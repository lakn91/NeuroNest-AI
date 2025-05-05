"""
Application Configuration

This module loads configuration from environment variables and .env files.
The environment is determined by the APP_ENV variable, which can be:
- dev: Development environment
- prod: Production environment
- local: Local development environment
"""

import os
import logging
from typing import Any, Dict, List, Optional, Union
from pydantic_settings import BaseSettings

# Determine environment
APP_ENV = os.environ.get("APP_ENV", "dev")
ENV_FILES = {
    "dev": ".env.dev",
    "prod": ".env.prod",
    "local": ".env.local",
}

# Default to .env if specific environment file doesn't exist
ENV_FILE = ENV_FILES.get(APP_ENV, ".env")
if not os.path.exists(ENV_FILE) and os.path.exists(".env"):
    ENV_FILE = ".env"

print(f"Loading configuration from {ENV_FILE} for environment: {APP_ENV}")

class Settings(BaseSettings):
    """Application settings"""
    
    # Environment
    app_env: str = APP_ENV
    
    # API settings
    api_title: str = "NeuroNest AI API"
    api_description: str = "API for NeuroNest AI platform"
    api_version: str = "0.1.0"
    
    # Core settings
    secret_key: str = "supersecretkey"
    
    # Security settings
    jwt_secret_key: str = "jwtsupersecretkey"
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 30
    
    # Database settings
    postgres_host: str = "postgres"
    postgres_port: int = 5432
    postgres_user: str = "neuronest"
    postgres_password: str = "neuronestpassword"
    postgres_db: str = "neuronest_db"
    use_postgres: bool = True
    
    # Redis settings
    redis_host: str = "redis"
    redis_port: int = 6379
    redis_password: str = ""
    redis_db: int = 0
    use_redis: bool = True
    
    # Firebase/Supabase settings
    firebase_credentials: str = ""
    firebase_web_api_key: str = ""
    use_supabase: bool = False
    supabase_url: str = ""
    supabase_key: str = ""
    
    # AI Providers
    default_ai_provider: str = "gemini"
    gemini_api_key: str = ""
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    
    # GitHub settings
    github_client_id: str = ""
    github_client_secret: str = ""
    
    # Code Execution
    enable_code_execution: bool = False
    docker_base_image: str = "python:3.10-slim"
    docker_network: str = "none"
    docker_timeout: int = 30
    docker_memory_limit: str = "512m"
    
    # File Storage
    upload_dir: str = "./static/uploads"
    projects_dir: str = "./static/projects"
    max_upload_size: int = 10485760  # 10MB
    
    # Speech Recognition
    enable_speech_recognition: bool = True
    speech_recognition_provider: str = "google"
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    
    # CORS settings
    cors_origins: List[str] = ["*"]
    
    # Debug mode
    debug: bool = False
    
    # LangChain settings
    langchain_verbose: bool = False
    agent_temperature: float = 0.7
    agent_max_tokens: int = 1000
    
    model_config = {
        "env_file": ENV_FILE,
        "env_file_encoding": "utf-8",
        "extra": "ignore",
        "case_sensitive": False,
    }
    
    def __init__(self, **data: Any):
        super().__init__(**data)
        
        # Convert string boolean values to actual booleans
        self.use_postgres = str(self.use_postgres).lower() == "true"
        self.use_redis = str(self.use_redis).lower() == "true"
        self.use_supabase = str(self.use_supabase).lower() == "true"
        self.enable_code_execution = str(self.enable_code_execution).lower() == "true"
        self.enable_speech_recognition = str(self.enable_speech_recognition).lower() == "true"
        self.debug = str(self.debug).lower() == "true"
        self.langchain_verbose = str(self.langchain_verbose).lower() == "true"
        
        # Parse CORS origins
        if isinstance(self.cors_origins, str):
            self.cors_origins = [origin.strip() for origin in self.cors_origins.split(",")]

# Create settings instance
settings = Settings()

# Ensure directories exist
os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(settings.projects_dir, exist_ok=True)

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s" if settings.log_format == "console" else "%(message)s",
)

# Log configuration
logger = logging.getLogger(__name__)
logger.info(f"Loaded configuration for environment: {settings.app_env}")
logger.info(f"Database: {'PostgreSQL' if settings.use_postgres else 'SQLite'}")
logger.info(f"Cache: {'Redis' if settings.use_redis else 'None'}")
logger.info(f"Supabase: {'Enabled' if settings.use_supabase else 'Disabled'}")
logger.info(f"Code Execution: {'Enabled' if settings.enable_code_execution else 'Disabled'}")
logger.info(f"Speech Recognition: {'Enabled' if settings.enable_speech_recognition else 'Disabled'}")
logger.info(f"Debug Mode: {'Enabled' if settings.debug else 'Disabled'}")