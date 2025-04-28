"""
Specialized agents for the NeuroNest AI system.
These agents are designed for specific tasks like code generation, debugging, etc.
"""

import os
import logging
import json
from typing import Dict, List, Any, Optional, Union
from datetime import datetime
from langchain.agents import AgentExecutor, create_openai_tools_agent, create_react_agent
from langchain.memory import ConversationBufferMemory
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import SystemMessage, HumanMessage, AIMessage
from langchain.tools import BaseTool
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_anthropic import ChatAnthropic
from app.core.config import settings
from app.models.agent import AgentThought
from app.services.agent_tools import get_agent_tools
from app.services.execution_service import execute_code_snippet

logger = logging.getLogger(__name__)

class CodeGenerationAgent:
    """
    Specialized agent for generating code based on requirements.
    """
    def __init__(self):
        self.name = "CodeGenerationAgent"
        self.description = "Generates code based on requirements"
        self.capabilities = [
            "Generate code in multiple languages",
            "Follow best practices and design patterns",
            "Create well-structured and documented code",
            "Implement complex algorithms and data structures",
            "Generate unit tests"
        ]
        self.tools = [tool for tool in get_agent_tools() 
                     if tool.name in ["execute_code", "read_file", "write_file"]]
        
    def get_name(self) -> str:
        return self.name
        
    def get_description(self) -> str:
        return self.description
        
    def get_capabilities(self) -> List[str]:
        return self.capabilities
        
    def _get_llm(self, provider: str, api_key: str, temperature: float = 0.7) -> Union[ChatOpenAI, ChatGoogleGenerativeAI, ChatAnthropic]:
        """
        Get the appropriate LLM based on the provider
        """
        if provider == "openai":
            return ChatOpenAI(
                model="gpt-4-turbo",
                temperature=temperature,
                api_key=api_key,
                streaming=True
            )
        elif provider == "gemini":
            return ChatGoogleGenerativeAI(
                model="gemini-pro",
                temperature=temperature,
                google_api_key=api_key,
                convert_system_message_to_human=True
            )
        elif provider == "anthropic":
            return ChatAnthropic(
                model="claude-3-opus-20240229",
                temperature=temperature,
                anthropic_api_key=api_key
            )
        else:
            raise ValueError(f"Unsupported provider: {provider}")
            
    async def generate_code(
        self,
        requirements: str,
        language: str,
        framework: Optional[str] = None,
        api_keys: Optional[Dict[str, str]] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate code based on requirements
        """
        # Default provider
        provider = settings.DEFAULT_AI_PROVIDER
        
        # Get API key
        api_key = None
        if api_keys and provider in api_keys:
            api_key = api_keys[provider]
        elif provider == "gemini" and settings.GEMINI_API_KEY:
            api_key = settings.GEMINI_API_KEY
        elif provider == "openai" and settings.OPENAI_API_KEY:
            api_key = settings.OPENAI_API_KEY
        elif provider == "anthropic" and settings.ANTHROPIC_API_KEY:
            api_key = settings.ANTHROPIC_API_KEY
            
        if not api_key:
            return {
                "success": False,
                "error": f"No API key found for provider: {provider}",
                "code": None
            }
            
        try:
            # Create LLM
            llm = self._get_llm(provider, api_key, temperature=0.2)  # Lower temperature for code generation
            
            # Create system message
            system_message = f"""You are a senior software developer specializing in {language} development.
Your task is to generate high-quality, production-ready code based on the requirements provided.

Guidelines:
1. Write clean, efficient, and well-documented code
2. Follow best practices and design patterns for {language}
3. Include appropriate error handling
4. Structure the code logically
5. Include comments to explain complex logic
6. If a framework is specified, use it appropriately
7. Include any necessary imports or dependencies
8. Provide a brief explanation of your implementation approach

The code should be complete and ready to use without requiring significant modifications.
"""
            
            # Add framework information if provided
            if framework:
                system_message += f"\nYou should use the {framework} framework for this implementation."
                
            # Create prompt
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_message),
                ("human", "{input}")
            ])
            
            # Create chain
            chain = prompt | llm
            
            # Prepare input
            input_text = f"Requirements: {requirements}\n\nLanguage: {language}"
            if framework:
                input_text += f"\nFramework: {framework}"
                
            # Generate code
            response = await chain.ainvoke({"input": input_text})
            
            # Extract code from response
            content = response.content
            
            # Try to execute the code if it's Python
            execution_result = None
            if language.lower() == "python":
                # Extract code blocks
                code_blocks = []
                in_code_block = False
                current_block = []
                
                for line in content.split("\n"):
                    if line.strip().startswith("```"):
                        if in_code_block:
                            code_blocks.append("\n".join(current_block))
                            current_block = []
                        in_code_block = not in_code_block
                    elif in_code_block:
                        current_block.append(line)
                        
                # If there are code blocks, try to execute the first one
                if code_blocks:
                    main_code = code_blocks[0]
                    execution_result = await execute_code_snippet(main_code, "python", 30)
            
            return {
                "success": True,
                "code": content,
                "execution_result": execution_result.dict() if execution_result else None
            }
        except Exception as e:
            logger.error(f"Error generating code: {e}")
            return {
                "success": False,
                "error": f"Error generating code: {str(e)}",
                "code": None
            }
            
class DebuggingAgent:
    """
    Specialized agent for debugging code.
    """
    def __init__(self):
        self.name = "DebuggingAgent"
        self.description = "Debugs code and fixes issues"
        self.capabilities = [
            "Identify and fix bugs in code",
            "Optimize code performance",
            "Improve code quality and readability",
            "Refactor code to follow best practices",
            "Add error handling and logging"
        ]
        self.tools = [tool for tool in get_agent_tools() 
                     if tool.name in ["execute_code", "read_file", "write_file"]]
        
    def get_name(self) -> str:
        return self.name
        
    def get_description(self) -> str:
        return self.description
        
    def get_capabilities(self) -> List[str]:
        return self.capabilities
        
    def _get_llm(self, provider: str, api_key: str, temperature: float = 0.7) -> Union[ChatOpenAI, ChatGoogleGenerativeAI, ChatAnthropic]:
        """
        Get the appropriate LLM based on the provider
        """
        if provider == "openai":
            return ChatOpenAI(
                model="gpt-4-turbo",
                temperature=temperature,
                api_key=api_key,
                streaming=True
            )
        elif provider == "gemini":
            return ChatGoogleGenerativeAI(
                model="gemini-pro",
                temperature=temperature,
                google_api_key=api_key,
                convert_system_message_to_human=True
            )
        elif provider == "anthropic":
            return ChatAnthropic(
                model="claude-3-opus-20240229",
                temperature=temperature,
                anthropic_api_key=api_key
            )
        else:
            raise ValueError(f"Unsupported provider: {provider}")
            
    async def debug_code(
        self,
        code: str,
        error_message: Optional[str] = None,
        language: str = "python",
        api_keys: Optional[Dict[str, str]] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Debug code and fix issues
        """
        # Default provider
        provider = settings.DEFAULT_AI_PROVIDER
        
        # Get API key
        api_key = None
        if api_keys and provider in api_keys:
            api_key = api_keys[provider]
        elif provider == "gemini" and settings.GEMINI_API_KEY:
            api_key = settings.GEMINI_API_KEY
        elif provider == "openai" and settings.OPENAI_API_KEY:
            api_key = settings.OPENAI_API_KEY
        elif provider == "anthropic" and settings.ANTHROPIC_API_KEY:
            api_key = settings.ANTHROPIC_API_KEY
            
        if not api_key:
            return {
                "success": False,
                "error": f"No API key found for provider: {provider}",
                "fixed_code": None
            }
            
        try:
            # Create LLM
            llm = self._get_llm(provider, api_key, temperature=0.2)  # Lower temperature for debugging
            
            # Create system message
            system_message = f"""You are a senior software developer specializing in debugging {language} code.
Your task is to identify and fix issues in the provided code.

Guidelines:
1. Carefully analyze the code to identify bugs, errors, or inefficiencies
2. Fix the issues while maintaining the original functionality
3. Explain the issues you found and how you fixed them
4. Improve code quality, readability, and performance where possible
5. Add appropriate error handling if missing
6. Follow best practices for {language}

Provide the fixed code along with an explanation of the changes you made.
"""
            
            # Create prompt
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_message),
                ("human", "{input}")
            ])
            
            # Create chain
            chain = prompt | llm
            
            # Prepare input
            input_text = f"Code to debug:\n\n```{language}\n{code}\n```"
            if error_message:
                input_text += f"\n\nError message:\n{error_message}"
                
            # Generate fixed code
            response = await chain.ainvoke({"input": input_text})
            
            # Extract code from response
            content = response.content
            
            # Try to execute the fixed code if it's Python
            execution_result = None
            if language.lower() == "python":
                # Extract code blocks
                code_blocks = []
                in_code_block = False
                current_block = []
                
                for line in content.split("\n"):
                    if line.strip().startswith("```"):
                        if in_code_block:
                            code_blocks.append("\n".join(current_block))
                            current_block = []
                        in_code_block = not in_code_block
                    elif in_code_block:
                        current_block.append(line)
                        
                # If there are code blocks, try to execute the first one
                if code_blocks:
                    fixed_code = code_blocks[0]
                    execution_result = await execute_code_snippet(fixed_code, "python", 30)
            
            return {
                "success": True,
                "fixed_code": content,
                "execution_result": execution_result.dict() if execution_result else None
            }
        except Exception as e:
            logger.error(f"Error debugging code: {e}")
            return {
                "success": False,
                "error": f"Error debugging code: {str(e)}",
                "fixed_code": None
            }
            
class ProjectPlanningAgent:
    """
    Specialized agent for project planning.
    """
    def __init__(self):
        self.name = "ProjectPlanningAgent"
        self.description = "Plans and structures software projects"
        self.capabilities = [
            "Create project structure and architecture",
            "Define components and their interactions",
            "Plan development phases and milestones",
            "Identify required technologies and dependencies",
            "Create detailed implementation plans"
        ]
        self.tools = [tool for tool in get_agent_tools() 
                     if tool.name in ["create_project", "create_project_file"]]
        
    def get_name(self) -> str:
        return self.name
        
    def get_description(self) -> str:
        return self.description
        
    def get_capabilities(self) -> List[str]:
        return self.capabilities
        
    def _get_llm(self, provider: str, api_key: str, temperature: float = 0.7) -> Union[ChatOpenAI, ChatGoogleGenerativeAI, ChatAnthropic]:
        """
        Get the appropriate LLM based on the provider
        """
        if provider == "openai":
            return ChatOpenAI(
                model="gpt-4-turbo",
                temperature=temperature,
                api_key=api_key,
                streaming=True
            )
        elif provider == "gemini":
            return ChatGoogleGenerativeAI(
                model="gemini-pro",
                temperature=temperature,
                google_api_key=api_key,
                convert_system_message_to_human=True
            )
        elif provider == "anthropic":
            return ChatAnthropic(
                model="claude-3-opus-20240229",
                temperature=temperature,
                anthropic_api_key=api_key
            )
        else:
            raise ValueError(f"Unsupported provider: {provider}")
            
    async def plan_project(
        self,
        requirements: str,
        project_type: str,
        technologies: List[str],
        api_keys: Optional[Dict[str, str]] = None,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Plan a software project
        """
        # Default provider
        provider = settings.DEFAULT_AI_PROVIDER
        
        # Get API key
        api_key = None
        if api_keys and provider in api_keys:
            api_key = api_keys[provider]
        elif provider == "gemini" and settings.GEMINI_API_KEY:
            api_key = settings.GEMINI_API_KEY
        elif provider == "openai" and settings.OPENAI_API_KEY:
            api_key = settings.OPENAI_API_KEY
        elif provider == "anthropic" and settings.ANTHROPIC_API_KEY:
            api_key = settings.ANTHROPIC_API_KEY
            
        if not api_key:
            return {
                "success": False,
                "error": f"No API key found for provider: {provider}",
                "plan": None
            }
            
        try:
            # Create LLM
            llm = self._get_llm(provider, api_key, temperature=0.3)
            
            # Create system message
            system_message = f"""You are a senior software architect specializing in {project_type} projects.
Your task is to create a detailed project plan based on the requirements provided.

Guidelines:
1. Define the project architecture and structure
2. Identify key components and their interactions
3. Plan development phases and milestones
4. List required technologies and dependencies
5. Create a detailed implementation plan
6. Consider best practices for the specified technologies
7. Include considerations for testing, deployment, and maintenance

Provide a comprehensive project plan that can be used as a roadmap for development.
"""
            
            # Create prompt
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_message),
                ("human", "{input}")
            ])
            
            # Create chain
            chain = prompt | llm
            
            # Prepare input
            input_text = f"Project Requirements: {requirements}\n\nProject Type: {project_type}\n\nTechnologies: {', '.join(technologies)}"
                
            # Generate project plan
            response = await chain.ainvoke({"input": input_text})
            
            # Extract plan from response
            content = response.content
            
            return {
                "success": True,
                "plan": content
            }
        except Exception as e:
            logger.error(f"Error planning project: {e}")
            return {
                "success": False,
                "error": f"Error planning project: {str(e)}",
                "plan": None
            }