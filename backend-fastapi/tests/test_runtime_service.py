"""
Test Runtime Service
"""

import pytest
import os
import uuid
from app.services.runtime_service import RuntimeService
from app.models.execution import RuntimeEnvironment, RuntimeStatus

@pytest.fixture
def runtime_service():
    """
    Create a runtime service for testing
    """
    # Create a runtime service
    service = RuntimeService()
    
    yield service
    
    # Clean up any running environments
    for env_id in list(service.environments.keys()):
        service.stop_environment(env_id)

def test_create_environment():
    """
    Test creating a runtime environment
    """
    # Create a runtime service
    service = RuntimeService()
    
    # Create a runtime environment
    env = RuntimeEnvironment(
        id=str(uuid.uuid4()),
        user_id="test_user",
        project_id="test_project",
        language="python",
        status=RuntimeStatus.CREATING
    )
    
    # Create the environment
    result = service.create_environment(env)
    
    # Check the result
    assert result is not None
    assert result.id == env.id
    assert result.user_id == "test_user"
    assert result.project_id == "test_project"
    assert result.language == "python"
    assert result.status == RuntimeStatus.READY
    
    # Clean up
    service.stop_environment(env.id)

def test_get_environment():
    """
    Test getting a runtime environment
    """
    # Create a runtime service
    service = RuntimeService()
    
    # Create a runtime environment
    env = RuntimeEnvironment(
        id=str(uuid.uuid4()),
        user_id="test_user",
        project_id="test_project",
        language="python",
        status=RuntimeStatus.CREATING
    )
    
    # Create the environment
    service.create_environment(env)
    
    # Get the environment
    result = service.get_environment(env.id)
    
    # Check the result
    assert result is not None
    assert result.id == env.id
    assert result.user_id == "test_user"
    assert result.project_id == "test_project"
    assert result.language == "python"
    assert result.status == RuntimeStatus.READY
    
    # Clean up
    service.stop_environment(env.id)

def test_execute_code():
    """
    Test executing code in a runtime environment
    """
    # Create a runtime service
    service = RuntimeService()
    
    # Create a runtime environment
    env = RuntimeEnvironment(
        id=str(uuid.uuid4()),
        user_id="test_user",
        project_id="test_project",
        language="python",
        status=RuntimeStatus.CREATING
    )
    
    # Create the environment
    service.create_environment(env)
    
    # Execute code
    code = "print('Hello, World!')"
    result = service.execute_code(env.id, code)
    
    # Check the result
    assert result is not None
    assert "Hello, World!" in result.output
    assert result.exit_code == 0
    
    # Clean up
    service.stop_environment(env.id)

def test_stop_environment():
    """
    Test stopping a runtime environment
    """
    # Create a runtime service
    service = RuntimeService()
    
    # Create a runtime environment
    env = RuntimeEnvironment(
        id=str(uuid.uuid4()),
        user_id="test_user",
        project_id="test_project",
        language="python",
        status=RuntimeStatus.CREATING
    )
    
    # Create the environment
    service.create_environment(env)
    
    # Stop the environment
    service.stop_environment(env.id)
    
    # Try to get the environment
    result = service.get_environment(env.id)
    
    # Check the result
    assert result is None