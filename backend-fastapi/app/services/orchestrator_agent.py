"""
Orchestrator Agent for the NeuroNest AI system.
This agent coordinates other agents and tools to complete tasks.
"""

import os
import logging
import json
from typing import Dict, List, Any, Optional, Union
import google.generativeai as genai
from openai import OpenAI
from anthropic import Anthropic
from langchain.agents import AgentExecutor, create_openai_tools_agent, create_react_agent
from langchain.memory import ConversationBufferMemory
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.schema import SystemMessage, HumanMessage, AIMessage
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_anthropic import ChatAnthropic

from app.core.config import settings
from app.models.agent import AgentThought
from app.services.base_agent import BaseAgent, EventStream, Action, Observation
from app.services.agent_tools import get_agent_tools
from app.services.file_service import extract_text_from_file

logger = logging.getLogger(__name__)

class OrchestratorAgent(BaseAgent):
    """
    Orchestrator Agent that coordinates other agents and tools
    """
    
    def __init__(self, event_stream: EventStream, llm_provider: Any):
        """
        Initialize a new OrchestratorAgent
        
        Args:
            event_stream: The event stream for the agent
            llm_provider: The LLM provider for the agent
        """
        super().__init__(event_stream, llm_provider)
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
    
    async def initialize(self, config: Dict[str, Any]) -> None:
        """
        Initialize the agent
        
        Args:
            config: Configuration for the agent
        """
        await super().initialize(config)
        
        # Set default system message if not provided
        if not self.system_message:
            self.system_message = """You are NeuroNest AI, an advanced AI assistant that helps users with various tasks.
You have access to tools that can help you complete tasks such as reading and writing files,
executing code, creating projects, and more. Always use the appropriate tool when needed.
If you don't know how to do something or if a tool is not available, be honest and say so.

When generating code, make sure it's well-structured, follows best practices, and is properly documented.
When creating projects, organize files in a logical structure and include necessary configuration files.
"""
    
    def _get_llm(self, provider: str, api_key: str, temperature: float = 0.7) -> Union[ChatOpenAI, ChatGoogleGenerativeAI, ChatAnthropic]:
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
    
    def _create_agent_executor(
        self, 
        llm: Union[ChatOpenAI, ChatGoogleGenerativeAI, ChatAnthropic],
        tools: List[Any],
        memory: Optional[ConversationBufferMemory] = None,
        system_message: str = None
    ) -> AgentExecutor:
        """
        Create an agent executor with the appropriate tools and memory
        
        Args:
            llm: The LLM to use
            tools: The tools to use
            memory: The memory to use
            system_message: The system message to use
            
        Returns:
            The agent executor
        """
        if system_message is None:
            system_message = self.system_message
        
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
    
    async def process(self, observation: Observation) -> Action:
        """
        Process an observation and generate an action
        
        Args:
            observation: The observation to process
            
        Returns:
            The action to take
        """
        try:
            # Extract message from observation
            message = ""
            context = {}
            files = []
            user_id = None
            api_keys = {}
            
            if observation.data["type"] == "user_message":
                message = observation.data["message"]
                context = observation.data.get("context", {})
                files = observation.data.get("files", [])
                user_id = observation.data.get("user_id")
                api_keys = observation.data.get("api_keys", {})
            elif observation.data["type"] == "text":
                message = observation.data["content"]
                context = observation.data.get("context", {})
            else:
                # For other observation types, convert to string
                message = json.dumps(observation.data)
            
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
                return Action.create_error_action(
                    self.id,
                    f"No API key found for provider: {provider}. Please provide an API key in your settings or request."
                )
                
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
                        return Action.create_error_action(
                            self.id,
                            f"Error processing file: {str(e)}"
                        )
            
            # Add file contents to message if available
            if file_contents:
                message = message + "\n\n" + "\n\n".join(file_contents)
                
            # Convert history to LangChain format
            chat_history = []
            history = context.get("history", [])
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
                    memory=memory
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
                
                # Create a text action with the result
                action = Action.create_text_action(self.id, result["output"])
                
                # Add thoughts to the action data
                action.data["thoughts"] = [thought.dict() for thought in thoughts]
                
                return action
                    
            # Process with the appropriate provider if agent execution fails
            except Exception as e:
                logger.error(f"Error executing agent: {e}")
                logger.info("Falling back to direct provider API")
                
                if provider == "gemini":
                    result = await self._process_with_gemini(message, history, api_key)
                    return Action.create_text_action(self.id, result["content"])
                elif provider == "openai":
                    result = await self._process_with_openai(message, history, api_key)
                    return Action.create_text_action(self.id, result["content"])
                else:
                    return Action.create_error_action(
                        self.id,
                        f"Unsupported provider: {provider}"
                    )
        except Exception as e:
            logger.error(f"Error processing observation: {e}")
            return Action.create_error_action(
                self.id,
                f"Error processing your request: {str(e)}"
            )
    
    async def _process_with_gemini(
        self, 
        message: str, 
        history: Optional[List[Dict[str, str]]] = None,
        api_key: str = None
    ) -> Dict[str, Any]:
        """
        Process a message using Google's Gemini API
        
        Args:
            message: The message to process
            history: The conversation history
            api_key: The API key for Gemini
            
        Returns:
            The response from Gemini
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
        
        Args:
            message: The message to process
            history: The conversation history
            api_key: The API key for OpenAI
            
        Returns:
            The response from OpenAI
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