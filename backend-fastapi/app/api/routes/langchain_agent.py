"""
LangChain Agent API Routes
"""

import os
from fastapi import APIRouter, HTTPException, Depends, Query, Path
from typing import Dict, List, Any, Optional
from pydantic import BaseModel

# Import services
from app.services.langchain_agent_service import LangChainAgentService

# Create router
router = APIRouter()

# Initialize services
langchain_agent_service = LangChainAgentService(os.environ.get("OPENAI_API_KEY"))

# Define models
class AgentRequest(BaseModel):
    agent_type: str
    github_token: Optional[str] = None

class AgentQueryRequest(BaseModel):
    query: str

# Routes
@router.post("")
async def create_agent(request: AgentRequest):
    """Create a new agent"""
    try:
        agent_id = langchain_agent_service.create_agent(
            request.agent_type,
            "user-123",  # Replace with actual user ID from auth
            request.github_token
        )
        return {"agent_id": agent_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{agent_id}/query")
async def query_agent(agent_id: str, request: AgentQueryRequest):
    """Query an agent"""
    try:
        return await langchain_agent_service.run_agent(agent_id, request.query)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{agent_id}")
async def get_agent_info(agent_id: str):
    """Get agent information"""
    try:
        return langchain_agent_service.get_agent_info(agent_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{agent_id}/memory")
async def get_agent_memory(agent_id: str):
    """Get agent memory (conversation history)"""
    try:
        return langchain_agent_service.get_agent_memory(agent_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{agent_id}/memory")
async def clear_agent_memory(agent_id: str):
    """Clear agent memory"""
    try:
        return langchain_agent_service.clear_agent_memory(agent_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{agent_id}")
async def delete_agent(agent_id: str):
    """Delete an agent"""
    try:
        return langchain_agent_service.delete_agent(agent_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))