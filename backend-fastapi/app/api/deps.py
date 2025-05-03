"""
Dependency injection for FastAPI routes.
"""

from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from datetime import datetime, timedelta
import logging

from app.config import settings
from app.models.user import User, UserInDB
from app.services.orchestration_service import OrchestrationService
from app.services.document_index_service import DocumentIndexService
from app.services.memory_service import MemoryService
from app.services.runtime_service import RuntimeService

logger = logging.getLogger(__name__)

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Cached service instances
_orchestration_service = None
_document_index_service = None
_memory_service = None
_runtime_service = None

def get_orchestration_service() -> OrchestrationService:
    """
    Get the orchestration service instance.
    """
    global _orchestration_service
    if _orchestration_service is None:
        _orchestration_service = OrchestrationService()
    return _orchestration_service

def get_document_index_service() -> DocumentIndexService:
    """
    Get the document index service instance.
    """
    global _document_index_service
    if _document_index_service is None:
        _document_index_service = DocumentIndexService()
    return _document_index_service

def get_memory_service() -> MemoryService:
    """
    Get the memory service instance.
    """
    global _memory_service
    if _memory_service is None:
        _memory_service = MemoryService()
    return _memory_service

def get_runtime_service() -> RuntimeService:
    """
    Get the runtime service instance.
    """
    global _runtime_service
    if _runtime_service is None:
        _runtime_service = RuntimeService()
    return _runtime_service

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Get the current user from the JWT token.
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
            
        # Create a User object
        user = User(
            id=user_id,
            email=payload.get("email", ""),
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
    """
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

def get_optional_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[User]:
    """
    Get the current user if a token is provided, otherwise return None.
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
            
        # Create a User object
        user = User(
            id=user_id,
            email=payload.get("email", ""),
            name=payload.get("name", ""),
            is_active=True
        )
        
        return user
    except:
        return None