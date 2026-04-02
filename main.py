# Import necessary libraries
import os
from dotenv import load_dotenv
from langchain_community.document_loaders import DirectoryLoader, UnstructuredFileLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain_community.vectorstores.utils import DistanceStrategy
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# Load environment variables securely
load_dotenv()

class DocumentLoaderService:
    def __init__(self, directoryPath: str):
        # Initialize the target directory containing raw data
        self.directoryPath = directoryPath

    def loadDocuments(self):
        try:
            # Configure DirectoryLoader to scan and load PDF files recursively
            loader = DirectoryLoader(
                path=self.directoryPath,
                glob="**/*.pdf",
                loader_cls=UnstructuredFileLoader,
                show_progress=True,
                use_multithreading=True
            )
            # Execute data loading
            loadedDocs = loader.load()
            return loadedDocs
        except Exception as error:
            # Handle potential file system or parsing errors gracefully
            print(f"[DocumentLoaderService] Error loading documents: {error}")
            return []

class TextSplitterService:
    def __init__(self, chunkSize: int = 1200, chunkOverlap: int = 200):
        # Initialize text splitting constraints
        self.chunkSize = chunkSize
        self.chunkOverlap = chunkOverlap

    def splitDocuments(self, rawDocuments):
        try:
            # Define markdown separators to split text semantically
            markdownSeparators = [
                "\n#{1,6} ",
                "```\n",
                "\n\\*\\*\\*+\n",
                "\n---+\n",
                "\n___+\n",
                "\n\n",
                "\n",
                " ",
                ""
            ]
            
            # Configure recursive text splitter
            textSplitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunkSize,
                chunk_overlap=self.chunkOverlap,
                add_start_index=True,
                strip_whitespace=True,
                separators=markdownSeparators
            )
            
            # Execute text splitting process
            splitDocs = textSplitter.split_documents(rawDocuments)
            return splitDocs
        except Exception as error:
            # Handle errors during string manipulation and chunking
            print(f"[TextSplitterService] Error splitting documents: {error}")
            return []

class VectorStoreService:
    def __init__(self):
        # Initialize OpenAI embedding model 
        self.embeddingsModel = OpenAIEmbeddings(model="text-embedding-3-large")

    def createVectorStore(self, splitDocuments):
        try:
            # Build FAISS vector database using cosine similarity strategy
            vectorStore = FAISS.from_documents(
                documents=splitDocuments,
                embedding=self.embeddingsModel,
                distance_strategy=DistanceStrategy.COSINE
            )
            return vectorStore
        except Exception as error:
            # Catch API or memory errors during embedding generation
            print(f"[VectorStoreService] Error creating vector store: {error}")
            return None

class RagChatbotComponent:
    def __init__(self, vectorStore):
        # Setup vector store, LLM, and structured prompt template
        self.vectorStore = vectorStore
        self.llmModel = ChatOpenAI(model="gpt-4o-mini", temperature=0)
        self.promptTemplate = self._createPromptTemplate()

    def _createPromptTemplate(self):
        # Define strict operational rules for the AI to prevent hallucinations
        systemPrompt = """
        You are a strict assistant. Focus on citations from private data sources.
        Rules:
        1. Only use the provided context to answer the question.
        2. If the answer is not in the context, simply say "I don't know".
        3. Do not use outside knowledge, guess, or search the internet.
        4. If possible, cite the source document and index used to answer.

        Context: {context}
        Question: {question}
        """
        # Compile and return the prompt template
        return ChatPromptTemplate.from_template(systemPrompt)

    def buildPipeline(self):
        try:
            # Configure document retriever with similarity threshold logic
            retriever = self.vectorStore.as_retriever(
                search_type="similarity_score_threshold",
                search_kwargs={"k": 5, "score_threshold": 0.2}
            )

            # Construct the LCEL (LangChain Expression Language) pipeline
            ragPipeline = (
                {"context": retriever, "question": RunnablePassthrough()}
                | self.promptTemplate
                | self.llmModel
                | StrOutputParser()
            )
            return ragPipeline
        except Exception as error:
            # Handle pipeline construction failures
            print(f"[RagChatbotComponent] Error building RAG pipeline: {error}")
            return None

class ApplicationController:
    @staticmethod
    def execute():
        try:
            # Step 1: Extract data from PDFs
            print("1. Loading raw documents...")
            loaderService = DocumentLoaderService(directoryPath="./papers")
            documents = loaderService.loadDocuments()
            if not documents:
                raise ValueError("No documents found or failed to load.")

            # Step 2: Transform and chunk data
            print("2. Splitting text into semantic chunks...")
            splitterService = TextSplitterService()
            splitDocs = splitterService.splitDocuments(documents)

            # Step 3: Load into Vector Database
            print("3. Generating embeddings and creating Vector Store...")
            vectorStoreService = VectorStoreService()
            faissStore = vectorStoreService.createVectorStore(splitDocs)
            if not faissStore:
                raise ValueError("Failed to initialize vector database.")

            # Step 4: Construct Pipeline
            print("4. Compiling RAG computational graph...")
            chatbotComponent = RagChatbotComponent(faissStore)
            chatbotPipeline = chatbotComponent.buildPipeline()

            # Step 5: Initialize interactive session
            print("\n=== Chatbot is online! Type 'exit' to terminate. ===")
            while True:
                userInput = input("\n[User]: ")
                if userInput.lower() in ['exit', 'quit']:
                    print("Terminating session...")
                    break
                
                # Execute pipeline and stream/print response
                answer = chatbotPipeline.invoke(userInput)
                print(f"[Bot]:\n{answer}")
                
        except Exception as error:
            # Catch all top-level runtime exceptions
            print(f"[ApplicationController] Critical application error: {error}")

if __name__ == "__main__":
    ApplicationController.execute()