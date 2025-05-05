from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query, Body
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel
import logging
import inspect
from app.services.runtime_service import RuntimeService
try:
    from app.services.supabase_runtime_service import SupabaseRuntimeService
except ImportError:
    pass
from app.core.dependencies import get_current_user
from app.api.deps import get_runtime_service
from app.models.execution import RuntimeEnvironment, RuntimeStatus, RuntimeLog
from app.models.user import User

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
async def create_runtime(
    request: RuntimeRequest, 
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    runtime_service = Depends(get_runtime_service)
):
    """
    Create a new runtime environment for a project
    """
    try:
        # Check if the runtime service has the create_runtime method with user_id parameter
        create_runtime_params = inspect.signature(runtime_service.create_runtime).parameters
        has_user_id = 'user_id' in create_runtime_params
        
        if has_user_id:
            # This is the Supabase version
            runtime = await runtime_service.create_runtime(
                project_id=request.project_id,
                language=request.language,
                user_id=current_user.id,
                environment_vars=request.environment_vars or {},
                entry_point=request.entry_point,
                timeout=request.timeout
            )
            
            # Start the runtime in the background
            start_runtime_params = inspect.signature(runtime_service.start_runtime).parameters
            if 'user_id' in start_runtime_params:
                background_tasks.add_task(
                    runtime_service.start_runtime,
                    runtime_id=runtime.id,
                    user_id=current_user.id
                )
            else:
                background_tasks.add_task(
                    runtime_service.start_runtime,
                    runtime_id=runtime.id
                )
        else:
            # This is the standard version
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
async def get_runtime_status(
    runtime_id: str,
    runtime_service: RuntimeService = Depends(get_runtime_service)
):
    """
    Get the status of a runtime environment
    """
    try:
        status = await runtime_service.get_runtime_status(runtime_id)
        return status
    except Exception as e:
        logger.error(f"Error getting runtime status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get runtime status: {str(e)}")

@router.post("/execute", response_model=Dict[str, Any])
async def execute_command(
    request: RuntimeCommandRequest,
    current_user: User = Depends(get_current_user),
    runtime_service = Depends(get_runtime_service)
):
    """
    Execute a command in a runtime environment
    """
    try:
        # Check if the runtime service has the execute_command method with user_id parameter
        execute_command_params = inspect.signature(runtime_service.execute_command).parameters
        has_user_id = 'user_id' in execute_command_params
        
        if has_user_id:
            # This is the Supabase version
            result = await runtime_service.execute_command(
                runtime_id=request.runtime_id,
                user_id=current_user.id,
                command=request.command
            )
        else:
            # This is the standard version
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
    offset: int = Query(0, description="Offset for pagination"),
    runtime_service: RuntimeService = Depends(get_runtime_service)
):
    """
    Get logs from a runtime environment
    """
    try:
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
async def stop_runtime(
    runtime_id: str,
    current_user: User = Depends(get_current_user),
    runtime_service = Depends(get_runtime_service)
):
    """
    Stop a runtime environment
    """
    try:
        # Check if the runtime service has the stop_runtime method with user_id parameter
        stop_runtime_params = inspect.signature(runtime_service.stop_runtime).parameters
        has_user_id = 'user_id' in stop_runtime_params
        
        if has_user_id:
            # This is the Supabase version
            await runtime_service.stop_runtime(runtime_id, current_user.id)
        else:
            # This is the standard version
            await runtime_service.stop_runtime(runtime_id)
            
        return {"status": "stopped", "runtime_id": runtime_id}
    except Exception as e:
        logger.error(f"Error stopping runtime: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to stop runtime: {str(e)}")

@router.post("/restart/{runtime_id}", response_model=RuntimeStatus)
async def restart_runtime(
    runtime_id: str, 
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    runtime_service = Depends(get_runtime_service)
):
    """
    Restart a runtime environment
    """
    try:
        # Check if the runtime service has the stop_runtime method with user_id parameter
        stop_runtime_params = inspect.signature(runtime_service.stop_runtime).parameters
        has_user_id_stop = 'user_id' in stop_runtime_params
        
        # Check if the runtime service has the start_runtime method with user_id parameter
        start_runtime_params = inspect.signature(runtime_service.start_runtime).parameters
        has_user_id_start = 'user_id' in start_runtime_params
        
        if has_user_id_stop:
            # This is the Supabase version
            await runtime_service.stop_runtime(runtime_id, current_user.id)
        else:
            # This is the standard version
            await runtime_service.stop_runtime(runtime_id)
        
        # Start the runtime in the background
        if has_user_id_start:
            background_tasks.add_task(
                runtime_service.start_runtime,
                runtime_id=runtime_id,
                user_id=current_user.id
            )
        else:
            background_tasks.add_task(
                runtime_service.start_runtime,
                runtime_id=runtime_id
            )
        
        return await runtime_service.get_runtime_status(runtime_id)
    except Exception as e:
        logger.error(f"Error restarting runtime: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to restart runtime: {str(e)}")

@router.get("/list", response_model=List[RuntimeEnvironment])
async def list_runtimes(
    project_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    runtime_service = Depends(get_runtime_service)
):
    """
    List all runtime environments, optionally filtered by project_id
    """
    try:
        # Check if the runtime service has the list_runtimes method with user_id parameter
        list_runtimes_params = inspect.signature(runtime_service.list_runtimes).parameters
        has_user_id = 'user_id' in list_runtimes_params
        
        if has_user_id:
            # This is the Supabase version
            runtimes = await runtime_service.list_runtimes(project_id, current_user.id)
        else:
            # This is the standard version
            runtimes = await runtime_service.list_runtimes(project_id)
            
        return runtimes
    except Exception as e:
        logger.error(f"Error listing runtimes: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list runtimes: {str(e)}")

@router.delete("/{runtime_id}")
async def delete_runtime(
    runtime_id: str,
    current_user: User = Depends(get_current_user),
    runtime_service = Depends(get_runtime_service)
):
    """
    Delete a runtime environment
    """
    try:
        # Check if the runtime service has the delete_runtime method with user_id parameter
        delete_runtime_params = inspect.signature(runtime_service.delete_runtime).parameters
        has_user_id = 'user_id' in delete_runtime_params
        
        if has_user_id:
            # This is the Supabase version
            await runtime_service.delete_runtime(runtime_id, current_user.id)
        else:
            # This is the standard version
            await runtime_service.delete_runtime(runtime_id)
            
        return {"status": "deleted", "runtime_id": runtime_id}
    except Exception as e:
        logger.error(f"Error deleting runtime: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete runtime: {str(e)}")