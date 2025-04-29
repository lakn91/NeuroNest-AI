"""
Code Analysis Tools for LangChain Agents
"""

from typing import Dict, List, Any, Optional
from langchain.tools import BaseTool, StructuredTool, tool
from pydantic import BaseModel, Field

class AnalyzePythonCodeInput(BaseModel):
    """Input for AnalyzePythonCodeTool"""
    code: str = Field(..., description="Python code to analyze")

class AnalyzePythonCodeTool(BaseTool):
    """Tool for analyzing Python code"""
    
    name = "analyze_python_code"
    description = "Analyzes Python code for issues, bugs, and structure"
    args_schema = AnalyzePythonCodeInput
    
    def __init__(self, code_analysis_service):
        """Initialize with code analysis service"""
        self.code_analysis_service = code_analysis_service
        super().__init__()
    
    def _run(self, code: str) -> Dict[str, Any]:
        """Run the tool"""
        return self.code_analysis_service.analyze_python_code(code)
    
    async def _arun(self, code: str) -> Dict[str, Any]:
        """Run the tool asynchronously"""
        return self._run(code)

class AnalyzeJavaScriptCodeInput(BaseModel):
    """Input for AnalyzeJavaScriptCodeTool"""
    code: str = Field(..., description="JavaScript code to analyze")

class AnalyzeJavaScriptCodeTool(BaseTool):
    """Tool for analyzing JavaScript code"""
    
    name = "analyze_javascript_code"
    description = "Analyzes JavaScript code for issues, bugs, and structure"
    args_schema = AnalyzeJavaScriptCodeInput
    
    def __init__(self, code_analysis_service):
        """Initialize with code analysis service"""
        self.code_analysis_service = code_analysis_service
        super().__init__()
    
    def _run(self, code: str) -> Dict[str, Any]:
        """Run the tool"""
        return self.code_analysis_service.analyze_javascript_code(code)
    
    async def _arun(self, code: str) -> Dict[str, Any]:
        """Run the tool asynchronously"""
        return self._run(code)

class AnalyzeTypeScriptCodeInput(BaseModel):
    """Input for AnalyzeTypeScriptCodeTool"""
    code: str = Field(..., description="TypeScript code to analyze")

class AnalyzeTypeScriptCodeTool(BaseTool):
    """Tool for analyzing TypeScript code"""
    
    name = "analyze_typescript_code"
    description = "Analyzes TypeScript code for issues, bugs, and structure"
    args_schema = AnalyzeTypeScriptCodeInput
    
    def __init__(self, code_analysis_service):
        """Initialize with code analysis service"""
        self.code_analysis_service = code_analysis_service
        super().__init__()
    
    def _run(self, code: str) -> Dict[str, Any]:
        """Run the tool"""
        return self.code_analysis_service.analyze_typescript_code(code)
    
    async def _arun(self, code: str) -> Dict[str, Any]:
        """Run the tool asynchronously"""
        return self._run(code)