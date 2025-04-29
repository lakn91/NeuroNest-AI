"""
Memory API Routes
Handles agent memory storage and retrieval
"""

from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.services.memory_service import (
    create_memory, get_memories, get_memory_by_id,
    update_memory, delete_memory, delete_agent_memories,
    search_memories
)
from app.services.auth_service import get_current_user, User

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_memory_endpoint(
    agent_id: str,
    content: str,
    context: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new memory entry
    """
    try:
        memory = await create_memory(
            user_id=current_user.id,
            agent_id=agent_id,
            content=content,
            context=context,
            metadata=metadata
        )
        return memory
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create memory: {str(e)}"
        )


@router.get("/")
async def get_memories_endpoint(
    agent_id: Optional[str] = None,
    context: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    """
    Get memories for the current user
    """
    try:
        memories = await get_memories(
            user_id=current_user.id,
            agent_id=agent_id,
            context=context,
            limit=limit,
            offset=offset
        )
        return {"memories": memories, "count": len(memories)}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get memories: {str(e)}"
        )


@router.get("/{memory_id}")
async def get_memory_endpoint(
    memory_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a memory by ID
    """
    memory = await get_memory_by_id(memory_id)
    
    if not memory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found"
        )
    
    # Check if the memory belongs to the current user
    if memory["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this memory"
        )
    
    return memory


@router.put("/{memory_id}")
async def update_memory_endpoint(
    memory_id: str,
    content: Optional[str] = None,
    context: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Update a memory
    """
    # Check if the memory exists and belongs to the current user
    memory = await get_memory_by_id(memory_id)
    
    if not memory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found"
        )
    
    if memory["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this memory"
        )
    
    updated_memory = await update_memory(
        memory_id=memory_id,
        content=content,
        context=context,
        metadata=metadata
    )
    
    if not updated_memory:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update memory"
        )
    
    return updated_memory


@router.delete("/{memory_id}")
async def delete_memory_endpoint(
    memory_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a memory
    """
    # Check if the memory exists and belongs to the current user
    memory = await get_memory_by_id(memory_id)
    
    if not memory:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Memory not found"
        )
    
    if memory["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this memory"
        )
    
    success = await delete_memory(memory_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete memory"
        )
    
    return {"message": "Memory deleted successfully"}


@router.delete("/agent/{agent_id}")
async def delete_agent_memories_endpoint(
    agent_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete all memories for an agent
    """
    success = await delete_agent_memories(current_user.id, agent_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete agent memories"
        )
    
    return {"message": "Agent memories deleted successfully"}


@router.get("/search/")
async def search_memories_endpoint(
    query: str,
    agent_id: Optional[str] = None,
    context: Optional[str] = None,
    limit: int = 10,
    current_user: User = Depends(get_current_user)
):
    """
    Search memories by content
    """
    try:
        memories = await search_memories(
            user_id=current_user.id,
            query=query,
            agent_id=agent_id,
            context=context,
            limit=limit
        )
        return {"memories": memories, "count": len(memories)}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to search memories: {str(e)}"
        )