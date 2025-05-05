"""
Logger module for NeuroNest-AI.

This module provides a centralized logging configuration using loguru.
"""

import sys
import json
import logging
import datetime
from pathlib import Path
from typing import Any, Dict, Optional, Union

from loguru import logger
from pydantic import BaseModel

from app.config import settings

# Create logs directory
LOGS_DIR = Path("./logs")
LOGS_DIR.mkdir(exist_ok=True)

# Configure loguru logger
config = {
    "handlers": [
        {
            "sink": sys.stderr,
            "format": (
                "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
                "<level>{level: <8}</level> | "
                "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> | "
                "<level>{message}</level>"
            ) if settings.log_format == "console" else lambda record: json.dumps({
                "timestamp": record["time"].strftime("%Y-%m-%d %H:%M:%S.%f"),
                "level": record["level"].name,
                "message": record["message"],
                "module": record["name"],
                "function": record["function"],
                "line": record["line"],
                "process_id": record["process"].id,
                "thread_id": record["thread"].id,
                "exception": record["exception"],
                "extra": record["extra"],
            }),
            "level": settings.log_level.upper(),
            "serialize": settings.log_format == "json",
        },
        {
            "sink": LOGS_DIR / f"neuronest_{datetime.datetime.now().strftime('%Y-%m-%d')}.log",
            "format": (
                "{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | "
                "{name}:{function}:{line} | {message}"
            ) if settings.log_format == "console" else lambda record: json.dumps({
                "timestamp": record["time"].strftime("%Y-%m-%d %H:%M:%S.%f"),
                "level": record["level"].name,
                "message": record["message"],
                "module": record["name"],
                "function": record["function"],
                "line": record["line"],
                "process_id": record["process"].id,
                "thread_id": record["thread"].id,
                "exception": record["exception"],
                "extra": record["extra"],
            }),
            "level": "DEBUG",
            "rotation": "00:00",  # New file at midnight
            "retention": "30 days",  # Keep logs for 30 days
            "compression": "zip",  # Compress rotated logs
            "serialize": settings.log_format == "json",
        },
    ],
}

# Remove default handlers
logger.remove()

# Add configured handlers
for handler in config["handlers"]:
    logger.add(**handler)

# Intercept standard logging
class InterceptHandler(logging.Handler):
    def emit(self, record):
        # Get corresponding Loguru level if it exists
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Find caller from where originated the logged message
        frame, depth = logging.currentframe(), 2
        while frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )

# Replace standard logging with loguru
logging.basicConfig(handlers=[InterceptHandler()], level=0, force=True)

# Replace uvicorn logging with loguru
for name in logging.root.manager.loggerDict:
    if name.startswith("uvicorn."):
        logging.getLogger(name).handlers = [InterceptHandler()]

# Create a function to get a logger for a specific module
def get_logger(name: str):
    """
    Get a logger for a specific module.
    
    Args:
        name: The name of the module.
    
    Returns:
        A loguru logger instance.
    """
    return logger.bind(name=name)

# Create a context class for structured logging
class LogContext(BaseModel):
    """
    Context for structured logging.
    """
    
    request_id: Optional[str] = None
    user_id: Optional[str] = None
    path: Optional[str] = None
    method: Optional[str] = None
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    
    def as_dict(self) -> Dict[str, Any]:
        """Convert to dictionary, excluding None values."""
        return {k: v for k, v in self.model_dump().items() if v is not None}

# Create a function to log with context
def log_with_context(
    level: str,
    message: str,
    context: Optional[Union[LogContext, Dict[str, Any]]] = None,
    **kwargs
):
    """
    Log a message with context.
    
    Args:
        level: The log level.
        message: The log message.
        context: The log context.
        **kwargs: Additional log data.
    """
    if context is None:
        context = {}
    elif isinstance(context, LogContext):
        context = context.as_dict()
    
    logger.bind(**context, **kwargs).log(level, message)

# Export the logger
__all__ = ["logger", "get_logger", "LogContext", "log_with_context"]