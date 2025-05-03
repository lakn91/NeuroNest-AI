import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Union

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import BaseModel, EmailStr
import sqlite3
from pathlib import Path

from app.core.config import settings

# Setup logging
logger = logging.getLogger(__name__)

# Setup OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/token")

# Database setup
DB_PATH = Path("./data/users.db")
DB_PATH.parent.mkdir(exist_ok=True)

# User models
class UserBase(BaseModel):
    email: EmailStr
    display_name: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserInDB(UserBase):
    id: str
    hashed_password: str
    created_at: datetime
    updated_at: datetime

class User(UserBase):
    id: str
    created_at: datetime
    updated_at: datetime

class TokenData(BaseModel):
    sub: str
    exp: datetime

# Initialize database
def init_db():
    """Initialize the SQLite database with required tables"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT,
        hashed_password TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT 1,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
    )
    ''')
    
    # Create user_settings table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS user_settings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        settings TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    
    conn.commit()
    conn.close()
    logger.info("Database initialized successfully")

# Password utilities
def get_password_hash(password: str) -> str:
    """Hash a password for storing"""
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a stored password against a provided password"""
    return get_password_hash(plain_password) == hashed_password

# User management functions
def get_user_by_email(email: str) -> Optional[UserInDB]:
    """Get a user by email"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
    user_data = cursor.fetchone()
    conn.close()
    
    if user_data:
        return UserInDB(**dict(user_data))
    return None

def get_user_by_id(user_id: str) -> Optional[UserInDB]:
    """Get a user by ID"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user_data = cursor.fetchone()
    conn.close()
    
    if user_data:
        return UserInDB(**dict(user_data))
    return None

def create_user(user: UserCreate) -> User:
    """Create a new user"""
    import uuid
    
    # Check if user already exists
    if get_user_by_email(user.email):
        raise ValueError("User with this email already exists")
    
    # Create user with hashed password
    user_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute(
        "INSERT INTO users (id, email, display_name, hashed_password, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        (
            user_id,
            user.email,
            user.display_name,
            get_password_hash(user.password),
            user.is_active,
            now,
            now
        )
    )
    
    conn.commit()
    conn.close()
    
    return User(
        id=user_id,
        email=user.email,
        display_name=user.display_name,
        is_active=user.is_active,
        created_at=now,
        updated_at=now
    )

def authenticate_user(email: str, password: str) -> Optional[User]:
    """Authenticate a user with email and password"""
    user = get_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return User(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at
    )

# JWT token functions
def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a new JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """Get the current user from a JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
        token_data = TokenData(sub=user_id, exp=datetime.fromtimestamp(payload.get("exp")))
    except JWTError:
        raise credentials_exception
    
    user = get_user_by_id(token_data.sub)
    if user is None:
        raise credentials_exception
    
    return User(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        is_active=user.is_active,
        created_at=user.created_at,
        updated_at=user.updated_at
    )

# Initialize database on module import
init_db()