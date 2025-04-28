from fastapi import Depends, HTTPException, status, Header
from fastapi.security import OAuth2PasswordBearer
from typing import Optional, Dict, Any
import logging
from app.core.config import settings
from app.core.security import verify_token
from app.core.firebase import verify_firebase_token

logger = logging.getLogger(__name__)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    authorization: Optional[str] = Header(None)
) -> Dict[str, Any]:
    """
    Get the current user from the token
    """
    if not token and authorization:
        # Extract token from Authorization header
        auth_parts = authorization.split()
        if len(auth_parts) == 2 and auth_parts[0].lower() == "bearer":
            token = auth_parts[1]
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Try to verify as a Firebase token first
        try:
            payload = verify_firebase_token(token)
            return {
                "uid": payload["uid"],
                "email": payload.get("email", ""),
                "name": payload.get("name", ""),
                "provider": "firebase",
            }
        except Exception as firebase_error:
            logger.debug(f"Not a valid Firebase token: {firebase_error}")
            
            # Try to verify as a JWT token
            try:
                payload = verify_token(token)
                return {
                    "uid": payload["sub"],
                    "email": payload.get("email", ""),
                    "name": payload.get("name", ""),
                    "provider": "jwt",
                }
            except Exception as jwt_error:
                logger.debug(f"Not a valid JWT token: {jwt_error}")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication credentials",
                    headers={"WWW-Authenticate": "Bearer"},
                )
    except Exception as e:
        logger.error(f"Error verifying token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

async def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme),
    authorization: Optional[str] = Header(None)
) -> Optional[Dict[str, Any]]:
    """
    Get the current user from the token, but don't raise an exception if not authenticated
    """
    try:
        return await get_current_user(token, authorization)
    except HTTPException:
        return None

async def get_api_key(
    x_api_key: Optional[str] = Header(None),
    user: Optional[Dict[str, Any]] = Depends(get_optional_user)
) -> Dict[str, str]:
    """
    Get API keys for AI providers
    """
    api_keys = {}
    
    # Get API keys from environment variables
    if settings.GEMINI_API_KEY:
        api_keys["gemini"] = settings.GEMINI_API_KEY
    
    if settings.OPENAI_API_KEY:
        api_keys["openai"] = settings.OPENAI_API_KEY
    
    # Override with user-provided API key if available
    if x_api_key and x_api_provider := Header(None):
        api_keys[x_api_provider.lower()] = x_api_key
    
    # If user is authenticated, check for user-specific API keys
    # This would typically come from a database
    if user:
        # This is a placeholder for user-specific API keys
        # In a real implementation, you would fetch these from a database
        pass
    
    return api_keys