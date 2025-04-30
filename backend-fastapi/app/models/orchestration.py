from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
import uuid

class AgentTask(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    input_data: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None
    tools: Optional[List[str]] = None
    memory_id: Optional[str] = None
    agent_id: Optional[str] = None
    status: str = "pending"
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class AgentInfo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    capabilities: List[str]
    model: str
    status: str = "active"
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class WorkflowStep(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str
    input_data: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None
    tools: Optional[List[str]] = None
    memory_id: Optional[str] = None
    update_context: bool = False
    depends_on: Optional[List[str]] = None

class Workflow(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    steps: List[WorkflowStep]
    status: str = "created"
    current_step: Optional[int] = None
    results: Dict[str, Any] = {}
    error: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class TaskRequest(BaseModel):
    task_type: str
    input_data: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None
    tools: Optional[List[str]] = None
    memory_id: Optional[str] = None

class TaskResponse(BaseModel):
    task_id: str
    status: str
    agent_id: Optional[str] = None

class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    agent_id: Optional[str] = None
    created_at: str
    updated_at: str

class WorkflowRequest(BaseModel):
    name: str
    description: str
    steps: List[Dict[str, Any]]

class WorkflowResponse(BaseModel):
    workflow_id: str
    status: str

class WorkflowStatusResponse(BaseModel):
    workflow_id: str
    name: str
    description: str
    status: str
    current_step: Optional[int] = None
    results: Dict[str, Any] = {}
    error: Optional[str] = None
    created_at: str
    updated_at: str

class AgentRegistrationRequest(BaseModel):
    name: str
    description: str
    capabilities: List[str]
    model: str

class AgentRegistrationResponse(BaseModel):
    agent_id: str
    status: str