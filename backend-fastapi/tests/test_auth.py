"""
Tests for authentication system.
"""

import pytest
import asyncio
from datetime import datetime, timedelta
from fastapi import HTTPException
from jose import jwt

from app.core.auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, authenticate_user, create_user
)
from app.models.user import UserCreate, User
from app.config import settings

@pytest.fixture
def test_user_data():
    """Test user data fixture."""
    return UserCreate(
        email="test@example.com",
        name="Test User",
        password="testpassword123"
    )

def test_password_hashing():
    """Test password hashing and verification."""
    password = "testpassword123"
    hashed_password = get_password_hash(password)
    
    # Verify that the hash is different from the original password
    assert hashed_password != password
    
    # Verify that the password can be verified against the hash
    assert verify_password(password, hashed_password)
    
    # Verify that an incorrect password fails verification
    assert not verify_password("wrongpassword", hashed_password)

def test_create_access_token():
    """Test JWT token creation."""
    data = {"sub": "user123", "email": "test@example.com"}
    expires_delta = timedelta(minutes=15)
    
    token = create_access_token(data, expires_delta)
    
    # Verify that the token is a string
    assert isinstance(token, str)
    
    # Decode the token and verify the payload
    payload = jwt.decode(
        token,
        settings.jwt_secret_key,
        algorithms=[settings.jwt_algorithm]
    )
    
    assert payload["sub"] == data["sub"]
    assert payload["email"] == data["email"]
    assert "exp" in payload

@pytest.mark.asyncio
async def test_create_and_authenticate_user(test_user_data):
    """Test user creation and authentication."""
    try:
        # Create a user
        user = await create_user(test_user_data)
        
        # Verify that the user was created with the correct data
        assert user.email == test_user_data.email
        assert user.name == test_user_data.name
        
        # Authenticate the user with correct credentials
        authenticated_user = await authenticate_user(test_user_data.email, test_user_data.password)
        
        # Verify that the user was authenticated
        assert authenticated_user is not None
        assert authenticated_user.email == test_user_data.email
        
        # Authenticate the user with incorrect credentials
        authenticated_user = await authenticate_user(test_user_data.email, "wrongpassword")
        
        # Verify that the user was not authenticated
        assert authenticated_user is None
    except Exception as e:
        pytest.fail(f"Failed to create or authenticate user: {e}")

@pytest.mark.asyncio
async def test_get_current_user():
    """Test getting the current user from a JWT token."""
    # Create a user
    user_id = "user123"
    email = "test@example.com"
    name = "Test User"
    
    # Create a token
    token = create_access_token(
        data={"sub": user_id, "email": email, "name": name}
    )
    
    try:
        # Get the current user from the token
        current_user = await get_current_user(token)
        
        # Verify that the user was retrieved with the correct data
        assert current_user.id == user_id
        assert current_user.email == email
        assert current_user.name == name
    except HTTPException:
        pytest.fail("Failed to get current user from token")
    
    # Test with an invalid token
    invalid_token = "invalid.token.here"
    
    with pytest.raises(HTTPException):
        await get_current_user(invalid_token)
    
    # Test with an expired token
    expired_token = create_access_token(
        data={"sub": user_id, "email": email},
        expires_delta=timedelta(minutes=-1)  # Expired 1 minute ago
    )
    
    with pytest.raises(HTTPException):
        await get_current_user(expired_token)