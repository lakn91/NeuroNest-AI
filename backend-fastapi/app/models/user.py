"""
User models for NeuroNest-AI.
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime

class UserBase(BaseModel):
    """Base user model with common fields."""
    email: EmailStr
    name: Optional[str] = None

class UserCreate(UserBase):
    """User creation model with password."""
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    """User login model."""
    email: EmailStr
    password: str

class User(UserBase):
    """User model returned to clients."""
    id: str
    is_active: bool = True
    
    class Config:
        from_attributes = True

class UserInDB(User):
    """User model with password hash stored in the database."""
    hashed_password: str
    created_at: Optional[Union[str, datetime]] = None
    updated_at: Optional[Union[str, datetime]] = None

class UserUpdate(BaseModel):
    """User update model."""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = None

class UserPasswordChange(BaseModel):
    """User password change model."""
    current_password: str
    new_password: str = Field(..., min_length=6)

class UserPasswordReset(BaseModel):
    """User password reset request model."""
    email: EmailStr

class UserPasswordResetConfirm(BaseModel):
    """User password reset confirmation model."""
    token: str
    new_password: str = Field(..., min_length=6)

class Token(BaseModel):
    """JWT token model."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: User

class TokenPayload(BaseModel):
    """JWT token payload model."""
    sub: str  # User ID
    email: str
    name: Optional[str] = None
    exp: Optional[int] = None  # Expiration time

class UserResponse(BaseModel):
    """User response model for API endpoints."""
    id: str
    email: EmailStr
    name: Optional[str] = None
    is_active: bool = True
    created_at: Optional[Union[str, datetime]] = None
    
    class Config:
        from_attributes = True