"""
Docker Sandbox Tools for LangChain Agents
"""

from typing import Dict, List, Any, Optional
from langchain.tools import BaseTool, StructuredTool, tool
from pydantic import BaseModel, Field

class CreateSandboxSessionInput(BaseModel):
    """Input for CreateSandboxSessionTool"""
    language: str = Field(..., description="Programming language for the session ('python', 'javascript')")

class CreateSandboxSessionTool(BaseTool):
    """Tool for creating a sandbox session"""
    
    name = "create_sandbox_session"
    description = "Creates a new sandbox session for executing code"
    args_schema = CreateSandboxSessionInput
    
    def __init__(self, docker_sandbox_service):
        """Initialize with Docker sandbox service"""
        self.docker_sandbox_service = docker_sandbox_service
        super().__init__()
    
    def _run(self, language: str) -> Dict[str, Any]:
        """Run the tool"""
        return self.docker_sandbox_service.create_session(language)
    
    async def _arun(self, language: str) -> Dict[str, Any]:
        """Run the tool asynchronously"""
        return self._run(language)

class ExecutePythonCodeInput(BaseModel):
    """Input for ExecutePythonCodeTool"""
    session_id: str = Field(..., description="Session ID")
    code: str = Field(..., description="Python code to execute")
    timeout: int = Field(30, description="Maximum execution time in seconds")

class ExecutePythonCodeTool(BaseTool):
    """Tool for executing Python code in a sandbox"""
    
    name = "execute_python_code"
    description = "Executes Python code in a sandbox environment"
    args_schema = ExecutePythonCodeInput
    
    def __init__(self, docker_sandbox_service):
        """Initialize with Docker sandbox service"""
        self.docker_sandbox_service = docker_sandbox_service
        super().__init__()
    
    def _run(self, session_id: str, code: str, timeout: int = 30) -> Dict[str, Any]:
        """Run the tool"""
        return self.docker_sandbox_service.execute_code(session_id, code, timeout)
    
    async def _arun(self, session_id: str, code: str, timeout: int = 30) -> Dict[str, Any]:
        """Run the tool asynchronously"""
        return self._run(session_id, code, timeout)

class ExecuteJavaScriptCodeInput(BaseModel):
    """Input for ExecuteJavaScriptCodeTool"""
    session_id: str = Field(..., description="Session ID")
    code: str = Field(..., description="JavaScript code to execute")
    timeout: int = Field(30, description="Maximum execution time in seconds")

class ExecuteJavaScriptCodeTool(BaseTool):
    """Tool for executing JavaScript code in a sandbox"""
    
    name = "execute_javascript_code"
    description = "Executes JavaScript code in a sandbox environment"
    args_schema = ExecuteJavaScriptCodeInput
    
    def __init__(self, docker_sandbox_service):
        """Initialize with Docker sandbox service"""
        self.docker_sandbox_service = docker_sandbox_service
        super().__init__()
    
    def _run(self, session_id: str, code: str, timeout: int = 30) -> Dict[str, Any]:
        """Run the tool"""
        return self.docker_sandbox_service.execute_javascript(session_id, code, timeout)
    
    async def _arun(self, session_id: str, code: str, timeout: int = 30) -> Dict[str, Any]:
        """Run the tool asynchronously"""
        return self._run(session_id, code, timeout)

class InstallPackageInput(BaseModel):
    """Input for InstallPackageTool"""
    session_id: str = Field(..., description="Session ID")
    package_name: str = Field(..., description="Name of the package to install")

class InstallPackageTool(BaseTool):
    """Tool for installing a package in a sandbox"""
    
    name = "install_package"
    description = "Installs a package in a sandbox environment"
    args_schema = InstallPackageInput
    
    def __init__(self, docker_sandbox_service):
        """Initialize with Docker sandbox service"""
        self.docker_sandbox_service = docker_sandbox_service
        super().__init__()
    
    def _run(self, session_id: str, package_name: str) -> Dict[str, Any]:
        """Run the tool"""
        return self.docker_sandbox_service.install_package(session_id, package_name)
    
    async def _arun(self, session_id: str, package_name: str) -> Dict[str, Any]:
        """Run the tool asynchronously"""
        return self._run(session_id, package_name)

class UploadFileInput(BaseModel):
    """Input for UploadFileTool"""
    session_id: str = Field(..., description="Session ID")
    file_path: str = Field(..., description="Path where the file should be created (relative to workspace)")
    content: str = Field(..., description="File content")

class UploadFileTool(BaseTool):
    """Tool for uploading a file to a sandbox"""
    
    name = "upload_file"
    description = "Uploads a file to a sandbox environment"
    args_schema = UploadFileInput
    
    def __init__(self, docker_sandbox_service):
        """Initialize with Docker sandbox service"""
        self.docker_sandbox_service = docker_sandbox_service
        super().__init__()
    
    def _run(self, session_id: str, file_path: str, content: str) -> Dict[str, Any]:
        """Run the tool"""
        return self.docker_sandbox_service.upload_file(session_id, file_path, content)
    
    async def _arun(self, session_id: str, file_path: str, content: str) -> Dict[str, Any]:
        """Run the tool asynchronously"""
        return self._run(session_id, file_path, content)

class ListFilesInput(BaseModel):
    """Input for ListFilesTool"""
    session_id: str = Field(..., description="Session ID")
    directory: str = Field("", description="Directory to list (relative to workspace)")

class ListFilesTool(BaseTool):
    """Tool for listing files in a sandbox"""
    
    name = "list_files"
    description = "Lists files in a sandbox environment"
    args_schema = ListFilesInput
    
    def __init__(self, docker_sandbox_service):
        """Initialize with Docker sandbox service"""
        self.docker_sandbox_service = docker_sandbox_service
        super().__init__()
    
    def _run(self, session_id: str, directory: str = "") -> Dict[str, Any]:
        """Run the tool"""
        return self.docker_sandbox_service.list_files(session_id, directory)
    
    async def _arun(self, session_id: str, directory: str = "") -> Dict[str, Any]:
        """Run the tool asynchronously"""
        return self._run(session_id, directory)

class ReadFileInput(BaseModel):
    """Input for ReadFileTool"""
    session_id: str = Field(..., description="Session ID")
    file_path: str = Field(..., description="Path to the file (relative to workspace)")

class ReadFileTool(BaseTool):
    """Tool for reading a file from a sandbox"""
    
    name = "read_file"
    description = "Reads a file from a sandbox environment"
    args_schema = ReadFileInput
    
    def __init__(self, docker_sandbox_service):
        """Initialize with Docker sandbox service"""
        self.docker_sandbox_service = docker_sandbox_service
        super().__init__()
    
    def _run(self, session_id: str, file_path: str) -> Dict[str, Any]:
        """Run the tool"""
        return self.docker_sandbox_service.read_file(session_id, file_path)
    
    async def _arun(self, session_id: str, file_path: str) -> Dict[str, Any]:
        """Run the tool asynchronously"""
        return self._run(session_id, file_path)

class CloseSandboxSessionInput(BaseModel):
    """Input for CloseSandboxSessionTool"""
    session_id: str = Field(..., description="Session ID")

class CloseSandboxSessionTool(BaseTool):
    """Tool for closing a sandbox session"""
    
    name = "close_sandbox_session"
    description = "Closes a sandbox session and cleans up resources"
    args_schema = CloseSandboxSessionInput
    
    def __init__(self, docker_sandbox_service):
        """Initialize with Docker sandbox service"""
        self.docker_sandbox_service = docker_sandbox_service
        super().__init__()
    
    def _run(self, session_id: str) -> Dict[str, Any]:
        """Run the tool"""
        return self.docker_sandbox_service.close_session(session_id)
    
    async def _arun(self, session_id: str) -> Dict[str, Any]:
        """Run the tool asynchronously"""
        return self._run(session_id)