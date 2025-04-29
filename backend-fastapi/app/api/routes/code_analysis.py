"""
Code Analysis API Routes
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Path
from typing import Dict, List, Any, Optional
from pydantic import BaseModel

# Import services
from app.services.code_analysis_service import CodeAnalysisService

# Create router
router = APIRouter()

# Initialize services
code_analysis_service = CodeAnalysisService()

# Define models
class CodeAnalysisRequest(BaseModel):
    code: str
    language: str

# Routes
@router.post("/analyze")
async def analyze_code(request: CodeAnalysisRequest):
    """Analyze code for issues and structure"""
    try:
        return code_analysis_service.analyze_code(request.code, request.language)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/analyze/file")
async def analyze_file(file_path: str = Query(...)):
    """Analyze a file for issues and structure"""
    try:
        return code_analysis_service.analyze_file(file_path)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/analyze/project")
async def analyze_project(
    project_path: str = Query(...),
    include_patterns: Optional[List[str]] = Query(None)
):
    """Analyze a project directory"""
    try:
        return code_analysis_service.analyze_project(project_path, include_patterns)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))