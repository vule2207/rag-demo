import os
from typing import List, Optional, Any
from langchain_community.document_loaders import DirectoryLoader, UnstructuredFileLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_community.vectorstores import FAISS
from langchain_community.vectorstores.utils import DistanceStrategy
from langchain_core.prompts import ChatPromptTemplate
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
        # Check if Google API Key is available
        google_api_key = os.getenv("GOOGLE_API_KEY")
        
        if google_api_key:
            # Use Google Cloud models
            self.llm = ChatGoogleGenerativeAI(model=model_name, google_api_key=google_api_key, temperature=0)
            self.embeddings = GoogleGenerativeAIEmbeddings(model=embed_model, google_api_key=google_api_key)
        else:
            # Fallback to local Ollama models (if no API key)
            self.llm = ChatOllama(model="gemma4:31b", temperature=0)
            self.embeddings = OllamaEmbeddings(model="nomic-embed-text")
        
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
        # Structured Chat Agent uses a different prompt format that works better with Gemma
        # We customize it to be even stricter about the JSON-only requirement
        base_prompt = hub.pull("hwchase17/structured-chat-agent")
        
        # Add a strict formatting instruction to the end of the system message
        custom_instruction = (
            "\n\nCRITICAL: Your response MUST end immediately after the closing ``` of the JSON blob. "
            "Do not add any text, thoughts, or analysis after the JSON blob. One action per response."
        )
        
        if hasattr(base_prompt, 'messages') and len(base_prompt.messages) > 0:
            base_prompt.messages[0].prompt.template += custom_instruction

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
            max_iterations=5
        )
