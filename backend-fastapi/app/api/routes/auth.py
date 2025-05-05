"""
Authentication routes for NeuroNest-AI.
"""

from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.security import OAuth2PasswordRequestForm

from app.core.auth import (
    authenticate_user, create_user, create_access_token, 
    get_current_user, get_current_active_user
)
from app.core.logger import get_logger
from app.models.user import (
    User, UserCreate, UserLogin, UserUpdate, UserPasswordChange, 
    UserPasswordReset, UserPasswordResetConfirm, UserResponse, Token
)
from app.config import settings

router = APIRouter()
logger = get_logger(__name__)

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    """
    Register a new user.
    
    Args:
        user_data: The user data.
    
    Returns:
        A JWT token.
    
    Raises:
        HTTPException: If the user already exists or registration fails.
    """
    try:
        # Create the user
        user = await create_user(user_data)
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.jwt_access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": user.id, "email": user.email, "name": user.name},
            expires_delta=access_token_expires
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.jwt_access_token_expire_minutes * 60,
            user=user
        )
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
    Login a user.
    
    Args:
        user_data: The user login data.
    
    Returns:
        A JWT token.
    
    Raises:
        HTTPException: If the credentials are invalid or login fails.
    """
    try:
        # Authenticate the user
        user = await authenticate_user(user_data.email, user_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.jwt_access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": user.id, "email": user.email, "name": user.name},
            expires_delta=access_token_expires
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.jwt_access_token_expire_minutes * 60,
            user=user
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error logging in user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to login"
        )

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    OAuth2 compatible token login, get an access token for future requests.
    
    Args:
        form_data: The OAuth2 form data.
    
    Returns:
        A JWT token.
    
    Raises:
        HTTPException: If the credentials are invalid or login fails.
    """
    try:
        # Authenticate the user
        user = await authenticate_user(form_data.username, form_data.password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=settings.jwt_access_token_expire_minutes)
        access_token = create_access_token(
            data={"sub": user.id, "email": user.email, "name": user.name},
            expires_delta=access_token_expires
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            expires_in=settings.jwt_access_token_expire_minutes * 60,
            user=user
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting access token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get access token"
        )

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_active_user)):
    """
    Get current user information.
    
    Args:
        current_user: The current user.
    
    Returns:
        The current user information.
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        is_active=current_user.is_active
    )

@router.put("/me", response_model=UserResponse)
async def update_user_info(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """
    Update current user information.
    
    Args:
        user_data: The user data to update.
        current_user: The current user.
    
    Returns:
        The updated user information.
    
    Raises:
        HTTPException: If the update fails.
    """
    try:
        # Update user in PostgreSQL if enabled
        if settings.use_postgres:
            try:
                from app.database.postgres_client import postgres_client
                
                # Build update data
                update_data = {}
                if user_data.name is not None:
                    update_data["name"] = user_data.name
                if user_data.email is not None:
                    update_data["email"] = user_data.email
                if user_data.is_active is not None:
                    update_data["is_active"] = user_data.is_active
                
                if update_data:
                    update_data["updated_at"] = timedelta.utcnow().isoformat()
                    
                    # Update user
                    await postgres_client.update("users", "id", current_user.id, update_data)
                    
                    # Return updated user
                    return UserResponse(
                        id=current_user.id,
                        email=user_data.email or current_user.email,
                        name=user_data.name or current_user.name,
                        is_active=user_data.is_active if user_data.is_active is not None else current_user.is_active
                    )
            except Exception as e:
                logger.error(f"Error updating user in PostgreSQL: {e}")
        
        # Update user in SQLite
        try:
            from app.database.sqlite_client import sqlite_client
            
            conn = sqlite_client.get_connection()
            cursor = conn.cursor()
            
            # Build update query
            update_parts = []
            params = []
            
            if user_data.name is not None:
                update_parts.append("name = ?")
                params.append(user_data.name)
            
            if user_data.email is not None:
                update_parts.append("email = ?")
                params.append(user_data.email)
            
            if user_data.is_active is not None:
                update_parts.append("is_active = ?")
                params.append(user_data.is_active)
            
            if update_parts:
                update_parts.append("updated_at = ?")
                params.append(timedelta.utcnow().isoformat())
                
                # Add user ID to params
                params.append(current_user.id)
                
                # Execute update query
                cursor.execute(
                    f"UPDATE users SET {', '.join(update_parts)} WHERE id = ?",
                    params
                )
                
                conn.commit()
                
                # Return updated user
                return UserResponse(
                    id=current_user.id,
                    email=user_data.email or current_user.email,
                    name=user_data.name or current_user.name,
                    is_active=user_data.is_active if user_data.is_active is not None else current_user.is_active
                )
        except Exception as e:
            logger.error(f"Error updating user in SQLite: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user"
            )
    except Exception as e:
        logger.error(f"Error updating user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user"
        )

@router.put("/change-password")
async def change_user_password(
    password_data: UserPasswordChange,
    current_user: User = Depends(get_current_active_user)
):
    """
    Change user password.
    
    Args:
        password_data: The password change data.
        current_user: The current user.
    
    Returns:
        A success message.
    
    Raises:
        HTTPException: If the current password is invalid or the change fails.
    """
    try:
        # Verify current password
        user = await authenticate_user(current_user.email, password_data.current_password)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid current password"
            )
        
        # Hash new password
        from app.core.auth import get_password_hash
        hashed_password = get_password_hash(password_data.new_password)
        
        # Update password in PostgreSQL if enabled
        if settings.use_postgres:
            try:
                from app.database.postgres_client import postgres_client
                
                # Update password
                await postgres_client.update(
                    "users",
                    "id",
                    current_user.id,
                    {
                        "hashed_password": hashed_password,
                        "updated_at": timedelta.utcnow().isoformat()
                    }
                )
                
                return {"message": "Password changed successfully"}
            except Exception as e:
                logger.error(f"Error changing password in PostgreSQL: {e}")
        
        # Update password in SQLite
        try:
            from app.database.sqlite_client import sqlite_client
            
            conn = sqlite_client.get_connection()
            cursor = conn.cursor()
            
            # Execute update query
            cursor.execute(
                "UPDATE users SET hashed_password = ?, updated_at = ? WHERE id = ?",
                (hashed_password, timedelta.utcnow().isoformat(), current_user.id)
            )
            
            conn.commit()
            
            return {"message": "Password changed successfully"}
        except Exception as e:
            logger.error(f"Error changing password in SQLite: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to change password"
            )
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
    Send password reset email.
    
    Args:
        password_data: The password reset data.
    
    Returns:
        A success message.
    
    Raises:
        HTTPException: If the email sending fails.
    """
    try:
        # Check if user exists
        user = await get_user_by_email(password_data.email)
        
        # For security reasons, we'll always return success, even if the email doesn't exist
        # In a real implementation, you would send a password reset email
        
        return {"message": "If the email exists, a password reset link will be sent."}
    except Exception as e:
        logger.error(f"Error sending password reset email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send password reset email"
        )

@router.post("/reset-password")
async def reset_password(password_data: UserPasswordResetConfirm):
    """
    Reset user password with token.
    
    Args:
        password_data: The password reset confirmation data.
    
    Returns:
        A success message.
    
    Raises:
        HTTPException: If the token is invalid or the reset fails.
    """
    try:
        # Verify token
        try:
            from jose import jwt
            
            payload = jwt.decode(
                password_data.token,
                settings.jwt_secret_key,
                algorithms=[settings.jwt_algorithm]
            )
            
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid token"
                )
            
            # Get user
            user = await get_user_by_id(user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid token"
                )
            
            # Hash new password
            from app.core.auth import get_password_hash
            hashed_password = get_password_hash(password_data.new_password)
            
            # Update password in PostgreSQL if enabled
            if settings.use_postgres:
                try:
                    from app.database.postgres_client import postgres_client
                    
                    # Update password
                    await postgres_client.update(
                        "users",
                        "id",
                        user_id,
                        {
                            "hashed_password": hashed_password,
                            "updated_at": timedelta.utcnow().isoformat()
                        }
                    )
                    
                    return {"message": "Password reset successfully"}
                except Exception as e:
                    logger.error(f"Error resetting password in PostgreSQL: {e}")
            
            # Update password in SQLite
            try:
                from app.database.sqlite_client import sqlite_client
                
                conn = sqlite_client.get_connection()
                cursor = conn.cursor()
                
                # Execute update query
                cursor.execute(
                    "UPDATE users SET hashed_password = ?, updated_at = ? WHERE id = ?",
                    (hashed_password, timedelta.utcnow().isoformat(), user_id)
                )
                
                conn.commit()
                
                return {"message": "Password reset successfully"}
            except Exception as e:
                logger.error(f"Error resetting password in SQLite: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to reset password"
                )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid token"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting password: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset password"
        )

@router.post("/logout")
async def logout(response: Response, current_user: User = Depends(get_current_user)):
    """
    Logout a user.
    
    Args:
        response: The response object.
        current_user: The current user.
    
    Returns:
        A success message.
    
    Raises:
        HTTPException: If the logout fails.
    """
    try:
        # In a stateless JWT authentication system, we can't really "logout" on the server side
        # The client should delete the token
        # For Redis-based token blacklisting, we could add the token to a blacklist
        
        if settings.use_redis:
            try:
                from app.database.redis_client import redis_client
                
                # Add token to blacklist
                # This is a placeholder. In a real implementation, you would get the token from the request
                # and add it to a blacklist with an expiration time matching the token's expiration
                
                return {"message": "Successfully logged out"}
            except Exception as e:
                logger.error(f"Error adding token to blacklist: {e}")
        
        # If Redis is not available, just return success
        return {"message": "Successfully logged out"}
    except Exception as e:
        logger.error(f"Error logging out user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to logout"
        )