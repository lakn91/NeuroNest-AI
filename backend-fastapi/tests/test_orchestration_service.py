"""
Test Orchestration Service
"""

import pytest
import asyncio
from unittest.mock import MagicMock, patch
from app.services.orchestration_service import OrchestrationService

@pytest.fixture
def orchestration_service():
    """
    Create an orchestration service for testing
    """
    return OrchestrationService()

@pytest.mark.asyncio
async def test_create_task(orchestration_service):
    """
    Test creating a task
    """
    # Mock the database
    orchestration_service.db = MagicMock()
    orchestration_service.db.tasks.insert_one.return_value = MagicMock(inserted_id="test_task_id")
    
    # Create a task
    task_id = await orchestration_service.create_task(
        user_id="test_user",
        task_type="code_analysis",
        task_input={"code": "print('Hello, World!')"},
        project_id="test_project",
        conversation_id="test_conversation"
    )
    
    # Check the result
    assert task_id == "test_task_id"
    
    # Check that the database was called
    orchestration_service.db.tasks.insert_one.assert_called_once()
    args, kwargs = orchestration_service.db.tasks.insert_one.call_args
    assert kwargs["document"]["user_id"] == "test_user"
    assert kwargs["document"]["task_type"] == "code_analysis"
    assert kwargs["document"]["task_input"]["code"] == "print('Hello, World!')"
    assert kwargs["document"]["project_id"] == "test_project"
    assert kwargs["document"]["conversation_id"] == "test_conversation"
    assert kwargs["document"]["status"] == "pending"

@pytest.mark.asyncio
async def test_get_task_status(orchestration_service):
    """
    Test getting task status
    """
    # Mock the database
    orchestration_service.db = MagicMock()
    orchestration_service.db.tasks.find_one.return_value = {
        "_id": "test_task_id",
        "user_id": "test_user",
        "task_type": "code_analysis",
        "task_input": {"code": "print('Hello, World!')"},
        "status": "completed",
        "result": {"analysis": "This is a simple Hello World program."},
        "agent_id": "test_agent"
    }
    
    # Get task status
    task_status = await orchestration_service.get_task_status(
        task_id="test_task_id",
        user_id="test_user"
    )
    
    # Check the result
    assert task_status is not None
    assert task_status["task_id"] == "test_task_id"
    assert task_status["status"] == "completed"
    assert task_status["result"]["analysis"] == "This is a simple Hello World program."
    assert task_status["agent_id"] == "test_agent"
    
    # Check that the database was called
    orchestration_service.db.tasks.find_one.assert_called_once_with(
        {"_id": "test_task_id", "user_id": "test_user"}
    )

@pytest.mark.asyncio
async def test_list_tasks(orchestration_service):
    """
    Test listing tasks
    """
    # Mock the database
    orchestration_service.db = MagicMock()
    orchestration_service.db.tasks.find.return_value = [
        {
            "_id": "test_task_id_1",
            "user_id": "test_user",
            "task_type": "code_analysis",
            "task_input": {"code": "print('Hello, World!')"},
            "status": "completed",
            "result": {"analysis": "This is a simple Hello World program."},
            "agent_id": "test_agent",
            "project_id": "test_project",
            "conversation_id": "test_conversation"
        },
        {
            "_id": "test_task_id_2",
            "user_id": "test_user",
            "task_type": "code_generation",
            "task_input": {"prompt": "Generate a function to calculate factorial"},
            "status": "pending",
            "agent_id": None,
            "project_id": "test_project",
            "conversation_id": "test_conversation"
        }
    ]
    
    # List tasks
    tasks = await orchestration_service.list_tasks(
        user_id="test_user",
        project_id="test_project",
        conversation_id="test_conversation",
        limit=10,
        offset=0
    )
    
    # Check the result
    assert len(tasks) == 2
    assert tasks[0]["task_id"] == "test_task_id_1"
    assert tasks[0]["status"] == "completed"
    assert tasks[1]["task_id"] == "test_task_id_2"
    assert tasks[1]["status"] == "pending"
    
    # Check that the database was called
    orchestration_service.db.tasks.find.assert_called_once()
    args, kwargs = orchestration_service.db.tasks.find.call_args
    assert kwargs["filter"]["user_id"] == "test_user"
    assert kwargs["filter"]["project_id"] == "test_project"
    assert kwargs["filter"]["conversation_id"] == "test_conversation"
    assert kwargs["limit"] == 10
    assert kwargs["skip"] == 0

@pytest.mark.asyncio
async def test_cancel_task(orchestration_service):
    """
    Test cancelling a task
    """
    # Mock the database
    orchestration_service.db = MagicMock()
    orchestration_service.db.tasks.update_one.return_value = MagicMock(modified_count=1)
    
    # Cancel a task
    success = await orchestration_service.cancel_task(
        task_id="test_task_id",
        user_id="test_user"
    )
    
    # Check the result
    assert success is True
    
    # Check that the database was called
    orchestration_service.db.tasks.update_one.assert_called_once_with(
        {"_id": "test_task_id", "user_id": "test_user", "status": {"$in": ["pending", "processing"]}},
        {"$set": {"status": "cancelled"}}
    )

@pytest.mark.asyncio
async def test_assign_task(orchestration_service):
    """
    Test assigning a task to an agent
    """
    # Mock the database
    orchestration_service.db = MagicMock()
    orchestration_service.db.tasks.update_one.return_value = MagicMock(modified_count=1)
    
    # Assign a task
    success = await orchestration_service.assign_task(
        task_id="test_task_id",
        agent_id="test_agent",
        user_id="test_user"
    )
    
    # Check the result
    assert success is True
    
    # Check that the database was called
    orchestration_service.db.tasks.update_one.assert_called_once_with(
        {"_id": "test_task_id", "user_id": "test_user", "status": "pending"},
        {"$set": {"agent_id": "test_agent", "status": "assigned"}}
    )

@pytest.mark.asyncio
async def test_execute_task(orchestration_service):
    """
    Test executing a task
    """
    # Mock the database and agent service
    orchestration_service.db = MagicMock()
    orchestration_service.db.tasks.find_one.return_value = {
        "_id": "test_task_id",
        "user_id": "test_user",
        "task_type": "code_analysis",
        "task_input": {"code": "print('Hello, World!')"},
        "status": "pending",
        "agent_id": None
    }
    orchestration_service.db.tasks.update_one.return_value = MagicMock()
    
    # Mock the agent selection
    orchestration_service._select_agent_for_task = MagicMock(return_value="test_agent")
    
    # Mock the agent execution
    orchestration_service._execute_agent_task = MagicMock(return_value={
        "analysis": "This is a simple Hello World program."
    })
    
    # Execute the task
    with patch("asyncio.sleep", return_value=None):
        await orchestration_service.execute_task("test_task_id")
    
    # Check that the database was called
    orchestration_service.db.tasks.find_one.assert_called_once_with({"_id": "test_task_id"})
    
    # Check that the agent was selected
    orchestration_service._select_agent_for_task.assert_called_once_with("code_analysis")
    
    # Check that the agent executed the task
    orchestration_service._execute_agent_task.assert_called_once()
    args, kwargs = orchestration_service._execute_agent_task.call_args
    assert args[0] == "test_agent"
    assert args[1] == "code_analysis"
    assert args[2]["code"] == "print('Hello, World!')"
    
    # Check that the task was updated
    orchestration_service.db.tasks.update_one.assert_called()
    args, kwargs = orchestration_service.db.tasks.update_one.call_args_list[-1]
    assert args[0]["_id"] == "test_task_id"
    assert kwargs["update"]["$set"]["status"] == "completed"
    assert kwargs["update"]["$set"]["result"]["analysis"] == "This is a simple Hello World program."