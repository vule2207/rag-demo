import os
# Force allow pulling public prompts via environment variable (MUST be set before hub import)
os.environ["LANGCHAIN_HUB_DANGEROUSLY_PULL_PUBLIC_PROMPT"] = "true"

from typing import List, Optional, Any
from langchain_community.document_loaders import DirectoryLoader, UnstructuredFileLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_community.vectorstores import FAISS
from langchain_community.vectorstores.utils import DistanceStrategy
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain.agents import AgentExecutor, create_structured_chat_agent
from langchain import hub

class DocumentProcessor:
    def __init__(self, chunk_size: int = 1200, chunk_overlap: int = 200):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            add_start_index=True,
            strip_whitespace=True,
            separators=["\n\n", "\n", " ", ""]
        )

    def load_and_split(self, directory: str) -> List:
        loader = DirectoryLoader(
            path=directory,
            glob="**/*.pdf",
            loader_cls=UnstructuredFileLoader
        )
        docs = loader.load()
        return self.splitter.split_documents(docs)

    def load_file_and_split(self, file_path: str) -> List:
        loader = UnstructuredFileLoader(file_path)
        docs = loader.load()
        return self.splitter.split_documents(docs)

class RagEngine:
    def __init__(self, model_name: str = "models/gemma-4-31b-it", embed_model: str = "models/gemini-embedding-001"):
        # 1. Get configuration from environment
        provider = os.getenv("MODEL_PROVIDER", "google").lower()
        google_api_key = os.getenv("GOOGLE_API_KEY")
        
        # 2. Initialize Models based on provider
        if provider == "google" and google_api_key:
            import logging
            logging.getLogger(__name__).info("Using Google Generative AI provider")
            self.llm = ChatGoogleGenerativeAI(model=model_name, google_api_key=google_api_key, temperature=0)
            self.embeddings = GoogleGenerativeAIEmbeddings(model=embed_model, google_api_key=google_api_key)
        else:
            import logging
            ollama_url = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
            ollama_model = os.getenv("OLLAMA_MODEL", "gemma2:9b")
            ollama_embed = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
            
            logging.getLogger(__name__).info(f"Using Ollama provider at {ollama_url}")
            
            self.llm = ChatOllama(
                model=ollama_model, 
                base_url=ollama_url,
                temperature=0
            )
            self.embeddings = OllamaEmbeddings(
                model=ollama_embed,
                base_url=ollama_url
            )
        
        self.vector_store = None

    def create_vector_store(self, documents: List):
        if not documents:
            return None
        self.vector_store = FAISS.from_documents(
            documents=documents,
            embedding=self.embeddings,
            distance_strategy=DistanceStrategy.COSINE
        )
        return self.vector_store

    def save_local(self, folder_path: str):
        if self.vector_store:
            self.vector_store.save_local(folder_path)

    def load_local(self, folder_path: str):
        index_file = os.path.join(folder_path, "index.faiss")
        if os.path.exists(index_file):
            try:
                self.vector_store = FAISS.load_local(
                    folder_path, 
                    self.embeddings, 
                    allow_dangerous_deserialization=True
                )
                return self.vector_store
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to load FAISS index: {e}")
                return None
        return None

    def add_documents(self, documents: List):
        if not self.vector_store:
            return self.create_vector_store(documents)
        
        self.vector_store.add_documents(documents)
        return self.vector_store

    def build_agent(self, tools: List):
        # 1. Define the Structured Chat Prompt manually to avoid Hub security issues
        from langchain_core.prompts import ChatPromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate
        
        system_template = (
            "Respond to the human as helpfully and accurately as possible.\n\n"
            "## CONVERSATION RULES:\n"
            "1. For greetings (hi, hello, etc.), basic conversation, or if you already know the answer, respond DIRECTLY using the 'Final Answer' action.\n"
            "2. ONLY use tools if you need to look up specific information from the knowledge base, database, or internet.\n"
            "3. If the user's request is ambiguous, ask for clarification directly.\n\n"
            "## TOOL ACCESS:\n"
            "You have access to the following tools:\n{tools}\n\n"
            "To use a tool, you MUST respond with a JSON blob specifying the action and action_input.\n"
            "Valid \"action\" values: \"Final Answer\" or {tool_names}\n\n"
            "## FORMATTING:\n"
            "Provide only ONE action per $JSON_BLOB, as shown:\n\n"
            "```\n"
            "{{\n"
            "  \"action\": \"$TOOL_NAME\",\n"
            "  \"action_input\": \"$INPUT\"\n"
            "}}\n"
            "```\n\n"
            "Follow this format strictly:\n\n"
            "Question: input question to answer\n"
            "Thought: consider if you need a tool or can answer directly\n"
            "Action:\n"
            "```\n"
            "$JSON_BLOB\n"
            "```\n"
            "Observation: action result\n"
            "... (repeat Thought/Action/Observation if needed)\n"
            "Thought: I have the final answer\n"
            "Action:\n"
            "```\n"
            "{{\n"
            "  \"action\": \"Final Answer\",\n"
            "  \"action_input\": \"Your final response here\"\n"
            "}}\n"
            "```\n\n"
            "CRITICAL: Your response MUST end immediately after the closing ``` of the JSON blob. "
            "Do not add any text after the JSON blob."
        )
        
        human_template = "{input}\n\n{agent_scratchpad}"
        
        base_prompt = ChatPromptTemplate.from_messages([
            SystemMessagePromptTemplate.from_template(system_template),
            MessagesPlaceholder(variable_name="chat_history"),
            HumanMessagePromptTemplate.from_template(human_template),
        ])
        
        # 2. Build the agent with the hardcoded prompt
        agent = create_structured_chat_agent(self.llm, tools, base_prompt)
        
        def handle_parsing_error(error: Any) -> str:
            """
            Robust fallback: attempts to extract JSON from a malformed output.
            """
            import re
            error_msg = str(error)
            # Find JSON-like structures in the error message if it's a parsing error
            match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", error_msg, re.DOTALL)
            if not match:
                match = re.search(r"({.*})", error_msg, re.DOTALL)
            
            if match:
                try:
                    import json
                    json_str = match.group(1)
                    parsed = json.loads(json_str)
                    if "action" in parsed and parsed["action"] == "Final Answer":
                         return parsed["action_input"]
                except:
                    pass
            
            return f"Parsing Error fallback triggered. Raw Error: {error_msg}"

        return AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=True,
            handle_parsing_errors=handle_parsing_error,
            return_intermediate_steps=True,
            max_iterations=5,
            max_execution_time=300 # Prevent long-running loops
        )
