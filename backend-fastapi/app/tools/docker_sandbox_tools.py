"""
Docker Sandbox Tools for LangChain Agents
"""

from typing import Dict, List, Any, Optional
import logging
from langchain.tools import tool

# Configure logging
logger = logging.getLogger(__name__)

@tool("create_sandbox_session")
def create_sandbox_session(docker_sandbox_service, language: str) -> Dict[str, Any]:
    """Creates a new sandbox session for executing code
    
    Args:
        docker_sandbox_service: The docker sandbox service instance
        language: Programming language for the session ('python', 'javascript')
        
    Returns:
        Dictionary with session information
    """
    try:
        return docker_sandbox_service.create_session(language)
    except Exception as e:
        logger.error(f"Error creating sandbox session: {e}")
        return {"error": str(e), "session_id": f"mock-{language}-session"}

@tool("execute_python_code")
def execute_python_code(docker_sandbox_service, session_id: str, code: str, timeout: int = 30) -> Dict[str, Any]:
    """Executes Python code in a sandbox environment
    
    Args:
        docker_sandbox_service: The docker sandbox service instance
        session_id: Session ID
        code: Python code to execute
        timeout: Maximum execution time in seconds
        
    Returns:
        Dictionary with execution results
    """
    try:
        return docker_sandbox_service.execute_code(session_id, code, timeout)
    except Exception as e:
        logger.error(f"Error executing Python code: {e}")
        return {
            "output": f"Error: {str(e)}",
            "error": str(e),
            "execution_time": 0
        }

@tool("execute_javascript_code")
def execute_javascript_code(docker_sandbox_service, session_id: str, code: str, timeout: int = 30) -> Dict[str, Any]:
    """Executes JavaScript code in a sandbox environment
    
    Args:
        docker_sandbox_service: The docker sandbox service instance
        session_id: Session ID
        code: JavaScript code to execute
        timeout: Maximum execution time in seconds
        
    Returns:
        Dictionary with execution results
    """
    try:
        return docker_sandbox_service.execute_javascript(session_id, code, timeout)
    except Exception as e:
        logger.error(f"Error executing JavaScript code: {e}")
        return {
            "output": f"Error: {str(e)}",
            "error": str(e),
            "execution_time": 0
        }

@tool("install_package")
def install_package(docker_sandbox_service, session_id: str, package_name: str) -> Dict[str, Any]:
    """Installs a package in a sandbox environment
    
    Args:
        docker_sandbox_service: The docker sandbox service instance
        session_id: Session ID
        package_name: Name of the package to install
        
    Returns:
        Dictionary with installation results
    """
    try:
        return docker_sandbox_service.install_package(session_id, package_name)
    except Exception as e:
        logger.error(f"Error installing package: {e}")
        return {
            "success": False,
            "output": f"Error: {str(e)}",
            "error": str(e)
        }

@tool("upload_file")
def upload_file(docker_sandbox_service, session_id: str, file_path: str, content: str) -> Dict[str, Any]:
    """Uploads a file to a sandbox environment
    
    Args:
        docker_sandbox_service: The docker sandbox service instance
        session_id: Session ID
        file_path: Path where the file should be created (relative to workspace)
        content: File content
        
    Returns:
        Dictionary with upload results
    """
    try:
        return docker_sandbox_service.upload_file(session_id, file_path, content)
    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        return {
            "success": False,
            "error": str(e)
        }

@tool("list_files")
def list_files(docker_sandbox_service, session_id: str, directory: str = "") -> Dict[str, Any]:
    """Lists files in a sandbox environment
    
    Args:
        docker_sandbox_service: The docker sandbox service instance
        session_id: Session ID
        directory: Directory to list (relative to workspace)
        
    Returns:
        Dictionary with file listing
    """
    try:
        return docker_sandbox_service.list_files(session_id, directory)
    except Exception as e:
        logger.error(f"Error listing files: {e}")
        return {
            "files": [],
            "error": str(e)
        }

@tool("read_file")
def read_file(docker_sandbox_service, session_id: str, file_path: str) -> Dict[str, Any]:
    """Reads a file from a sandbox environment
    
    Args:
        docker_sandbox_service: The docker sandbox service instance
        session_id: Session ID
        file_path: Path to the file (relative to workspace)
        
    Returns:
        Dictionary with file content
    """
    try:
        return docker_sandbox_service.read_file(session_id, file_path)
    except Exception as e:
        logger.error(f"Error reading file: {e}")
        return {
            "content": "",
            "error": str(e)
        }

@tool("close_sandbox_session")
def close_sandbox_session(docker_sandbox_service, session_id: str) -> Dict[str, Any]:
    """Closes a sandbox session and cleans up resources
    
    Args:
        docker_sandbox_service: The docker sandbox service instance
        session_id: Session ID
        
    Returns:
        Dictionary with closure results
    """
    try:
        return docker_sandbox_service.close_session(session_id)
    except Exception as e:
        logger.error(f"Error closing sandbox session: {e}")
        return {
            "success": False,
            "error": str(e)
        }