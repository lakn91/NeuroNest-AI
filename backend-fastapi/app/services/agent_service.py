import os
import logging
import json
from typing import Dict, List, Any, Optional, Tuple, Union
import google.generativeai as genai
from openai import OpenAI
from anthropic import Anthropic
from langchain.agents import AgentExecutor, create_openai_tools_agent, create_react_agent
from langchain.agents import AgentType, initialize_agent, Tool
from langchain.memory import ConversationBufferMemory, ConversationSummaryMemory
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder, PromptTemplate
from langchain.schema import SystemMessage, HumanMessage, AIMessage
from langchain.tools import BaseTool
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_anthropic import ChatAnthropic
from langchain.chains import LLMChain
from app.core.config import settings
from app.models.agent import AgentRequest, AgentResponse, Message, AgentThought
from app.services.file_service import extract_text_from_file
from app.services.project_service import create_project_from_code
from app.services.agent_tools import get_agent_tools

logger = logging.getLogger(__name__)

class OrchestratorAgent:
    """
    Orchestrator Agent that coordinates other agents and tools
    """
    def __init__(self):
        self.name = "OrchestratorAgent"
        self.description = "Coordinates other agents and tools to complete tasks"
        self.capabilities = [
            "Process natural language requests",
            "Generate code in multiple languages",
            "Create and manage projects",
            "Execute code in a secure environment",
            "Process and analyze files"
        ]
        self.tools = get_agent_tools()
        
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
    
    def _create_agent_executor(
        self, 
        llm: Union[ChatOpenAI, ChatGoogleGenerativeAI, ChatAnthropic],
        tools: List[BaseTool],
        memory: Optional[ConversationBufferMemory] = None,
        system_message: str = None
    ) -> AgentExecutor:
        """
        Create an agent executor with the appropriate tools and memory
        """
        if system_message is None:
            system_message = """You are an AI assistant that helps users with various tasks.
You have access to tools that can help you complete tasks.
Always use the appropriate tool when needed.
If you don't know how to do something or if a tool is not available, be honest and say so.
"""
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_message),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad")
        ])
        
        if isinstance(llm, ChatOpenAI):
            agent = create_openai_tools_agent(llm, tools, prompt)
        else:
            agent = create_react_agent(llm, tools, prompt)
            
        return AgentExecutor(
            agent=agent,
            tools=tools,
            memory=memory,
            verbose=True,
            return_intermediate_steps=True
        )
        
    async def process_message(
        self, 
        message: str, 
        history: Optional[List[Dict[str, str]]] = None,
        context: Optional[Dict[str, Any]] = None,
        api_keys: Optional[Dict[str, str]] = None,
        user_id: Optional[str] = None,
        files: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Process a message using the appropriate AI provider with LangChain agents
        """
        # Default provider
        provider = settings.DEFAULT_AI_PROVIDER
        
        # Override with context if provided
        if context and "provider" in context:
            provider = context["provider"]
            
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
                "content": f"No API key found for provider: {provider}. Please provide an API key in your settings or request.",
                "type": "error"
            }
            
        # Process files if provided
        file_contents = []
        file_ids = []
        if files:
            for file_path in files:
                try:
                    text = await extract_text_from_file(file_path)
                    if text:
                        file_contents.append(f"Content of file {os.path.basename(file_path)}:\n{text}")
                        file_ids.append(os.path.basename(file_path))
                except Exception as e:
                    logger.error(f"Error extracting text from file: {e}")
                    return {
                        "content": f"Error processing file: {str(e)}",
                        "type": "error"
                    }
        
        # Add file contents to message if available
        if file_contents:
            message = message + "\n\n" + "\n\n".join(file_contents)
            
        # Convert history to LangChain format
        chat_history = []
        if history:
            for msg in history:
                if msg["role"] == "user":
                    chat_history.append(HumanMessage(content=msg["content"]))
                elif msg["role"] == "assistant":
                    chat_history.append(AIMessage(content=msg["content"]))
                    
        # Create memory
        memory = ConversationBufferMemory(
            memory_key="chat_history",
            return_messages=True,
            input_key="input"
        )
        
        # Add history to memory
        if chat_history:
            memory.chat_memory.messages.extend(chat_history)
            
        # Create LLM
        try:
            llm = self._get_llm(provider, api_key)
            
            # Create agent executor with tools
            agent_executor = self._create_agent_executor(
                llm=llm,
                tools=self.tools,
                memory=memory,
                system_message="""You are NeuroNest AI, an advanced AI assistant that helps users with various tasks.
You have access to tools that can help you complete tasks such as reading and writing files,
executing code, creating projects, and more. Always use the appropriate tool when needed.
If you don't know how to do something or if a tool is not available, be honest and say so.

When generating code, make sure it's well-structured, follows best practices, and is properly documented.
When creating projects, organize files in a logical structure and include necessary configuration files.
"""
            )
            
            # Add file information to the context
            input_context = {}
            if context:
                input_context.update(context)
            if file_ids:
                input_context["file_ids"] = file_ids
            if user_id:
                input_context["user_id"] = user_id
                
            # Execute the agent
            result = await agent_executor.ainvoke(
                {
                    "input": message,
                    "context": json.dumps(input_context)
                }
            )
            
            # Extract thoughts from intermediate steps
            thoughts = []
            for step in result.get("intermediate_steps", []):
                action = step[0]
                action_input = action.tool_input if hasattr(action, "tool_input") else action.args
                action_output = step[1]
                
                thoughts.append(
                    AgentThought(
                        thought=f"I need to use the {action.tool} tool",
                        action=action.tool,
                        action_input=str(action_input),
                        observation=str(action_output)
                    )
                )
                
            return {
                "content": result["output"],
                "type": "text",
                "thoughts": thoughts
            }
                
        # Process with the appropriate provider if agent execution fails
        except Exception as e:
            logger.error(f"Error executing agent: {e}")
            logger.info("Falling back to direct provider API")
            
            if provider == "gemini":
                return await self._process_with_gemini(message, history, api_key)
            elif provider == "openai":
                return await self._process_with_openai(message, history, api_key)
            else:
                return {
                    "content": f"Unsupported provider: {provider}",
                    "type": "error"
                }
        except Exception as e:
            logger.error(f"Error processing message with {provider}: {e}")
            return {
                "content": f"Error processing your request: {str(e)}",
                "type": "error"
            }
    
    async def _process_with_gemini(
        self, 
        message: str, 
        history: Optional[List[Dict[str, str]]] = None,
        api_key: str = None
    ) -> Dict[str, Any]:
        """
        Process a message using Google's Gemini API
        """
        try:
            # Configure the Gemini API
            genai.configure(api_key=api_key)
            
            # Create a model instance
            model = genai.GenerativeModel(
                model_name="gemini-pro",
                generation_config={
                    "temperature": settings.AGENT_TEMPERATURE,
                    "max_output_tokens": settings.AGENT_MAX_TOKENS,
                    "top_p": 0.95,
                }
            )
            
            # Convert history to Gemini format if provided
            gemini_history = []
            if history:
                for msg in history:
                    role = "user" if msg["role"] == "user" else "model"
                    gemini_history.append({"role": role, "parts": [msg["content"]]})
            
            # Create a chat session
            chat = model.start_chat(history=gemini_history)
            
            # Send the message and get the response
            response = chat.send_message(message)
            
            return {
                "content": response.text,
                "type": "text"
            }
        except Exception as e:
            logger.error(f"Error with Gemini API: {e}")
            raise
    
    async def _process_with_openai(
        self, 
        message: str, 
        history: Optional[List[Dict[str, str]]] = None,
        api_key: str = None
    ) -> Dict[str, Any]:
        """
        Process a message using OpenAI's API
        """
        try:
            # Initialize the OpenAI client
            client = OpenAI(api_key=api_key)
            
            # Convert history to OpenAI format if provided
            messages = []
            if history:
                for msg in history:
                    role = "user" if msg["role"] == "user" else "assistant"
                    messages.append({"role": role, "content": msg["content"]})
            
            # Add the current message
            messages.append({"role": "user", "content": message})
            
            # Send the request to OpenAI
            response = client.chat.completions.create(
                model="gpt-4",
                messages=messages,
                temperature=settings.AGENT_TEMPERATURE,
                max_tokens=settings.AGENT_MAX_TOKENS,
            )
            
            return {
                "content": response.choices[0].message.content,
                "type": "text"
            }
        except Exception as e:
            logger.error(f"Error with OpenAI API: {e}")
            raise


class CodeGenerationAgent:
    """
    Agent specialized in generating code
    """
    def __init__(self):
        self.name = "CodeGenerationAgent"
        self.description = "Generates code in multiple programming languages"
        self.capabilities = [
            "Generate code based on requirements",
            "Explain code functionality",
            "Debug and fix code issues",
            "Optimize code performance",
            "Convert code between languages"
        ]
        
    def get_name(self) -> str:
        return self.name
        
    def get_description(self) -> str:
        return self.description
        
    def get_capabilities(self) -> List[str]:
        return self.capabilities
        
    async def generate_code(
        self,
        requirements: str,
        language: str = "javascript",
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
            
        if not api_key:
            return {
                "content": f"No API key found for provider: {provider}. Please provide an API key in your settings or request.",
                "type": "error"
            }
            
        # Construct the prompt
        framework_text = f" using {framework}" if framework else ""
        prompt = f"""
        Generate {language} code{framework_text} based on the following requirements:
        
        {requirements}
        
        Please provide well-structured, clean, and efficient code. Include comments to explain complex parts.
        Organize the code into appropriate files and provide a brief explanation of how the code works.
        """
        
        # Process with the appropriate provider
        try:
            if provider == "gemini":
                response = await self._generate_with_gemini(prompt, api_key)
            elif provider == "openai":
                response = await self._generate_with_openai(prompt, api_key)
            else:
                return {
                    "content": f"Unsupported provider: {provider}",
                    "type": "error"
                }
                
            # Create a project from the generated code if user_id is provided
            if user_id and "content" in response and response["type"] == "text":
                try:
                    project_id = await create_project_from_code(
                        user_id=user_id,
                        title=f"{language.capitalize()}{framework_text} Project",
                        description=requirements,
                        code_content=response["content"],
                        language=language,
                        framework=framework
                    )
                    
                    if project_id:
                        response["project_id"] = project_id
                except Exception as e:
                    logger.error(f"Error creating project from code: {e}")
                    # Continue even if project creation fails
                
            return response
        except Exception as e:
            logger.error(f"Error generating code with {provider}: {e}")
            return {
                "content": f"Error generating code: {str(e)}",
                "type": "error"
            }
    
    async def _generate_with_gemini(self, prompt: str, api_key: str) -> Dict[str, Any]:
        """
        Generate code using Google's Gemini API
        """
        try:
            # Configure the Gemini API
            genai.configure(api_key=api_key)
            
            # Create a model instance
            model = genai.GenerativeModel(
                model_name="gemini-pro",
                generation_config={
                    "temperature": 0.2,  # Lower temperature for code generation
                    "max_output_tokens": 8192,  # Larger output for code
                    "top_p": 0.95,
                }
            )
            
            # Send the prompt and get the response
            response = model.generate_content(prompt)
            
            return {
                "content": response.text,
                "type": "text"
            }
        except Exception as e:
            logger.error(f"Error with Gemini API: {e}")
            raise
    
    async def _generate_with_openai(self, prompt: str, api_key: str) -> Dict[str, Any]:
        """
        Generate code using OpenAI's API
        """
        try:
            # Initialize the OpenAI client
            client = OpenAI(api_key=api_key)
            
            # Send the request to OpenAI
            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are an expert programmer. Generate clean, efficient, and well-documented code."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,  # Lower temperature for code generation
                max_tokens=8192,  # Larger output for code
            )
            
            return {
                "content": response.choices[0].message.content,
                "type": "text"
            }
        except Exception as e:
            logger.error(f"Error with OpenAI API: {e}")
            raise


# Initialize agents
orchestrator_agent = OrchestratorAgent()
code_generation_agent = CodeGenerationAgent()

# Get available agents
def get_available_agents() -> List[Dict[str, Any]]:
    """
    Get a list of available agents
    """
    return [
        {
            "id": "orchestrator",
            "name": orchestrator_agent.get_name(),
            "description": orchestrator_agent.get_description(),
            "capabilities": orchestrator_agent.get_capabilities()
        },
        {
            "id": "code_generator",
            "name": code_generation_agent.get_name(),
            "description": code_generation_agent.get_description(),
            "capabilities": code_generation_agent.get_capabilities()
        }
    ]

# Get available AI providers
def get_available_providers() -> List[Dict[str, Any]]:
    """
    Get a list of available AI providers
    """
    return [
        {
            "id": "gemini",
            "name": "Google Gemini",
            "description": "Google's Gemini AI model",
            "requires_api_key": True,
            "api_key_url": "https://ai.google.dev/"
        },
        {
            "id": "openai",
            "name": "OpenAI",
            "description": "OpenAI's GPT models",
            "requires_api_key": True,
            "api_key_url": "https://platform.openai.com/api-keys"
        }
    ]

# Process a message with the orchestrator agent
async def process_message(
    request: AgentRequest,
    api_keys: Optional[Dict[str, str]] = None,
    user_id: Optional[str] = None
) -> AgentResponse:
    """
    Process a message with the orchestrator agent
    """
    response = await orchestrator_agent.process_message(
        message=request.message,
        history=request.history,
        context=request.context,
        api_keys=api_keys,
        user_id=user_id,
        files=request.files
    )
    
    return AgentResponse(
        response=response,
        conversation_id=None  # This would be set if we're saving the conversation
    )

# Generate code with the code generation agent
async def generate_code(
    requirements: str,
    language: str = "javascript",
    framework: Optional[str] = None,
    api_keys: Optional[Dict[str, str]] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate code based on requirements using the specialized CodeGenerationAgent
    """
    from app.services.specialized_agents import CodeGenerationAgent
    
    # Create code generation agent
    code_agent = CodeGenerationAgent()
    
    # Generate code
    result = await code_agent.generate_code(
        requirements=requirements,
        language=language,
        framework=framework,
        api_keys=api_keys,
        user_id=user_id
    )
    
    return result