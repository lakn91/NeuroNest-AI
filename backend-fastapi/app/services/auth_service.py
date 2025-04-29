"""
Authentication Service
Handles user authentication and management
"""

import os
import time
import jwt
from datetime import datetime, timedelta
from typing import Dict, Optional, Union
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr

from app.database.supabase_client import get_supabase_client
from app.config import settings

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token")

# JWT settings
JWT_SECRET_KEY = settings.jwt_secret_key
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours


class User(BaseModel):
    """User model"""
    id: str
    email: EmailStr
    name: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class UserCreate(BaseModel):
    """User creation model"""
    email: EmailStr
    password: str
    name: str


class UserInDB(User):
    """User model with password hash"""
    password_hash: str


class Token(BaseModel):
    """Token model"""
    access_token: str
    token_type: str
    user: User


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate password hash"""
    return pwd_context.hash(password)


def create_access_token(data: Dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    return encoded_jwt


async def get_user_by_email(email: str) -> Optional[UserInDB]:
    """Get user by email"""
    supabase = get_supabase_client()
    
    response = supabase.table("users").select("*").eq("email", email).execute()
    
    if response.data and len(response.data) > 0:
        user_data = response.data[0]
        return UserInDB(**user_data)
    
    return None


async def authenticate_user(email: str, password: str) -> Optional[User]:
    """Authenticate user"""
    user = await get_user_by_email(email)
    
    if not user:
        return None
    
    if not verify_password(password, user.password_hash):
        return None
    
    # Convert UserInDB to User (remove password_hash)
    return User(
        id=user.id,
        email=user.email,
        name=user.name,
        created_at=user.created_at,
        updated_at=user.updated_at
    )


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Get current user from token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        
        if user_id is None:
            raise credentials_exception
        
    except jwt.PyJWTError:
        raise credentials_exception
    
    # Get user from database
    supabase = get_supabase_client()
    response = supabase.table("users").select("*").eq("id", user_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise credentials_exception
    
    user_data = response.data[0]
    
    # Convert to User model (without password_hash)
    return User(
        id=user_data["id"],
        email=user_data["email"],
        name=user_data["name"],
        created_at=user_data["created_at"],
        updated_at=user_data.get("updated_at")
    )


async def register_user(user_data: UserCreate) -> User:
    """Register a new user"""
    # Check if user already exists
    existing_user = await get_user_by_email(user_data.email)
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password
    password_hash = get_password_hash(user_data.password)
    
    # Create user in database
    supabase = get_supabase_client()
    
    now = datetime.utcnow().isoformat()
    
    new_user = {
        "email": user_data.email,
        "password_hash": password_hash,
        "name": user_data.name,
        "created_at": now,
        "updated_at": now
    }
    
    response = supabase.table("users").insert(new_user).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
    
    created_user = response.data[0]
    
    # Return user without password_hash
    return User(
        id=created_user["id"],
        email=created_user["email"],
        name=created_user["name"],
        created_at=created_user["created_at"],
        updated_at=created_user.get("updated_at")
    )


async def update_user_profile(user_id: str, name: Optional[str] = None) -> User:
    """Update user profile"""
    supabase = get_supabase_client()
    
    update_data = {}
    
    if name:
        update_data["name"] = name
    
    if not update_data:
        # Nothing to update
        response = supabase.table("users").select("*").eq("id", user_id).execute()
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        user_data = response.data[0]
    else:
        # Update user
        update_data["updated_at"] = datetime.utcnow().isoformat()
        
        response = supabase.table("users").update(update_data).eq("id", user_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user_data = response.data[0]
    
    # Return user without password_hash
    return User(
        id=user_data["id"],
        email=user_data["email"],
        name=user_data["name"],
        created_at=user_data["created_at"],
        updated_at=user_data.get("updated_at")
    )


async def change_password(user_id: str, current_password: str, new_password: str) -> bool:
    """Change user password"""
    supabase = get_supabase_client()
    
    # Get user with password hash
    response = supabase.table("users").select("*").eq("id", user_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user_data = response.data[0]
    
    # Verify current password
    if not verify_password(current_password, user_data["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password"
        )
    
    # Hash new password
    password_hash = get_password_hash(new_password)
    
    # Update password
    update_data = {
        "password_hash": password_hash,
        "updated_at": datetime.utcnow().isoformat()
    }
    
    response = supabase.table("users").update(update_data).eq("id", user_id).execute()
    
    if not response.data or len(response.data) == 0:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password"
        )
    
    return True