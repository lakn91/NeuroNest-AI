"""
Docker service for executing code in isolated containers.
"""

import os
import logging
import uuid
import json
import tempfile
import shutil
import time
from typing import Dict, List, Any, Optional, Tuple, Union
from datetime import datetime
from app.config import settings

# Mock Docker client for environments without Docker
class MockDockerClient:
    """Mock Docker client for environments without Docker"""
    
    class MockContainer:
        """Mock Docker container"""
        def __init__(self, container_id, name, image, command):
            self.id = container_id
            self.name = name
            self.image = image
            self.command = command
            self.status = "running"
            self.attrs = {"State": {"ExitCode": 0}}
            
        def logs(self):
            return b"Mock container logs"
            
        def stop(self, timeout=5):
            self.status = "stopped"
            
        def remove(self):
            pass
            
        def reload(self):
            # Simulate container finishing after a short time
            self.status = "exited"
    
    class MockContainerCollection:
        """Mock Docker container collection"""
        def __init__(self):
            self.containers = {}
            
        def create(self, **kwargs):
            container_id = str(uuid.uuid4())
            container = MockDockerClient.MockContainer(
                container_id,
                kwargs.get("name", f"mock-container-{container_id}"),
                kwargs.get("image", "mock-image"),
                kwargs.get("command", "mock-command")
            )
            self.containers[container_id] = container
            return container
            
        def get(self, container_id):
            return self.containers.get(container_id)
    
    class MockImageCollection:
        """Mock Docker image collection"""
        def __init__(self):
            pass
            
        def pull(self, image):
            return {"id": image}
    
    def __init__(self):
        self.containers = self.MockContainerCollection()
        self.images = self.MockImageCollection()
        
    def ping(self):
        return True
        
    def from_env(self):
        return self

logger = logging.getLogger(__name__)

# Initialize Docker client
docker_client = None
try:
    import docker
    docker_client = docker.from_env()
    logger.info("Docker client initialized successfully")
    
    # Check if Docker is running
    docker_client.ping()
    logger.info("Docker daemon is running")
except Exception as e:
    logger.error(f"Error initializing Docker client: {e}")
    logger.warning("Using mock Docker client")
    docker_client = MockDockerClient()
        
# Track active containers
active_containers = {}

def create_container(
    image: str,
    command: str,
    working_dir: str = "/app",
    volumes: Dict[str, Dict[str, str]] = None,
    environment: Dict[str, str] = None,
    network: str = None,
    memory: str = None,
    cpu_limit: float = None,
    timeout: int = 60
) -> Tuple[str, Dict[str, Any]]:
    """
    Create and start a Docker container.
    
    Args:
        image: Docker image to use
        command: Command to run in the container
        working_dir: Working directory in the container
        volumes: Volumes to mount
        environment: Environment variables
        network: Network to use
        memory: Memory limit
        cpu_limit: CPU limit
        timeout: Timeout in seconds
        
    Returns:
        Tuple of container ID and container info
    """
    if not docker_client:
        raise Exception("Docker client is not initialized")
        
    # Generate a unique container name
    container_name = f"{settings.DOCKER_CONTAINER_PREFIX}{uuid.uuid4().hex[:8]}"
    
    # Set default values
    if network is None:
        network = settings.DOCKER_NETWORK
    if memory is None:
        memory = settings.DOCKER_MEMORY_LIMIT
    if cpu_limit is None:
        cpu_limit = settings.DOCKER_CPU_LIMIT
    if timeout is None:
        timeout = settings.DOCKER_TIMEOUT
        
    # Create container
    try:
        container = docker_client.containers.create(
            image=image,
            command=command,
            name=container_name,
            working_dir=working_dir,
            volumes=volumes,
            environment=environment,
            network=network,
            mem_limit=memory,
            cpu_period=100000,  # Docker CPU period (microseconds)
            cpu_quota=int(100000 * cpu_limit),  # CPU quota based on period
            detach=True
        )
        
        # Start container
        container.start()
        
        # Store container info
        container_info = {
            "id": container.id,
            "name": container_name,
            "image": image,
            "command": command,
            "status": "running",
            "start_time": datetime.utcnow(),
            "timeout": timeout
        }
        
        # Add to active containers
        active_containers[container.id] = container_info
        
        return container.id, container_info
    except Exception as e:
        logger.error(f"Error creating container: {e}")
        raise
        
def get_container_logs(container_id: str) -> str:
    """
    Get logs from a container.
    
    Args:
        container_id: Container ID
        
    Returns:
        Container logs
    """
    if not docker_client:
        raise Exception("Docker client is not initialized")
        
    try:
        container = docker_client.containers.get(container_id)
        logs = container.logs().decode("utf-8")
        return logs
    except Exception as e:
        logger.error(f"Error getting container logs: {e}")
        raise
        
def stop_container(container_id: str) -> Dict[str, Any]:
    """
    Stop a container.
    
    Args:
        container_id: Container ID
        
    Returns:
        Container info
    """
    if not docker_client:
        raise Exception("Docker client is not initialized")
        
    try:
        container = docker_client.containers.get(container_id)
        container.stop(timeout=5)
        container.remove()
        
        # Update container info
        if container_id in active_containers:
            container_info = active_containers[container_id]
            container_info["status"] = "stopped"
            container_info["end_time"] = datetime.utcnow()
            del active_containers[container_id]
            return container_info
        else:
            return {
                "id": container_id,
                "status": "stopped",
                "end_time": datetime.utcnow()
            }
    except Exception as e:
        logger.error(f"Error stopping container: {e}")
        raise
        
def execute_code_in_container(
    code: str,
    language: str = "python",
    timeout: int = 60,
    environment: Dict[str, str] = None,
    project_dir: Optional[str] = None,
    image: Optional[str] = None,
    command: Optional[str] = None,
    volumes: Optional[Dict[str, Dict[str, str]]] = None
) -> Dict[str, Any]:
    """
    Execute code in a Docker container.
    
    Args:
        code: Code to execute
        language: Programming language
        timeout: Timeout in seconds
        environment: Environment variables
        
    Returns:
        Execution result
    """
    if not docker_client:
        raise Exception("Docker client is not initialized")
        
    # Create a temporary directory for the code
    temp_dir = tempfile.mkdtemp()
    
    try:
        # If project_dir is provided, we're executing a project
        if project_dir and os.path.exists(project_dir):
            # Use provided volumes or create default
            if not volumes:
                volumes = {
                    project_dir: {"bind": "/app", "mode": "ro"}
                }
                
            # If image and command are not provided, determine them based on language
            if not image or not command:
                if language.lower() == "python":
                    image = image or "python:3.10-slim"
                    command = command or "python /app/main.py"
                elif language.lower() in ["javascript", "js"]:
                    image = image or "node:18-alpine"
                    command = command or "node /app/index.js"
                elif language.lower() in ["typescript", "ts"]:
                    image = image or "node:18-alpine"
                    command = command or "npx ts-node /app/index.ts"
                elif language.lower() in ["html", "web"]:
                    image = image or "nginx:alpine"
                    command = command or "nginx -g 'daemon off;'"
                elif language.lower() == "java":
                    image = image or "openjdk:17-slim"
                    command = command or "java -cp /app Main"
                elif language.lower() == "go":
                    image = image or "golang:1.20-alpine"
                    command = command or "go run /app/main.go"
                else:
                    image = image or "python:3.10-slim"
                    command = command or "python /app/main.py"
        else:
            # Determine file extension and image based on language
            if language.lower() == "python":
                file_ext = ".py"
                image = image or "python:3.10-slim"
                command = command or "python /app/code.py"
            elif language.lower() in ["javascript", "js"]:
                file_ext = ".js"
                image = image or "node:18-alpine"
                command = command or "node /app/code.js"
            elif language.lower() in ["typescript", "ts"]:
                file_ext = ".ts"
                image = image or "node:18-alpine"
                command = command or "npx ts-node /app/code.ts"
            elif language.lower() in ["html", "web"]:
                file_ext = ".html"
                image = image or "nginx:alpine"
                command = command or "nginx -g 'daemon off;'"
            elif language.lower() == "java":
                file_ext = ".java"
                image = image or "openjdk:17-slim"
                command = command or "javac /app/code.java && java -cp /app Main"
            elif language.lower() == "go":
                file_ext = ".go"
                image = image or "golang:1.20-alpine"
                command = command or "go run /app/code.go"
            else:
                raise ValueError(f"Unsupported language: {language}")
                
            # Write code to file
            code_file = os.path.join(temp_dir, f"code{file_ext}")
            with open(code_file, "w") as f:
                f.write(code)
                
            # Set up volumes if not provided
            if not volumes:
                volumes = {
                    temp_dir: {"bind": "/app", "mode": "ro"}
                }
        
        # Create and start container
        container_id, container_info = create_container(
            image=image,
            command=command,
            working_dir="/app",
            volumes=volumes,
            environment=environment,
            timeout=timeout
        )
        
        # Wait for container to finish or timeout
        start_time = time.time()
        container = docker_client.containers.get(container_id)
        
        while container.status == "running":
            # Check if timeout has been reached
            if time.time() - start_time > timeout:
                logger.warning(f"Container {container_id} timed out after {timeout} seconds")
                stop_container(container_id)
                return {
                    "execution_id": container_id,
                    "status": "timeout",
                    "output": get_container_logs(container_id),
                    "error": f"Execution timed out after {timeout} seconds",
                    "start_time": container_info["start_time"],
                    "end_time": datetime.utcnow(),
                    "execution_time": time.time() - start_time
                }
                
            # Wait a bit before checking again
            time.sleep(0.5)
            container.reload()
            
        # Get logs
        logs = get_container_logs(container_id)
        
        # Get exit code
        exit_code = container.attrs["State"]["ExitCode"]
        
        # Remove container
        container.remove()
        
        # Update container info
        if container_id in active_containers:
            container_info = active_containers[container_id]
            container_info["status"] = "completed"
            container_info["end_time"] = datetime.utcnow()
            container_info["exit_code"] = exit_code
            del active_containers[container_id]
            
        # Return result
        return {
            "execution_id": container_id,
            "status": "success" if exit_code == 0 else "error",
            "output": logs,
            "error": None if exit_code == 0 else f"Execution failed with exit code {exit_code}",
            "exit_code": exit_code,
            "start_time": container_info["start_time"],
            "end_time": datetime.utcnow(),
            "execution_time": time.time() - start_time
        }
    except Exception as e:
        logger.error(f"Error executing code: {e}")
        return {
            "execution_id": str(uuid.uuid4()),
            "status": "error",
            "output": "",
            "error": f"Error executing code: {str(e)}",
            "start_time": datetime.utcnow(),
            "end_time": datetime.utcnow(),
            "execution_time": 0
        }
    finally:
        # Clean up temporary directory
        shutil.rmtree(temp_dir)
        
def cleanup_containers():
    """
    Clean up all active containers.
    """
    if not docker_client:
        return
        
    for container_id in list(active_containers.keys()):
        try:
            stop_container(container_id)
        except Exception as e:
            logger.error(f"Error cleaning up container {container_id}: {e}")