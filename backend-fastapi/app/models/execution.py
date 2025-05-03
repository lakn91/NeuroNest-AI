from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
import uuid

class ExecutionRequest(BaseModel):
    project_id: str
    command: Optional[str] = None
    timeout: Optional[int] = 30
    
class ExecutionResponse(BaseModel):
    execution_id: str
    status: str
    output: Optional[str] = None
    error: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    
class ExecutionLog(BaseModel):
    execution_id: str
    logs: str
    
class ExecutionStatus(BaseModel):
    execution_id: str
    status: str
    
class ContainerInfo(BaseModel):
    container_id: str
    project_id: str
    status: str
    created_at: datetime
    ports: Optional[Dict[str, Any]] = None
    
class DockerConfig(BaseModel):
    image: str = "python:3.10-slim"
    command: Optional[str] = None
    environment: Optional[Dict[str, str]] = None
    ports: Optional[Dict[str, int]] = None
    volumes: Optional[Dict[str, str]] = None
    memory: Optional[str] = "512m"
    cpu_count: Optional[int] = 1
    timeout: Optional[int] = 30
    
class RuntimeEnvironment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: Optional[str] = None
    description: Optional[str] = None
    language: Optional[str] = None
    version: Optional[str] = None
    image: Optional[str] = None
    file_extensions: Optional[List[str]] = None
    project_id: str = Field(default="default")
    status: str = Field(default="available")
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    environment_vars: Dict[str, str] = {}
    entry_point: Optional[str] = None
    container_id: Optional[str] = None
    port: Optional[str] = None
    url: Optional[str] = None
    timeout: int = 300
    
class RuntimeStatus(BaseModel):
    id: str
    status: str
    container_id: Optional[str] = None
    port: Optional[str] = None
    url: Optional[str] = None
    updated_at: str
    
class RuntimeLog(BaseModel):
    id: str
    runtime_id: str
    timestamp: str
    message: str
    type: str  # info, error, output
    
class RuntimeEnvironmentTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    language: str
    version: str
    image: str
    default_command: Optional[str] = None
    file_extensions: List[str]
    
class RuntimeEnvironmentList(BaseModel):
    environments: List[RuntimeEnvironmentTemplate]