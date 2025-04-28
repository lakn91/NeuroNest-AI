from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Query
from typing import Dict, Any, Optional, List
import logging
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.services.speech_service import recognize_speech, enhance_audio, save_audio_file, get_supported_languages

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/recognize")
async def recognize_speech_endpoint(
    audio: UploadFile = File(...),
    language: str = Form("en-US"),
    dialect: Optional[str] = Form(None),
    enhance: bool = Form(True),
    use_ai_enhancement: bool = Form(True),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Recognize speech from an audio file
    """
    try:
        # Read the audio file
        audio_data = await audio.read()
        
        # Enhance the audio if requested
        if enhance:
            enhanced_result = await enhance_audio(audio_data, use_ai_enhancement)
            
            if not enhanced_result["success"]:
                logger.warning(f"Audio enhancement failed: {enhanced_result.get('error')}")
                # Continue with original audio
            else:
                audio_data = enhanced_result["enhanced_audio"]
        
        # Save the audio file
        save_result = await save_audio_file(audio_data, current_user["uid"])
        
        if not save_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save audio file: {save_result.get('error')}"
            )
        
        # Recognize speech
        recognition_result = await recognize_speech(audio_data, language, dialect)
        
        if not recognition_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Speech recognition failed: {recognition_result.get('error')}"
            )
        
        return {
            "text": recognition_result["text"],
            "language": recognition_result.get("language", language),
            "confidence": recognition_result.get("confidence", 0),
            "file_path": save_result.get("file_path")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error recognizing speech: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to recognize speech"
        )

@router.post("/enhance")
async def enhance_audio_endpoint(
    audio: UploadFile = File(...),
    use_ai_enhancement: bool = Form(True),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Enhance audio quality
    """
    try:
        # Read the audio file
        audio_data = await audio.read()
        
        # Enhance the audio
        enhanced_result = await enhance_audio(audio_data, use_ai_enhancement)
        
        if not enhanced_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Audio enhancement failed: {enhanced_result.get('error')}"
            )
        
        # Save the enhanced audio file
        save_result = await save_audio_file(enhanced_result["enhanced_audio"], current_user["uid"])
        
        if not save_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save enhanced audio file: {save_result.get('error')}"
            )
        
        return {
            "message": enhanced_result.get("message", "Audio enhanced successfully"),
            "file_path": save_result.get("file_path"),
            "enhanced_audio": enhanced_result["enhanced_audio"]
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enhancing audio: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to enhance audio"
        )

@router.get("/languages")
async def get_speech_languages(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get supported languages for speech recognition
    """
    try:
        languages = get_supported_languages()
        return languages
    except Exception as e:
        logger.error(f"Error getting supported languages: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get supported languages"
        )

@router.get("/dialects/{language}")
async def get_speech_dialects(
    language: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get supported dialects for a specific language
    """
    try:
        languages = get_supported_languages()
        
        # Find the language
        for lang in languages:
            if lang["code"] == language:
                return lang.get("dialects", [])
        
        # If language not found, return empty list
        return []
    except Exception as e:
        logger.error(f"Error getting dialects for language {language}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get dialects for language {language}"
        )