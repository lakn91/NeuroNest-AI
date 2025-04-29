"""
Conversation Service
Handles conversation storage and retrieval
"""

from typing import Dict, List, Optional, Any
from datetime import datetime
import json
import uuid

from app.database.supabase_client import get_supabase_client


async def create_conversation(
    user_id: str,
    title: Optional[str] = None,
    context: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Create a new conversation
    
    Args:
        user_id: User ID
        title: Optional conversation title
        context: Optional conversation context
        metadata: Optional metadata
        
    Returns:
        Created conversation
    """
    supabase = get_supabase_client()
    
    conversation_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    # Generate title if not provided
    if not title:
        title = f"Conversation {now}"
    
    conversation_data = {
        "id": conversation_id,
        "user_id": user_id,
        "title": title,
        "context": context or "",
        "metadata": json.dumps(metadata) if metadata else "{}",
        "created_at": now,
        "updated_at": now
    }
    
    response = supabase.table("conversations").insert(conversation_data).execute()
    
    if not response.data or len(response.data) == 0:
        raise Exception("Failed to create conversation")
    
    conversation = response.data[0]
    
    # Parse metadata JSON
    if conversation.get("metadata"):
        try:
            conversation["metadata"] = json.loads(conversation["metadata"])
        except json.JSONDecodeError:
            conversation["metadata"] = {}
    
    return conversation


async def get_conversations(
    user_id: str,
    limit: int = 100,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """
    Get conversations for a user
    
    Args:
        user_id: User ID
        limit: Maximum number of conversations to return
        offset: Offset for pagination
        
    Returns:
        List of conversations
    """
    supabase = get_supabase_client()
    
    response = supabase.table("conversations").select("*").eq("user_id", user_id).order("updated_at", desc=True).limit(limit).offset(offset).execute()
    
    if not response.data:
        return []
    
    # Parse metadata JSON
    for conversation in response.data:
        if conversation.get("metadata"):
            try:
                conversation["metadata"] = json.loads(conversation["metadata"])
            except json.JSONDecodeError:
                conversation["metadata"] = {}
    
    return response.data


async def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """
    Get a conversation by ID
    
    Args:
        conversation_id: Conversation ID
        
    Returns:
        Conversation or None if not found
    """
    supabase = get_supabase_client()
    
    response = supabase.table("conversations").select("*").eq("id", conversation_id).execute()
    
    if not response.data or len(response.data) == 0:
        return None
    
    conversation = response.data[0]
    
    # Parse metadata JSON
    if conversation.get("metadata"):
        try:
            conversation["metadata"] = json.loads(conversation["metadata"])
        except json.JSONDecodeError:
            conversation["metadata"] = {}
    
    return conversation


async def update_conversation(
    conversation_id: str,
    title: Optional[str] = None,
    context: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[Dict[str, Any]]:
    """
    Update a conversation
    
    Args:
        conversation_id: Conversation ID
        title: Optional new title
        context: Optional new context
        metadata: Optional new metadata
        
    Returns:
        Updated conversation or None if not found
    """
    supabase = get_supabase_client()
    
    # Get current conversation to merge metadata
    current_conversation = await get_conversation(conversation_id)
    
    if not current_conversation:
        return None
    
    update_data = {
        "updated_at": datetime.utcnow().isoformat()
    }
    
    if title is not None:
        update_data["title"] = title
    
    if context is not None:
        update_data["context"] = context
    
    if metadata is not None:
        # Merge with existing metadata
        current_metadata = current_conversation.get("metadata", {})
        merged_metadata = {**current_metadata, **metadata}
        update_data["metadata"] = json.dumps(merged_metadata)
    
    response = supabase.table("conversations").update(update_data).eq("id", conversation_id).execute()
    
    if not response.data or len(response.data) == 0:
        return None
    
    conversation = response.data[0]
    
    # Parse metadata JSON
    if conversation.get("metadata"):
        try:
            conversation["metadata"] = json.loads(conversation["metadata"])
        except json.JSONDecodeError:
            conversation["metadata"] = {}
    
    return conversation


async def delete_conversation(conversation_id: str) -> bool:
    """
    Delete a conversation
    
    Args:
        conversation_id: Conversation ID
        
    Returns:
        True if deleted, False otherwise
    """
    supabase = get_supabase_client()
    
    # First, delete all messages in the conversation
    await delete_conversation_messages(conversation_id)
    
    # Then delete the conversation
    response = supabase.table("conversations").delete().eq("id", conversation_id).execute()
    
    return response.data is not None and len(response.data) > 0


async def add_message_to_conversation(
    conversation_id: str,
    role: str,
    content: str,
    metadata: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Add a message to a conversation
    
    Args:
        conversation_id: Conversation ID
        role: Message role (e.g., "user", "assistant", "system")
        content: Message content
        metadata: Optional message metadata
        
    Returns:
        Created message
    """
    supabase = get_supabase_client()
    
    # Check if conversation exists
    conversation = await get_conversation(conversation_id)
    
    if not conversation:
        raise Exception("Conversation not found")
    
    message_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    message_data = {
        "id": message_id,
        "conversation_id": conversation_id,
        "role": role,
        "content": content,
        "metadata": json.dumps(metadata) if metadata else "{}",
        "created_at": now
    }
    
    response = supabase.table("conversation_messages").insert(message_data).execute()
    
    if not response.data or len(response.data) == 0:
        raise Exception("Failed to add message to conversation")
    
    message = response.data[0]
    
    # Parse metadata JSON
    if message.get("metadata"):
        try:
            message["metadata"] = json.loads(message["metadata"])
        except json.JSONDecodeError:
            message["metadata"] = {}
    
    # Update conversation updated_at
    await update_conversation(conversation_id)
    
    return message


async def get_conversation_messages(
    conversation_id: str,
    limit: int = 100,
    offset: int = 0
) -> List[Dict[str, Any]]:
    """
    Get messages for a conversation
    
    Args:
        conversation_id: Conversation ID
        limit: Maximum number of messages to return
        offset: Offset for pagination
        
    Returns:
        List of messages
    """
    supabase = get_supabase_client()
    
    response = supabase.table("conversation_messages").select("*").eq("conversation_id", conversation_id).order("created_at", desc=False).limit(limit).offset(offset).execute()
    
    if not response.data:
        return []
    
    # Parse metadata JSON
    for message in response.data:
        if message.get("metadata"):
            try:
                message["metadata"] = json.loads(message["metadata"])
            except json.JSONDecodeError:
                message["metadata"] = {}
    
    return response.data


async def delete_conversation_messages(conversation_id: str) -> bool:
    """
    Delete all messages in a conversation
    
    Args:
        conversation_id: Conversation ID
        
    Returns:
        True if deleted, False otherwise
    """
    supabase = get_supabase_client()
    
    response = supabase.table("conversation_messages").delete().eq("conversation_id", conversation_id).execute()
    
    return response.data is not None