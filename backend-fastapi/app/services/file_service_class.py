"""
File service class for handling file operations.
"""

import os
import logging
import uuid
import shutil
import mimetypes
from typing import Dict, List, Any, Optional, BinaryIO
from datetime import datetime
import aiofiles
from fastapi import UploadFile
import PyPDF2
from PIL import Image
import io
from app.config import settings
from app.models.file import FileInfo, FileAnalysisResult
from app.services.file_service import (
    save_upload_file, get_file_info, delete_file, 
    extract_text_from_file, extract_text_from_pdf, 
    extract_text_from_image, extract_text_from_text_file,
    analyze_file
)

logger = logging.getLogger(__name__)

class FileService:
    """Service for handling file operations"""
    
    def __init__(self, upload_dir=None):
        """
        Initialize the file service
        
        Args:
            upload_dir: Directory to store uploaded files
        """
        self.upload_dir = upload_dir or settings.UPLOAD_DIR
        
        # Create upload directory if it doesn't exist
        os.makedirs(self.upload_dir, exist_ok=True)
    
    async def save_upload_file(self, upload_file: UploadFile, user_id: str, destination_dir: Optional[str] = None) -> FileInfo:
        """Save an uploaded file to disk and return file info"""
        dest_dir = destination_dir or self.upload_dir
        return await save_upload_file(upload_file, user_id, dest_dir)
    
    async def get_file_info(self, file_id: str) -> Optional[FileInfo]:
        """Get file info from the database or file system"""
        return await get_file_info(file_id)
    
    async def delete_file(self, file_id: str) -> bool:
        """Delete a file from disk"""
        return await delete_file(file_id)
    
    async def extract_text_from_file(self, file_path: str) -> Optional[str]:
        """Extract text from a file based on its content type"""
        return await extract_text_from_file(file_path)
    
    async def analyze_file(self, file_id: str) -> FileAnalysisResult:
        """Analyze a file and extract its content and metadata"""
        return await analyze_file(file_id)