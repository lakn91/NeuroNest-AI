"""
API routes for agent interactions.
"""

import logging
from typing import Dict, List, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, Body
from pydantic import BaseModel

from app.core.config import settings
from app.services.base_agent import EventStream, Observation
from app.services.agent_registry import AgentRegistry
from app.models.agent import AgentRequest, AgentResponse, AgentType
from app.api.deps import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)

# Get the agent registry instance
agent_registry = AgentRegistry.get_instance()

class CreateAgentRequest(BaseModel):
    """Request model for creating an agent"""
    agent_type: str
    config: Dict[str, Any]
    api_key: Optional[str] = None

class AgentListResponse(BaseModel):
    """Response model for listing agents"""
    agents: List[Dict[str, Any]]

class AgentTypeListResponse(BaseModel):
    """Response model for listing agent types"""
    agent_types: List[str]

@router.post("/agents", response_model=Dict[str, Any])
async def create_agent(
    request: CreateAgentRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new agent instance
    """
    try:
        # Create event stream
        event_stream = EventStream()
        
        # Use provided API key or default
        api_key = request.api_key
        if not api_key:
            if settings.DEFAULT_AI_PROVIDER == "openai":
                api_key = settings.OPENAI_API_KEY
            elif settings.DEFAULT_AI_PROVIDER == "gemini":
                api_key = settings.GEMINI_API_KEY
            elif settings.DEFAULT_AI_PROVIDER == "anthropic":
                api_key = settings.ANTHROPIC_API_KEY
        
        # Create a simple LLM provider
        llm_provider = {"api_key": api_key, "provider": settings.DEFAULT_AI_PROVIDER}
        
        # Create the agent
        agent = await agent_registry.create_agent(
            request.agent_type,
            request.config,
            event_stream,
            llm_provider
        )
        
        return {
            "id": agent.id,
            "name": agent.name,
            "description": agent.description,
            "agent_type": request.agent_type
        }
    except Exception as e:
        logger.error(f"Error creating agent: {e}")
        raise HTTPException(status_code=500, detail=f"Error creating agent: {str(e)}")

@router.get("/agents", response_model=AgentListResponse)
async def list_agents(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    List all agent instances
    """
    try:
        agents = agent_registry.get_agents()
        
        return {
            "agents": [
                {
                    "id": agent.id,
                    "name": agent.name,
                    "description": agent.description
                }
                for agent in agents
            ]
        }
    except Exception as e:
        logger.error(f"Error listing agents: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing agents: {str(e)}")

@router.get("/agent-types", response_model=AgentTypeListResponse)
async def list_agent_types(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    List all available agent types
    """
    try:
        agent_types = agent_registry.get_agent_types()
        
        return {
            "agent_types": agent_types
        }
    except Exception as e:
        logger.error(f"Error listing agent types: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing agent types: {str(e)}")

@router.get("/agents/{agent_id}", response_model=Dict[str, Any])
async def get_agent(
    agent_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get an agent instance by ID
    """
    try:
        agent = agent_registry.get_agent(agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
        
        return {
            "id": agent.id,
            "name": agent.name,
            "description": agent.description,
            "system_message": agent.get_system_message(),
            "tools": [tool.dict() for tool in agent.get_tools()]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting agent: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting agent: {str(e)}")

@router.delete("/agents/{agent_id}", response_model=Dict[str, str])
async def delete_agent(
    agent_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete an agent instance
    """
    try:
        agent = agent_registry.get_agent(agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
        
        agent_registry.remove_agent(agent_id)
        
        return {
            "message": f"Agent {agent_id} deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting agent: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting agent: {str(e)}")

@router.post("/agents/{agent_id}/process", response_model=Dict[str, Any])
async def process_message(
    agent_id: str,
    request: AgentRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Process a message with an agent
    """
    try:
        agent = agent_registry.get_agent(agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
        
        # Create an observation from the request
        observation = Observation.create_user_message_observation("user", request.message)
        
        # Add context to the observation
        if request.context:
            observation.data["context"] = request.context
        
        # Add files to the observation
        if request.files:
            observation.data["files"] = request.files
            
        # Add user ID to the observation
        if current_user and "id" in current_user:
            observation.data["user_id"] = current_user["id"]
            
        # Add API keys to the observation
        if request.api_keys:
            observation.data["api_keys"] = request.api_keys
        
        # Process the observation
        action = await agent.process(observation)
        
        # Convert the action to a response
        response = agent.action_to_legacy_response(action)
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing message: {str(e)}")

@router.post("/agents/{agent_id}/reset", response_model=Dict[str, str])
async def reset_agent(
    agent_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Reset an agent's state
    """
    try:
        agent = agent_registry.get_agent(agent_id)
        
        if not agent:
            raise HTTPException(status_code=404, detail=f"Agent not found: {agent_id}")
        
        agent.reset()
        
        return {
            "message": f"Agent {agent_id} reset successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting agent: {e}")
        raise HTTPException(status_code=500, detail=f"Error resetting agent: {str(e)}")

@router.post("/orchestrator", response_model=Dict[str, Any])
async def orchestrator_process(
    request: AgentRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Process a message with the orchestrator agent (convenience endpoint)
    """
    try:
        # Create event stream
        event_stream = EventStream()
        
        # Use provided API key or default
        api_key = None
        if request.api_keys and settings.DEFAULT_AI_PROVIDER in request.api_keys:
            api_key = request.api_keys[settings.DEFAULT_AI_PROVIDER]
        elif settings.DEFAULT_AI_PROVIDER == "openai":
            api_key = settings.OPENAI_API_KEY
        elif settings.DEFAULT_AI_PROVIDER == "gemini":
            api_key = settings.GEMINI_API_KEY
        elif settings.DEFAULT_AI_PROVIDER == "anthropic":
            api_key = settings.ANTHROPIC_API_KEY
        
        # Create a simple LLM provider
        llm_provider = {"api_key": api_key, "provider": settings.DEFAULT_AI_PROVIDER}
        
        # Create the orchestrator agent
        agent = await agent_registry.create_agent(
            "orchestrator",
            {
                "id": "orchestrator",
                "name": "OrchestratorAgent",
                "description": "Coordinates other agents and tools to complete tasks"
            },
            event_stream,
            llm_provider
        )
        
        # Create an observation from the request
        observation = Observation.create_user_message_observation("user", request.message)
        
        # Add context to the observation
        if request.context:
            observation.data["context"] = request.context
        
        # Add files to the observation
        if request.files:
            observation.data["files"] = request.files
            
        # Add user ID to the observation
        if current_user and "id" in current_user:
            observation.data["user_id"] = current_user["id"]
            
        # Add API keys to the observation
        if request.api_keys:
            observation.data["api_keys"] = request.api_keys
        
        # Process the observation
        action = await agent.process(observation)
        
        # Convert the action to a response
        response = agent.action_to_legacy_response(action)
        
        # Clean up the agent
        agent_registry.remove_agent(agent.id)
        
        return response
    except Exception as e:
        logger.error(f"Error processing message with orchestrator: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing message: {str(e)}")

@router.post("/thinking", response_model=Dict[str, Any])
async def thinking_process(
    request: AgentRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Process a message with the thinking agent (convenience endpoint)
    """
    try:
        # Create event stream
        event_stream = EventStream()
        
        # Use provided API key or default
        api_key = None
        if request.api_keys and settings.DEFAULT_AI_PROVIDER in request.api_keys:
            api_key = request.api_keys[settings.DEFAULT_AI_PROVIDER]
        elif settings.DEFAULT_AI_PROVIDER == "openai":
            api_key = settings.OPENAI_API_KEY
        elif settings.DEFAULT_AI_PROVIDER == "gemini":
            api_key = settings.GEMINI_API_KEY
        elif settings.DEFAULT_AI_PROVIDER == "anthropic":
            api_key = settings.ANTHROPIC_API_KEY
        
        # Create a simple LLM provider
        llm_provider = {"api_key": api_key, "provider": settings.DEFAULT_AI_PROVIDER}
        
        # Create the thinking agent
        agent = await agent_registry.create_agent(
            "thinking",
            {
                "id": "thinking",
                "name": "ThinkingAgent",
                "description": "Analyzes requests and creates execution plans"
            },
            event_stream,
            llm_provider
        )
        
        # Create an observation from the request
        observation = Observation.create_user_message_observation("user", request.message)
        
        # Add context to the observation
        if request.context:
            observation.data["context"] = request.context
            
        # Add user ID to the observation
        if current_user and "id" in current_user:
            observation.data["user_id"] = current_user["id"]
            
        # Add API keys to the observation
        if request.api_keys:
            observation.data["api_keys"] = request.api_keys
        
        # Process the observation
        action = await agent.process(observation)
        
        # Convert the action to a response
        response = agent.action_to_legacy_response(action)
        
        # Clean up the agent
        agent_registry.remove_agent(agent.id)
        
        return response
    except Exception as e:
        logger.error(f"Error processing message with thinking agent: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing message: {str(e)}")

@router.post("/code", response_model=Dict[str, Any])
async def code_generation_process(
    request: AgentRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Process a message with the code generation agent (convenience endpoint)
    """
    try:
        # Create event stream
        event_stream = EventStream()
        
        # Use provided API key or default
        api_key = None
        if request.api_keys and settings.DEFAULT_AI_PROVIDER in request.api_keys:
            api_key = request.api_keys[settings.DEFAULT_AI_PROVIDER]
        elif settings.DEFAULT_AI_PROVIDER == "openai":
            api_key = settings.OPENAI_API_KEY
        elif settings.DEFAULT_AI_PROVIDER == "gemini":
            api_key = settings.GEMINI_API_KEY
        elif settings.DEFAULT_AI_PROVIDER == "anthropic":
            api_key = settings.ANTHROPIC_API_KEY
        
        # Create a simple LLM provider
        llm_provider = {"api_key": api_key, "provider": settings.DEFAULT_AI_PROVIDER}
        
        # Create the code generation agent
        agent = await agent_registry.create_agent(
            "code_generation",
            {
                "id": "code_generation",
                "name": "CodeGenerationAgent",
                "description": "Generates code based on requirements"
            },
            event_stream,
            llm_provider
        )
        
        # Create an observation from the request
        observation = Observation.create_user_message_observation("user", request.message)
        
        # Add context to the observation
        if request.context:
            observation.data["context"] = request.context
            
        # Add user ID to the observation
        if current_user and "id" in current_user:
            observation.data["user_id"] = current_user["id"]
            
        # Add API keys to the observation
        if request.api_keys:
            observation.data["api_keys"] = request.api_keys
        
        # Process the observation
        action = await agent.process(observation)
        
        # Convert the action to a response
        response = agent.action_to_legacy_response(action)
        
        # Clean up the agent
        agent_registry.remove_agent(agent.id)
        
        return response
    except Exception as e:
        logger.error(f"Error processing message with code generation agent: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing message: {str(e)}")

@router.post("/debug", response_model=Dict[str, Any])
async def debugging_process(
    request: AgentRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Process a message with the debugging agent (convenience endpoint)
    """
    try:
        # Create event stream
        event_stream = EventStream()
        
        # Use provided API key or default
        api_key = None
        if request.api_keys and settings.DEFAULT_AI_PROVIDER in request.api_keys:
            api_key = request.api_keys[settings.DEFAULT_AI_PROVIDER]
        elif settings.DEFAULT_AI_PROVIDER == "openai":
            api_key = settings.OPENAI_API_KEY
        elif settings.DEFAULT_AI_PROVIDER == "gemini":
            api_key = settings.GEMINI_API_KEY
        elif settings.DEFAULT_AI_PROVIDER == "anthropic":
            api_key = settings.ANTHROPIC_API_KEY
        
        # Create a simple LLM provider
        llm_provider = {"api_key": api_key, "provider": settings.DEFAULT_AI_PROVIDER}
        
        # Create the debugging agent
        agent = await agent_registry.create_agent(
            "debugging",
            {
                "id": "debugging",
                "name": "DebuggingAgent",
                "description": "Debugs code and fixes issues"
            },
            event_stream,
            llm_provider
        )
        
        # Create an observation from the request
        observation = Observation.create_user_message_observation("user", request.message)
        
        # Add context to the observation
        if request.context:
            observation.data["context"] = request.context
            
        # Add user ID to the observation
        if current_user and "id" in current_user:
            observation.data["user_id"] = current_user["id"]
            
        # Add API keys to the observation
        if request.api_keys:
            observation.data["api_keys"] = request.api_keys
        
        # Process the observation
        action = await agent.process(observation)
        
        # Convert the action to a response
        response = agent.action_to_legacy_response(action)
        
        # Clean up the agent
        agent_registry.remove_agent(agent.id)
        
        return response
    except Exception as e:
        logger.error(f"Error processing message with debugging agent: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing message: {str(e)}")

@router.post("/project", response_model=Dict[str, Any])
async def project_planning_process(
    request: AgentRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Process a message with the project planning agent (convenience endpoint)
    """
    try:
        # Create event stream
        event_stream = EventStream()
        
        # Use provided API key or default
        api_key = None
        if request.api_keys and settings.DEFAULT_AI_PROVIDER in request.api_keys:
            api_key = request.api_keys[settings.DEFAULT_AI_PROVIDER]
        elif settings.DEFAULT_AI_PROVIDER == "openai":
            api_key = settings.OPENAI_API_KEY
        elif settings.DEFAULT_AI_PROVIDER == "gemini":
            api_key = settings.GEMINI_API_KEY
        elif settings.DEFAULT_AI_PROVIDER == "anthropic":
            api_key = settings.ANTHROPIC_API_KEY
        
        # Create a simple LLM provider
        llm_provider = {"api_key": api_key, "provider": settings.DEFAULT_AI_PROVIDER}
        
        # Create the project planning agent
        agent = await agent_registry.create_agent(
            "project_planning",
            {
                "id": "project_planning",
                "name": "ProjectPlanningAgent",
                "description": "Plans and structures software projects"
            },
            event_stream,
            llm_provider
        )
        
        # Create an observation from the request
        observation = Observation.create_user_message_observation("user", request.message)
        
        # Add context to the observation
        if request.context:
            observation.data["context"] = request.context
            
        # Add user ID to the observation
        if current_user and "id" in current_user:
            observation.data["user_id"] = current_user["id"]
            
        # Add API keys to the observation
        if request.api_keys:
            observation.data["api_keys"] = request.api_keys
        
        # Process the observation
        action = await agent.process(observation)
        
        # Convert the action to a response
        response = agent.action_to_legacy_response(action)
        
        # Clean up the agent
        agent_registry.remove_agent(agent.id)
        
        return response
    except Exception as e:
        logger.error(f"Error processing message with project planning agent: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing message: {str(e)}")