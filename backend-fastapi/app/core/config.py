import os
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Settings(BaseModel):
    # API settings
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "NeuroNest-AI"
    
    # CORS settings
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    
    # Security settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "supersecretkey")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Firebase settings
    FIREBASE_CREDENTIALS: Optional[str] = os.getenv("FIREBASE_CREDENTIALS")
    FIREBASE_WEB_API_KEY: Optional[str] = os.getenv("FIREBASE_WEB_API_KEY")
    
    # AI Provider settings
    DEFAULT_AI_PROVIDER: str = os.getenv("DEFAULT_AI_PROVIDER", "gemini")
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY")
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY")
    
    # Docker settings
    ENABLE_CODE_EXECUTION: bool = os.getenv("ENABLE_CODE_EXECUTION", "false").lower() == "true"
    DOCKER_BASE_IMAGE: str = os.getenv("DOCKER_BASE_IMAGE", "python:3.10-slim")
    DOCKER_NETWORK: str = os.getenv("DOCKER_NETWORK", "none")
    DOCKER_TIMEOUT: int = int(os.getenv("DOCKER_TIMEOUT", "30"))
    DOCKER_MEMORY_LIMIT: str = os.getenv("DOCKER_MEMORY_LIMIT", "512m")
    
    # File storage settings
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "./static/uploads")
    PROJECTS_DIR: str = os.getenv("PROJECTS_DIR", "./static/projects")
    MAX_UPLOAD_SIZE: int = int(os.getenv("MAX_UPLOAD_SIZE", "10485760"))  # 10MB
    
    # Speech recognition settings
    ENABLE_SPEECH_RECOGNITION: bool = os.getenv("ENABLE_SPEECH_RECOGNITION", "true").lower() == "true"
    SPEECH_RECOGNITION_PROVIDER: str = os.getenv("SPEECH_RECOGNITION_PROVIDER", "google")
    ENABLE_AI_AUDIO_ENHANCEMENT: bool = os.getenv("ENABLE_AI_AUDIO_ENHANCEMENT", "true").lower() == "true"
    DEFAULT_SPEECH_LANGUAGE: str = os.getenv("DEFAULT_SPEECH_LANGUAGE", "en-US")
    DEFAULT_SPEECH_DIALECT: Optional[str] = os.getenv("DEFAULT_SPEECH_DIALECT")
    AUDIO_STORAGE_PATH: str = os.getenv("AUDIO_STORAGE_PATH", os.path.join(UPLOAD_DIR, "audio"))
    
    # Supported languages and dialects
    SUPPORTED_LANGUAGES: List[Dict[str, Any]] = [
        {"code": "en", "name": "English", "dialects": [
            {"code": "en-US", "name": "American English"},
            {"code": "en-GB", "name": "British English"},
            {"code": "en-AU", "name": "Australian English"},
            {"code": "en-IN", "name": "Indian English"},
        ]},
        {"code": "ar", "name": "العربية", "dialects": [
            {"code": "ar-SA", "name": "Saudi Arabic"},
            {"code": "ar-IQ", "name": "Iraqi Arabic"},
            {"code": "ar-EG", "name": "Egyptian Arabic"},
            {"code": "ar-MA", "name": "Moroccan Arabic"},
            {"code": "ar-DZ", "name": "Algerian Arabic"},
            {"code": "ar-TN", "name": "Tunisian Arabic"},
            {"code": "ar-LB", "name": "Lebanese Arabic"},
            {"code": "ar-JO", "name": "Jordanian Arabic"},
        ]},
        {"code": "fr", "name": "Français", "dialects": [
            {"code": "fr-FR", "name": "French (France)"},
            {"code": "fr-CA", "name": "French (Canada)"},
            {"code": "fr-BE", "name": "French (Belgium)"},
            {"code": "fr-CH", "name": "French (Switzerland)"},
        ]},
        {"code": "es", "name": "Español", "dialects": [
            {"code": "es-ES", "name": "Spanish (Spain)"},
            {"code": "es-MX", "name": "Spanish (Mexico)"},
            {"code": "es-AR", "name": "Spanish (Argentina)"},
            {"code": "es-CO", "name": "Spanish (Colombia)"},
        ]},
        {"code": "de", "name": "Deutsch", "dialects": [
            {"code": "de-DE", "name": "German (Germany)"},
            {"code": "de-AT", "name": "German (Austria)"},
            {"code": "de-CH", "name": "German (Switzerland)"},
        ]},
        {"code": "zh", "name": "中文", "dialects": [
            {"code": "zh-CN", "name": "Mandarin (China)"},
            {"code": "zh-TW", "name": "Mandarin (Taiwan)"},
            {"code": "zh-HK", "name": "Cantonese (Hong Kong)"},
        ]},
        {"code": "ja", "name": "日本語", "dialects": [
            {"code": "ja-JP", "name": "Japanese"},
        ]},
        {"code": "ko", "name": "한국어", "dialects": [
            {"code": "ko-KR", "name": "Korean"},
        ]},
        {"code": "ru", "name": "Русский", "dialects": [
            {"code": "ru-RU", "name": "Russian"},
        ]},
        {"code": "pt", "name": "Português", "dialects": [
            {"code": "pt-BR", "name": "Portuguese (Brazil)"},
            {"code": "pt-PT", "name": "Portuguese (Portugal)"},
        ]},
        {"code": "hi", "name": "हिन्दी", "dialects": [
            {"code": "hi-IN", "name": "Hindi"},
        ]},
        {"code": "ur", "name": "اردو", "dialects": [
            {"code": "ur-PK", "name": "Urdu (Pakistan)"},
            {"code": "ur-IN", "name": "Urdu (India)"},
        ]},
    ]
    
    # Agent settings
    AGENT_TEMPERATURE: float = float(os.getenv("AGENT_TEMPERATURE", "0.7"))
    AGENT_MAX_TOKENS: int = int(os.getenv("AGENT_MAX_TOKENS", "4096"))
    AGENT_MEMORY_SIZE: int = int(os.getenv("AGENT_MEMORY_SIZE", "10"))
    
    class Config:
        case_sensitive = True


settings = Settings()

# Create necessary directories
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.PROJECTS_DIR, exist_ok=True)
os.makedirs(settings.AUDIO_STORAGE_PATH, exist_ok=True)