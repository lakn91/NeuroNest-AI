"""
Docker Sandbox API Routes
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Path
from typing import Dict, List, Any, Optional
from pydantic import BaseModel

# Import services
from app.services.docker_sandbox_service import DockerSandboxService

# Create router
router = APIRouter()

# Initialize services
docker_sandbox_service = DockerSandboxService()

# Define models
class SandboxSessionRequest(BaseModel):
    language: str

class CodeExecutionRequest(BaseModel):
    session_id: str
    code: str
    timeout: Optional[int] = 30

class PackageInstallRequest(BaseModel):
    session_id: str
    package_name: str

class FileUploadRequest(BaseModel):
    session_id: str
    file_path: str
    content: str

# Routes
@router.post("/session")
async def create_sandbox_session(request: SandboxSessionRequest):
    """Create a new sandbox session"""
    try:
        return docker_sandbox_service.create_session(request.language)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/execute/python")
async def execute_python_code(request: CodeExecutionRequest):
    """Execute Python code in a sandbox"""
    try:
        return docker_sandbox_service.execute_code(request.session_id, request.code, request.timeout)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/execute/javascript")
async def execute_javascript_code(request: CodeExecutionRequest):
    """Execute JavaScript code in a sandbox"""
    try:
        return docker_sandbox_service.execute_javascript(request.session_id, request.code, request.timeout)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/install/package")
async def install_package(request: PackageInstallRequest):
    """Install a package in a sandbox"""
    try:
        return docker_sandbox_service.install_package(request.session_id, request.package_name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/upload/file")
async def upload_file(request: FileUploadRequest):
    """Upload a file to a sandbox"""
    try:
        return docker_sandbox_service.upload_file(request.session_id, request.file_path, request.content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/files")
async def list_files(session_id: str, directory: str = ""):
    """List files in a sandbox"""
    try:
        return docker_sandbox_service.list_files(session_id, directory)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/file")
async def read_file(session_id: str, file_path: str):
    """Read a file from a sandbox"""
    try:
        return docker_sandbox_service.read_file(session_id, file_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/session/{session_id}")
async def close_sandbox_session(session_id: str):
    """Close a sandbox session"""
    try:
        return docker_sandbox_service.close_session(session_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))