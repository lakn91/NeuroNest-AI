"""
Runtime models for NeuroNest-AI.
"""

from enum import Enum
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from pydantic import BaseModel, Field

class RuntimeLanguage(str, Enum):
    """Runtime language enum."""
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"
    RUBY = "ruby"
    GO = "go"
    RUST = "rust"
    JAVA = "java"
    CSHARP = "csharp"
    PHP = "php"
    SWIFT = "swift"
    KOTLIN = "kotlin"
    R = "r"
    JULIA = "julia"

class RuntimeStatus(str, Enum):
    """Runtime status enum."""
    CREATED = "created"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    STOPPED = "stopped"
    FAILED = "failed"
    DELETED = "deleted"

class RuntimeLogType(str, Enum):
    """Runtime log type enum."""
    STDOUT = "stdout"
    STDERR = "stderr"
    INFO = "info"
    ERROR = "error"
    WARNING = "warning"
    DEBUG = "debug"

class RuntimeCreate(BaseModel):
    """Runtime creation model."""
    project_id: str
    language: RuntimeLanguage
    entry_point: Optional[str] = None
    environment_vars: Optional[Dict[str, str]] = None
    timeout: Optional[int] = 300  # Default timeout in seconds

class RuntimeUpdate(BaseModel):
    """Runtime update model."""
    entry_point: Optional[str] = None
    environment_vars: Optional[Dict[str, str]] = None
    timeout: Optional[int] = None

class RuntimeResponse(BaseModel):
    """Runtime response model."""
    id: str
    project_id: str
    user_id: str
    language: RuntimeLanguage
    status: RuntimeStatus
    environment_vars: Optional[Dict[str, str]] = None
    entry_point: Optional[str] = None
    container_id: Optional[str] = None
    port: Optional[int] = None
    url: Optional[str] = None
    timeout: int
    created_at: Union[str, datetime]
    updated_at: Union[str, datetime]

    class Config:
        from_attributes = True

class RuntimeLogCreate(BaseModel):
    """Runtime log creation model."""
    runtime_id: str
    type: RuntimeLogType
    message: str

class RuntimeLogResponse(BaseModel):
    """Runtime log response model."""
    id: str
    runtime_id: str
    user_id: str
    type: RuntimeLogType
    message: str
    timestamp: Union[str, datetime]

    class Config:
        from_attributes = True