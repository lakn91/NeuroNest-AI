from fastapi import APIRouter, Depends, HTTPException, Header, UploadFile, File, Form
from typing import List, Optional, Dict, Any
import logging
from app.core.dependencies import get_current_user, get_api_key
from app.models.agent import AgentRequest, AgentResponse, AgentListResponse, ProviderListResponse
from app.services.agent_service import process_message, get_available_agents, get_available_providers, generate_code
from app.services.file_service import save_upload_file

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/", response_model=AgentListResponse)
async def get_agents():
    """
    Get information about available agents
    """
    try:
        agents = get_available_agents()
        return AgentListResponse(agents=agents)
    except Exception as e:
        logger.error(f"Error getting agents: {e}")
        raise HTTPException(status_code=500, detail="Failed to get agents")

@router.get("/providers", response_model=ProviderListResponse)
async def get_providers():
    """
    Get supported AI providers
    """
    try:
        providers = get_available_providers()
        return ProviderListResponse(providers=providers)
    except Exception as e:
        logger.error(f"Error getting providers: {e}")
        raise HTTPException(status_code=500, detail="Failed to get providers")

@router.post("/process", response_model=AgentResponse)
async def process_agent_message(
    request: AgentRequest,
    user: Optional[Dict[str, Any]] = Depends(get_current_user),
    api_keys: Dict[str, str] = Depends(get_api_key)
):
    """
    Process a message through the agent system
    """
    try:
        response = await process_message(
            request=request,
            api_keys=api_keys,
            user_id=user["uid"] if user else None
        )
        return response
    except Exception as e:
        logger.error(f"Error processing message: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process message: {str(e)}")

@router.post("/generate-code")
async def generate_code_endpoint(
    requirements: str = Form(...),
    language: str = Form("javascript"),
    framework: Optional[str] = Form(None),
    user: Optional[Dict[str, Any]] = Depends(get_current_user),
    api_keys: Dict[str, str] = Depends(get_api_key)
):
    """
    Generate code based on requirements
    """
    try:
        response = await generate_code(
            requirements=requirements,
            language=language,
            framework=framework,
            api_keys=api_keys,
            user_id=user["uid"] if user else None
        )
        return response
    except Exception as e:
        logger.error(f"Error generating code: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate code: {str(e)}")

@router.post("/upload")
async def upload_file_for_agent(
    file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Upload a file to be processed by an agent
    """
    try:
        file_info = await save_upload_file(file, user["uid"])
        return {
            "file_id": file_info.id,
            "filename": file_info.original_filename,
            "content_type": file_info.content_type,
            "size": file_info.size,
            "url": file_info.url
        }
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")