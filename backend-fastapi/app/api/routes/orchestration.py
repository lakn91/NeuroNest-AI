from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel
import logging
import inspect
from app.services.orchestration_service import OrchestrationService
try:
    from app.services.supabase_orchestration_service import SupabaseOrchestrationService
except ImportError:
    pass
from app.api.deps import get_orchestration_service, get_current_user
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)

class AgentTask(BaseModel):
    task_type: str
    input_data: Dict[str, Any]
    context: Optional[Dict[str, Any]] = None
    tools: Optional[List[str]] = None
    memory_id: Optional[str] = None

class AgentResponse(BaseModel):
    task_id: str
    status: str
    agent_id: Optional[str] = None

class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    agent_id: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

@router.post("/task", response_model=AgentResponse)
async def create_task(
    task: AgentTask, 
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    orchestration_service = Depends(get_orchestration_service)
):
    """
    Create a new task for the orchestrator to assign to an appropriate agent
    """
    try:
        # Check if the orchestration service has the create_task method with user_id parameter
        create_task_params = inspect.signature(orchestration_service.create_task).parameters
        has_user_id = 'user_id' in create_task_params
        
        if has_user_id:
            # This is the Supabase version
            task_id, agent_id = await orchestration_service.create_task(
                task_type=task.task_type,
                input_data=task.input_data,
                user_id=current_user.id,
                context=task.context,
                tools=task.tools,
                memory_id=task.memory_id
            )
        else:
            # This is the standard version
            task_id, agent_id = await orchestration_service.create_task(
                task_type=task.task_type,
                input_data=task.input_data,
                context=task.context,
                tools=task.tools,
                memory_id=task.memory_id
            )
        
        # Process the task in the background
        background_tasks.add_task(
            orchestration_service.process_task,
            task_id=task_id
        )
        
        return AgentResponse(
            task_id=task_id,
            status="pending",
            agent_id=agent_id
        )
    except Exception as e:
        logger.error(f"Error creating task: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create task: {str(e)}")

@router.get("/task/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(
    task_id: str,
    orchestration_service = Depends(get_orchestration_service)
):
    """
    Get the status of a task
    """
    try:
        task_status = await orchestration_service.get_task_status(task_id)
        return task_status
    except Exception as e:
        logger.error(f"Error getting task status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get task status: {str(e)}")

@router.get("/tasks", response_model=List[TaskStatusResponse])
async def list_tasks(
    status: Optional[str] = None,
    agent_id: Optional[str] = None,
    limit: int = 10,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    orchestration_service = Depends(get_orchestration_service)
):
    """
    List tasks with optional filtering
    """
    try:
        # Check if the orchestration service has the list_tasks method with user_id parameter
        list_tasks_params = inspect.signature(orchestration_service.list_tasks).parameters
        has_user_id = 'user_id' in list_tasks_params
        
        if has_user_id:
            # This is the Supabase version
            tasks = await orchestration_service.list_tasks(
                user_id=current_user.id,
                status=status,
                agent_id=agent_id,
                limit=limit,
                offset=offset
            )
        else:
            # This is the standard version
            tasks = await orchestration_service.list_tasks(
                status=status,
                agent_id=agent_id,
                limit=limit,
                offset=offset
            )
            
        return tasks
    except Exception as e:
        logger.error(f"Error listing tasks: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list tasks: {str(e)}")

@router.post("/task/{task_id}/cancel")
async def cancel_task(
    task_id: str,
    orchestration_service = Depends(get_orchestration_service)
):
    """
    Cancel a running task
    """
    try:
        await orchestration_service.cancel_task(task_id)
        return {"status": "cancelled", "task_id": task_id}
    except Exception as e:
        logger.error(f"Error cancelling task: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to cancel task: {str(e)}")

@router.post("/agent/register", response_model=Dict[str, Any])
async def register_agent(
    agent_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    orchestration_service = Depends(get_orchestration_service)
):
    """
    Register a new agent with the orchestrator
    """
    try:
        # Check if the orchestration service has the register_agent method with user_id parameter
        register_agent_params = inspect.signature(orchestration_service.register_agent).parameters
        has_user_id = 'user_id' in register_agent_params
        
        if has_user_id:
            # This is the Supabase version
            agent_id = await orchestration_service.register_agent(agent_data, current_user.id)
        else:
            # This is the standard version
            agent_id = await orchestration_service.register_agent(agent_data)
            
        return {"agent_id": agent_id, "status": "registered"}
    except Exception as e:
        logger.error(f"Error registering agent: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to register agent: {str(e)}")

@router.get("/agent/{agent_id}", response_model=Dict[str, Any])
async def get_agent_info(
    agent_id: str,
    orchestration_service = Depends(get_orchestration_service)
):
    """
    Get information about a registered agent
    """
    try:
        agent_info = await orchestration_service.get_agent_info(agent_id)
        return agent_info
    except Exception as e:
        logger.error(f"Error getting agent info: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get agent info: {str(e)}")

@router.get("/agents", response_model=List[Dict[str, Any]])
async def list_agents(
    current_user: User = Depends(get_current_user),
    orchestration_service = Depends(get_orchestration_service)
):
    """
    List all registered agents
    """
    try:
        # Check if the orchestration service has the list_agents method with user_id parameter
        list_agents_params = inspect.signature(orchestration_service.list_agents).parameters
        has_user_id = 'user_id' in list_agents_params
        
        if has_user_id:
            # This is the Supabase version
            agents = await orchestration_service.list_agents(current_user.id)
        else:
            # This is the standard version
            agents = await orchestration_service.list_agents()
            
        return agents
    except Exception as e:
        logger.error(f"Error listing agents: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list agents: {str(e)}")

@router.post("/workflow", response_model=Dict[str, Any])
async def create_workflow(
    workflow_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    orchestration_service = Depends(get_orchestration_service)
):
    """
    Create a new workflow for orchestrating multiple agent tasks
    """
    try:
        # Check if the orchestration service has the create_workflow method with user_id parameter
        create_workflow_params = inspect.signature(orchestration_service.create_workflow).parameters
        has_user_id = 'user_id' in create_workflow_params
        
        if has_user_id:
            # This is the Supabase version
            workflow_id = await orchestration_service.create_workflow(workflow_data, current_user.id)
        else:
            # This is the standard version
            workflow_id = await orchestration_service.create_workflow(workflow_data)
            
        return {"workflow_id": workflow_id, "status": "created"}
    except Exception as e:
        logger.error(f"Error creating workflow: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create workflow: {str(e)}")

@router.get("/workflow/{workflow_id}", response_model=Dict[str, Any])
async def get_workflow_status(
    workflow_id: str,
    orchestration_service = Depends(get_orchestration_service)
):
    """
    Get the status of a workflow
    """
    try:
        workflow_status = await orchestration_service.get_workflow_status(workflow_id)
        return workflow_status
    except Exception as e:
        logger.error(f"Error getting workflow status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get workflow status: {str(e)}")

@router.post("/workflow/{workflow_id}/execute", response_model=Dict[str, Any])
async def execute_workflow(
    workflow_id: str, 
    background_tasks: BackgroundTasks,
    orchestration_service = Depends(get_orchestration_service)
):
    """
    Execute a workflow
    """
    try:
        background_tasks.add_task(
            orchestration_service.execute_workflow,
            workflow_id=workflow_id
        )
        return {"workflow_id": workflow_id, "status": "executing"}
    except Exception as e:
        logger.error(f"Error executing workflow: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to execute workflow: {str(e)}")