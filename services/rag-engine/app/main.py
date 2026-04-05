import os
import shutil
import logging
import traceback
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from .schema.models import ChatRequest, ChatResponse, HealthResponse, ToolStep
from .core.engine import DocumentProcessor, RagEngine
from .tools.mcp_tools import get_mcp_tools

app = FastAPI(title="Rag Engine API", version="2.0.0")

# Setup Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Shared State
engine = RagEngine()
processor = DocumentProcessor()
papers_dir = "./papers"
agent_executor = None

def get_agent():
    global agent_executor
    if not agent_executor:
        os.makedirs(papers_dir, exist_ok=True)
        docs = processor.load_and_split(papers_dir)
        engine.create_vector_store(docs)
        
        # Tools initialized with retriever if store exists
        retriever = engine.vector_store.as_retriever(
            search_type="similarity_score_threshold",
            search_kwargs={"k": 5, "score_threshold": 0.2}
        ) if engine.vector_store else None
        
        mcp_tools = get_mcp_tools(retriever=retriever)
        agent_executor = engine.build_agent(mcp_tools)
    return agent_executor

@app.post("/api/rag/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, agent=Depends(get_agent)):
    try:
        result = agent.invoke({"input": request.message})
        
        steps = [
            ToolStep(
                tool=a.tool,
                tool_input=str(a.tool_input),
                thought=a.log,
                output=str(o)[:1000]
            ) for a, o in result.get("intermediate_steps", [])
        ]

        return ChatResponse(answer=result["output"], steps=steps)
    except Exception as e:
        logger.error(f"Chat execution failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rag/upload")
async def upload(file: UploadFile = File(...)):
    global agent_executor
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDFs allowed.")
    
    os.makedirs(papers_dir, exist_ok=True)
    path = os.path.join(papers_dir, file.filename)
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    agent_executor = None # Force re-init
    return {"message": "Uploaded and re-indexed."}

@app.get("/api/rag/documents")
async def list_docs():
    return {"documents": [f for f in os.listdir(papers_dir) if f.endswith(".pdf")]}

@app.get("/api/rag/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", initialized=(agent_executor is not None))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
