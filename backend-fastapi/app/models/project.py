from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

class FileContent(BaseModel):
    content: str
    language: str = "plaintext"
    
class ProjectFile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    path: str
    content: str
    language: str = "plaintext"
    size: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = None
    language: Optional[str] = None
    framework: Optional[str] = None
    
class ProjectCreate(ProjectBase):
    files: Optional[Dict[str, FileContent]] = None
    
class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    language: Optional[str] = None
    framework: Optional[str] = None
    
class ProjectResponse(ProjectBase):
    id: str
    user_id: str
    files: Dict[str, FileContent] = {}
    file_count: int = 0
    created_at: datetime
    updated_at: datetime
    preview_url: Optional[str] = None
    
    class Config:
        from_attributes = True
        
class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int
    
class ProjectFileCreate(BaseModel):
    project_id: str
    name: str
    path: str
    content: str
    language: str = "plaintext"
    
class ProjectFileUpdate(BaseModel):
    content: Optional[str] = None
    language: Optional[str] = None
    
class ProjectFileResponse(ProjectFile):
    project_id: str
    
    class Config:
        from_attributes = True