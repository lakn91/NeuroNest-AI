import os
import logging
import uuid
import json
import asyncio
import tempfile
import shutil
import docker
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
from app.core.config import settings
from app.models.execution import ExecutionRequest, ExecutionResponse, RuntimeEnvironment

logger = logging.getLogger(__name__)

# Initialize Docker client if code execution is enabled
docker_client = None
if settings.ENABLE_CODE_EXECUTION:
    try:
        docker_client = docker.from_env()
        logger.info("Docker client initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing Docker client: {e}")

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
    command: Optional[str] = None,
    timeout: int = 30,
    runtime_id: Optional[str] = None
) -> ExecutionResponse:
    """
    Execute code in a Docker container
    """
    if not settings.ENABLE_CODE_EXECUTION:
        return ExecutionResponse(
            execution_id=str(uuid.uuid4()),
            status="failed",
            error="Code execution is disabled",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow()
        )
    
    if not docker_client:
        return ExecutionResponse(
            execution_id=str(uuid.uuid4()),
            status="failed",
            error="Docker client is not initialized",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow()
        )
    
    # Get project directory
    project_dir = os.path.join(settings.PROJECTS_DIR, project_id)
    
    # Check if project exists
    if not os.path.exists(project_dir):
        return ExecutionResponse(
            execution_id=str(uuid.uuid4()),
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
            execution_id=str(uuid.uuid4()),
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
            execution_id=str(uuid.uuid4()),
            status="failed",
            error=f"Runtime environment not found: {runtime_id}",
            start_time=datetime.utcnow(),
            end_time=datetime.utcnow()
        )
    
    # Generate execution ID
    execution_id = str(uuid.uuid4())
    
    # Start time
    start_time = datetime.utcnow()
    
    try:
        # Create a container
        container = docker_client.containers.run(
            image=runtime.image,
            command=command or runtime.default_command,
            volumes={project_dir: {'bind': '/app', 'mode': 'ro'}},
            working_dir='/app',
            network_mode=settings.DOCKER_NETWORK,
            mem_limit=settings.DOCKER_MEMORY_LIMIT,
            detach=True,
            remove=True,
            stdout=True,
            stderr=True
        )
        
        # Wait for container to finish or timeout
        try:
            container_logs = container.logs(stream=True)
            output = ""
            
            # Read logs with timeout
            async def read_logs():
                nonlocal output
                for line in container_logs:
                    output += line.decode('utf-8')
            
            # Run with timeout
            try:
                await asyncio.wait_for(read_logs(), timeout=timeout)
                status = "success"
                error = None
            except asyncio.TimeoutError:
                status = "timeout"
                error = f"Execution timed out after {timeout} seconds"
                try:
                    container.kill()
                except:
                    pass
        except Exception as e:
            status = "failed"
            error = f"Error reading container logs: {str(e)}"
            output = ""
        
        # End time
        end_time = datetime.utcnow()
        
        return ExecutionResponse(
            execution_id=execution_id,
            status=status,
            output=output,
            error=error,
            start_time=start_time,
            end_time=end_time
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

async def stop_execution(container_id: str) -> bool:
    """
    Stop a running container
    """
    if not settings.ENABLE_CODE_EXECUTION or not docker_client:
        return False
    
    try:
        container = docker_client.containers.get(container_id)
        container.kill()
        return True
    except Exception as e:
        logger.error(f"Error stopping container: {e}")
        return False

async def get_execution_logs(container_id: str) -> Optional[str]:
    """
    Get logs from a container
    """
    if not settings.ENABLE_CODE_EXECUTION or not docker_client:
        return None
    
    try:
        container = docker_client.containers.get(container_id)
        logs = container.logs().decode('utf-8')
        return logs
    except Exception as e:
        logger.error(f"Error getting container logs: {e}")
        return None