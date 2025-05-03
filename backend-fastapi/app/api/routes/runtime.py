from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Body
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
import logging
from app.services.runtime_service import RuntimeService
from app.api.deps import get_runtime_service, get_current_user
from app.models.execution import RuntimeEnvironment, RuntimeStatus, RuntimeLog

router = APIRouter()
logger = logging.getLogger(__name__)

class RuntimeRequest(BaseModel):
    project_id: str
    language: str
    environment_vars: Optional[Dict[str, str]] = None
    entry_point: Optional[str] = None
    timeout: Optional[int] = 300  # Default timeout in seconds

class RuntimeCommandRequest(BaseModel):
    runtime_id: str
    command: str

@router.post("/create", response_model=RuntimeEnvironment)
async def create_runtime(request: RuntimeRequest, background_tasks: BackgroundTasks):
    """
    Create a new runtime environment for a project
    """
    try:
        runtime_service = RuntimeService()
        runtime = await runtime_service.create_runtime(
            project_id=request.project_id,
            language=request.language,
            environment_vars=request.environment_vars or {},
            entry_point=request.entry_point,
            timeout=request.timeout
        )
        
        # Start the runtime in the background
        background_tasks.add_task(
            runtime_service.start_runtime,
            runtime_id=runtime.id
        )
        
        return runtime
    except Exception as e:
        logger.error(f"Error creating runtime: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create runtime: {str(e)}")

@router.get("/status/{runtime_id}", response_model=RuntimeStatus)
async def get_runtime_status(runtime_id: str):
    """
    Get the status of a runtime environment
    """
    try:
        runtime_service = RuntimeService()
        status = await runtime_service.get_runtime_status(runtime_id)
        return status
    except Exception as e:
        logger.error(f"Error getting runtime status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get runtime status: {str(e)}")

@router.post("/execute", response_model=Dict[str, Any])
async def execute_command(request: RuntimeCommandRequest):
    """
    Execute a command in a runtime environment
    """
    try:
        runtime_service = RuntimeService()
        result = await runtime_service.execute_command(
            runtime_id=request.runtime_id,
            command=request.command
        )
        return {"result": result}
    except Exception as e:
        logger.error(f"Error executing command: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to execute command: {str(e)}")

@router.get("/logs/{runtime_id}", response_model=List[RuntimeLog])
async def get_runtime_logs(
    runtime_id: str, 
    limit: int = Query(100, description="Maximum number of log entries to return"),
    offset: int = Query(0, description="Offset for pagination")
):
    """
    Get logs from a runtime environment
    """
    try:
        runtime_service = RuntimeService()
        logs = await runtime_service.get_runtime_logs(
            runtime_id=runtime_id,
            limit=limit,
            offset=offset
        )
        return logs
    except Exception as e:
        logger.error(f"Error getting runtime logs: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get runtime logs: {str(e)}")

@router.post("/stop/{runtime_id}")
async def stop_runtime(runtime_id: str):
    """
    Stop a runtime environment
    """
    try:
        runtime_service = RuntimeService()
        await runtime_service.stop_runtime(runtime_id)
        return {"status": "stopped", "runtime_id": runtime_id}
    except Exception as e:
        logger.error(f"Error stopping runtime: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to stop runtime: {str(e)}")

@router.post("/restart/{runtime_id}", response_model=RuntimeStatus)
async def restart_runtime(runtime_id: str, background_tasks: BackgroundTasks):
    """
    Restart a runtime environment
    """
    try:
        runtime_service = RuntimeService()
        await runtime_service.stop_runtime(runtime_id)
        
        # Start the runtime in the background
        background_tasks.add_task(
            runtime_service.start_runtime,
            runtime_id=runtime_id
        )
        
        return await runtime_service.get_runtime_status(runtime_id)
    except Exception as e:
        logger.error(f"Error restarting runtime: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to restart runtime: {str(e)}")

@router.get("/list", response_model=List[RuntimeEnvironment])
async def list_runtimes(project_id: Optional[str] = None):
    """
    List all runtime environments, optionally filtered by project_id
    """
    try:
        runtime_service = RuntimeService()
        runtimes = await runtime_service.list_runtimes(project_id)
        return runtimes
    except Exception as e:
        logger.error(f"Error listing runtimes: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list runtimes: {str(e)}")

@router.delete("/{runtime_id}")
async def delete_runtime(runtime_id: str):
    """
    Delete a runtime environment
    """
    try:
        runtime_service = RuntimeService()
        await runtime_service.delete_runtime(runtime_id)
        return {"status": "deleted", "runtime_id": runtime_id}
    except Exception as e:
        logger.error(f"Error deleting runtime: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete runtime: {str(e)}")