from pydantic import BaseModel
from typing import List, Optional, Any

class ChatRequest(BaseModel):
    message: str

class ToolStep(BaseModel):
    tool: str
    tool_input: Any
    thought: str
    output: str

class ChatResponse(BaseModel):
    answer: str
    steps: List[ToolStep] = []

class HealthResponse(BaseModel):
    status: str
    initialized: bool
