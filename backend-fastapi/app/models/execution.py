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
    name: str
    description: str
    language: str
    version: str
    image: str
    default_command: Optional[str] = None
    file_extensions: List[str]
    
class RuntimeEnvironmentList(BaseModel):
    environments: List[RuntimeEnvironment]