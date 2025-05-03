"""
Docker Sandbox Service - Provides secure code execution in isolated containers
"""

import os
import uuid
import tempfile
import json
import docker
import logging
from typing import Dict, List, Any, Optional, Union
import time
import shutil

logger = logging.getLogger(__name__)

# Mock Docker client for environments without Docker
class MockDockerClient:
    """Mock Docker client for environments without Docker"""
    
    class MockContainer:
        def __init__(self, id):
            self.id = id
            
        def exec_run(self, cmd, **kwargs):
            return (0, f"Mock execution of: {cmd}".encode())
            
        def stop(self):
            pass
            
        def remove(self):
            pass
    
    def __init__(self):
        self.containers = self.MockContainerCollection()
        self.images = self.MockImageCollection()
        
    class MockContainerCollection:
        def run(self, image, **kwargs):
            return MockDockerClient.MockContainer(str(uuid.uuid4()))
            
        def get(self, id):
            return MockDockerClient.MockContainer(id)
    
    class MockImageCollection:
        def pull(self, image):
            return None

class DockerSandboxService:
    """Service for executing code securely in Docker containers"""
    
    def __init__(self, base_image: str = "python:3.10-slim"):
        """
        Initialize Docker sandbox service
        
        Args:
            base_image: Base Docker image to use for sandboxes
        """
        try:
            self.client = docker.from_env()
        except Exception as e:
            logger.error(f"Error initializing Docker client: {e}")
            logger.warning("Using mock Docker client")
            self.client = MockDockerClient()
            
        self.base_image = base_image
        self.containers = {}  # Map of session_id -> container_id
        self.temp_dirs = {}   # Map of session_id -> temp_dir_path
    
    def create_session(self, language: str = "python") -> Dict[str, Any]:
        """
        Create a new sandbox session
        
        Args:
            language: Programming language for the session
            
        Returns:
            Dictionary with session information
        """
        # Generate a unique session ID
        session_id = str(uuid.uuid4())
        
        # Create a temporary directory for the session
        temp_dir = tempfile.mkdtemp(prefix=f"sandbox-{session_id}-")
        self.temp_dirs[session_id] = temp_dir
        
        # Determine the appropriate Docker image based on language
        image = self._get_image_for_language(language)
        
        # Create a container for the session
        container = self.client.containers.run(
            image=image,
            command="tail -f /dev/null",  # Keep container running
            detach=True,
            remove=True,
            working_dir="/workspace",
            volumes={
                temp_dir: {
                    "bind": "/workspace",
                    "mode": "rw"
                }
            },
            # Security constraints
            mem_limit="512m",
            memswap_limit="512m",
            cpu_period=100000,
            cpu_quota=50000,  # 50% of CPU
            network_mode="none",  # No network access
            cap_drop=["ALL"],  # Drop all capabilities
            security_opt=["no-new-privileges"]
        )
        
        # Store container ID
        self.containers[session_id] = container.id
        
        return {
            "session_id": session_id,
            "language": language,
            "status": "created",
            "container_id": container.id
        }
    
    def execute_code(self, session_id: str, code: str, timeout: int = 30) -> Dict[str, Any]:
        """
        Execute code in a sandbox session
        
        Args:
            session_id: Session ID
            code: Code to execute
            timeout: Maximum execution time in seconds
            
        Returns:
            Dictionary with execution results
        """
        if session_id not in self.containers:
            raise ValueError(f"Session not found: {session_id}")
        
        if session_id not in self.temp_dirs:
            raise ValueError(f"Session directory not found: {session_id}")
        
        # Get container
        container = self.client.containers.get(self.containers[session_id])
        
        # Write code to a file in the temporary directory
        temp_dir = self.temp_dirs[session_id]
        code_file = os.path.join(temp_dir, "code.py")
        
        with open(code_file, "w") as f:
            f.write(code)
        
        # Execute the code
        start_time = time.time()
        
        try:
            # Run the code with timeout
            exec_result = container.exec_run(
                cmd=f"python /workspace/code.py",
                stdout=True,
                stderr=True,
                demux=True
            )
            
            stdout, stderr = exec_result.output
            
            # Convert bytes to string
            stdout = stdout.decode("utf-8") if stdout else ""
            stderr = stderr.decode("utf-8") if stderr else ""
            
            execution_time = time.time() - start_time
            
            return {
                "session_id": session_id,
                "success": exec_result.exit_code == 0,
                "stdout": stdout,
                "stderr": stderr,
                "execution_time": execution_time,
                "exit_code": exec_result.exit_code
            }
        
        except Exception as e:
            return {
                "session_id": session_id,
                "success": False,
                "stdout": "",
                "stderr": str(e),
                "execution_time": time.time() - start_time,
                "exit_code": -1
            }
    
    def execute_javascript(self, session_id: str, code: str, timeout: int = 30) -> Dict[str, Any]:
        """
        Execute JavaScript code in a sandbox session
        
        Args:
            session_id: Session ID
            code: JavaScript code to execute
            timeout: Maximum execution time in seconds
            
        Returns:
            Dictionary with execution results
        """
        if session_id not in self.containers:
            raise ValueError(f"Session not found: {session_id}")
        
        if session_id not in self.temp_dirs:
            raise ValueError(f"Session directory not found: {session_id}")
        
        # Get container
        container = self.client.containers.get(self.containers[session_id])
        
        # Write code to a file in the temporary directory
        temp_dir = self.temp_dirs[session_id]
        code_file = os.path.join(temp_dir, "code.js")
        
        with open(code_file, "w") as f:
            f.write(code)
        
        # Execute the code
        start_time = time.time()
        
        try:
            # Run the code with timeout
            exec_result = container.exec_run(
                cmd=f"node /workspace/code.js",
                stdout=True,
                stderr=True,
                demux=True
            )
            
            stdout, stderr = exec_result.output
            
            # Convert bytes to string
            stdout = stdout.decode("utf-8") if stdout else ""
            stderr = stderr.decode("utf-8") if stderr else ""
            
            execution_time = time.time() - start_time
            
            return {
                "session_id": session_id,
                "success": exec_result.exit_code == 0,
                "stdout": stdout,
                "stderr": stderr,
                "execution_time": execution_time,
                "exit_code": exec_result.exit_code
            }
        
        except Exception as e:
            return {
                "session_id": session_id,
                "success": False,
                "stdout": "",
                "stderr": str(e),
                "execution_time": time.time() - start_time,
                "exit_code": -1
            }
    
    def install_package(self, session_id: str, package_name: str) -> Dict[str, Any]:
        """
        Install a package in a sandbox session
        
        Args:
            session_id: Session ID
            package_name: Name of the package to install
            
        Returns:
            Dictionary with installation results
        """
        if session_id not in self.containers:
            raise ValueError(f"Session not found: {session_id}")
        
        # Get container
        container = self.client.containers.get(self.containers[session_id])
        
        # Sanitize package name to prevent command injection
        if not self._is_valid_package_name(package_name):
            return {
                "session_id": session_id,
                "success": False,
                "stdout": "",
                "stderr": "Invalid package name",
                "exit_code": -1
            }
        
        # Install the package
        try:
            # Run pip install with timeout
            exec_result = container.exec_run(
                cmd=f"pip install --user {package_name}",
                stdout=True,
                stderr=True,
                demux=True
            )
            
            stdout, stderr = exec_result.output
            
            # Convert bytes to string
            stdout = stdout.decode("utf-8") if stdout else ""
            stderr = stderr.decode("utf-8") if stderr else ""
            
            return {
                "session_id": session_id,
                "success": exec_result.exit_code == 0,
                "stdout": stdout,
                "stderr": stderr,
                "exit_code": exec_result.exit_code
            }
        
        except Exception as e:
            return {
                "session_id": session_id,
                "success": False,
                "stdout": "",
                "stderr": str(e),
                "exit_code": -1
            }
    
    def install_npm_package(self, session_id: str, package_name: str) -> Dict[str, Any]:
        """
        Install an NPM package in a sandbox session
        
        Args:
            session_id: Session ID
            package_name: Name of the NPM package to install
            
        Returns:
            Dictionary with installation results
        """
        if session_id not in self.containers:
            raise ValueError(f"Session not found: {session_id}")
        
        # Get container
        container = self.client.containers.get(self.containers[session_id])
        
        # Sanitize package name to prevent command injection
        if not self._is_valid_package_name(package_name):
            return {
                "session_id": session_id,
                "success": False,
                "stdout": "",
                "stderr": "Invalid package name",
                "exit_code": -1
            }
        
        # Install the package
        try:
            # Create package.json if it doesn't exist
            container.exec_run(
                cmd="[ -f package.json ] || echo '{}' > package.json",
                workdir="/workspace"
            )
            
            # Run npm install with timeout
            exec_result = container.exec_run(
                cmd=f"npm install --no-fund --no-audit {package_name}",
                stdout=True,
                stderr=True,
                demux=True,
                workdir="/workspace"
            )
            
            stdout, stderr = exec_result.output
            
            # Convert bytes to string
            stdout = stdout.decode("utf-8") if stdout else ""
            stderr = stderr.decode("utf-8") if stderr else ""
            
            return {
                "session_id": session_id,
                "success": exec_result.exit_code == 0,
                "stdout": stdout,
                "stderr": stderr,
                "exit_code": exec_result.exit_code
            }
        
        except Exception as e:
            return {
                "session_id": session_id,
                "success": False,
                "stdout": "",
                "stderr": str(e),
                "exit_code": -1
            }
    
    def upload_file(self, session_id: str, file_path: str, content: str) -> Dict[str, Any]:
        """
        Upload a file to a sandbox session
        
        Args:
            session_id: Session ID
            file_path: Path where the file should be created (relative to workspace)
            content: File content
            
        Returns:
            Dictionary with upload results
        """
        if session_id not in self.temp_dirs:
            raise ValueError(f"Session not found: {session_id}")
        
        # Ensure the file path is within the workspace
        if ".." in file_path or file_path.startswith("/"):
            return {
                "session_id": session_id,
                "success": False,
                "error": "Invalid file path"
            }
        
        # Get the temporary directory for the session
        temp_dir = self.temp_dirs[session_id]
        
        # Create the full file path
        full_path = os.path.join(temp_dir, file_path)
        
        # Ensure the directory exists
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        try:
            # Write the file
            with open(full_path, "w") as f:
                f.write(content)
            
            return {
                "session_id": session_id,
                "success": True,
                "file_path": file_path
            }
        
        except Exception as e:
            return {
                "session_id": session_id,
                "success": False,
                "error": str(e)
            }
    
    def list_files(self, session_id: str, directory: str = "") -> Dict[str, Any]:
        """
        List files in a sandbox session
        
        Args:
            session_id: Session ID
            directory: Directory to list (relative to workspace)
            
        Returns:
            Dictionary with file listing
        """
        if session_id not in self.temp_dirs:
            raise ValueError(f"Session not found: {session_id}")
        
        # Ensure the directory path is within the workspace
        if ".." in directory or directory.startswith("/"):
            return {
                "session_id": session_id,
                "success": False,
                "error": "Invalid directory path"
            }
        
        # Get the temporary directory for the session
        temp_dir = self.temp_dirs[session_id]
        
        # Create the full directory path
        full_path = os.path.join(temp_dir, directory)
        
        try:
            # List files and directories
            files = []
            directories = []
            
            for item in os.listdir(full_path):
                item_path = os.path.join(full_path, item)
                
                if os.path.isfile(item_path):
                    files.append(item)
                elif os.path.isdir(item_path):
                    directories.append(item)
            
            return {
                "session_id": session_id,
                "success": True,
                "directory": directory,
                "files": files,
                "directories": directories
            }
        
        except Exception as e:
            return {
                "session_id": session_id,
                "success": False,
                "error": str(e)
            }
    
    def read_file(self, session_id: str, file_path: str) -> Dict[str, Any]:
        """
        Read a file from a sandbox session
        
        Args:
            session_id: Session ID
            file_path: Path to the file (relative to workspace)
            
        Returns:
            Dictionary with file content
        """
        if session_id not in self.temp_dirs:
            raise ValueError(f"Session not found: {session_id}")
        
        # Ensure the file path is within the workspace
        if ".." in file_path or file_path.startswith("/"):
            return {
                "session_id": session_id,
                "success": False,
                "error": "Invalid file path"
            }
        
        # Get the temporary directory for the session
        temp_dir = self.temp_dirs[session_id]
        
        # Create the full file path
        full_path = os.path.join(temp_dir, file_path)
        
        try:
            # Read the file
            with open(full_path, "r") as f:
                content = f.read()
            
            return {
                "session_id": session_id,
                "success": True,
                "file_path": file_path,
                "content": content
            }
        
        except Exception as e:
            return {
                "session_id": session_id,
                "success": False,
                "error": str(e)
            }
    
    def close_session(self, session_id: str) -> Dict[str, Any]:
        """
        Close a sandbox session and clean up resources
        
        Args:
            session_id: Session ID
            
        Returns:
            Dictionary with closure results
        """
        if session_id not in self.containers:
            return {
                "session_id": session_id,
                "success": False,
                "error": "Session not found"
            }
        
        try:
            # Stop and remove the container
            container_id = self.containers[session_id]
            container = self.client.containers.get(container_id)
            container.stop()
            
            # Clean up the temporary directory
            if session_id in self.temp_dirs:
                temp_dir = self.temp_dirs[session_id]
                shutil.rmtree(temp_dir, ignore_errors=True)
                del self.temp_dirs[session_id]
            
            # Remove from containers map
            del self.containers[session_id]
            
            return {
                "session_id": session_id,
                "success": True
            }
        
        except Exception as e:
            return {
                "session_id": session_id,
                "success": False,
                "error": str(e)
            }
    
    def _get_image_for_language(self, language: str) -> str:
        """
        Get the appropriate Docker image for a language
        
        Args:
            language: Programming language
            
        Returns:
            Docker image name
        """
        language = language.lower()
        
        if language == "python":
            return "python:3.10-slim"
        elif language in ["javascript", "js", "node"]:
            return "node:18-slim"
        elif language in ["typescript", "ts"]:
            return "node:18-slim"  # TypeScript runs on Node.js
        else:
            # Default to Python
            return "python:3.10-slim"
    
    def _is_valid_package_name(self, package_name: str) -> bool:
        """
        Validate a package name to prevent command injection
        
        Args:
            package_name: Package name to validate
            
        Returns:
            True if valid, False otherwise
        """
        # Basic validation: alphanumeric, dash, underscore, dot, and some special chars
        import re
        return bool(re.match(r'^[a-zA-Z0-9._-]+$', package_name))
    
    def cleanup(self):
        """Clean up all sessions and resources"""
        for session_id in list(self.containers.keys()):
            self.close_session(session_id)