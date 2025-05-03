"""
Agent tools for the NeuroNest AI system.
These tools allow agents to interact with the system and perform various tasks.
"""

import os
import json
import logging
import tempfile
from typing import Dict, List, Any, Optional, Type, Union
from pydantic import BaseModel, Field
# Import tools with proper error handling
try:
    from langchain.tools import BaseTool, StructuredTool, Tool
    from langchain.agents import AgentType, Tool
except ImportError:
    # Create mock classes if imports fail
    class BaseTool:
        """Mock BaseTool class"""
        def __init__(self, name=None, description=None):
            self.name = name
            self.description = description
            
        def _run(self, *args, **kwargs):
            return "Mock tool execution"
            
    class StructuredTool:
        """Mock StructuredTool class"""
        pass
        
    class Tool:
        """Mock Tool class"""
        def __init__(self, name=None, func=None, description=None):
            self.name = name
            self.description = description
            self.func = func
            
    class AgentType:
        """Mock AgentType class"""
        ZERO_SHOT_REACT_DESCRIPTION = "zero-shot-react-description"
        STRUCTURED_CHAT_ZERO_SHOT_REACT_DESCRIPTION = "structured-chat-zero-shot-react-description"
from app.services.file_service import extract_text_from_file

# Mock implementations for missing functions
def save_file(content: str, filename: str, project_id: Optional[str] = None) -> str:
    """Mock implementation of save_file"""
    return f"/tmp/{filename}"

def read_file(file_path: str) -> str:
    """Mock implementation of read_file"""
    try:
        with open(file_path, 'r') as f:
            return f.read()
    except Exception as e:
        logging.error(f"Error reading file: {e}")
        return ""

def analyze_file(file_path: str) -> Dict[str, Any]:
    """Mock implementation of analyze_file"""
    return {"type": "unknown", "content": "", "metadata": {}}
from app.services.execution_service import (
    execute_code,
    get_execution_logs,
    stop_execution
)
from app.services.project_service import create_project, update_project

# Mock implementations for missing functions
def get_project_files(project_id: str) -> List[Dict[str, Any]]:
    """Mock implementation of get_project_files"""
    return [{"id": "file1", "name": "example.py", "path": "/tmp/example.py"}]

def create_project_file(project_id: str, file_path: str, content: str) -> Dict[str, Any]:
    """Mock implementation of create_project_file"""
    return {"id": str(uuid.uuid4()), "name": os.path.basename(file_path), "path": file_path}

logger = logging.getLogger(__name__)

# Define tools as simple functions instead of classes to avoid Pydantic issues
def read_file_tool(file_path: str) -> str:
    """Read the content of a file by providing the file path"""
    try:
        content = read_file(file_path)
        return content
    except Exception as e:
        logger.error(f"Error reading file: {e}")
        return f"Error reading file: {str(e)}"

def write_file_tool(file_path: str, content: str) -> str:
    """Write content to a file by providing the file path and content"""
    try:
        return save_file(content, file_path)
    except Exception as e:
        logger.error(f"Error writing file: {e}")
        return f"Error writing file: {str(e)}"

def analyze_file_tool(file_path: str) -> Dict[str, Any]:
    """Analyze a file and extract metadata"""
    try:
        return analyze_file(file_path)
    except Exception as e:
        logger.error(f"Error analyzing file: {e}")
        return {"error": str(e)}

def execute_code_tool(code: str, language: str = "python", timeout: int = 30) -> Dict[str, Any]:
    """Execute code in a secure environment by providing the code and language"""
    try:
        # Create a temporary file for the code
        with tempfile.NamedTemporaryFile(
            suffix=f".{language}", mode="w", delete=False
        ) as temp_file:
            temp_file.write(code)
            temp_file_path = temp_file.name
            
        # Execute the code
        result = execute_code(temp_file_path, language, timeout)
        
        # Clean up the temporary file
        os.unlink(temp_file_path)
        
        return result
    except Exception as e:
        logger.error(f"Error executing code: {e}")
        return {"error": str(e), "output": "", "status": "error"}
            
def create_project_tool(name: str, description: str, project_type: str = "web") -> Dict[str, Any]:
    """Create a new project by providing the project name, description, and type"""
    try:
        project = create_project("user123", {"name": name, "description": description, "type": project_type})
        return {
            "project_id": project,
            "name": name,
            "description": description,
            "type": project_type
        }
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        return {"error": str(e)}

def create_project_file_tool(project_id: str, file_path: str, content: str) -> Dict[str, Any]:
    """Create a file in a project by providing the project_id, file_path, and content"""
    try:
        file_info = create_project_file(project_id, file_path, content)
        return {
            "file_id": file_info["id"],
            "path": file_info["path"]
        }
    except Exception as e:
        logger.error(f"Error creating project file: {e}")
        return {"error": str(e)}

def get_project_files_tool(project_id: str) -> List[Dict[str, Any]]:
    """Get files in a project by providing the project_id"""
    try:
        files = get_project_files(project_id)
        return files
    except Exception as e:
        logger.error(f"Error getting project files: {e}")
        return [{"error": str(e)}]

def get_agent_tools() -> List[Any]:
    """
    Get all available agent tools.
    
    Returns:
        List[Any]: List of agent tool functions
    """
    # Return a list of tool functions instead of BaseTool instances
    return [
        read_file_tool,
        write_file_tool,
        analyze_file_tool,
        execute_code_tool,
        create_project_tool,
        create_project_file_tool,
        get_project_files_tool
    ]