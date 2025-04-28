from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
import uuid

class Message(BaseModel):
    role: str
    content: str
    type: str = "text"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str = "New Conversation"
    messages: List[Message] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
class ConversationCreate(BaseModel):
    title: Optional[str] = "New Conversation"
    messages: Optional[List[Message]] = None
    
class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    messages: Optional[List[Message]] = None
    
class ConversationResponse(Conversation):
    class Config:
        from_attributes = True
        
class AgentRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = None
    context: Optional[Dict[str, Any]] = None
    files: Optional[List[str]] = None
    
class AgentResponse(BaseModel):
    response: Dict[str, Any]
    conversation_id: Optional[str] = None
    
class AgentInfo(BaseModel):
    id: str
    name: str
    description: str
    capabilities: List[str]
    
class ProviderInfo(BaseModel):
    id: str
    name: str
    description: str
    requires_api_key: bool
    api_key_url: Optional[str] = None
    
class AgentListResponse(BaseModel):
    agents: List[AgentInfo]
    
class ProviderListResponse(BaseModel):
    providers: List[ProviderInfo]
    
class ToolCall(BaseModel):
    name: str
    arguments: Dict[str, Any]
    
class ToolResponse(BaseModel):
    result: Any
    
class AgentAction(BaseModel):
    agent_id: str
    action: str
    parameters: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
class AgentMemory(BaseModel):
    agent_id: str
    user_id: str
    key: str
    value: Any
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    
class AgentThought(BaseModel):
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)