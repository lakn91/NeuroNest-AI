from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List, Optional
import logging
from app.core.dependencies import get_current_user
from app.models.execution import ExecutionRequest, ExecutionResponse, RuntimeEnvironment
from app.services.execution_service import execute_code, stop_execution, get_execution_logs, get_runtime_environments

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/environments", response_model=List[RuntimeEnvironment])
async def get_environments():
    """
    Get available runtime environments
    """
    try:
        environments = get_runtime_environments()
        return environments
    except Exception as e:
        logger.error(f"Error getting runtime environments: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get runtime environments"
        )

@router.post("/execute", response_model=ExecutionResponse)
async def execute_project(
    execution_data: ExecutionRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Execute code in a project
    """
    try:
        # Get the project
        from app.services.project_service import get_project
        project = await get_project(execution_data.project_id)
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Check if user owns the project
        if project.user_id != current_user["uid"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to execute this project"
            )
        
        # Execute the code
        response = await execute_code(
            project_id=execution_data.project_id,
            command=execution_data.command,
            timeout=execution_data.timeout or 30
        )
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing code: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute code: {str(e)}"
        )

@router.delete("/containers/{container_id}")
async def stop_container(
    container_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Stop a running container
    """
    try:
        success = await stop_execution(container_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Container not found or already stopped"
            )
        
        return {"message": "Container stopped successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error stopping container: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to stop container"
        )

@router.get("/logs/{container_id}")
async def get_container_logs(
    container_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get logs from a container
    """
    try:
        logs = await get_execution_logs(container_id)
        
        if logs is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Container not found or logs not available"
            )
        
        return {"logs": logs}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting container logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get container logs"
        )