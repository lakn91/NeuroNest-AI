"""
Docker service class for executing code in isolated containers.
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
from app.services.docker_service import docker_client, active_containers, create_container, get_container_logs, stop_container, execute_code_in_container, cleanup_containers

logger = logging.getLogger(__name__)

class DockerService:
    """Service for executing code in Docker containers"""
    
    def __init__(self):
        """Initialize Docker service"""
        self.docker_client = docker_client
        
    def create_container(self, image, command, working_dir="/app", volumes=None, environment=None, 
                         network=None, memory=None, cpu_limit=None, timeout=60):
        """Create and start a Docker container"""
        return create_container(image, command, working_dir, volumes, environment, 
                               network, memory, cpu_limit, timeout)
    
    def get_container_logs(self, container_id):
        """Get logs from a container"""
        return get_container_logs(container_id)
    
    def stop_container(self, container_id):
        """Stop a container"""
        return stop_container(container_id)
    
    def execute_code(self, code, language="python", timeout=60, environment=None, 
                    project_dir=None, image=None, command=None, volumes=None):
        """Execute code in a Docker container"""
        return execute_code_in_container(code, language, timeout, environment, 
                                        project_dir, image, command, volumes)
    
    def cleanup(self):
        """Clean up all active containers"""
        return cleanup_containers()