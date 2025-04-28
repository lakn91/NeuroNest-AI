import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from app.core.config import settings
from app.models.settings import UserSettings, UserSettingsUpdate, UserSettingsResponse, AIProvider

logger = logging.getLogger(__name__)

# This is a simple in-memory settings store for demonstration purposes
# In a real implementation, you would use a database
settings_db = {}

async def get_user_settings(user_id: str) -> UserSettingsResponse:
    """
    Get settings for a user
    """
    try:
        # Check if settings exist for this user
        if user_id in settings_db:
            user_settings = settings_db[user_id]
        else:
            # Create default settings
            user_settings = {
                "user_id": user_id,
                "theme": "system",
                "language": "en",
                "ai_provider": "gemini",
                "api_keys": {},
                "speech_recognition": True,
                "speech_dialect": None,
                "code_execution": True,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            settings_db[user_id] = user_settings
        
        # Create response
        return UserSettingsResponse(**user_settings)
    except Exception as e:
        logger.error(f"Error getting user settings: {e}")
        # Return default settings
        return UserSettingsResponse(
            user_id=user_id,
            theme="system",
            language="en",
            ai_provider="gemini",
            api_keys={},
            speech_recognition=True,
            speech_dialect=None,
            code_execution=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )

async def update_user_settings(user_id: str, settings_update: UserSettingsUpdate) -> UserSettingsResponse:
    """
    Update settings for a user
    """
    try:
        # Get current settings
        current_settings = await get_user_settings(user_id)
        
        # Update settings
        updated_settings = current_settings.model_dump()
        
        if settings_update.theme is not None:
            updated_settings["theme"] = settings_update.theme
        if settings_update.language is not None:
            updated_settings["language"] = settings_update.language
        if settings_update.ai_provider is not None:
            updated_settings["ai_provider"] = settings_update.ai_provider
        if settings_update.api_keys is not None:
            updated_settings["api_keys"] = settings_update.api_keys
        if settings_update.speech_recognition is not None:
            updated_settings["speech_recognition"] = settings_update.speech_recognition
        if settings_update.speech_dialect is not None:
            updated_settings["speech_dialect"] = settings_update.speech_dialect
        if settings_update.code_execution is not None:
            updated_settings["code_execution"] = settings_update.code_execution
        
        updated_settings["updated_at"] = datetime.utcnow()
        
        # Save settings
        settings_db[user_id] = updated_settings
        
        # Create response
        return UserSettingsResponse(**updated_settings)
    except Exception as e:
        logger.error(f"Error updating user settings: {e}")
        raise

def get_supported_languages() -> List[Dict[str, Any]]:
    """
    Get a list of supported languages
    """
    return settings.SUPPORTED_LANGUAGES

def get_ai_providers() -> List[AIProvider]:
    """
    Get a list of supported AI providers
    """
    return [
        AIProvider(
            id="gemini",
            name="Google Gemini",
            description="Google's Gemini AI model",
            requires_api_key=True,
            api_key_url="https://ai.google.dev/"
        ),
        AIProvider(
            id="openai",
            name="OpenAI",
            description="OpenAI's GPT models",
            requires_api_key=True,
            api_key_url="https://platform.openai.com/api-keys"
        )
    ]