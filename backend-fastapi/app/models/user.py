from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    
class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    display_name: Optional[str] = None
    
class UserLogin(UserBase):
    password: str
    
class UserUpdate(BaseModel):
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    
class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)
    
class UserPasswordReset(BaseModel):
    email: EmailStr
    
class UserResponse(UserBase):
    uid: str
    display_name: Optional[str] = None
    photo_url: Optional[str] = None
    provider: Optional[str] = None
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True
        
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    
class TokenPayload(BaseModel):
    sub: str
    exp: Optional[int] = None