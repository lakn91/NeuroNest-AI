from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
import logging
from app.core.dependencies import get_current_user
from app.models.user import UserCreate, UserLogin, UserUpdate, UserPasswordChange, UserPasswordReset, UserResponse, Token
from app.services.user_service import create_user, authenticate_user, get_user, update_user_profile, change_password, create_token

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """
    Register a new user
    """
    try:
        user = await create_user(user_data)
        token = await create_token(user)
        return token
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error registering user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to register user"
        )

@router.post("/login", response_model=Token)
async def login(user_data: UserLogin):
    """
    Login a user
    """
    try:
        user = await authenticate_user(user_data.email, user_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        token = await create_token(user)
        return token
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging in user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to login"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Get current user information
    """
    try:
        user = await get_user(current_user["uid"])
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting user info: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user information"
        )

@router.put("/profile", response_model=UserResponse)
async def update_profile(
    user_data: UserUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update user profile
    """
    try:
        user = await update_user_profile(
            current_user["uid"],
            display_name=user_data.display_name,
            photo_url=user_data.photo_url
        )
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating user profile: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update profile"
        )

@router.put("/change-password")
async def change_user_password(
    password_data: UserPasswordChange,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Change user password
    """
    try:
        success = await change_password(
            current_user["uid"],
            password_data.current_password,
            password_data.new_password
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid current password"
            )
        
        return {"message": "Password changed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error changing password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to change password"
        )

@router.post("/forgot-password")
async def forgot_password(password_data: UserPasswordReset):
    """
    Send password reset email
    """
    try:
        # This is a placeholder. In a real implementation, you would send a password reset email.
        # For security reasons, we'll always return success, even if the email doesn't exist.
        return {"message": "If the email exists, a password reset link will be sent."}
    except Exception as e:
        logger.error(f"Error sending password reset email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send password reset email"
        )

@router.post("/logout")
async def logout(current_user: Dict[str, Any] = Depends(get_current_user)):
    """
    Logout a user
    """
    try:
        # This is a placeholder. In a real implementation with JWT, you would typically
        # add the token to a blacklist or revoke it in some way.
        return {"message": "Successfully logged out"}
    except Exception as e:
        logger.error(f"Error logging out user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to logout"
        )