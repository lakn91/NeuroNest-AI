from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
import logging
from app.core.dependencies import get_current_user
from app.models.settings import UserSettings, UserSettingsUpdate, UserSettingsResponse, SupportedLanguagesResponse, AIProvidersResponse
from app.services.settings_service import get_user_settings, update_user_settings, get_supported_languages, get_ai_providers
from app.services.speech_service import get_supported_languages as get_speech_languages

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("", response_model=UserSettingsResponse)
async def get_settings(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get user settings
    """
    try:
        settings = await get_user_settings(current_user["uid"])
        return settings
    except Exception as e:
        logger.error(f"Error getting user settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user settings"
        )

@router.put("", response_model=UserSettingsResponse)
async def update_settings(
    settings_data: UserSettingsUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update user settings
    """
    try:
        settings = await update_user_settings(current_user["uid"], settings_data)
        return settings
    except Exception as e:
        logger.error(f"Error updating user settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update user settings"
        )

@router.get("/languages", response_model=SupportedLanguagesResponse)
async def get_languages():
    """
    Get supported languages
    """
    try:
        languages = get_supported_languages()
        return SupportedLanguagesResponse(languages=languages)
    except Exception as e:
        logger.error(f"Error getting supported languages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get supported languages"
        )

@router.get("/speech/languages", response_model=List[Dict[str, Any]])
async def get_speech_supported_languages():
    """
    Get supported languages for speech recognition
    """
    try:
        languages = get_speech_languages()
        return languages
    except Exception as e:
        logger.error(f"Error getting supported speech languages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get supported speech languages"
        )

@router.get("/providers", response_model=AIProvidersResponse)
async def get_ai_providers_list():
    """
    Get supported AI providers
    """
    try:
        providers = get_ai_providers()
        return AIProvidersResponse(providers=providers)
    except Exception as e:
        logger.error(f"Error getting AI providers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get AI providers"
        )