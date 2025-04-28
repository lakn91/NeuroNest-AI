from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

class SpeechSettings(BaseModel):
    enabled: bool = True
    language: str = "en-US"
    dialect: Optional[str] = None
    enhance_audio: bool = True
    use_ai_enhancement: bool = True
    visualization: bool = True
    
class UserSettings(BaseModel):
    theme: str = "system"  # light, dark, system
    language: str = "en"
    ai_provider: str = "gemini"
    api_keys: Dict[str, str] = {}
    speech_recognition: bool = True
    speech_dialect: Optional[str] = None
    speech_settings: Optional[SpeechSettings] = SpeechSettings()
    code_execution: bool = True
    
class UserSettingsUpdate(BaseModel):
    theme: Optional[str] = None
    language: Optional[str] = None
    ai_provider: Optional[str] = None
    api_keys: Optional[Dict[str, str]] = None
    speech_recognition: Optional[bool] = None
    speech_dialect: Optional[str] = None
    speech_settings: Optional[SpeechSettings] = None
    code_execution: Optional[bool] = None
    
class UserSettingsResponse(UserSettings):
    user_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        
class Dialect(BaseModel):
    code: str
    name: str
    
class SupportedLanguage(BaseModel):
    code: str
    name: str
    dialects: Optional[List[Dialect]] = None
    
class SupportedLanguagesResponse(BaseModel):
    languages: List[SupportedLanguage]
    
class AIProvider(BaseModel):
    id: str
    name: str
    description: str
    requires_api_key: bool
    api_key_url: Optional[str] = None
    
class AIProvidersResponse(BaseModel):
    providers: List[AIProvider]