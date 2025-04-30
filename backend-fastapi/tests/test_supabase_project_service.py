"""
Test Supabase Project Service
"""

import pytest
from unittest.mock import MagicMock, patch
from app.services.supabase_project_service import create_project_in_supabase, get_project_from_supabase
from app.services.supabase_project_service import get_projects_from_supabase, update_project_in_supabase
from app.services.supabase_project_service import delete_project_from_supabase, add_file_to_project_in_supabase
from app.services.supabase_project_service import update_file_in_project_in_supabase, delete_file_from_project_in_supabase
from app.models.project import ProjectCreate, ProjectUpdate

@pytest.fixture
def mock_supabase_client():
    """
    Create a mock Supabase client
    """
    with patch("app.database.supabase_client.get_supabase_client") as mock_get_client:
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        yield mock_client

@pytest.mark.asyncio
async def test_create_project_in_supabase(mock_supabase_client):
    """
    Test creating a project in Supabase
    """
    # Mock the project response
    mock_project_response = MagicMock()
    mock_project_response.data = [{
        "id": "test_project_id",
        "user_id": "test_user_id",
        "name": "Test Project",
        "description": "Test project description",
        "language": "python",
        "framework": "fastapi",
        "is_public": True,
        "tags": ["test", "api"]
    }]
    
    mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_project_response
    
    # Create a project
    project_data = ProjectCreate(
        name="Test Project",
        description="Test project description",
        language="python",
        framework="fastapi",
        is_public=True,
        tags=["test", "api"]
    )
    
    result = await create_project_in_supabase("test_user_id", project_data)
    
    # Check the result
    assert result is not None
    
    # Check that the Supabase client was called
    mock_supabase_client.table.assert_called_once_with("projects")
    mock_supabase_client.table().insert.assert_called_once()
    args, kwargs = mock_supabase_client.table().insert.call_args
    assert kwargs["data"]["user_id"] == "test_user_id"
    assert kwargs["data"]["name"] == "Test Project"
    assert kwargs["data"]["description"] == "Test project description"
    assert kwargs["data"]["language"] == "python"
    assert kwargs["data"]["framework"] == "fastapi"
    assert kwargs["data"]["is_public"] is True
    assert kwargs["data"]["tags"] == ["test", "api"]

@pytest.mark.asyncio
async def test_get_project_from_supabase(mock_supabase_client):
    """
    Test getting a project from Supabase
    """
    # Mock the project response
    mock_project_response = MagicMock()
    mock_project_response.data = [{
        "id": "test_project_id",
        "user_id": "test_user_id",
        "name": "Test Project",
        "description": "Test project description",
        "language": "python",
        "framework": "fastapi",
        "is_public": True,
        "tags": ["test", "api"],
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-01T00:00:00Z"
    }]
    
    mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_project_response
    
    # Mock the files response
    mock_files_response = MagicMock()
    mock_files_response.data = [
        {
            "id": "test_file_id_1",
            "name": "main.py",
            "path": "/main.py",
            "content": "print('Hello, World!')",
            "language": "python"
        },
        {
            "id": "test_file_id_2",
            "name": "README.md",
            "path": "/README.md",
            "content": "# Test Project",
            "language": "markdown"
        }
    ]
    
    mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.side_effect = [
        mock_project_response,
        mock_files_response
    ]
    
    # Get project
    result = await get_project_from_supabase("test_project_id", "test_user_id")
    
    # Check the result
    assert result["id"] == "test_project_id"
    assert result["user_id"] == "test_user_id"
    assert result["name"] == "Test Project"
    assert result["description"] == "Test project description"
    assert result["language"] == "python"
    assert result["framework"] == "fastapi"
    assert result["is_public"] is True
    assert result["tags"] == ["test", "api"]
    assert len(result["files"]) == 2
    assert result["files"][0]["name"] == "main.py"
    assert result["files"][1]["name"] == "README.md"
    
    # Check that the Supabase client was called
    assert mock_supabase_client.table.call_count == 2
    mock_supabase_client.table.assert_any_call("projects")
    mock_supabase_client.table.assert_any_call("project_files")

@pytest.mark.asyncio
async def test_get_projects_from_supabase(mock_supabase_client):
    """
    Test getting projects from Supabase
    """
    # Mock the projects response
    mock_projects_response = MagicMock()
    mock_projects_response.data = [
        {
            "id": "test_project_id_1",
            "user_id": "test_user_id",
            "name": "Test Project 1",
            "description": "Test project 1 description",
            "language": "python",
            "framework": "fastapi",
            "is_public": True,
            "tags": ["test", "api"],
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z"
        },
        {
            "id": "test_project_id_2",
            "user_id": "test_user_id",
            "name": "Test Project 2",
            "description": "Test project 2 description",
            "language": "javascript",
            "framework": "react",
            "is_public": False,
            "tags": ["test", "frontend"],
            "created_at": "2023-01-02T00:00:00Z",
            "updated_at": "2023-01-02T00:00:00Z"
        }
    ]
    
    mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_projects_response
    
    # Get projects
    result = await get_projects_from_supabase("test_user_id")
    
    # Check the result
    assert len(result) == 2
    assert result[0]["id"] == "test_project_id_1"
    assert result[0]["name"] == "Test Project 1"
    assert result[1]["id"] == "test_project_id_2"
    assert result[1]["name"] == "Test Project 2"
    
    # Check that the Supabase client was called
    mock_supabase_client.table.assert_called_once_with("projects")
    mock_supabase_client.table().select.assert_called_once_with("*")
    mock_supabase_client.table().select().eq.assert_called_once_with("user_id", "test_user_id")

@pytest.mark.asyncio
async def test_update_project_in_supabase(mock_supabase_client):
    """
    Test updating a project in Supabase
    """
    # Mock the project check response
    mock_project_check_response = MagicMock()
    mock_project_check_response.data = [{"id": "test_project_id"}]
    
    # Mock the project update response
    mock_project_update_response = MagicMock()
    mock_project_update_response.data = [{
        "id": "test_project_id",
        "user_id": "test_user_id",
        "name": "Updated Project",
        "description": "Updated project description",
        "language": "python",
        "framework": "fastapi",
        "is_public": True,
        "tags": ["test", "api", "updated"],
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-02T00:00:00Z"
    }]
    
    # Mock the get project response
    mock_get_project_response = {
        "id": "test_project_id",
        "user_id": "test_user_id",
        "name": "Updated Project",
        "description": "Updated project description",
        "language": "python",
        "framework": "fastapi",
        "is_public": True,
        "tags": ["test", "api", "updated"],
        "created_at": "2023-01-01T00:00:00Z",
        "updated_at": "2023-01-02T00:00:00Z",
        "files": []
    }
    
    mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_project_check_response
    mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_project_update_response
    
    # Mock the get_project_from_supabase function
    with patch("app.services.supabase_project_service.get_project_from_supabase") as mock_get_project:
        mock_get_project.return_value = mock_get_project_response
        
        # Update project
        project_data = ProjectUpdate(
            name="Updated Project",
            description="Updated project description",
            tags=["test", "api", "updated"]
        )
        
        result = await update_project_in_supabase("test_project_id", "test_user_id", project_data)
        
        # Check the result
        assert result["id"] == "test_project_id"
        assert result["name"] == "Updated Project"
        assert result["description"] == "Updated project description"
        assert result["tags"] == ["test", "api", "updated"]
        
        # Check that the Supabase client was called
        mock_supabase_client.table.assert_called_with("projects")
        mock_supabase_client.table().select.assert_called_with("id")
        mock_supabase_client.table().select().eq.assert_any_call("id", "test_project_id")
        mock_supabase_client.table().select().eq().eq.assert_called_with("user_id", "test_user_id")
        
        mock_supabase_client.table().update.assert_called_once()
        args, kwargs = mock_supabase_client.table().update.call_args
        assert kwargs["data"]["name"] == "Updated Project"
        assert kwargs["data"]["description"] == "Updated project description"
        assert kwargs["data"]["tags"] == ["test", "api", "updated"]
        
        mock_get_project.assert_called_once_with("test_project_id", "test_user_id")

@pytest.mark.asyncio
async def test_delete_project_from_supabase(mock_supabase_client):
    """
    Test deleting a project from Supabase
    """
    # Mock the project check response
    mock_project_check_response = MagicMock()
    mock_project_check_response.data = [{"id": "test_project_id"}]
    
    mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_project_check_response
    mock_supabase_client.table.return_value.delete.return_value.eq.return_value.execute.return_value = MagicMock()
    
    # Delete project
    result = await delete_project_from_supabase("test_project_id", "test_user_id")
    
    # Check the result
    assert result is True
    
    # Check that the Supabase client was called
    mock_supabase_client.table.assert_called_with("projects")
    mock_supabase_client.table().select.assert_called_with("id")
    mock_supabase_client.table().select().eq.assert_any_call("id", "test_project_id")
    mock_supabase_client.table().select().eq().eq.assert_called_with("user_id", "test_user_id")
    
    # Check that the files were deleted first
    mock_supabase_client.table.assert_any_call("project_files")
    mock_supabase_client.table().delete.assert_any_call()
    mock_supabase_client.table().delete().eq.assert_any_call("project_id", "test_project_id")
    
    # Check that the project was deleted
    mock_supabase_client.table.assert_any_call("projects")
    mock_supabase_client.table().delete.assert_any_call()
    mock_supabase_client.table().delete().eq.assert_any_call("id", "test_project_id")