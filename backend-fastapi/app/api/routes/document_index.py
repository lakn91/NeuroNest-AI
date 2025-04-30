from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
import logging
import os
import tempfile
from app.services.document_index_service import DocumentIndexService

router = APIRouter()
logger = logging.getLogger(__name__)

class IndexRequest(BaseModel):
    name: str
    description: Optional[str] = None
    user_id: Optional[str] = None

class DocumentRequest(BaseModel):
    text: str
    metadata: Optional[Dict[str, Any]] = None

class SearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 5

@router.post("/create", response_model=Dict[str, str])
async def create_index(request: IndexRequest):
    """
    Create a new document index
    """
    try:
        document_index_service = DocumentIndexService()
        index_id = await document_index_service.create_index(
            name=request.name,
            description=request.description,
            user_id=request.user_id
        )
        return {"index_id": index_id}
    except Exception as e:
        logger.error(f"Error creating index: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create index: {str(e)}")

@router.post("/{index_id}/add-documents", response_model=Dict[str, int])
async def add_documents(index_id: str, documents: List[DocumentRequest]):
    """
    Add documents to an index
    """
    try:
        document_index_service = DocumentIndexService()
        count = await document_index_service.add_documents(
            index_id=index_id,
            documents=[doc.dict() for doc in documents]
        )
        return {"added_count": count}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error adding documents: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to add documents: {str(e)}")

@router.post("/{index_id}/add-files", response_model=Dict[str, int])
async def add_files(
    index_id: str,
    files: List[UploadFile] = File(...)
):
    """
    Add files to an index
    """
    try:
        # Save uploaded files to temporary directory
        temp_dir = tempfile.mkdtemp()
        file_paths = []
        
        for file in files:
            file_path = os.path.join(temp_dir, file.filename)
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            file_paths.append(file_path)
        
        # Add files to index
        document_index_service = DocumentIndexService()
        count = await document_index_service.add_files(
            index_id=index_id,
            file_paths=file_paths
        )
        
        # Clean up temporary files
        import shutil
        shutil.rmtree(temp_dir)
        
        return {"added_count": count}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error adding files: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to add files: {str(e)}")

@router.post("/{index_id}/search", response_model=List[Dict[str, Any]])
async def search_index(index_id: str, request: SearchRequest):
    """
    Search an index for documents matching a query
    """
    try:
        document_index_service = DocumentIndexService()
        results = await document_index_service.search(
            index_id=index_id,
            query=request.query,
            limit=request.limit
        )
        return results
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error searching index: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to search index: {str(e)}")

@router.get("/{index_id}", response_model=Dict[str, Any])
async def get_index_info(index_id: str):
    """
    Get information about an index
    """
    try:
        document_index_service = DocumentIndexService()
        index_info = await document_index_service.get_index_info(index_id)
        return index_info
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting index info: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get index info: {str(e)}")

@router.get("/list", response_model=List[Dict[str, Any]])
async def list_indices(user_id: Optional[str] = None):
    """
    List all indices, optionally filtered by user_id
    """
    try:
        document_index_service = DocumentIndexService()
        indices = await document_index_service.list_indices(user_id)
        return indices
    except Exception as e:
        logger.error(f"Error listing indices: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list indices: {str(e)}")

@router.delete("/{index_id}")
async def delete_index(index_id: str):
    """
    Delete an index
    """
    try:
        document_index_service = DocumentIndexService()
        await document_index_service.delete_index(index_id)
        return {"status": "deleted", "index_id": index_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error deleting index: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete index: {str(e)}")