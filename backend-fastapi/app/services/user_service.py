import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from app.core.config import settings
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import UserCreate, UserResponse, Token
from app.core.firebase import create_user as firebase_create_user, get_user_by_email, update_user

logger = logging.getLogger(__name__)

# This is a simple in-memory user store for demonstration purposes
# In a real implementation, you would use a database
users_db = {}

async def create_user(user_data: UserCreate) -> UserResponse:
    """
    Create a new user
    """
    try:
        # Check if Firebase is available
        if settings.FIREBASE_CREDENTIALS:
            # Create user in Firebase
            firebase_user = firebase_create_user(
                email=user_data.email,
                password=user_data.password,
                display_name=user_data.display_name
            )
            
            # Create user response
            return UserResponse(
                uid=firebase_user["uid"],
                email=firebase_user["email"],
                display_name=firebase_user.get("displayName"),
                photo_url=firebase_user.get("photoURL"),
                provider="firebase",
                created_at=datetime.utcnow()
            )
        else:
            # Create user locally
            # Check if user already exists
            for uid, user in users_db.items():
                if user["email"] == user_data.email:
                    raise ValueError("Email already in use")
            
            # Generate a unique ID
            import uuid
            uid = str(uuid.uuid4())
            
            # Hash the password
            hashed_password = get_password_hash(user_data.password)
            
            # Create user
            users_db[uid] = {
                "uid": uid,
                "email": user_data.email,
                "hashed_password": hashed_password,
                "display_name": user_data.display_name or user_data.email.split('@')[0],
                "photo_url": None,
                "provider": "local",
                "created_at": datetime.utcnow()
            }
            
            # Create user response
            return UserResponse(
                uid=uid,
                email=user_data.email,
                display_name=users_db[uid]["display_name"],
                photo_url=None,
                provider="local",
                created_at=users_db[uid]["created_at"]
            )
    except Exception as e:
        logger.error(f"Error creating user: {e}")
        raise

async def authenticate_user(email: str, password: str) -> Optional[UserResponse]:
    """
    Authenticate a user
    """
    try:
        # Check if Firebase is available
        if settings.FIREBASE_CREDENTIALS:
            # This is a placeholder. In a real implementation, you would use Firebase Admin SDK
            # to verify the user's credentials. However, Firebase Admin SDK doesn't provide
            # a way to authenticate with email and password directly. Instead, you would
            # typically use Firebase Authentication on the client side and then verify
            # the token on the server side.
            
            # For demonstration purposes, we'll just check if the user exists
            try:
                firebase_user = get_user_by_email(email)
                
                # Create user response
                return UserResponse(
                    uid=firebase_user["uid"],
                    email=firebase_user["email"],
                    display_name=firebase_user.get("displayName"),
                    photo_url=firebase_user.get("photoURL"),
                    provider="firebase",
                    created_at=datetime.utcnow()
                )
            except Exception as e:
                logger.error(f"Error authenticating user with Firebase: {e}")
                return None
        else:
            # Authenticate user locally
            for uid, user in users_db.items():
                if user["email"] == email:
                    if verify_password(password, user["hashed_password"]):
                        # Create user response
                        return UserResponse(
                            uid=uid,
                            email=user["email"],
                            display_name=user["display_name"],
                            photo_url=user["photo_url"],
                            provider="local",
                            created_at=user["created_at"]
                        )
            
            return None
    except Exception as e:
        logger.error(f"Error authenticating user: {e}")
        return None

async def get_user(uid: str) -> Optional[UserResponse]:
    """
    Get a user by ID
    """
    try:
        # Check if Firebase is available
        if settings.FIREBASE_CREDENTIALS:
            # Get user from Firebase
            try:
                from app.core.firebase import get_user_by_uid
                firebase_user = get_user_by_uid(uid)
                
                # Create user response
                return UserResponse(
                    uid=firebase_user["uid"],
                    email=firebase_user["email"],
                    display_name=firebase_user.get("displayName"),
                    photo_url=firebase_user.get("photoURL"),
                    provider="firebase",
                    created_at=datetime.utcnow()
                )
            except Exception as e:
                logger.error(f"Error getting user from Firebase: {e}")
                return None
        else:
            # Get user locally
            if uid in users_db:
                user = users_db[uid]
                
                # Create user response
                return UserResponse(
                    uid=uid,
                    email=user["email"],
                    display_name=user["display_name"],
                    photo_url=user["photo_url"],
                    provider="local",
                    created_at=user["created_at"]
                )
            
            return None
    except Exception as e:
        logger.error(f"Error getting user: {e}")
        return None

async def update_user_profile(uid: str, display_name: Optional[str] = None, photo_url: Optional[str] = None) -> Optional[UserResponse]:
    """
    Update a user's profile
    """
    try:
        # Check if Firebase is available
        if settings.FIREBASE_CREDENTIALS:
            # Update user in Firebase
            try:
                update_data = {}
                if display_name is not None:
                    update_data["display_name"] = display_name
                if photo_url is not None:
                    update_data["photo_url"] = photo_url
                
                firebase_user = update_user(uid, **update_data)
                
                # Create user response
                return UserResponse(
                    uid=firebase_user["uid"],
                    email=firebase_user["email"],
                    display_name=firebase_user.get("displayName"),
                    photo_url=firebase_user.get("photoURL"),
                    provider="firebase",
                    created_at=datetime.utcnow()
                )
            except Exception as e:
                logger.error(f"Error updating user in Firebase: {e}")
                return None
        else:
            # Update user locally
            if uid in users_db:
                if display_name is not None:
                    users_db[uid]["display_name"] = display_name
                if photo_url is not None:
                    users_db[uid]["photo_url"] = photo_url
                
                # Create user response
                return UserResponse(
                    uid=uid,
                    email=users_db[uid]["email"],
                    display_name=users_db[uid]["display_name"],
                    photo_url=users_db[uid]["photo_url"],
                    provider="local",
                    created_at=users_db[uid]["created_at"]
                )
            
            return None
    except Exception as e:
        logger.error(f"Error updating user profile: {e}")
        return None

async def change_password(uid: str, current_password: str, new_password: str) -> bool:
    """
    Change a user's password
    """
    try:
        # Check if Firebase is available
        if settings.FIREBASE_CREDENTIALS:
            # This is a placeholder. In a real implementation, you would use Firebase Admin SDK
            # to change the user's password. However, Firebase Admin SDK doesn't provide
            # a way to verify the current password before changing it.
            
            # For demonstration purposes, we'll just return True
            return True
        else:
            # Change password locally
            if uid in users_db:
                if verify_password(current_password, users_db[uid]["hashed_password"]):
                    # Hash the new password
                    hashed_password = get_password_hash(new_password)
                    
                    # Update the password
                    users_db[uid]["hashed_password"] = hashed_password
                    
                    return True
            
            return False
    except Exception as e:
        logger.error(f"Error changing password: {e}")
        return False

async def create_token(user: UserResponse) -> Token:
    """
    Create an access token for a user
    """
    try:
        # Create access token
        access_token = create_access_token(
            subject=user.uid,
            expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer"
        )
    except Exception as e:
        logger.error(f"Error creating token: {e}")
        raise