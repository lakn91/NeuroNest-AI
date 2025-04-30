"""
Test Supabase Service
"""

import pytest
from unittest.mock import MagicMock, patch
from app.services.supabase_service import create_user_in_supabase, authenticate_with_supabase
from app.services.supabase_service import get_user_from_supabase, update_user_in_supabase
from app.services.supabase_service import verify_supabase_token
from app.models.user import UserCreate, UserUpdate

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
async def test_create_user_in_supabase(mock_supabase_client):
    """
    Test creating a user in Supabase
    """
    # Mock the auth response
    mock_user = MagicMock()
    mock_user.id = "test_user_id"
    mock_user.created_at = "2023-01-01T00:00:00Z"
    
    mock_auth_response = MagicMock()
    mock_auth_response.user = mock_user
    
    mock_supabase_client.auth.sign_up.return_value = mock_auth_response
    
    # Mock the profile response
    mock_profile_response = MagicMock()
    mock_profile_response.data = [{"id": "test_user_id"}]
    
    mock_supabase_client.table.return_value.insert.return_value.execute.return_value = mock_profile_response
    
    # Create a user
    user_data = UserCreate(
        email="test@example.com",
        password="password123",
        display_name="Test User"
    )
    
    result = await create_user_in_supabase(user_data)
    
    # Check the result
    assert result["id"] == "test_user_id"
    assert result["email"] == "test@example.com"
    assert result["display_name"] == "Test User"
    
    # Check that the Supabase client was called
    mock_supabase_client.auth.sign_up.assert_called_once_with({
        "email": "test@example.com",
        "password": "password123",
    })
    
    mock_supabase_client.table.assert_called_once_with("profiles")
    mock_supabase_client.table().insert.assert_called_once()
    args, kwargs = mock_supabase_client.table().insert.call_args
    assert kwargs["data"]["id"] == "test_user_id"
    assert kwargs["data"]["email"] == "test@example.com"
    assert kwargs["data"]["display_name"] == "Test User"

@pytest.mark.asyncio
async def test_authenticate_with_supabase(mock_supabase_client):
    """
    Test authenticating with Supabase
    """
    # Mock the auth response
    mock_user = MagicMock()
    mock_user.id = "test_user_id"
    mock_user.email = "test@example.com"
    
    mock_session = MagicMock()
    mock_session.access_token = "test_access_token"
    mock_session.refresh_token = "test_refresh_token"
    
    mock_auth_response = MagicMock()
    mock_auth_response.user = mock_user
    mock_auth_response.session = mock_session
    
    mock_supabase_client.auth.sign_in_with_password.return_value = mock_auth_response
    
    # Mock the profile response
    mock_profile_response = MagicMock()
    mock_profile_response.data = [{"display_name": "Test User"}]
    
    mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_profile_response
    
    # Authenticate
    result = await authenticate_with_supabase("test@example.com", "password123")
    
    # Check the result
    assert result["id"] == "test_user_id"
    assert result["email"] == "test@example.com"
    assert result["display_name"] == "Test User"
    assert result["access_token"] == "test_access_token"
    assert result["refresh_token"] == "test_refresh_token"
    
    # Check that the Supabase client was called
    mock_supabase_client.auth.sign_in_with_password.assert_called_once_with({
        "email": "test@example.com",
        "password": "password123",
    })
    
    mock_supabase_client.table.assert_called_once_with("profiles")
    mock_supabase_client.table().select.assert_called_once_with("*")
    mock_supabase_client.table().select().eq.assert_called_once_with("id", "test_user_id")

@pytest.mark.asyncio
async def test_get_user_from_supabase(mock_supabase_client):
    """
    Test getting a user from Supabase
    """
    # Mock the profile response
    mock_profile_response = MagicMock()
    mock_profile_response.data = [{
        "id": "test_user_id",
        "email": "test@example.com",
        "display_name": "Test User"
    }]
    
    mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_profile_response
    
    # Get user
    result = await get_user_from_supabase("test_user_id")
    
    # Check the result
    assert result["id"] == "test_user_id"
    assert result["email"] == "test@example.com"
    assert result["display_name"] == "Test User"
    
    # Check that the Supabase client was called
    mock_supabase_client.table.assert_called_once_with("profiles")
    mock_supabase_client.table().select.assert_called_once_with("*")
    mock_supabase_client.table().select().eq.assert_called_once_with("id", "test_user_id")

@pytest.mark.asyncio
async def test_update_user_in_supabase(mock_supabase_client):
    """
    Test updating a user in Supabase
    """
    # Mock the profile response
    mock_profile_response = MagicMock()
    mock_profile_response.data = [{
        "id": "test_user_id",
        "email": "test@example.com",
        "display_name": "Updated User"
    }]
    
    mock_supabase_client.table.return_value.update.return_value.eq.return_value.execute.return_value = mock_profile_response
    
    # Update user
    user_data = UserUpdate(
        display_name="Updated User"
    )
    
    result = await update_user_in_supabase("test_user_id", user_data)
    
    # Check the result
    assert result["id"] == "test_user_id"
    assert result["email"] == "test@example.com"
    assert result["display_name"] == "Updated User"
    
    # Check that the Supabase client was called
    mock_supabase_client.table.assert_called_once_with("profiles")
    mock_supabase_client.table().update.assert_called_once_with({"display_name": "Updated User"})
    mock_supabase_client.table().update().eq.assert_called_once_with("id", "test_user_id")

@pytest.mark.asyncio
async def test_verify_supabase_token(mock_supabase_client):
    """
    Test verifying a Supabase token
    """
    # Mock the user response
    mock_user = MagicMock()
    mock_user.id = "test_user_id"
    mock_user.email = "test@example.com"
    
    mock_supabase_client.auth.get_user.return_value = mock_user
    
    # Mock the profile response
    mock_profile_response = MagicMock()
    mock_profile_response.data = [{
        "display_name": "Test User"
    }]
    
    mock_supabase_client.table.return_value.select.return_value.eq.return_value.execute.return_value = mock_profile_response
    
    # Verify token
    result = await verify_supabase_token("test_token")
    
    # Check the result
    assert result["id"] == "test_user_id"
    assert result["email"] == "test@example.com"
    assert result["display_name"] == "Test User"
    
    # Check that the Supabase client was called
    mock_supabase_client.auth.get_user.assert_called_once_with("test_token")
    
    mock_supabase_client.table.assert_called_once_with("profiles")
    mock_supabase_client.table().select.assert_called_once_with("*")
    mock_supabase_client.table().select().eq.assert_called_once_with("id", "test_user_id")