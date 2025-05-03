"""
Specialized agents for the NeuroNest AI system.
These agents are designed for specific tasks like code generation, debugging, etc.
"""

import logging
import json
from typing import Dict, List, Any, Optional, Union

from app.services.base_agent import BaseAgent, EventStream, Action, Observation
from app.core.config import settings
from app.services.execution_service import execute_code_snippet
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_anthropic import ChatAnthropic
from langchain.prompts import ChatPromptTemplate
from langchain.chains import LLMChain

logger = logging.getLogger(__name__)

class CodeGenerationAgent(BaseAgent):
    """
    Specialized agent for generating code based on requirements.
    """
    
    def __init__(self, event_stream: EventStream, llm_provider: Any):
        """
        Initialize a new CodeGenerationAgent
        
        Args:
            event_stream: The event stream for the agent
            llm_provider: The LLM provider for the agent
        """
        super().__init__(event_stream, llm_provider)
        self.name = "CodeGenerationAgent"
        self.description = "Generates code based on requirements"
        self.capabilities = [
            "Generate code in multiple languages",
            "Follow best practices and design patterns",
            "Create well-structured and documented code",
            "Implement complex algorithms and data structures",
            "Generate unit tests"
        ]
    
    async def initialize(self, config: Dict[str, Any]) -> None:
        """
        Initialize the agent
        
        Args:
            config: Configuration for the agent
        """
        await super().initialize(config)
        
        # Set default system message if not provided
        if not self.system_message:
            self.system_message = """You are a senior software developer specializing in multiple programming languages.
Your task is to generate high-quality, production-ready code based on the requirements provided.

Guidelines:
1. Write clean, efficient, and well-documented code
2. Follow best practices and design patterns for the specified language
3. Include appropriate error handling
4. Structure the code logically
5. Include comments to explain complex logic
6. If a framework is specified, use it appropriately
7. Include any necessary imports or dependencies
8. Provide a brief explanation of your implementation approach

The code should be complete and ready to use without requiring significant modifications.
"""
    
    def _get_llm(self, provider: str, api_key: str, temperature: float = 0.2) -> Union[ChatOpenAI, ChatGoogleGenerativeAI, ChatAnthropic]:
        """
        Get the appropriate LLM based on the provider
        
        Args:
            provider: The provider name
            api_key: The API key for the provider
            temperature: The temperature for the LLM
            
        Returns:
            The LLM instance
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
    
    async def process(self, observation: Observation) -> Action:
        """
        Process an observation and generate an action
        
        Args:
            observation: The observation to process
            
        Returns:
            The action to take
        """
        try:
            # Extract data from observation
            requirements = ""
            language = "javascript"
            framework = None
            api_keys = {}
            user_id = None
            
            if observation.data["type"] == "user_message":
                requirements = observation.data["message"]
                context = observation.data.get("context", {})
                language = context.get("language", "javascript")
                framework = context.get("framework")
                api_keys = context.get("api_keys", {})
                user_id = context.get("user_id")
            elif observation.data["type"] == "code_request":
                requirements = observation.data.get("requirements", "")
                language = observation.data.get("language", "javascript")
                framework = observation.data.get("framework")
                api_keys = observation.data.get("api_keys", {})
                user_id = observation.data.get("user_id")
            
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
                return Action.create_error_action(
                    self.id,
                    f"No API key found for provider: {provider}"
                )
                
            # Create LLM
            llm = self._get_llm(provider, api_key, temperature=0.2)  # Lower temperature for code generation
            
            # Update system message with language/framework info
            system_message = self.system_message
            if framework:
                system_message += f"\nYou should use the {framework} framework for this implementation."
                
            # Create prompt
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_message),
                ("human", "{input}")
            ])
            
            # Create chain
            chain = LLMChain(
                llm=llm,
                prompt=prompt,
                output_key="output"
            )
            
            # Prepare input
            input_text = f"Requirements: {requirements}\n\nLanguage: {language}"
            if framework:
                input_text += f"\nFramework: {framework}"
                
            # Generate code
            result = await chain.ainvoke({"input": input_text})
            content = result["output"]
            
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
            
            # Create a code action
            action = Action.create_code_action(self.id, content, language)
            
            # Add execution result if available
            if execution_result:
                action.data["execution_result"] = execution_result.dict()
            
            return action
        except Exception as e:
            logger.error(f"Error generating code: {e}")
            return Action.create_error_action(
                self.id,
                f"Error generating code: {str(e)}"
            )

class DebuggingAgent(BaseAgent):
    """
    Specialized agent for debugging code.
    """
    
    def __init__(self, event_stream: EventStream, llm_provider: Any):
        """
        Initialize a new DebuggingAgent
        
        Args:
            event_stream: The event stream for the agent
            llm_provider: The LLM provider for the agent
        """
        super().__init__(event_stream, llm_provider)
        self.name = "DebuggingAgent"
        self.description = "Debugs code and fixes issues"
        self.capabilities = [
            "Identify and fix bugs in code",
            "Optimize code performance",
            "Improve code quality and readability",
            "Refactor code to follow best practices",
            "Add error handling and logging"
        ]
    
    async def initialize(self, config: Dict[str, Any]) -> None:
        """
        Initialize the agent
        
        Args:
            config: Configuration for the agent
        """
        await super().initialize(config)
        
        # Set default system message if not provided
        if not self.system_message:
            self.system_message = """You are a senior software developer specializing in debugging code.
Your task is to identify and fix issues in the provided code.

Guidelines:
1. Carefully analyze the code to identify bugs, errors, or inefficiencies
2. Fix the issues while maintaining the original functionality
3. Explain the issues you found and how you fixed them
4. Improve code quality, readability, and performance where possible
5. Add appropriate error handling if missing
6. Follow best practices for the specified language

Provide the fixed code along with an explanation of the changes you made.
"""
    
    def _get_llm(self, provider: str, api_key: str, temperature: float = 0.2) -> Union[ChatOpenAI, ChatGoogleGenerativeAI, ChatAnthropic]:
        """
        Get the appropriate LLM based on the provider
        
        Args:
            provider: The provider name
            api_key: The API key for the provider
            temperature: The temperature for the LLM
            
        Returns:
            The LLM instance
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
    
    async def process(self, observation: Observation) -> Action:
        """
        Process an observation and generate an action
        
        Args:
            observation: The observation to process
            
        Returns:
            The action to take
        """
        try:
            # Extract data from observation
            code = ""
            error_message = None
            language = "python"
            api_keys = {}
            user_id = None
            
            if observation.data["type"] == "user_message":
                message = observation.data["message"]
                context = observation.data.get("context", {})
                code = context.get("code", message)
                error_message = context.get("error_message")
                language = context.get("language", "python")
                api_keys = context.get("api_keys", {})
                user_id = context.get("user_id")
            elif observation.data["type"] == "code":
                code = observation.data["content"]
                language = observation.data.get("language", "python")
                error_message = observation.data.get("error_message")
                api_keys = observation.data.get("api_keys", {})
                user_id = observation.data.get("user_id")
            
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
                return Action.create_error_action(
                    self.id,
                    f"No API key found for provider: {provider}"
                )
                
            # Create LLM
            llm = self._get_llm(provider, api_key, temperature=0.2)  # Lower temperature for debugging
            
            # Create prompt
            prompt = ChatPromptTemplate.from_messages([
                ("system", self.system_message),
                ("human", "{input}")
            ])
            
            # Create chain
            chain = LLMChain(
                llm=llm,
                prompt=prompt,
                output_key="output"
            )
            
            # Prepare input
            input_text = f"Code to debug:\n\n```{language}\n{code}\n```"
            if error_message:
                input_text += f"\n\nError message:\n{error_message}"
                
            # Generate fixed code
            result = await chain.ainvoke({"input": input_text})
            content = result["output"]
            
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
            
            # Create a code action
            action = Action.create_code_action(self.id, content, language)
            
            # Add execution result if available
            if execution_result:
                action.data["execution_result"] = execution_result.dict()
            
            return action
        except Exception as e:
            logger.error(f"Error debugging code: {e}")
            return Action.create_error_action(
                self.id,
                f"Error debugging code: {str(e)}"
            )

class ProjectPlanningAgent(BaseAgent):
    """
    Specialized agent for project planning.
    """
    
    def __init__(self, event_stream: EventStream, llm_provider: Any):
        """
        Initialize a new ProjectPlanningAgent
        
        Args:
            event_stream: The event stream for the agent
            llm_provider: The LLM provider for the agent
        """
        super().__init__(event_stream, llm_provider)
        self.name = "ProjectPlanningAgent"
        self.description = "Plans and structures software projects"
        self.capabilities = [
            "Create project structure and architecture",
            "Define components and their interactions",
            "Plan development phases and milestones",
            "Identify required technologies and dependencies",
            "Create detailed implementation plans"
        ]
    
    async def initialize(self, config: Dict[str, Any]) -> None:
        """
        Initialize the agent
        
        Args:
            config: Configuration for the agent
        """
        await super().initialize(config)
        
        # Set default system message if not provided
        if not self.system_message:
            self.system_message = """You are a senior software architect specializing in project planning.
Your task is to create a comprehensive project plan based on the requirements provided.

Guidelines:
1. Analyze the requirements to understand the project scope
2. Define the project architecture and component structure
3. Identify required technologies and dependencies
4. Create a logical file structure for the project
5. Define development phases and milestones
6. Consider best practices for the specified project type
7. Include considerations for testing, deployment, and maintenance

Your output should be a detailed project plan that can be used as a blueprint for development.
"""
    
    def _get_llm(self, provider: str, api_key: str, temperature: float = 0.3) -> Union[ChatOpenAI, ChatGoogleGenerativeAI, ChatAnthropic]:
        """
        Get the appropriate LLM based on the provider
        
        Args:
            provider: The provider name
            api_key: The API key for the provider
            temperature: The temperature for the LLM
            
        Returns:
            The LLM instance
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
    
    async def process(self, observation: Observation) -> Action:
        """
        Process an observation and generate an action
        
        Args:
            observation: The observation to process
            
        Returns:
            The action to take
        """
        try:
            # Extract data from observation
            requirements = ""
            project_type = "web"
            technologies = []
            api_keys = {}
            user_id = None
            
            if observation.data["type"] == "user_message":
                requirements = observation.data["message"]
                context = observation.data.get("context", {})
                project_type = context.get("project_type", "web")
                technologies = context.get("technologies", [])
                api_keys = context.get("api_keys", {})
                user_id = context.get("user_id")
            elif observation.data["type"] == "project_request":
                requirements = observation.data.get("requirements", "")
                project_type = observation.data.get("project_type", "web")
                technologies = observation.data.get("technologies", [])
                api_keys = observation.data.get("api_keys", {})
                user_id = observation.data.get("user_id")
            
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
                return Action.create_error_action(
                    self.id,
                    f"No API key found for provider: {provider}"
                )
                
            # Create LLM
            llm = self._get_llm(provider, api_key, temperature=0.3)
            
            # Update system message with project type info
            system_message = self.system_message
            if project_type:
                system_message += f"\nYou are planning a {project_type} project."
            if technologies:
                system_message += f"\nThe project should use the following technologies: {', '.join(technologies)}."
                
            # Create prompt
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_message),
                ("human", "{input}")
            ])
            
            # Create chain
            chain = LLMChain(
                llm=llm,
                prompt=prompt,
                output_key="output"
            )
            
            # Prepare input
            input_text = f"Project Requirements:\n\n{requirements}"
            if project_type:
                input_text += f"\n\nProject Type: {project_type}"
            if technologies:
                input_text += f"\n\nTechnologies: {', '.join(technologies)}"
                
            # Generate project plan
            result = await chain.ainvoke({"input": input_text})
            content = result["output"]
            
            # Create a text action with the project plan
            return Action.create_text_action(self.id, content)
        except Exception as e:
            logger.error(f"Error planning project: {e}")
            return Action.create_error_action(
                self.id,
                f"Error planning project: {str(e)}"
            )