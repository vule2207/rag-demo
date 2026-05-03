import os
import shutil
import logging
import traceback
import json
import asyncio
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from .schema.models import ChatRequest, ChatResponse, HealthResponse, ToolStep, SessionListResponse, SessionMetadata
from .core.engine import DocumentProcessor, RagEngine
from .core.session_manager import SessionManager
from .tools.mcp_tools import get_mcp_tools
from langchain_core.messages import HumanMessage, AIMessage

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
session_manager = SessionManager()
papers_dir = "./papers"
vector_store_dir = "./faiss_index"
agent_executor = None

def get_agent():
    global agent_executor
    if not agent_executor:
        os.makedirs(papers_dir, exist_ok=True)
        
        # 1. Try Loading from Disk
        if os.path.exists(vector_store_dir):
            logger.info("Loading existing FAISS index from disk...")
            engine.load_local(vector_store_dir)
        
        # 2. If load failed or not exists, try Indexing everything
        if not engine.vector_store:
            docs = [f for f in os.listdir(papers_dir) if f.endswith(".pdf")]
            if docs:
                logger.info("No index found. Creating new FAISS index from existing papers...")
                all_docs = processor.load_and_split(papers_dir)
                engine.create_vector_store(all_docs)
                engine.save_local(vector_store_dir)
        
        # 3. Build/Rebuild Agent with the current retriever
        retriever = engine.vector_store.as_retriever(
            search_type="similarity_score_threshold",
            search_kwargs={"k": 5, "score_threshold": 0.2}
        ) if engine.vector_store else None
        
        mcp_tools = get_mcp_tools(retriever=retriever)
        agent_executor = engine.build_agent(mcp_tools)
        
    return agent_executor

def format_chat_history(history):
    if not history:
        return []
    
    formatted = []
    for entry in history:
        role = entry.get("role")
        content = entry.get("content", "")
        if role == "user":
            formatted.append(HumanMessage(content=content))
        elif role == "assistant":
            formatted.append(AIMessage(content=content))
            
    # Limit to last 10 messages (5 rounds) to prevent token overflow
    return formatted[-10:]

@app.post("/api/rag/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, agent=Depends(get_agent)):
    try:
        # 1. Handle Context from Disk if session_id is provided but history is empty
        history = request.history
        if not history and request.session_id:
            stored_messages = session_manager.get_messages(request.session_id)
            history = [{"role": m["role"], "content": m["content"]} for m in stored_messages]
            
        chat_history = format_chat_history(history)
        result = agent.invoke({"input": request.message, "chat_history": chat_history})
        
        steps = [
            ToolStep(
                tool=a.tool,
                tool_input=str(a.tool_input),
                thought=a.log,
                output=str(o)[:1000]
            ) for a, o in result.get("intermediate_steps", [])
        ]

        # 2. Persist if session_id exists
        if request.session_id:
            session_manager.add_message(request.session_id, "user", request.message)
            session_manager.add_message(request.session_id, "assistant", result["output"], steps=[s.dict() for s in steps])

        return ChatResponse(answer=result["output"], steps=steps)
    except Exception as e:
        logger.error(f"Chat execution failed: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/rag/chat/stream")
async def chat_stream(request: ChatRequest, agent=Depends(get_agent)):
    async def event_generator():
        try:
            # 1. Handle Context from Disk
            history = request.history
            if not history and request.session_id:
                stored_messages = session_manager.get_messages(request.session_id)
                history = [{"role": m["role"], "content": m["content"]} for m in stored_messages]

            chat_history = format_chat_history(history)
            
            # Save user message immediately
            if request.session_id:
                session_manager.add_message(request.session_id, "user", request.message)

            full_answer = ""
            collected_steps = []

            async for event in agent.astream_events(
                {"input": request.message, "chat_history": chat_history},
                version="v2",
            ):
                kind = event["event"]
                
                if kind == "on_tool_start":
                    step_data = {'tool': event['name'], 'tool_input': event['data'].get('input', '')}
                    collected_steps.append({'tool': event['name'], 'tool_input': event['data'].get('input', ''), 'thought': '', 'output': ''})
                    yield f"data: {json.dumps({'type': 'step_start', 'data': step_data})}\n\n"
                elif kind == "on_tool_end":
                    output = event['data'].get('output', '')
                    # Update last step output
                    for step in reversed(collected_steps):
                        if step['tool'] == event['name'] and not step['output']:
                            step['output'] = str(output)[:1000]
                            break
                    yield f"data: {json.dumps({'type': 'step_end', 'data': {'tool': event['name'], 'output': str(output)[:1000]}})}\n\n"
                
                elif kind == "on_chain_end" and event["name"] == "AgentExecutor":
                    final_answer = event["data"].get("output", {}).get("output", "")
                    if final_answer:
                        full_answer = final_answer
                        chunk_size = 5
                        for i in range(0, len(final_answer), chunk_size):
                            chunk = final_answer[i:i+chunk_size]
                            yield f"data: {json.dumps({'type': 'answer_chunk', 'data': chunk})}\n\n"
                            await asyncio.sleep(0.02)
                    
                    # Save assistant response at the end
                    if request.session_id and full_answer:
                        session_manager.add_message(request.session_id, "assistant", full_answer, steps=collected_steps)
                    
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"

        except Exception as e:
            logger.error(f"Chat stream failed: {str(e)}")
            logger.error(traceback.format_exc())
            yield f"data: {json.dumps({'type': 'error', 'data': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# --- Session Management Endpoints ---

@app.get("/api/rag/sessions", response_model=SessionListResponse)
async def list_sessions():
    return {"sessions": session_manager.list_sessions()}

@app.post("/api/rag/sessions")
async def create_session():
    return session_manager.create_session()

@app.get("/api/rag/sessions/{session_id}")
async def get_session(session_id: str):
    messages = session_manager.get_messages(session_id)
    if not messages and not os.path.exists(os.path.join(session_manager.base_path, session_id)):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"messages": messages}

@app.delete("/api/rag/sessions/{session_id}")
async def delete_session(session_id: str):
    session_manager.delete_session(session_id)
    return {"message": "Session deleted"}

@app.post("/api/rag/upload")
async def upload(file: UploadFile = File(...)):
    global agent_executor
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDFs allowed.")
    
    os.makedirs(papers_dir, exist_ok=True)
    path = os.path.join(papers_dir, file.filename)
    with open(path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    logger.info(f"Incrementally indexing new file: {file.filename}")
    new_chunks = processor.load_file_and_split(path)
    if new_chunks:
        engine.add_documents(new_chunks)
        engine.save_local(vector_store_dir)
        
        # Force re-init of agent to update retriever with new context
        agent_executor = None 
        get_agent() # Re-init immediately
        
    return {"message": f"Successfully uploaded and indexed {file.filename}."}

@app.get("/api/rag/documents")
async def list_docs():
    return {"documents": [f for f in os.listdir(papers_dir) if f.endswith(".pdf")]}

@app.get("/api/rag/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", initialized=(agent_executor is not None))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
