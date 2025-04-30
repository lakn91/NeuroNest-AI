"""
Supabase Service - Provides integration with Supabase for authentication and data storage
"""

import logging
from typing import Dict, List, Any, Optional
from app.database.supabase_client import get_supabase_client
from app.models.user import UserCreate, UserResponse, UserUpdate, Token
from app.core.security import create_access_token, get_password_hash

logger = logging.getLogger(__name__)

async def create_user_in_supabase(user_data: UserCreate) -> Dict[str, Any]:
    """
    Create a new user in Supabase
    
    Args:
        user_data: User data
        
    Returns:
        User data from Supabase
    """
    try:
        supabase = get_supabase_client()
        
        # Register user with Supabase auth
        auth_response = supabase.auth.sign_up({
            "email": user_data.email,
            "password": user_data.password,
        })
        
        # Get user ID
        user_id = auth_response.user.id
        
        # Store additional user data in profiles table
        profile_data = {
            "id": user_id,
            "email": user_data.email,
            "display_name": user_data.display_name,
            "created_at": auth_response.user.created_at,
        }
        
        # Insert profile data
        profile_response = supabase.table("profiles").insert(profile_data).execute()
        
        return {
            "id": user_id,
            "email": user_data.email,
            "display_name": user_data.display_name,
        }
    except Exception as e:
        logger.error(f"Error creating user in Supabase: {e}")
        raise ValueError(f"Failed to create user in Supabase: {str(e)}")

async def authenticate_with_supabase(email: str, password: str) -> Dict[str, Any]:
    """
    Authenticate user with Supabase
    
    Args:
        email: User email
        password: User password
        
    Returns:
        User data from Supabase
    """
    try:
        supabase = get_supabase_client()
        
        # Sign in with Supabase auth
        auth_response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password,
        })
        
        # Get user data
        user = auth_response.user
        
        # Get profile data
        profile_response = supabase.table("profiles").select("*").eq("id", user.id).execute()
        
        if len(profile_response.data) == 0:
            raise ValueError("User profile not found")
        
        profile = profile_response.data[0]
        
        return {
            "id": user.id,
            "email": user.email,
            "display_name": profile.get("display_name", ""),
            "access_token": auth_response.session.access_token,
            "refresh_token": auth_response.session.refresh_token,
        }
    except Exception as e:
        logger.error(f"Error authenticating with Supabase: {e}")
        raise ValueError(f"Failed to authenticate with Supabase: {str(e)}")

async def get_user_from_supabase(user_id: str) -> Dict[str, Any]:
    """
    Get user data from Supabase
    
    Args:
        user_id: User ID
        
    Returns:
        User data from Supabase
    """
    try:
        supabase = get_supabase_client()
        
        # Get profile data
        profile_response = supabase.table("profiles").select("*").eq("id", user_id).execute()
        
        if len(profile_response.data) == 0:
            raise ValueError("User profile not found")
        
        profile = profile_response.data[0]
        
        return {
            "id": profile.get("id"),
            "email": profile.get("email"),
            "display_name": profile.get("display_name", ""),
        }
    except Exception as e:
        logger.error(f"Error getting user from Supabase: {e}")
        raise ValueError(f"Failed to get user from Supabase: {str(e)}")

async def update_user_in_supabase(user_id: str, user_data: UserUpdate) -> Dict[str, Any]:
    """
    Update user data in Supabase
    
    Args:
        user_id: User ID
        user_data: User data to update
        
    Returns:
        Updated user data from Supabase
    """
    try:
        supabase = get_supabase_client()
        
        # Update profile data
        update_data = {}
        if user_data.display_name:
            update_data["display_name"] = user_data.display_name
            
        # Only update if there's data to update
        if update_data:
            profile_response = supabase.table("profiles").update(update_data).eq("id", user_id).execute()
            
            if len(profile_response.data) == 0:
                raise ValueError("User profile not found")
            
            profile = profile_response.data[0]
            
            return {
                "id": profile.get("id"),
                "email": profile.get("email"),
                "display_name": profile.get("display_name", ""),
            }
        else:
            # No data to update, just return current user data
            return await get_user_from_supabase(user_id)
    except Exception as e:
        logger.error(f"Error updating user in Supabase: {e}")
        raise ValueError(f"Failed to update user in Supabase: {str(e)}")

async def verify_supabase_token(token: str) -> Dict[str, Any]:
    """
    Verify Supabase token and get user data
    
    Args:
        token: Supabase token
        
    Returns:
        User data from Supabase
    """
    try:
        supabase = get_supabase_client()
        
        # Verify token
        user = supabase.auth.get_user(token)
        
        if not user:
            raise ValueError("Invalid token")
        
        # Get profile data
        profile_response = supabase.table("profiles").select("*").eq("id", user.id).execute()
        
        if len(profile_response.data) == 0:
            raise ValueError("User profile not found")
        
        profile = profile_response.data[0]
        
        return {
            "id": user.id,
            "email": user.email,
            "display_name": profile.get("display_name", ""),
        }
    except Exception as e:
        logger.error(f"Error verifying Supabase token: {e}")
        raise ValueError(f"Failed to verify Supabase token: {str(e)}")