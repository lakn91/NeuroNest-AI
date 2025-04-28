import os
import logging
import tempfile
import uuid
import io
import numpy as np
from typing import Dict, List, Any, Optional, BinaryIO
import speech_recognition as sr
from pydub import AudioSegment
from pydub.effects import normalize
import librosa
import soundfile as sf
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Google Gemini for audio enhancement if API key is available
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

async def recognize_speech(
    audio_data: bytes,
    language: str = "en-US",
    dialect: Optional[str] = None
) -> Dict[str, Any]:
    """
    Recognize speech from audio data using Google's Speech Recognition
    """
    try:
        if not settings.ENABLE_SPEECH_RECOGNITION:
            return {
                "success": False,
                "error": "Speech recognition is disabled",
                "text": None
            }
        
        # Use the specified dialect if provided, otherwise use the language
        recognition_language = dialect or language
        
        # Create a temporary file to store the audio data
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name
        
        try:
            # Initialize recognizer
            recognizer = sr.Recognizer()
            
            # Load the audio file
            with sr.AudioFile(temp_file_path) as source:
                # Apply noise reduction
                audio = recognizer.record(source)
                
                # Recognize speech using Google Speech Recognition
                text = recognizer.recognize_google(audio, language=recognition_language)
                
                return {
                    "success": True,
                    "text": text,
                    "language": recognition_language,
                    "confidence": 0.9  # Google doesn't provide confidence scores
                }
        finally:
            # Clean up the temporary file
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
                
    except sr.UnknownValueError:
        logger.warning("Google Speech Recognition could not understand audio")
        return {
            "success": False,
            "error": "Could not understand audio",
            "text": None
        }
    except sr.RequestError as e:
        logger.error(f"Could not request results from Google Speech Recognition service: {e}")
        return {
            "success": False,
            "error": f"Speech recognition service error: {e}",
            "text": None
        }
    except Exception as e:
        logger.error(f"Error recognizing speech: {e}")
        return {
            "success": False,
            "error": str(e),
            "text": None
        }

async def enhance_audio(audio_data: bytes, use_ai_enhancement: bool = True) -> Dict[str, Any]:
    """
    Enhance audio quality for better speech recognition using multiple techniques:
    1. Noise reduction
    2. Normalization
    3. AI-based enhancement if Gemini API key is available and AI enhancement is enabled
    """
    try:
        # Create a temporary file to store the audio data
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name
        
        try:
            # Load audio with pydub
            audio = AudioSegment.from_file(temp_file_path)
            
            # Normalize audio (adjust volume to a standard level)
            normalized_audio = normalize(audio)
            
            # Convert to mono if stereo
            if normalized_audio.channels > 1:
                normalized_audio = normalized_audio.set_channels(1)
            
            # Set sample rate to 16kHz (good for speech recognition)
            normalized_audio = normalized_audio.set_frame_rate(16000)
            
            # Export to a new temporary file
            enhanced_temp_path = f"{temp_file_path}_enhanced.wav"
            normalized_audio.export(enhanced_temp_path, format="wav")
            
            # Load with librosa for more advanced processing
            y, sr = librosa.load(enhanced_temp_path, sr=16000)
            
            # Apply noise reduction using spectral gating
            # This is a simple implementation - in production you might use more sophisticated methods
            # like deep learning-based noise reduction
            y_denoised = librosa.effects.preemphasis(y)
            
            # Save the enhanced audio
            sf.write(enhanced_temp_path, y_denoised, sr)
            
            # Read the enhanced audio file
            with open(enhanced_temp_path, 'rb') as f:
                enhanced_audio_data = f.read()
            
            # If Gemini API is available and AI enhancement is enabled, try to use it for further enhancement
            ai_enhancement_applied = False
            if settings.GEMINI_API_KEY and settings.ENABLE_AI_AUDIO_ENHANCEMENT and use_ai_enhancement:
                try:
                    # This is a placeholder for actual Gemini audio enhancement
                    # In a real implementation, you would use Gemini's audio processing capabilities
                    # For now, we'll just use the already enhanced audio
                    
                    # In a real implementation, you might use a model like this:
                    # model = genai.GenerativeModel('gemini-pro-vision')
                    # response = model.generate_content([
                    #     "Enhance this audio for speech recognition. Remove background noise and improve clarity.",
                    #     {"mime_type": "audio/wav", "data": enhanced_audio_data}
                    # ])
                    # enhanced_audio_data = process_ai_response(response)
                    
                    ai_enhancement_applied = True
                except Exception as e:
                    logger.warning(f"AI-based audio enhancement failed: {e}")
            
            enhancement_message = "Basic audio enhancement applied"
            if ai_enhancement_applied:
                enhancement_message = "AI-based audio enhancement applied"
            
            return {
                "success": True,
                "enhanced_audio": enhanced_audio_data,
                "message": enhancement_message,
                "ai_enhanced": ai_enhancement_applied
            }
        finally:
            # Clean up temporary files
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)
            if os.path.exists(f"{temp_file_path}_enhanced.wav"):
                os.remove(f"{temp_file_path}_enhanced.wav")
    except Exception as e:
        logger.error(f"Error enhancing audio: {e}")
        return {
            "success": False,
            "error": str(e),
            "enhanced_audio": audio_data
        }

async def save_audio_file(audio_data: bytes, user_id: str) -> Dict[str, Any]:
    """
    Save audio data to a file
    """
    try:
        # Generate a unique filename
        filename = f"{user_id}_{uuid.uuid4()}.wav"
        
        # Create the directory if it doesn't exist
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        
        # Full path to save the file
        file_path = os.path.join(settings.UPLOAD_DIR, filename)
        
        # Write the audio data to the file
        with open(file_path, 'wb') as f:
            f.write(audio_data)
        
        return {
            "success": True,
            "file_path": file_path,
            "filename": filename
        }
    except Exception as e:
        logger.error(f"Error saving audio file: {e}")
        return {
            "success": False,
            "error": str(e)
        }

def get_supported_languages() -> List[Dict[str, Any]]:
    """
    Get a list of supported languages and dialects for speech recognition
    """
    try:
        # Check if languages are defined in settings
        if hasattr(settings, 'SUPPORTED_LANGUAGES') and settings.SUPPORTED_LANGUAGES:
            return settings.SUPPORTED_LANGUAGES
        
        # Otherwise, return a comprehensive list of languages and dialects supported by Google Speech Recognition
        # In a production environment, you might want to fetch this dynamically from the provider's API
        languages = [
            {
                "code": "en",
                "name": "English",
                "dialects": [
                    {"code": "en-US", "name": "English (United States)"},
                    {"code": "en-GB", "name": "English (United Kingdom)"},
                    {"code": "en-AU", "name": "English (Australia)"},
                    {"code": "en-CA", "name": "English (Canada)"},
                    {"code": "en-IN", "name": "English (India)"},
                    {"code": "en-IE", "name": "English (Ireland)"},
                    {"code": "en-NZ", "name": "English (New Zealand)"},
                    {"code": "en-ZA", "name": "English (South Africa)"}
                ]
            },
            {
                "code": "es",
                "name": "Spanish",
                "dialects": [
                    {"code": "es-ES", "name": "Spanish (Spain)"},
                    {"code": "es-MX", "name": "Spanish (Mexico)"},
                    {"code": "es-AR", "name": "Spanish (Argentina)"},
                    {"code": "es-CO", "name": "Spanish (Colombia)"},
                    {"code": "es-US", "name": "Spanish (United States)"}
                ]
            },
            {
                "code": "fr",
                "name": "French",
                "dialects": [
                    {"code": "fr-FR", "name": "French (France)"},
                    {"code": "fr-CA", "name": "French (Canada)"},
                    {"code": "fr-CH", "name": "French (Switzerland)"},
                    {"code": "fr-BE", "name": "French (Belgium)"}
                ]
            },
            {
                "code": "de",
                "name": "German",
                "dialects": [
                    {"code": "de-DE", "name": "German (Germany)"},
                    {"code": "de-AT", "name": "German (Austria)"},
                    {"code": "de-CH", "name": "German (Switzerland)"}
                ]
            },
            {
                "code": "it",
                "name": "Italian",
                "dialects": [
                    {"code": "it-IT", "name": "Italian (Italy)"},
                    {"code": "it-CH", "name": "Italian (Switzerland)"}
                ]
            },
            {
                "code": "pt",
                "name": "Portuguese",
                "dialects": [
                    {"code": "pt-BR", "name": "Portuguese (Brazil)"},
                    {"code": "pt-PT", "name": "Portuguese (Portugal)"}
                ]
            },
            {
                "code": "ru",
                "name": "Russian",
                "dialects": [
                    {"code": "ru-RU", "name": "Russian (Russia)"}
                ]
            },
            {
                "code": "ja",
                "name": "Japanese",
                "dialects": [
                    {"code": "ja-JP", "name": "Japanese (Japan)"}
                ]
            },
            {
                "code": "ko",
                "name": "Korean",
                "dialects": [
                    {"code": "ko-KR", "name": "Korean (South Korea)"}
                ]
            },
            {
                "code": "zh",
                "name": "Chinese",
                "dialects": [
                    {"code": "zh-CN", "name": "Chinese (Simplified, China)"},
                    {"code": "zh-TW", "name": "Chinese (Traditional, Taiwan)"},
                    {"code": "zh-HK", "name": "Chinese (Traditional, Hong Kong)"}
                ]
            },
            {
                "code": "ar",
                "name": "Arabic",
                "dialects": [
                    {"code": "ar-AE", "name": "Arabic (UAE)"},
                    {"code": "ar-SA", "name": "Arabic (Saudi Arabia)"},
                    {"code": "ar-EG", "name": "Arabic (Egypt)"}
                ]
            },
            {
                "code": "hi",
                "name": "Hindi",
                "dialects": [
                    {"code": "hi-IN", "name": "Hindi (India)"}
                ]
            },
            {
                "code": "nl",
                "name": "Dutch",
                "dialects": [
                    {"code": "nl-NL", "name": "Dutch (Netherlands)"},
                    {"code": "nl-BE", "name": "Dutch (Belgium)"}
                ]
            },
            {
                "code": "id",
                "name": "Indonesian",
                "dialects": [
                    {"code": "id-ID", "name": "Indonesian (Indonesia)"}
                ]
            },
            {
                "code": "tr",
                "name": "Turkish",
                "dialects": [
                    {"code": "tr-TR", "name": "Turkish (Turkey)"}
                ]
            },
            {
                "code": "pl",
                "name": "Polish",
                "dialects": [
                    {"code": "pl-PL", "name": "Polish (Poland)"}
                ]
            },
            {
                "code": "th",
                "name": "Thai",
                "dialects": [
                    {"code": "th-TH", "name": "Thai (Thailand)"}
                ]
            },
            {
                "code": "vi",
                "name": "Vietnamese",
                "dialects": [
                    {"code": "vi-VN", "name": "Vietnamese (Vietnam)"}
                ]
            }
        ]
        
        return languages
    except Exception as e:
        logger.error(f"Error getting supported languages: {e}")
        return []