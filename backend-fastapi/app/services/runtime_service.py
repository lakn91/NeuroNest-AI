import os
import uuid
import logging
import asyncio
import docker
import json
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import aiofiles
from app.models.execution import RuntimeEnvironment, RuntimeStatus, RuntimeLog
from app.services.docker_service import DockerService
from app.services.file_service import FileService

logger = logging.getLogger(__name__)

class RuntimeService:
    """
    Service for managing runtime environments for executing code
    """
    
    def __init__(self):
        self.docker_service = DockerService()
        self.file_service = FileService()
        self.runtime_base_path = os.path.join(os.getcwd(), "static", "runtimes")
        os.makedirs(self.runtime_base_path, exist_ok=True)
        
        # In-memory storage for runtime metadata
        # In a production environment, this would be stored in a database
        self.runtimes = {}
        self.runtime_logs = {}
    
    async def create_runtime(
        self,
        project_id: str,
        language: str,
        environment_vars: Dict[str, str] = None,
        entry_point: Optional[str] = None,
        timeout: int = 300
    ) -> RuntimeEnvironment:
        """
        Create a new runtime environment for a project
        """
        runtime_id = str(uuid.uuid4())
        runtime_path = os.path.join(self.runtime_base_path, runtime_id)
        os.makedirs(runtime_path, exist_ok=True)
        
        # Copy project files to runtime directory
        project_path = await self.file_service.get_project_path(project_id)
        await self.file_service.copy_directory(project_path, runtime_path)
        
        # Create runtime environment
        runtime = RuntimeEnvironment(
            id=runtime_id,
            project_id=project_id,
            language=language,
            status="created",
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            environment_vars=environment_vars or {},
            entry_point=entry_point,
            container_id=None,
            port=None,
            url=None,
            timeout=timeout
        )
        
        # Store runtime metadata
        self.runtimes[runtime_id] = runtime
        self.runtime_logs[runtime_id] = []
        
        return runtime
    
    async def start_runtime(self, runtime_id: str) -> RuntimeEnvironment:
        """
        Start a runtime environment
        """
        if runtime_id not in self.runtimes:
            raise ValueError(f"Runtime {runtime_id} not found")
        
        runtime = self.runtimes[runtime_id]
        runtime_path = os.path.join(self.runtime_base_path, runtime_id)
        
        # Update runtime status
        runtime.status = "starting"
        runtime.updated_at = datetime.now().isoformat()
        
        try:
            # Determine the appropriate Docker image based on language
            image = self._get_docker_image_for_language(runtime.language)
            
            # Prepare container configuration
            container_config = {
                "image": image,
                "volumes": {runtime_path: {"bind": "/app", "mode": "rw"}},
                "working_dir": "/app",
                "environment": runtime.environment_vars,
                "ports": {"8000/tcp": None},  # Dynamically assign a port
                "detach": True,
            }
            
            # Create and start the container
            container = await self.docker_service.create_container(**container_config)
            container_info = await self.docker_service.inspect_container(container.id)
            
            # Get the assigned port
            port = list(container_info["NetworkSettings"]["Ports"]["8000/tcp"][0]["HostPort"])
            url = f"http://localhost:{port}"
            
            # Update runtime with container information
            runtime.container_id = container.id
            runtime.port = port
            runtime.url = url
            runtime.status = "running"
            runtime.updated_at = datetime.now().isoformat()
            
            # Start the entry point if specified
            if runtime.entry_point:
                await self.execute_command(
                    runtime_id=runtime_id,
                    command=f"cd /app && {self._get_run_command(runtime.language, runtime.entry_point)}"
                )
            
            # Log the startup
            self._add_log(runtime_id, "Runtime started successfully", "info")
            
            return runtime
        except Exception as e:
            # Update runtime status on failure
            runtime.status = "failed"
            runtime.updated_at = datetime.now().isoformat()
            self._add_log(runtime_id, f"Failed to start runtime: {str(e)}", "error")
            logger.error(f"Error starting runtime {runtime_id}: {str(e)}", exc_info=True)
            raise
    
    async def stop_runtime(self, runtime_id: str) -> None:
        """
        Stop a runtime environment
        """
        if runtime_id not in self.runtimes:
            raise ValueError(f"Runtime {runtime_id} not found")
        
        runtime = self.runtimes[runtime_id]
        
        if runtime.container_id:
            try:
                await self.docker_service.stop_container(runtime.container_id)
                await self.docker_service.remove_container(runtime.container_id)
                
                # Update runtime status
                runtime.status = "stopped"
                runtime.updated_at = datetime.now().isoformat()
                runtime.container_id = None
                runtime.port = None
                runtime.url = None
                
                self._add_log(runtime_id, "Runtime stopped successfully", "info")
            except Exception as e:
                self._add_log(runtime_id, f"Failed to stop runtime: {str(e)}", "error")
                logger.error(f"Error stopping runtime {runtime_id}: {str(e)}", exc_info=True)
                raise
    
    async def delete_runtime(self, runtime_id: str) -> None:
        """
        Delete a runtime environment
        """
        if runtime_id not in self.runtimes:
            raise ValueError(f"Runtime {runtime_id} not found")
        
        # Stop the runtime if it's running
        runtime = self.runtimes[runtime_id]
        if runtime.status == "running" and runtime.container_id:
            await self.stop_runtime(runtime_id)
        
        # Delete runtime directory
        runtime_path = os.path.join(self.runtime_base_path, runtime_id)
        if os.path.exists(runtime_path):
            import shutil
            shutil.rmtree(runtime_path)
        
        # Remove runtime metadata
        del self.runtimes[runtime_id]
        del self.runtime_logs[runtime_id]
    
    async def execute_command(self, runtime_id: str, command: str) -> str:
        """
        Execute a command in a runtime environment
        """
        if runtime_id not in self.runtimes:
            raise ValueError(f"Runtime {runtime_id} not found")
        
        runtime = self.runtimes[runtime_id]
        
        if runtime.status != "running" or not runtime.container_id:
            raise ValueError(f"Runtime {runtime_id} is not running")
        
        try:
            # Execute the command in the container
            result = await self.docker_service.exec_command(
                container_id=runtime.container_id,
                command=command,
                workdir="/app"
            )
            
            # Log the command and result
            self._add_log(runtime_id, f"Command executed: {command}", "info")
            self._add_log(runtime_id, f"Result: {result}", "output")
            
            return result
        except Exception as e:
            self._add_log(runtime_id, f"Command failed: {command}", "error")
            self._add_log(runtime_id, f"Error: {str(e)}", "error")
            logger.error(f"Error executing command in runtime {runtime_id}: {str(e)}", exc_info=True)
            raise
    
    async def get_runtime_status(self, runtime_id: str) -> RuntimeStatus:
        """
        Get the status of a runtime environment
        """
        if runtime_id not in self.runtimes:
            raise ValueError(f"Runtime {runtime_id} not found")
        
        runtime = self.runtimes[runtime_id]
        
        # Check if the container is still running
        if runtime.status == "running" and runtime.container_id:
            try:
                container_info = await self.docker_service.inspect_container(runtime.container_id)
                if not container_info["State"]["Running"]:
                    runtime.status = "stopped"
                    runtime.updated_at = datetime.now().isoformat()
            except Exception:
                # Container might have been removed externally
                runtime.status = "unknown"
                runtime.updated_at = datetime.now().isoformat()
        
        return RuntimeStatus(
            id=runtime.id,
            status=runtime.status,
            container_id=runtime.container_id,
            port=runtime.port,
            url=runtime.url,
            updated_at=runtime.updated_at
        )
    
    async def get_runtime_logs(
        self, 
        runtime_id: str, 
        limit: int = 100, 
        offset: int = 0
    ) -> List[RuntimeLog]:
        """
        Get logs from a runtime environment
        """
        if runtime_id not in self.runtime_logs:
            raise ValueError(f"Runtime {runtime_id} not found")
        
        logs = self.runtime_logs[runtime_id]
        
        # Apply pagination
        paginated_logs = logs[offset:offset + limit]
        
        return paginated_logs
    
    async def list_runtimes(self, project_id: Optional[str] = None) -> List[RuntimeEnvironment]:
        """
        List all runtime environments, optionally filtered by project_id
        """
        if project_id:
            return [runtime for runtime in self.runtimes.values() if runtime.project_id == project_id]
        else:
            return list(self.runtimes.values())
    
    async def cleanup_old_runtimes(self) -> None:
        """
        Clean up old runtime environments
        """
        current_time = datetime.now()
        runtime_ids_to_delete = []
        
        for runtime_id, runtime in self.runtimes.items():
            # Parse the updated_at timestamp
            updated_at = datetime.fromisoformat(runtime.updated_at)
            
            # Check if the runtime is older than 24 hours
            if current_time - updated_at > timedelta(hours=24):
                runtime_ids_to_delete.append(runtime_id)
        
        # Delete old runtimes
        for runtime_id in runtime_ids_to_delete:
            try:
                await self.delete_runtime(runtime_id)
                logger.info(f"Cleaned up old runtime {runtime_id}")
            except Exception as e:
                logger.error(f"Error cleaning up runtime {runtime_id}: {str(e)}", exc_info=True)
    
    def _add_log(self, runtime_id: str, message: str, log_type: str) -> None:
        """
        Add a log entry to a runtime environment
        """
        if runtime_id not in self.runtime_logs:
            self.runtime_logs[runtime_id] = []
        
        log = RuntimeLog(
            id=str(uuid.uuid4()),
            runtime_id=runtime_id,
            timestamp=datetime.now().isoformat(),
            message=message,
            type=log_type
        )
        
        self.runtime_logs[runtime_id].append(log)
    
    def _get_docker_image_for_language(self, language: str) -> str:
        """
        Get the appropriate Docker image for a language
        """
        language_images = {
            "python": "python:3.10-slim",
            "node": "node:18-alpine",
            "javascript": "node:18-alpine",
            "typescript": "node:18-alpine",
            "java": "openjdk:17-slim",
            "go": "golang:1.19-alpine",
            "ruby": "ruby:3.1-slim",
            "php": "php:8.1-apache",
        }
        
        return language_images.get(language.lower(), "python:3.10-slim")
    
    def _get_run_command(self, language: str, entry_point: str) -> str:
        """
        Get the appropriate run command for a language and entry point
        """
        language = language.lower()
        
        if language == "python":
            return f"python {entry_point}"
        elif language in ["node", "javascript"]:
            return f"node {entry_point}"
        elif language == "typescript":
            return f"npx ts-node {entry_point}"
        elif language == "java":
            # Assuming the entry point is a compiled .class file
            return f"java {entry_point}"
        elif language == "go":
            return f"go run {entry_point}"
        elif language == "ruby":
            return f"ruby {entry_point}"
        elif language == "php":
            return f"php {entry_point}"
        else:
            return f"sh {entry_point}"