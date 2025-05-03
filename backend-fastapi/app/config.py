"""
Application Configuration
"""

import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""
    
    # API settings
    api_title: str = "NeuroNest AI API"
    api_description: str = "API for NeuroNest AI platform"
    api_version: str = "0.1.0"
    
    # Security settings
    jwt_secret_key: str = os.environ.get("JWT_SECRET_KEY", "supersecretkey")
    jwt_algorithm: str = "HS256"
    jwt_expiration_minutes: int = 60 * 24  # 24 hours
    
    # Supabase settings
    supabase_url: str = os.environ.get("SUPABASE_URL", "")
    supabase_key: str = os.environ.get("SUPABASE_KEY", "")
    
    # Firebase settings
    firebase_credentials: str = os.environ.get("FIREBASE_CREDENTIALS", "")
    
    # OpenAI settings
    openai_api_key: str = os.environ.get("OPENAI_API_KEY", "")
    
    # GitHub settings
    github_client_id: str = os.environ.get("GITHUB_CLIENT_ID", "")
    github_client_secret: str = os.environ.get("GITHUB_CLIENT_SECRET", "")
    
    # File storage settings
    upload_dir: str = os.environ.get("UPLOAD_DIR", "/tmp/neuronest-uploads")
    projects_dir: str = os.environ.get("PROJECTS_DIR", "/tmp/neuronest-projects")
    
    # Docker settings
    docker_enabled: bool = os.environ.get("DOCKER_ENABLED", "false").lower() == "true"
    docker_network: str = os.environ.get("DOCKER_NETWORK", "neuronest-network")
    docker_timeout: int = int(os.environ.get("DOCKER_TIMEOUT", "30"))
    
    # CORS settings
    cors_origins: list = os.environ.get("CORS_ORIGINS", "*").split(",")
    
    # Debug mode
    debug: bool = os.environ.get("DEBUG", "false").lower() == "true"
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


# Create settings instance
settings = Settings()

# Ensure directories exist
os.makedirs(settings.upload_dir, exist_ok=True)
os.makedirs(settings.projects_dir, exist_ok=True)