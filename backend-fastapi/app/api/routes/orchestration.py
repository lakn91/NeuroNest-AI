from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import Dict, List, Optional, Any
from pydantic import BaseModel
import logging
from app.services.orchestration_service import OrchestrationService
from app.api.deps import get_orchestration_service, get_current_user

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
async def create_task(task: AgentTask, background_tasks: BackgroundTasks):
    """
    Create a new task for the orchestrator to assign to an appropriate agent
    """
    try:
        orchestration_service = OrchestrationService()
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
async def get_task_status(task_id: str):
    """
    Get the status of a task
    """
    try:
        orchestration_service = OrchestrationService()
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
    offset: int = 0
):
    """
    List tasks with optional filtering
    """
    try:
        orchestration_service = OrchestrationService()
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
async def cancel_task(task_id: str):
    """
    Cancel a running task
    """
    try:
        orchestration_service = OrchestrationService()
        await orchestration_service.cancel_task(task_id)
        return {"status": "cancelled", "task_id": task_id}
    except Exception as e:
        logger.error(f"Error cancelling task: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to cancel task: {str(e)}")

@router.post("/agent/register", response_model=Dict[str, Any])
async def register_agent(agent_data: Dict[str, Any]):
    """
    Register a new agent with the orchestrator
    """
    try:
        orchestration_service = OrchestrationService()
        agent_id = await orchestration_service.register_agent(agent_data)
        return {"agent_id": agent_id, "status": "registered"}
    except Exception as e:
        logger.error(f"Error registering agent: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to register agent: {str(e)}")

@router.get("/agent/{agent_id}", response_model=Dict[str, Any])
async def get_agent_info(agent_id: str):
    """
    Get information about a registered agent
    """
    try:
        orchestration_service = OrchestrationService()
        agent_info = await orchestration_service.get_agent_info(agent_id)
        return agent_info
    except Exception as e:
        logger.error(f"Error getting agent info: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get agent info: {str(e)}")

@router.get("/agents", response_model=List[Dict[str, Any]])
async def list_agents():
    """
    List all registered agents
    """
    try:
        orchestration_service = OrchestrationService()
        agents = await orchestration_service.list_agents()
        return agents
    except Exception as e:
        logger.error(f"Error listing agents: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to list agents: {str(e)}")

@router.post("/workflow", response_model=Dict[str, Any])
async def create_workflow(workflow_data: Dict[str, Any]):
    """
    Create a new workflow for orchestrating multiple agent tasks
    """
    try:
        orchestration_service = OrchestrationService()
        workflow_id = await orchestration_service.create_workflow(workflow_data)
        return {"workflow_id": workflow_id, "status": "created"}
    except Exception as e:
        logger.error(f"Error creating workflow: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create workflow: {str(e)}")

@router.get("/workflow/{workflow_id}", response_model=Dict[str, Any])
async def get_workflow_status(workflow_id: str):
    """
    Get the status of a workflow
    """
    try:
        orchestration_service = OrchestrationService()
        workflow_status = await orchestration_service.get_workflow_status(workflow_id)
        return workflow_status
    except Exception as e:
        logger.error(f"Error getting workflow status: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get workflow status: {str(e)}")

@router.post("/workflow/{workflow_id}/execute", response_model=Dict[str, Any])
async def execute_workflow(workflow_id: str, background_tasks: BackgroundTasks):
    """
    Execute a workflow
    """
    try:
        orchestration_service = OrchestrationService()
        background_tasks.add_task(
            orchestration_service.execute_workflow,
            workflow_id=workflow_id
        )
        return {"workflow_id": workflow_id, "status": "executing"}
    except Exception as e:
        logger.error(f"Error executing workflow: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to execute workflow: {str(e)}")