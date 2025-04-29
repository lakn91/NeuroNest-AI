"""
Memory Service
Handles agent memory storage and retrieval
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import json
import uuid

from app.database.supabase_client import get_supabase_client


async def create_memory(
    user_id: str,
    agent_id: str,
    content: str,
    context: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create a new memory entry
    
    Args:
        user_id: User ID
        agent_id: Agent ID
        content: Memory content
        context: Optional context for the memory
        metadata: Optional metadata for the memory
        
    Returns:
        Created memory entry
    """
    supabase = get_supabase_client()
    
    memory_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    memory_data = {
        "id": memory_id,
        "user_id": user_id,
        "agent_id": agent_id,
        "content": content,
        "context": context or "",
        "metadata": json.dumps(metadata) if metadata else "{}",
        "created_at": now,
        "updated_at": now
    }
    
    response = supabase.table("agent_memories").insert(memory_data).execute()
    
    if not response.data or len(response.data) == 0:
        raise Exception("Failed to create memory")
    
    return response.data[0]


async def get_memories(
    user_id: str,
    agent_id: Optional[str] = None,
    context: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """
    Get memories for a user
    
    Args:
        user_id: User ID
        agent_id: Optional agent ID to filter by
        context: Optional context to filter by
        limit: Maximum number of memories to return
        offset: Offset for pagination
        
    Returns:
        List of memory entries
    """
    supabase = get_supabase_client()
    
    query = supabase.table("agent_memories").select("*").eq("user_id", user_id)
    
    if agent_id:
        query = query.eq("agent_id", agent_id)
    
    if context:
        query = query.eq("context", context)
    
    query = query.order("created_at", desc=True).limit(limit).offset(offset)
    
    response = query.execute()
    
    if not response.data:
        return []
    
    # Parse metadata JSON
    for memory in response.data:
        if memory.get("metadata"):
            try:
                memory["metadata"] = json.loads(memory["metadata"])
            except json.JSONDecodeError:
                memory["metadata"] = {}
    
    return response.data


async def get_memory_by_id(memory_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a memory by ID
    
    Args:
        memory_id: Memory ID
        
    Returns:
        Memory entry or None if not found
    """
    supabase = get_supabase_client()
    
    response = supabase.table("agent_memories").select("*").eq("id", memory_id).execute()
    
    if not response.data or len(response.data) == 0:
        return None
    
    memory = response.data[0]
    
    # Parse metadata JSON
    if memory.get("metadata"):
        try:
            memory["metadata"] = json.loads(memory["metadata"])
        except json.JSONDecodeError:
            memory["metadata"] = {}
    
    return memory


async def update_memory(
    memory_id: str,
    content: Optional[str] = None,
    context: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    """
    Update a memory
    
    Args:
        memory_id: Memory ID
        content: Optional new content
        context: Optional new context
        metadata: Optional new metadata
        
    Returns:
        Updated memory entry or None if not found
    """
    supabase = get_supabase_client()
    
    # Get current memory to merge metadata
    current_memory = await get_memory_by_id(memory_id)
    
    if not current_memory:
        return None
    
    update_data = {
        "updated_at": datetime.utcnow().isoformat()
    }
    
    if content is not None:
        update_data["content"] = content
    
    if context is not None:
        update_data["context"] = context
    
    if metadata is not None:
        # Merge with existing metadata
        current_metadata = current_memory.get("metadata", {})
        merged_metadata = {**current_metadata, **metadata}
        update_data["metadata"] = json.dumps(merged_metadata)
    
    response = supabase.table("agent_memories").update(update_data).eq("id", memory_id).execute()
    
    if not response.data or len(response.data) == 0:
        return None
    
    memory = response.data[0]
    
    # Parse metadata JSON
    if memory.get("metadata"):
        try:
            memory["metadata"] = json.loads(memory["metadata"])
        except json.JSONDecodeError:
            memory["metadata"] = {}
    
    return memory


async def delete_memory(memory_id: str) -> bool:
    """
    Delete a memory
    
    Args:
        memory_id: Memory ID
        
    Returns:
        True if deleted, False otherwise
    """
    supabase = get_supabase_client()
    
    response = supabase.table("agent_memories").delete().eq("id", memory_id).execute()
    
    return response.data is not None and len(response.data) > 0


async def delete_agent_memories(user_id: str, agent_id: str) -> bool:
    """
    Delete all memories for an agent
    
    Args:
        user_id: User ID
        agent_id: Agent ID
        
    Returns:
        True if deleted, False otherwise
    """
    supabase = get_supabase_client()
    
    response = supabase.table("agent_memories").delete().eq("user_id", user_id).eq("agent_id", agent_id).execute()
    
    return response.data is not None


async def search_memories(
    user_id: str,
    query: str,
    agent_id: Optional[str] = None,
    context: Optional[str] = None,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Search memories by content
    
    Args:
        user_id: User ID
        query: Search query
        agent_id: Optional agent ID to filter by
        context: Optional context to filter by
        limit: Maximum number of memories to return
        
    Returns:
        List of memory entries
    """
    supabase = get_supabase_client()
    
    # This is a simple implementation using LIKE queries
    # In a production environment, you would use a more sophisticated search mechanism
    search_query = f"%{query}%"
    
    query_builder = supabase.table("agent_memories").select("*").eq("user_id", user_id).like("content", search_query)
    
    if agent_id:
        query_builder = query_builder.eq("agent_id", agent_id)
    
    if context:
        query_builder = query_builder.eq("context", context)
    
    response = query_builder.limit(limit).execute()
    
    if not response.data:
        return []
    
    # Parse metadata JSON
    for memory in response.data:
        if memory.get("metadata"):
            try:
                memory["metadata"] = json.loads(memory["metadata"])
            except json.JSONDecodeError:
                memory["metadata"] = {}
    
    return response.data