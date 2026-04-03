# Import necessary libraries
import os
from dotenv import load_dotenv
from langchain_community.document_loaders import DirectoryLoader, UnstructuredFileLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import FAISS
from langchain_community.vectorstores.utils import DistanceStrategy
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser

# Load environment variables from .env file
load_dotenv()

class DocumentLoaderService:
    """Service to handle loading documents from a specified directory."""
    def __init__(self, directoryPath: str):
        """
        Initialize the loader service.
        :param directoryPath: Path to the directory containing documents.
        """
        self.directoryPath = directoryPath

    def loadDocuments(self):
        """
        Scans the directory for PDF files and loads them.
        :return: List of loaded documents.
        """
        try:
            # Use DirectoryLoader to fetch all PDFs recursively using Unstructured
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
    """Service to handle splitting large documents into smaller, manageable chunks."""
    def __init__(self, chunkSize: int = 1200, chunkOverlap: int = 200):
        """
        Initialize the splitter service.
        :param chunkSize: Maximum size of each text chunk.
        :param chunkOverlap: Overlap between adjacent chunks to maintain context.
        """
        self.chunkSize = chunkSize
        self.chunkOverlap = chunkOverlap

    def splitDocuments(self, rawDocuments):
        """
        Splits a list of documents into segments based on predefined separators.
        :param rawDocuments: List of documents to split.
        :return: List of document chunks.
        """
        try:
            # Define hierarchical separators for semantic splitting
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
    """Service to manage the creation and interaction with the vector database."""
    def __init__(self):
        """Initialize the embedding model (Google)."""
        self.embeddingsModel = GoogleGenerativeAIEmbeddings(model="gemini-embedding-001")

    def createVectorStore(self, splitDocuments):
        """
        Creates a FAISS vector store from document chunks.
        :param splitDocuments: List of document chunks.
        :return: Initialized FAISS vector store.
        """
        try:
            # Build the vector database using Google's embedding model and cosine similarity
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
    """Core component that integrates the vector store with the LLM to provide RAG capabilities."""
    def __init__(self, vectorStore):
        """
        Initialize the chatbot component.
        :param vectorStore: The vector database to retrieve context from.
        """
        self.vectorStore = vectorStore
        # Using Google's Gemma 4 (31B Dense) for high-performance reasoning
        self.llmModel = ChatGoogleGenerativeAI(model="gemma-4-31b-it", temperature=0)
        self.promptTemplate = self._createPromptTemplate()

    def _createPromptTemplate(self):
        """Defines the system prompt and operational constraints for the AI."""
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
    """Main controller to orchestrate the RAG application workflow."""
    @staticmethod
    def execute():
        """Executes the end-to-end RAG pipeline from loading to interactive chat."""
        try:
            # Step 1: Load and parse documents from the local repository
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