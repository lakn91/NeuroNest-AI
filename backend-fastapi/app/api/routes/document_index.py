from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
import logging
import os
import tempfile
from app.services.document_index_service import DocumentIndexService
from app.api.deps import get_document_index_service
from app.api.deps import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

class IndexRequest(BaseModel):
    name: str = Field(..., description="Name of the index")
    description: Optional[str] = Field(None, description="Description of the index")

class IndexResponse(BaseModel):
    id: str = Field(..., description="Index ID")
    name: str = Field(..., description="Name of the index")
    description: Optional[str] = Field(None, description="Description of the index")
    document_count: int = Field(..., description="Number of documents in the index")
    created_at: str = Field(..., description="Creation timestamp")
    updated_at: str = Field(..., description="Last update timestamp")
    user_id: Optional[str] = Field(None, description="User ID who owns the index")

class DocumentRequest(BaseModel):
    text: str = Field(..., description="Document text content")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Document metadata")

class SearchRequest(BaseModel):
    query: str = Field(..., description="Search query")
    limit: Optional[int] = Field(5, description="Maximum number of results to return")

class SearchResult(BaseModel):
    text: str = Field(..., description="Document text")
    metadata: Dict[str, Any] = Field({}, description="Document metadata")
    score: Optional[float] = Field(None, description="Relevance score")

class SearchResponse(BaseModel):
    results: List[SearchResult] = Field(..., description="Search results")
    query: str = Field(..., description="Original query")

@router.post("/create", response_model=IndexResponse, tags=["Document Index"])
async def create_index(
    request: IndexRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    document_index_service: DocumentIndexService = Depends(get_document_index_service)
):
    """
    Create a new document index
    """
    try:
        user_id = current_user.get("id") if current_user else None
        index_id = await document_index_service.create_index(
            name=request.name,
            description=request.description,
            user_id=user_id
        )
        index_info = await document_index_service.get_index_info(index_id)
        return index_info
    except Exception as e:
        logger.error(f"Error creating index: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create index: {str(e)}")

@router.post("/{index_id}/add-documents", response_model=IndexResponse, tags=["Document Index"])
async def add_documents(
    index_id: str, 
    documents: List[DocumentRequest],
    current_user: Dict[str, Any] = Depends(get_current_user),
    document_index_service: DocumentIndexService = Depends(get_document_index_service)
):
    """
    Add documents to an index
    """
    try:
        # Check if user has access to this index
        try:
            index_info = await document_index_service.get_index_info(index_id)
            if current_user and index_info.get("user_id") and index_info.get("user_id") != current_user.get("id"):
                raise HTTPException(status_code=403, detail="You don't have access to this index")
        except ValueError:
            raise HTTPException(status_code=404, detail=f"Index {index_id} not found")
            
        # Add documents to index
        await document_index_service.add_documents(
            index_id=index_id,
            documents=[doc.dict() for doc in documents]
        )
        
        # Get updated index info
        updated_index = await document_index_service.get_index_info(index_id)
        return updated_index
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding documents: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to add documents: {str(e)}")

@router.post("/{index_id}/add-files", response_model=IndexResponse, tags=["Document Index"])
async def add_files(
    index_id: str,
    files: List[UploadFile] = File(...),
    current_user: Dict[str, Any] = Depends(get_current_user),
    document_index_service: DocumentIndexService = Depends(get_document_index_service)
):
    """
    Add files to an index
    """
    try:
        # Check if user has access to this index
        try:
            index_info = await document_index_service.get_index_info(index_id)
            if current_user and index_info.get("user_id") and index_info.get("user_id") != current_user.get("id"):
                raise HTTPException(status_code=403, detail="You don't have access to this index")
        except ValueError:
            raise HTTPException(status_code=404, detail=f"Index {index_id} not found")
            
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
        await document_index_service.add_files(
            index_id=index_id,
            file_paths=file_paths
        )
        
        # Clean up temporary files
        import shutil
        shutil.rmtree(temp_dir)
        
        # Get updated index info
        updated_index = await document_index_service.get_index_info(index_id)
        return updated_index
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding files: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to add files: {str(e)}")

@router.post("/{index_id}/search", response_model=SearchResponse, tags=["Document Index"])
async def search_index(
    index_id: str, 
    request: SearchRequest,
    current_user: Dict[str, Any] = Depends(get_current_user),
    document_index_service: DocumentIndexService = Depends(get_document_index_service)
):
    """
    Search an index for documents matching a query
    """
    try:
        # Check if user has access to this index
        try:
            index_info = await document_index_service.get_index_info(index_id)
            if current_user and index_info.get("user_id") and index_info.get("user_id") != current_user.get("id"):
                raise HTTPException(status_code=403, detail="You don't have access to this index")
        except ValueError:
            raise HTTPException(status_code=404, detail=f"Index {index_id} not found")
            
        # Search index
        results = await document_index_service.search(
            index_id=index_id,
            query=request.query,
            limit=request.limit
        )
        
        return {
            "results": results,
            "query": request.query
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching index: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to search index: {str(e)}")

@router.get("/{index_id}", response_model=IndexResponse, tags=["Document Index"])
async def get_index_info(
    index_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    document_index_service: DocumentIndexService = Depends(get_document_index_service)
):
    """
    Get information about an index
    """
    try:
        index_info = await document_index_service.get_index_info(index_id)
        
        # Check if user has access to this index
        if current_user and index_info.get("user_id") and index_info.get("user_id") != current_user.get("id"):
            raise HTTPException(status_code=403, detail="You don't have access to this index")
            
        return index_info
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting index info: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get index info: {str(e)}")

@router.get("/list", response_model=List[IndexResponse], tags=["Document Index"])
async def list_indices(
    current_user: Dict[str, Any] = Depends(get_current_user),
    document_index_service: DocumentIndexService = Depends(get_document_index_service)
):
    """
    List all indices for the current user
    """
    try:
        user_id = current_user.get("id") if current_user else None
        indices = await document_index_service.list_indices(user_id)
        return indices
    except Exception as e:
        logger.error(f"Error listing indices: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list indices: {str(e)}")

@router.delete("/{index_id}", tags=["Document Index"])
async def delete_index(
    index_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user),
    document_index_service: DocumentIndexService = Depends(get_document_index_service)
):
    """
    Delete an index
    """
    try:
        # Check if user has access to this index
        try:
            index_info = await document_index_service.get_index_info(index_id)
            if current_user and index_info.get("user_id") and index_info.get("user_id") != current_user.get("id"):
                raise HTTPException(status_code=403, detail="You don't have access to this index")
        except ValueError:
            raise HTTPException(status_code=404, detail=f"Index {index_id} not found")
            
        # Delete index
        success = await document_index_service.delete_index(index_id)
        if not success:
            raise HTTPException(status_code=404, detail=f"Index {index_id} not found")
            
        return {"status": "deleted", "index_id": index_id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting index: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete index: {str(e)}")