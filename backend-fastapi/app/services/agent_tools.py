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
from langchain.tools import BaseTool, StructuredTool, Tool
from langchain.agents import AgentType, Tool
from app.services.file_service import (
    save_file, 
    read_file, 
    extract_text_from_file,
    analyze_file
)
from app.services.execution_service import (
    execute_code,
    get_execution_logs,
    stop_execution
)
from app.services.project_service import (
    create_project,
    update_project,
    get_project_files,
    create_project_file
)

logger = logging.getLogger(__name__)

class ReadFileTool(BaseTool):
    """Tool for reading file content."""
    name = "read_file"
    description = "Read the content of a file by providing the file_id or file path"
    
    def _run(self, file_id: str) -> str:
        """Read file content."""
        try:
            content = read_file(file_id)
            return content
        except Exception as e:
            logger.error(f"Error reading file: {e}")
            return f"Error reading file: {str(e)}"
            
    async def _arun(self, file_id: str) -> str:
        """Read file content asynchronously."""
        return self._run(file_id)

class WriteFileTool(BaseTool):
    """Tool for writing content to a file."""
    name = "write_file"
    description = "Write content to a file by providing the file path and content"
    
    def _run(self, file_path: str, content: str) -> str:
        """Write content to a file."""
        try:
            file_info = save_file(file_path, content)
            return f"File saved successfully: {file_info.id}"
        except Exception as e:
            logger.error(f"Error writing file: {e}")
            return f"Error writing file: {str(e)}"
            
    async def _arun(self, file_path: str, content: str) -> str:
        """Write content to a file asynchronously."""
        return self._run(file_path, content)

class AnalyzeFileTool(BaseTool):
    """Tool for analyzing file content."""
    name = "analyze_file"
    description = "Analyze a file to extract information by providing the file_id"
    
    def _run(self, file_id: str) -> str:
        """Analyze file content."""
        try:
            analysis = analyze_file(file_id)
            return json.dumps(analysis)
        except Exception as e:
            logger.error(f"Error analyzing file: {e}")
            return f"Error analyzing file: {str(e)}"
            
    async def _arun(self, file_id: str) -> str:
        """Analyze file content asynchronously."""
        return self._run(file_id)

class ExecuteCodeTool(BaseTool):
    """Tool for executing code in a secure environment."""
    name = "execute_code"
    description = "Execute code in a secure environment by providing the code and language"
    
    def _run(self, code: str, language: str = "python", timeout: int = 30) -> str:
        """Execute code in a secure environment."""
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
            
            return json.dumps(result)
        except Exception as e:
            logger.error(f"Error executing code: {e}")
            return f"Error executing code: {str(e)}"
            
    async def _arun(self, code: str, language: str = "python", timeout: int = 30) -> str:
        """Execute code in a secure environment asynchronously."""
        return self._run(code, language, timeout)

class CreateProjectTool(BaseTool):
    """Tool for creating a new project."""
    name = "create_project"
    description = "Create a new project by providing the project name, description, and type"
    
    def _run(self, name: str, description: str, project_type: str = "web") -> str:
        """Create a new project."""
        try:
            project = create_project(name, description, project_type)
            return json.dumps({
                "project_id": project.id,
                "name": project.name,
                "description": project.description,
                "type": project.type
            })
        except Exception as e:
            logger.error(f"Error creating project: {e}")
            return f"Error creating project: {str(e)}"
            
    async def _arun(self, name: str, description: str, project_type: str = "web") -> str:
        """Create a new project asynchronously."""
        return self._run(name, description, project_type)

class CreateProjectFileTool(BaseTool):
    """Tool for creating a file in a project."""
    name = "create_project_file"
    description = "Create a file in a project by providing the project_id, file_path, and content"
    
    def _run(self, project_id: str, file_path: str, content: str) -> str:
        """Create a file in a project."""
        try:
            file_info = create_project_file(project_id, file_path, content)
            return json.dumps({
                "file_id": file_info.id,
                "project_id": file_info.project_id,
                "path": file_info.path,
                "size": file_info.size
            })
        except Exception as e:
            logger.error(f"Error creating project file: {e}")
            return f"Error creating project file: {str(e)}"
            
    async def _arun(self, project_id: str, file_path: str, content: str) -> str:
        """Create a file in a project asynchronously."""
        return self._run(project_id, file_path, content)

class GetProjectFilesTool(BaseTool):
    """Tool for getting files in a project."""
    name = "get_project_files"
    description = "Get files in a project by providing the project_id"
    
    def _run(self, project_id: str) -> str:
        """Get files in a project."""
        try:
            files = get_project_files(project_id)
            return json.dumps([{
                "file_id": file.id,
                "path": file.path,
                "size": file.size
            } for file in files])
        except Exception as e:
            logger.error(f"Error getting project files: {e}")
            return f"Error getting project files: {str(e)}"
            
    async def _arun(self, project_id: str) -> str:
        """Get files in a project asynchronously."""
        return self._run(project_id)

def get_agent_tools() -> List[BaseTool]:
    """
    Get all available agent tools.
    
    Returns:
        List[BaseTool]: List of agent tools
    """
    return [
        ReadFileTool(),
        WriteFileTool(),
        AnalyzeFileTool(),
        ExecuteCodeTool(),
        CreateProjectTool(),
        CreateProjectFileTool(),
        GetProjectFilesTool()
    ]