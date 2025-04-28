import os
import logging
import uuid
import json
import asyncio
import tempfile
import shutil
import time
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime
from app.core.config import settings
from app.models.execution import ExecutionRequest, ExecutionResponse, RuntimeEnvironment
from app.services.docker_service import (
    execute_code_in_container,
    get_container_logs,
    stop_container,
    cleanup_containers
)

logger = logging.getLogger(__name__)

# Available runtime environments
RUNTIME_ENVIRONMENTS = [
    RuntimeEnvironment(
        id="python",
        name="Python",
        description="Python 3.10 runtime environment",
        language="python",
        version="3.10",
        image="python:3.10-slim",
        default_command="python",
        file_extensions=[".py"]
    ),
    RuntimeEnvironment(
        id="node",
        name="Node.js",
        description="Node.js 18 runtime environment",
        language="javascript",
        version="18",
        image="node:18-alpine",
        default_command="node",
        file_extensions=[".js", ".ts"]
    ),
    RuntimeEnvironment(
        id="web",
        name="Web (HTML/CSS/JS)",
        description="Simple web server for HTML, CSS, and JavaScript",
        language="html",
        version="latest",
        image="nginx:alpine",
        file_extensions=[".html", ".css", ".js"]
    ),
    RuntimeEnvironment(
        id="java",
        name="Java",
        description="Java 17 runtime environment",
        language="java",
        version="17",
        image="openjdk:17-slim",
        default_command="java",
        file_extensions=[".java", ".jar"]
    ),
    RuntimeEnvironment(
        id="go",
        name="Go",
        description="Go 1.20 runtime environment",
        language="go",
        version="1.20",
        image="golang:1.20-alpine",
        default_command="go run",
        file_extensions=[".go"]
    )
]

def get_runtime_environments() -> List[RuntimeEnvironment]:
    """
    Get available runtime environments
    """
    return RUNTIME_ENVIRONMENTS

def get_runtime_environment(runtime_id: str) -> Optional[RuntimeEnvironment]:
    """
    Get a runtime environment by ID
    """
    for env in RUNTIME_ENVIRONMENTS:
        if env.id == runtime_id:
            return env
    return None

async def execute_code(
    project_id: str,
    runtime_id: Optional[str] = None,
    command: Optional[str] = None,
    timeout: int = 60
) -> ExecutionResponse:
    """
    Execute code in a Docker container for a project
    """
    execution_id = str(uuid.uuid4())
    
    if not settings.ENABLE_CODE_EXECUTION:
        return ExecutionResponse(
            execution_id=execution_id,
            status="failed",
            error="Code execution is disabled",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow()
        )
    
    # Get project directory
    project_dir = os.path.join(settings.PROJECTS_DIR, project_id)
    
    # Check if project exists
    if not os.path.exists(project_dir):
        return ExecutionResponse(
            execution_id=execution_id,
            status="failed",
            error="Project not found",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow()
        )
    
    # Read metadata
    try:
        with open(os.path.join(project_dir, "metadata.json"), 'r') as f:
            metadata = json.loads(f.read())
    except Exception as e:
        return ExecutionResponse(
            execution_id=execution_id,
            status="failed",
            error=f"Error reading project metadata: {str(e)}",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow()
        )
    
    # Determine runtime environment
    if runtime_id:
        runtime = get_runtime_environment(runtime_id)
    elif metadata.get("language"):
        # Try to find a runtime environment based on project language
        for env in RUNTIME_ENVIRONMENTS:
            if env.language.lower() == metadata["language"].lower():
                runtime = env
                break
        else:
            # Default to Python if no matching runtime is found
            runtime = get_runtime_environment("python")
    else:
        # Default to Python if no language is specified
        runtime = get_runtime_environment("python")
        
    if not runtime:
        return ExecutionResponse(
            execution_id=execution_id,
            status="failed",
            error=f"Runtime environment not found: {runtime_id}",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow()
        )
    
    # Start time
    start_time = datetime.utcnow()
    
    try:
        # Set up volumes
        volumes = {
            project_dir: {'bind': '/app', 'mode': 'ro'}
        }
        
        # Set up environment variables
        environment = {
            "PROJECT_ID": project_id,
            "RUNTIME_ID": runtime.id
        }
        
        # Create and start container using docker_service
        result = await asyncio.to_thread(
            execute_code_in_container,
            code="",  # No code, we're executing a project
            language=runtime.language,
            timeout=timeout,
            environment=environment,
            project_dir=project_dir,
            image=runtime.image,
            command=command or runtime.default_command,
            volumes=volumes
        )
        
        # Convert result to ExecutionResponse
        return ExecutionResponse(
            execution_id=result.get("execution_id", execution_id),
            status=result.get("status", "failed"),
            output=result.get("output", ""),
            error=result.get("error"),
            start_time=result.get("start_time", start_time),
            end_time=result.get("end_time", datetime.utcnow())
        )
    except Exception as e:
        logger.error(f"Error executing code: {e}")
        return ExecutionResponse(
            execution_id=execution_id,
            status="failed",
            error=f"Error executing code: {str(e)}",
            start_time=start_time,
            end_time=datetime.utcnow()
        )

async def execute_single_file(
    file_path: str,
    language: str = "python",
    timeout: int = 60
) -> ExecutionResponse:
    """
    Execute a single file in a Docker container
    """
    execution_id = str(uuid.uuid4())
    
    if not settings.ENABLE_CODE_EXECUTION:
        return ExecutionResponse(
            execution_id=execution_id,
            status="failed",
            error="Code execution is disabled",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow()
        )
    
    # Check if file exists
    if not os.path.exists(file_path):
        return ExecutionResponse(
            execution_id=execution_id,
            status="failed",
            error="File not found",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow()
        )
    
    # Start time
    start_time = datetime.utcnow()
    
    try:
        # Read file content
        with open(file_path, 'r') as f:
            code = f.read()
        
        # Execute code using docker_service
        result = await asyncio.to_thread(
            execute_code_in_container,
            code=code,
            language=language,
            timeout=timeout
        )
        
        # Convert result to ExecutionResponse
        return ExecutionResponse(
            execution_id=result.get("execution_id", execution_id),
            status=result.get("status", "failed"),
            output=result.get("output", ""),
            error=result.get("error"),
            start_time=result.get("start_time", start_time),
            end_time=result.get("end_time", datetime.utcnow())
        )
    except Exception as e:
        logger.error(f"Error executing file: {e}")
        return ExecutionResponse(
            execution_id=execution_id,
            status="failed",
            error=f"Error executing file: {str(e)}",
            start_time=start_time,
            end_time=datetime.utcnow()
        )

async def execute_code_snippet(
    code: str,
    language: str = "python",
    timeout: int = 60
) -> ExecutionResponse:
    """
    Execute a code snippet in a Docker container
    """
    execution_id = str(uuid.uuid4())
    
    if not settings.ENABLE_CODE_EXECUTION:
        return ExecutionResponse(
            execution_id=execution_id,
            status="failed",
            error="Code execution is disabled",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow()
        )
    
    # Start time
    start_time = datetime.utcnow()
    
    try:
        # Execute code using docker_service
        result = await asyncio.to_thread(
            execute_code_in_container,
            code=code,
            language=language,
            timeout=timeout
        )
        
        # Convert result to ExecutionResponse
        return ExecutionResponse(
            execution_id=result.get("execution_id", execution_id),
            status=result.get("status", "failed"),
            output=result.get("output", ""),
            error=result.get("error"),
            start_time=result.get("start_time", start_time),
            end_time=result.get("end_time", datetime.utcnow())
        )
    except Exception as e:
        logger.error(f"Error executing code snippet: {e}")
        return ExecutionResponse(
            execution_id=execution_id,
            status="failed",
            error=f"Error executing code snippet: {str(e)}",
            start_time=start_time,
            end_time=datetime.utcnow()
        )

async def stop_execution(container_id: str) -> bool:
    """
    Stop a running container
    """
    if not settings.ENABLE_CODE_EXECUTION:
        return False
    
    try:
        await asyncio.to_thread(stop_container, container_id)
        return True
    except Exception as e:
        logger.error(f"Error stopping container: {e}")
        return False

async def get_execution_logs(container_id: str) -> Optional[str]:
    """
    Get logs from a container
    """
    if not settings.ENABLE_CODE_EXECUTION:
        return None
    
    try:
        logs = await asyncio.to_thread(get_container_logs, container_id)
        return logs
    except Exception as e:
        logger.error(f"Error getting container logs: {e}")
        return None

def cleanup_all_containers():
    """
    Clean up all active containers
    """
    if settings.ENABLE_CODE_EXECUTION:
        try:
            cleanup_containers()
            logger.info("All containers cleaned up")
        except Exception as e:
            logger.error(f"Error cleaning up containers: {e}")