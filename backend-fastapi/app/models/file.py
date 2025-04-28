from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid

class FileUpload(BaseModel):
    filename: str
    content_type: str
    size: int
    
class FileInfo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_filename: str
    content_type: str
    size: int
    user_id: str
    url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
class FileResponse(FileInfo):
    class Config:
        from_attributes = True
        
class FileListResponse(BaseModel):
    files: List[FileResponse]
    total: int
    
class FileAnalysisResult(BaseModel):
    file_id: str
    content_type: str
    text_content: Optional[str] = None
    metadata: Dict[str, Any] = {}
    error: Optional[str] = None
    
class FileProcessingRequest(BaseModel):
    file_id: str
    processing_type: str = "extract_text"
    options: Optional[Dict[str, Any]] = None
    
class FileProcessingResponse(BaseModel):
    file_id: str
    result: Any
    error: Optional[str] = None