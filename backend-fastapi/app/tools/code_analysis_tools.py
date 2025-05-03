"""
Code Analysis Tools for LangChain Agents
"""

from typing import Dict, List, Any, Optional
import logging
from langchain.tools import tool

# Configure logging
logger = logging.getLogger(__name__)

@tool("analyze_python_code")
def analyze_python_code(code_analysis_service, code: str) -> Dict[str, Any]:
    """Analyzes Python code for issues, bugs, and structure
    
    Args:
        code_analysis_service: The code analysis service instance
        code: Python code to analyze
        
    Returns:
        Dictionary with analysis results
    """
    try:
        return code_analysis_service.analyze_python_code(code)
    except Exception as e:
        logger.error(f"Error analyzing Python code: {e}")
        return {"error": str(e)}

@tool("analyze_javascript_code")
def analyze_javascript_code(code_analysis_service, code: str) -> Dict[str, Any]:
    """Analyzes JavaScript code for issues, bugs, and structure
    
    Args:
        code_analysis_service: The code analysis service instance
        code: JavaScript code to analyze
        
    Returns:
        Dictionary with analysis results
    """
    try:
        return code_analysis_service.analyze_javascript_code(code)
    except Exception as e:
        logger.error(f"Error analyzing JavaScript code: {e}")
        return {"error": str(e)}

@tool("analyze_typescript_code")
def analyze_typescript_code(code_analysis_service, code: str) -> Dict[str, Any]:
    """Analyzes TypeScript code for issues, bugs, and structure
    
    Args:
        code_analysis_service: The code analysis service instance
        code: TypeScript code to analyze
        
    Returns:
        Dictionary with analysis results
    """
    try:
        return code_analysis_service.analyze_typescript_code(code)
    except Exception as e:
        logger.error(f"Error analyzing TypeScript code: {e}")
        return {"error": str(e)}