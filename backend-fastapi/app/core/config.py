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
    
    # Supported languages and dialects
    SUPPORTED_LANGUAGES: List[Dict[str, Any]] = [
        {"code": "en", "name": "English", "dialects": [
            {"code": "en-US", "name": "American English"},
            {"code": "en-GB", "name": "British English"},
        ]},
        {"code": "ar", "name": "العربية", "dialects": [
            {"code": "ar-SA", "name": "Saudi Arabic"},
            {"code": "ar-IQ", "name": "Iraqi Arabic"},
            {"code": "ar-EG", "name": "Egyptian Arabic"},
            {"code": "ar-MA", "name": "Moroccan Arabic"},
        ]},
        {"code": "fr", "name": "Français", "dialects": [
            {"code": "fr-FR", "name": "French (France)"},
            {"code": "fr-CA", "name": "French (Canada)"},
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