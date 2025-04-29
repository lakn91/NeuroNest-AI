"""
Conversation API Routes
Handles conversation storage and retrieval
"""

from typing import Dict, List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, status

from app.services.conversation_service import (
    create_conversation, get_conversations, get_conversation,
    update_conversation, delete_conversation,
    add_message_to_conversation, get_conversation_messages
)
from app.services.auth_service import get_current_user, User

router = APIRouter()


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_conversation_endpoint(
    title: Optional[str] = None,
    context: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Create a new conversation
    """
    try:
        conversation = await create_conversation(
            user_id=current_user.id,
            title=title,
            context=context,
            metadata=metadata
        )
        return conversation
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create conversation: {str(e)}"
        )


@router.get("/")
async def get_conversations_endpoint(
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    """
    Get conversations for the current user
    """
    try:
        conversations = await get_conversations(
            user_id=current_user.id,
            limit=limit,
            offset=offset
        )
        return {"conversations": conversations, "count": len(conversations)}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get conversations: {str(e)}"
        )


@router.get("/{conversation_id}")
async def get_conversation_endpoint(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get a conversation by ID
    """
    conversation = await get_conversation(conversation_id)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Check if the conversation belongs to the current user
    if conversation["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this conversation"
        )
    
    return conversation


@router.put("/{conversation_id}")
async def update_conversation_endpoint(
    conversation_id: str,
    title: Optional[str] = None,
    context: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Update a conversation
    """
    # Check if the conversation exists and belongs to the current user
    conversation = await get_conversation(conversation_id)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    if conversation["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this conversation"
        )
    
    updated_conversation = await update_conversation(
        conversation_id=conversation_id,
        title=title,
        context=context,
        metadata=metadata
    )
    
    if not updated_conversation:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update conversation"
        )
    
    return updated_conversation


@router.delete("/{conversation_id}")
async def delete_conversation_endpoint(
    conversation_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Delete a conversation
    """
    # Check if the conversation exists and belongs to the current user
    conversation = await get_conversation(conversation_id)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    if conversation["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this conversation"
        )
    
    success = await delete_conversation(conversation_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete conversation"
        )
    
    return {"message": "Conversation deleted successfully"}


@router.post("/{conversation_id}/messages")
async def add_message_endpoint(
    conversation_id: str,
    role: str,
    content: str,
    metadata: Optional[Dict[str, Any]] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Add a message to a conversation
    """
    # Check if the conversation exists and belongs to the current user
    conversation = await get_conversation(conversation_id)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    if conversation["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to add messages to this conversation"
        )
    
    try:
        message = await add_message_to_conversation(
            conversation_id=conversation_id,
            role=role,
            content=content,
            metadata=metadata
        )
        return message
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add message: {str(e)}"
        )


@router.get("/{conversation_id}/messages")
async def get_messages_endpoint(
    conversation_id: str,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user)
):
    """
    Get messages for a conversation
    """
    # Check if the conversation exists and belongs to the current user
    conversation = await get_conversation(conversation_id)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    if conversation["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access messages for this conversation"
        )
    
    try:
        messages = await get_conversation_messages(
            conversation_id=conversation_id,
            limit=limit,
            offset=offset
        )
        return {"messages": messages, "count": len(messages)}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get messages: {str(e)}"
        )