from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import Dict, Any, Optional
import logging
from app.core.dependencies import get_current_user
from app.services.speech_service import recognize_speech, enhance_audio, save_audio_file

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/recognize")
async def recognize_speech_endpoint(
    audio: UploadFile = File(...),
    language: str = Form("en-US"),
    dialect: Optional[str] = Form(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Recognize speech from an audio file
    """
    try:
        # Read the audio file
        audio_data = await audio.read()
        
        # Enhance the audio
        enhanced_result = await enhance_audio(audio_data)
        
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
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Enhance audio quality
    """
    try:
        # Read the audio file
        audio_data = await audio.read()
        
        # Enhance the audio
        enhanced_result = await enhance_audio(audio_data)
        
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
            "file_path": save_result.get("file_path")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enhancing audio: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to enhance audio"
        )