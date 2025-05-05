"""
Authentication module for NeuroNest-AI.

This module provides JWT-based authentication functionality.
"""

import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List, Union

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel, EmailStr

from app.config import settings
from app.core.logger import get_logger
from app.models.user import User, UserInDB, UserCreate

# Setup logging
logger = get_logger(__name__)

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Setup OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Password utilities
def get_password_hash(password: str) -> str:
    """
    Hash a password.
    
    Args:
        password: The plain text password.
    
    Returns:
        The hashed password.
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash.
    
    Args:
        plain_password: The plain text password.
        hashed_password: The hashed password.
    
    Returns:
        True if the password matches the hash, False otherwise.
    """
    return pwd_context.verify(plain_password, hashed_password)

# JWT token functions
def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: The data to encode in the token.
        expires_delta: The expiration time delta.
    
    Returns:
        The encoded JWT token.
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.jwt_secret_key, 
        algorithm=settings.jwt_algorithm
    )
    
    return encoded_jwt

# User management functions
async def get_user_by_email(email: str) -> Optional[UserInDB]:
    """
    Get a user by email.
    
    Args:
        email: The user's email.
    
    Returns:
        The user if found, None otherwise.
    """
    # Try to get user from PostgreSQL if enabled
    if settings.use_postgres:
        try:
            from app.database.postgres_client import postgres_client
            
            user_data = await postgres_client.fetchrow(
                "SELECT * FROM users WHERE email = $1",
                email
            )
            
            if user_data:
                return UserInDB(**user_data)
        except Exception as e:
            logger.error(f"Error getting user from PostgreSQL: {e}")
    
    # Try to get user from SQLite
    try:
        from app.database.sqlite_client import sqlite_client
        
        conn = sqlite_client.get_connection()
        conn.row_factory = lambda cursor, row: {col[0]: row[idx] for idx, col in enumerate(cursor.description)}
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        user_data = cursor.fetchone()
        
        if user_data:
            return UserInDB(**user_data)
    except Exception as e:
        logger.error(f"Error getting user from SQLite: {e}")
    
    return None

async def get_user_by_id(user_id: str) -> Optional[UserInDB]:
    """
    Get a user by ID.
    
    Args:
        user_id: The user's ID.
    
    Returns:
        The user if found, None otherwise.
    """
    # Try to get user from PostgreSQL if enabled
    if settings.use_postgres:
        try:
            from app.database.postgres_client import postgres_client
            
            user_data = await postgres_client.fetchrow(
                "SELECT * FROM users WHERE id = $1",
                user_id
            )
            
            if user_data:
                return UserInDB(**user_data)
        except Exception as e:
            logger.error(f"Error getting user from PostgreSQL: {e}")
    
    # Try to get user from SQLite
    try:
        from app.database.sqlite_client import sqlite_client
        
        conn = sqlite_client.get_connection()
        conn.row_factory = lambda cursor, row: {col[0]: row[idx] for idx, col in enumerate(cursor.description)}
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        user_data = cursor.fetchone()
        
        if user_data:
            return UserInDB(**user_data)
    except Exception as e:
        logger.error(f"Error getting user from SQLite: {e}")
    
    return None

async def create_user(user: UserCreate) -> User:
    """
    Create a new user.
    
    Args:
        user: The user to create.
    
    Returns:
        The created user.
    
    Raises:
        ValueError: If a user with the same email already exists.
    """
    # Check if user already exists
    existing_user = await get_user_by_email(user.email)
    if existing_user:
        raise ValueError("User with this email already exists")
    
    # Create user with hashed password
    user_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    # Create user data
    user_data = {
        "id": user_id,
        "email": user.email,
        "name": user.name,
        "hashed_password": get_password_hash(user.password),
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    
    # Try to insert user into PostgreSQL if enabled
    if settings.use_postgres:
        try:
            from app.database.postgres_client import postgres_client
            
            await postgres_client.insert("users", user_data)
            logger.info(f"User {user_id} created in PostgreSQL")
            
            return User(
                id=user_id,
                email=user.email,
                name=user.name,
                is_active=True
            )
        except Exception as e:
            logger.error(f"Error creating user in PostgreSQL: {e}")
    
    # Try to insert user into SQLite
    try:
        from app.database.sqlite_client import sqlite_client
        
        conn = sqlite_client.get_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT INTO users (id, email, name, hashed_password, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                user_id,
                user.email,
                user.name,
                user_data["hashed_password"],
                user_data["is_active"],
                user_data["created_at"],
                user_data["updated_at"]
            )
        )
        
        conn.commit()
        logger.info(f"User {user_id} created in SQLite")
        
        return User(
            id=user_id,
            email=user.email,
            name=user.name,
            is_active=True
        )
    except Exception as e:
        logger.error(f"Error creating user in SQLite: {e}")
        raise

async def authenticate_user(email: str, password: str) -> Optional[User]:
    """
    Authenticate a user.
    
    Args:
        email: The user's email.
        password: The user's password.
    
    Returns:
        The authenticated user if successful, None otherwise.
    """
    user = await get_user_by_email(email)
    
    if not user:
        return None
    
    if not verify_password(password, user.hashed_password):
        return None
    
    return User(
        id=user.id,
        email=user.email,
        name=user.name,
        is_active=user.is_active
    )

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Get the current user from the JWT token.
    
    Args:
        token: The JWT token.
    
    Returns:
        The current user.
    
    Raises:
        HTTPException: If the token is invalid or the user is not found.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the JWT token
        payload = jwt.decode(
            token, 
            settings.jwt_secret_key, 
            algorithms=[settings.jwt_algorithm]
        )
        
        # Extract user ID from token
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        
        # Extract email from token
        email: str = payload.get("email")
        if email is None:
            raise credentials_exception
        
        # Create a User object
        user = User(
            id=user_id,
            email=email,
            name=payload.get("name", ""),
            is_active=True
        )
        
        return user
    except JWTError as e:
        logger.error(f"JWT error: {e}")
        raise credentials_exception
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        raise credentials_exception

async def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Get the current active user.
    
    Args:
        current_user: The current user.
    
    Returns:
        The current active user.
    
    Raises:
        HTTPException: If the user is inactive.
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    return current_user

def get_optional_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[User]:
    """
    Get the current user if a token is provided, otherwise return None.
    
    Args:
        token: The JWT token.
    
    Returns:
        The current user if a token is provided, None otherwise.
    """
    if token is None:
        return None
    
    try:
        # Decode the JWT token
        payload = jwt.decode(
            token, 
            settings.jwt_secret_key, 
            algorithms=[settings.jwt_algorithm]
        )
        
        # Extract user ID from token
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        
        # Extract email from token
        email: str = payload.get("email")
        if email is None:
            return None
        
        # Create a User object
        user = User(
            id=user_id,
            email=email,
            name=payload.get("name", ""),
            is_active=True
        )
        
        return user
    except:
        return None