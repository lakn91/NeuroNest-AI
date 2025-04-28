from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import Dict, Any, List, Optional
import logging
from app.core.dependencies import get_current_user
from app.models.file import FileInfo, FileResponse, FileListResponse, FileAnalysisResult, FileProcessingRequest
from app.services.file_service import save_upload_file, get_file_info, delete_file, analyze_file

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("", response_model=FileResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Upload a file
    """
    try:
        file_info = await save_upload_file(file, current_user["uid"])
        return file_info
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload file"
        )

@router.get("/{file_id}", response_model=FileResponse)
async def get_file(
    file_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get file information
    """
    try:
        file_info = await get_file_info(file_id)
        
        if not file_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # In a real implementation, you would check if the user owns the file
        # For now, we'll skip this check
        
        return file_info
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get file information"
        )

@router.delete("/{file_id}")
async def delete_file_by_id(
    file_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a file
    """
    try:
        success = await delete_file(file_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        return {"message": "File deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete file"
        )

@router.post("/analyze/{file_id}", response_model=FileAnalysisResult)
async def analyze_file_by_id(
    file_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Analyze a file and extract its content and metadata
    """
    try:
        result = await analyze_file(file_id)
        
        if result.error:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.error
            )
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error analyzing file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to analyze file"
        )

@router.post("/process")
async def process_file(
    request: FileProcessingRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Process a file with a specific processing type
    """
    try:
        # Get file info
        file_info = await get_file_info(request.file_id)
        
        if not file_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        
        # Process the file based on the processing type
        if request.processing_type == "extract_text":
            # Extract text from the file
            from app.services.file_service import extract_text_from_file
            text = await extract_text_from_file(file_info.filename)
            
            return {
                "file_id": request.file_id,
                "result": {
                    "text": text
                }
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported processing type: {request.processing_type}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing file: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process file"
        )