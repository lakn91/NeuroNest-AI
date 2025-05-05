"""
Supabase Runtime Service - Provides runtime environment management with Supabase integration
"""

import os
import uuid
import logging
import asyncio
import docker
import json
import io
import tarfile
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import aiofiles

from app.config import settings
from app.models.execution import RuntimeEnvironment, RuntimeStatus, RuntimeLog
from app.services.docker_service_class import DockerService
from app.services.file_service_class import FileService
from app.database.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

class SupabaseRuntimeService:
    """
    Service for managing runtime environments for executing code with Supabase integration
    """
    
    def __init__(self):
        self.logger = logger
        self.docker_service = DockerService()
        self.file_service = FileService()
        
        # Initialize Docker client if code execution is enabled
        self.docker_client = None
        if settings.ENABLE_CODE_EXECUTION:
            self._init_docker_client()
        
        # Set up runtime paths
        self.runtime_base_path = settings.PROJECTS_DIR
        os.makedirs(self.runtime_base_path, exist_ok=True)
        
        # Initialize Supabase client
        self.supabase = get_supabase_client()
        
        # Cache for runtime data
        self.runtime_cache = {}
    
    def _init_docker_client(self):
        """
        Initialize the Docker client
        """
        try:
            self.docker_client = docker.from_env()
            self.logger.info("Docker client initialized")
        except Exception as e:
            self.logger.error(f"Error initializing Docker client: {e}")
            raise ValueError(f"Failed to initialize Docker client: {str(e)}")
    
    async def create_runtime(
        self,
        project_id: str,
        language: str,
        user_id: str,
        environment_vars: Dict[str, str] = None,
        entry_point: Optional[str] = None,
        timeout: int = 300
    ) -> RuntimeEnvironment:
        """
        Create a new runtime environment for a project with Supabase integration
        """
        runtime_id = str(uuid.uuid4())
        runtime_path = os.path.join(self.runtime_base_path, runtime_id)
        os.makedirs(runtime_path, exist_ok=True)
        
        # Copy project files to runtime directory
        project_path = await self.file_service.get_project_path(project_id)
        await self.file_service.copy_directory(project_path, runtime_path)
        
        # Create runtime environment
        created_at = datetime.now().isoformat()
        runtime = RuntimeEnvironment(
            id=runtime_id,
            project_id=project_id,
            language=language,
            status="created",
            created_at=created_at,
            updated_at=created_at,
            environment_vars=environment_vars or {},
            entry_point=entry_point,
            container_id=None,
            port=None,
            url=None,
            timeout=timeout
        )
        
        # Store runtime metadata in Supabase
        try:
            runtime_data = {
                "id": runtime_id,
                "project_id": project_id,
                "user_id": user_id,
                "language": language,
                "status": "created",
                "created_at": created_at,
                "updated_at": created_at,
                "environment_vars": json.dumps(environment_vars or {}),
                "entry_point": entry_point,
                "container_id": None,
                "port": None,
                "url": None,
                "timeout": timeout
            }
            
            # Insert into Supabase
            response = self.supabase.table("runtimes").insert(runtime_data).execute()
            
            if hasattr(response, 'error') and response.error:
                self.logger.error(f"Error storing runtime in Supabase: {response.error}")
                # Fall back to in-memory storage
                self.runtime_cache[runtime_id] = runtime
            else:
                self.logger.info(f"Runtime {runtime_id} stored in Supabase")
                # Cache the runtime
                self.runtime_cache[runtime_id] = runtime
            
            # Create initial log entry
            await self._add_log(
                runtime_id=runtime_id,
                user_id=user_id,
                message="Runtime environment created",
                log_type="info"
            )
            
            return runtime
        except Exception as e:
            self.logger.error(f"Error creating runtime: {str(e)}", exc_info=True)
            # Fall back to in-memory storage
            self.runtime_cache[runtime_id] = runtime
            return runtime
    
    async def start_runtime(self, runtime_id: str, user_id: str) -> RuntimeEnvironment:
        """
        Start a runtime environment with Supabase integration
        """
        # Get runtime from Supabase
        runtime = await self._get_runtime(runtime_id)
        
        if not runtime:
            raise ValueError(f"Runtime {runtime_id} not found")
        
        runtime_path = os.path.join(self.runtime_base_path, runtime_id)
        
        # Update runtime status
        runtime.status = "starting"
        runtime.updated_at = datetime.now().isoformat()
        await self._update_runtime_status(runtime_id, "starting")
        
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
            
            # Update in Supabase
            await self._update_runtime(runtime_id, {
                "container_id": container.id,
                "port": port,
                "url": url,
                "status": "running",
                "updated_at": datetime.now().isoformat()
            })
            
            # Start the entry point if specified
            if runtime.entry_point:
                await self.execute_command(
                    runtime_id=runtime_id,
                    user_id=user_id,
                    command=f"cd /app && {self._get_run_command(runtime.language, runtime.entry_point)}"
                )
            
            # Log the startup
            await self._add_log(runtime_id, user_id, "Runtime started successfully", "info")
            
            return runtime
        except Exception as e:
            # Update runtime status on failure
            runtime.status = "failed"
            runtime.updated_at = datetime.now().isoformat()
            await self._update_runtime_status(runtime_id, "failed")
            await self._add_log(runtime_id, user_id, f"Failed to start runtime: {str(e)}", "error")
            logger.error(f"Error starting runtime {runtime_id}: {str(e)}", exc_info=True)
            raise
    
    async def stop_runtime(self, runtime_id: str, user_id: str) -> None:
        """
        Stop a runtime environment with Supabase integration
        """
        # Get runtime from Supabase
        runtime = await self._get_runtime(runtime_id)
        
        if not runtime:
            raise ValueError(f"Runtime {runtime_id} not found")
        
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
                
                # Update in Supabase
                await self._update_runtime(runtime_id, {
                    "container_id": None,
                    "port": None,
                    "url": None,
                    "status": "stopped",
                    "updated_at": datetime.now().isoformat()
                })
                
                await self._add_log(runtime_id, user_id, "Runtime stopped successfully", "info")
            except Exception as e:
                await self._add_log(runtime_id, user_id, f"Failed to stop runtime: {str(e)}", "error")
                logger.error(f"Error stopping runtime {runtime_id}: {str(e)}", exc_info=True)
                raise
    
    async def delete_runtime(self, runtime_id: str, user_id: str) -> None:
        """
        Delete a runtime environment with Supabase integration
        """
        # Get runtime from Supabase
        runtime = await self._get_runtime(runtime_id)
        
        if not runtime:
            raise ValueError(f"Runtime {runtime_id} not found")
        
        # Stop the runtime if it's running
        if runtime.status == "running" and runtime.container_id:
            await self.stop_runtime(runtime_id, user_id)
        
        # Delete runtime directory
        runtime_path = os.path.join(self.runtime_base_path, runtime_id)
        if os.path.exists(runtime_path):
            import shutil
            shutil.rmtree(runtime_path)
        
        # Delete from Supabase
        try:
            # Delete logs
            self.supabase.table("runtime_logs").delete().eq("runtime_id", runtime_id).execute()
            
            # Delete runtime
            self.supabase.table("runtimes").delete().eq("id", runtime_id).execute()
            
            # Remove from cache
            if runtime_id in self.runtime_cache:
                del self.runtime_cache[runtime_id]
                
            self.logger.info(f"Runtime {runtime_id} deleted from Supabase")
        except Exception as e:
            self.logger.error(f"Error deleting runtime from Supabase: {str(e)}", exc_info=True)
    
    async def execute_command(self, runtime_id: str, user_id: str, command: str) -> str:
        """
        Execute a command in a runtime environment with Supabase integration
        """
        # Get runtime from Supabase
        runtime = await self._get_runtime(runtime_id)
        
        if not runtime:
            raise ValueError(f"Runtime {runtime_id} not found")
        
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
            await self._add_log(runtime_id, user_id, f"Command executed: {command}", "info")
            await self._add_log(runtime_id, user_id, f"Result: {result}", "output")
            
            return result
        except Exception as e:
            await self._add_log(runtime_id, user_id, f"Command failed: {command}", "error")
            await self._add_log(runtime_id, user_id, f"Error: {str(e)}", "error")
            logger.error(f"Error executing command in runtime {runtime_id}: {str(e)}", exc_info=True)
            raise
    
    async def get_runtime_status(self, runtime_id: str) -> RuntimeStatus:
        """
        Get the status of a runtime environment with Supabase integration
        """
        # Get runtime from Supabase
        runtime = await self._get_runtime(runtime_id)
        
        if not runtime:
            raise ValueError(f"Runtime {runtime_id} not found")
        
        # Check if the container is still running
        if runtime.status == "running" and runtime.container_id:
            try:
                container_info = await self.docker_service.inspect_container(runtime.container_id)
                if not container_info["State"]["Running"]:
                    runtime.status = "stopped"
                    runtime.updated_at = datetime.now().isoformat()
                    await self._update_runtime_status(runtime_id, "stopped")
            except Exception:
                # Container might have been removed externally
                runtime.status = "unknown"
                runtime.updated_at = datetime.now().isoformat()
                await self._update_runtime_status(runtime_id, "unknown")
        
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
        Get logs from a runtime environment with Supabase integration
        """
        try:
            # Get logs from Supabase
            response = self.supabase.table("runtime_logs") \
                .select("*") \
                .eq("runtime_id", runtime_id) \
                .order("timestamp", desc=True) \
                .limit(limit) \
                .offset(offset) \
                .execute()
            
            if hasattr(response, 'error') and response.error:
                self.logger.error(f"Error getting runtime logs from Supabase: {response.error}")
                return []
            
            logs = []
            for log_data in response.data:
                log = RuntimeLog(
                    id=log_data["id"],
                    runtime_id=log_data["runtime_id"],
                    timestamp=log_data["timestamp"],
                    message=log_data["message"],
                    type=log_data["type"]
                )
                logs.append(log)
            
            return logs
        except Exception as e:
            self.logger.error(f"Error getting runtime logs: {str(e)}", exc_info=True)
            return []
    
    async def list_runtimes(self, project_id: Optional[str] = None, user_id: Optional[str] = None) -> List[RuntimeEnvironment]:
        """
        List all runtime environments with Supabase integration, optionally filtered by project_id or user_id
        """
        try:
            # Build query
            query = self.supabase.table("runtimes").select("*")
            
            if project_id:
                query = query.eq("project_id", project_id)
            
            if user_id:
                query = query.eq("user_id", user_id)
            
            # Execute query
            response = query.execute()
            
            if hasattr(response, 'error') and response.error:
                self.logger.error(f"Error listing runtimes from Supabase: {response.error}")
                return []
            
            runtimes = []
            for runtime_data in response.data:
                runtime = RuntimeEnvironment(
                    id=runtime_data["id"],
                    project_id=runtime_data["project_id"],
                    language=runtime_data["language"],
                    status=runtime_data["status"],
                    created_at=runtime_data["created_at"],
                    updated_at=runtime_data["updated_at"],
                    environment_vars=json.loads(runtime_data["environment_vars"]) if runtime_data["environment_vars"] else {},
                    entry_point=runtime_data["entry_point"],
                    container_id=runtime_data["container_id"],
                    port=runtime_data["port"],
                    url=runtime_data["url"],
                    timeout=runtime_data["timeout"]
                )
                runtimes.append(runtime)
                
                # Update cache
                self.runtime_cache[runtime.id] = runtime
            
            return runtimes
        except Exception as e:
            self.logger.error(f"Error listing runtimes: {str(e)}", exc_info=True)
            return []
    
    async def cleanup_old_runtimes(self) -> None:
        """
        Clean up old runtime environments with Supabase integration
        """
        try:
            # Get runtimes older than 24 hours
            cutoff_time = (datetime.now() - timedelta(hours=24)).isoformat()
            
            response = self.supabase.table("runtimes") \
                .select("id,user_id") \
                .lt("updated_at", cutoff_time) \
                .execute()
            
            if hasattr(response, 'error') and response.error:
                self.logger.error(f"Error getting old runtimes from Supabase: {response.error}")
                return
            
            # Delete old runtimes
            for runtime_data in response.data:
                try:
                    await self.delete_runtime(runtime_data["id"], runtime_data["user_id"])
                    logger.info(f"Cleaned up old runtime {runtime_data['id']}")
                except Exception as e:
                    logger.error(f"Error cleaning up runtime {runtime_data['id']}: {str(e)}", exc_info=True)
        except Exception as e:
            logger.error(f"Error cleaning up old runtimes: {str(e)}", exc_info=True)
    
    async def _add_log(self, runtime_id: str, user_id: str, message: str, log_type: str) -> None:
        """
        Add a log entry to a runtime environment with Supabase integration
        """
        log_id = str(uuid.uuid4())
        timestamp = datetime.now().isoformat()
        
        log = RuntimeLog(
            id=log_id,
            runtime_id=runtime_id,
            timestamp=timestamp,
            message=message,
            type=log_type
        )
        
        # Store in Supabase
        try:
            log_data = {
                "id": log_id,
                "runtime_id": runtime_id,
                "user_id": user_id,
                "timestamp": timestamp,
                "message": message,
                "type": log_type
            }
            
            response = self.supabase.table("runtime_logs").insert(log_data).execute()
            
            if hasattr(response, 'error') and response.error:
                self.logger.error(f"Error storing runtime log in Supabase: {response.error}")
        except Exception as e:
            self.logger.error(f"Error adding runtime log: {str(e)}", exc_info=True)
    
    async def _get_runtime(self, runtime_id: str) -> Optional[RuntimeEnvironment]:
        """
        Get a runtime environment from Supabase or cache
        """
        # Check cache first
        if runtime_id in self.runtime_cache:
            return self.runtime_cache[runtime_id]
        
        try:
            # Get from Supabase
            response = self.supabase.table("runtimes").select("*").eq("id", runtime_id).execute()
            
            if hasattr(response, 'error') and response.error:
                self.logger.error(f"Error getting runtime from Supabase: {response.error}")
                return None
            
            if not response.data:
                return None
            
            runtime_data = response.data[0]
            
            runtime = RuntimeEnvironment(
                id=runtime_data["id"],
                project_id=runtime_data["project_id"],
                language=runtime_data["language"],
                status=runtime_data["status"],
                created_at=runtime_data["created_at"],
                updated_at=runtime_data["updated_at"],
                environment_vars=json.loads(runtime_data["environment_vars"]) if runtime_data["environment_vars"] else {},
                entry_point=runtime_data["entry_point"],
                container_id=runtime_data["container_id"],
                port=runtime_data["port"],
                url=runtime_data["url"],
                timeout=runtime_data["timeout"]
            )
            
            # Update cache
            self.runtime_cache[runtime_id] = runtime
            
            return runtime
        except Exception as e:
            self.logger.error(f"Error getting runtime: {str(e)}", exc_info=True)
            return None
    
    async def _update_runtime(self, runtime_id: str, update_data: Dict[str, Any]) -> None:
        """
        Update a runtime environment in Supabase
        """
        try:
            response = self.supabase.table("runtimes").update(update_data).eq("id", runtime_id).execute()
            
            if hasattr(response, 'error') and response.error:
                self.logger.error(f"Error updating runtime in Supabase: {response.error}")
            else:
                # Update cache if it exists
                if runtime_id in self.runtime_cache:
                    runtime = self.runtime_cache[runtime_id]
                    for key, value in update_data.items():
                        setattr(runtime, key, value)
        except Exception as e:
            self.logger.error(f"Error updating runtime: {str(e)}", exc_info=True)
    
    async def _update_runtime_status(self, runtime_id: str, status: str) -> None:
        """
        Update a runtime environment status in Supabase
        """
        await self._update_runtime(runtime_id, {
            "status": status,
            "updated_at": datetime.now().isoformat()
        })
    
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
            "rust": "rust:1.67-slim",
            "c": "gcc:11.2",
            "cpp": "gcc:11.2",
            "csharp": "mcr.microsoft.com/dotnet/sdk:6.0",
            "dart": "dart:2.19",
            "kotlin": "openjdk:17-slim",
            "swift": "swift:5.7",
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
        elif language == "rust":
            return f"cargo run --manifest-path {entry_point}"
        elif language in ["c", "cpp"]:
            return f"gcc {entry_point} -o /tmp/output && /tmp/output"
        elif language == "csharp":
            return f"dotnet run --project {entry_point}"
        elif language == "dart":
            return f"dart run {entry_point}"
        elif language == "kotlin":
            return f"kotlinc {entry_point} -include-runtime -d /tmp/output.jar && java -jar /tmp/output.jar"
        elif language == "swift":
            return f"swift {entry_point}"
        else:
            return f"sh {entry_point}"
    
    async def close(self):
        """
        Close the runtime service
        """
        try:
            # Stop all running containers
            try:
                response = self.supabase.table("runtimes") \
                    .select("id,user_id") \
                    .eq("status", "running") \
                    .execute()
                
                if not hasattr(response, 'error') or not response.error:
                    for runtime_data in response.data:
                        try:
                            await self.stop_runtime(runtime_data["id"], runtime_data["user_id"])
                            self.logger.info(f"Runtime {runtime_data['id']} stopped during shutdown")
                        except Exception as e:
                            self.logger.error(f"Error stopping runtime {runtime_data['id']} during shutdown: {e}")
            except Exception as e:
                self.logger.error(f"Error stopping runtimes during shutdown: {e}")
            
            # Close Docker client
            if self.docker_client:
                self.docker_client.close()
                self.docker_client = None
                self.logger.info("Docker client closed")
            
            # Close Docker service
            if hasattr(self.docker_service, 'close'):
                await self.docker_service.close()
                self.logger.info("Docker service closed")
            
            self.logger.info("Runtime service closed")
        except Exception as e:
            self.logger.error(f"Error closing runtime service: {e}")