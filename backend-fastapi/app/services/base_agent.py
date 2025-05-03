"""
Base agent class for the NeuroNest AI system.
This module provides a standardized interface for all agents in the system.
"""

import uuid
import logging
import json
from typing import Dict, List, Any, Optional, Union
from abc import ABC, abstractmethod
from datetime import datetime

from app.models.agent import AgentTool, AgentThought, AgentType

logger = logging.getLogger(__name__)

class Event:
    """Base class for all events in the system"""
    
    def __init__(self, event_type: str, source: str, data: Any):
        """
        Initialize a new event
        
        Args:
            event_type: Type of the event
            source: Source of the event
            data: Data associated with the event
        """
        self.id = str(uuid.uuid4())
        self.type = event_type
        self.timestamp = datetime.utcnow().timestamp()
        self.source = source
        self.data = data
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert the event to a dictionary"""
        return {
            "id": self.id,
            "type": self.type,
            "timestamp": self.timestamp,
            "source": self.source,
            "data": self.data
        }

class Action(Event):
    """Action event representing an action taken by an agent"""
    
    def __init__(self, source: str, data: Any):
        """
        Initialize a new action event
        
        Args:
            source: Source of the action
            data: Data associated with the action
        """
        super().__init__("action", source, data)
    
    @classmethod
    def create_text_action(cls, source: str, text: str) -> 'Action':
        """Create a text action"""
        return cls(source, {
            "type": "text",
            "content": text
        })
    
    @classmethod
    def create_code_action(cls, source: str, code: str, language: str, file_path: Optional[str] = None) -> 'Action':
        """Create a code action"""
        return cls(source, {
            "type": "code",
            "content": code,
            "language": language,
            "file_path": file_path
        })
    
    @classmethod
    def create_tool_action(cls, source: str, tool_name: str, parameters: Dict[str, Any]) -> 'Action':
        """Create a tool action"""
        return cls(source, {
            "type": "tool",
            "tool_name": tool_name,
            "parameters": parameters
        })
    
    @classmethod
    def create_error_action(cls, source: str, error: str) -> 'Action':
        """Create an error action"""
        return cls(source, {
            "type": "error",
            "error": error
        })

class Observation(Event):
    """Observation event representing an observation made by an agent"""
    
    def __init__(self, source: str, data: Any):
        """
        Initialize a new observation event
        
        Args:
            source: Source of the observation
            data: Data associated with the observation
        """
        super().__init__("observation", source, data)
    
    @classmethod
    def create_text_observation(cls, source: str, text: str) -> 'Observation':
        """Create a text observation"""
        return cls(source, {
            "type": "text",
            "content": text
        })
    
    @classmethod
    def create_code_observation(cls, source: str, code: str, language: str, file_path: Optional[str] = None) -> 'Observation':
        """Create a code observation"""
        return cls(source, {
            "type": "code",
            "content": code,
            "language": language,
            "file_path": file_path
        })
    
    @classmethod
    def create_tool_result_observation(cls, source: str, tool_name: str, result: Any) -> 'Observation':
        """Create a tool result observation"""
        return cls(source, {
            "type": "tool_result",
            "tool_name": tool_name,
            "result": result
        })
    
    @classmethod
    def create_error_observation(cls, source: str, error: str) -> 'Observation':
        """Create an error observation"""
        return cls(source, {
            "type": "error",
            "error": error
        })
    
    @classmethod
    def create_user_message_observation(cls, source: str, message: str) -> 'Observation':
        """Create a user message observation"""
        return cls(source, {
            "type": "user_message",
            "message": message
        })

class EventStream:
    """Event stream that agents use to communicate"""
    
    def __init__(self):
        """Initialize a new event stream"""
        self.events = []
        self.handlers = {}
    
    def emit(self, event: Event) -> None:
        """
        Emit an event to the stream
        
        Args:
            event: The event to emit
        """
        self.events.append(event)
        
        if event.type in self.handlers:
            for handler in self.handlers[event.type]:
                handler(event)
    
    def on(self, event_type: str, handler: callable) -> callable:
        """
        Subscribe to events of a specific type
        
        Args:
            event_type: The type of event to subscribe to
            handler: The handler function to call when an event is emitted
            
        Returns:
            A function to unsubscribe
        """
        if event_type not in self.handlers:
            self.handlers[event_type] = []
        
        self.handlers[event_type].append(handler)
        
        def unsubscribe():
            self.off(event_type, handler)
        
        return unsubscribe
    
    def off(self, event_type: str, handler: Optional[callable] = None) -> None:
        """
        Unsubscribe from events of a specific type
        
        Args:
            event_type: The type of event to unsubscribe from
            handler: Optional handler function to unsubscribe
        """
        if event_type not in self.handlers:
            return
        
        if handler:
            self.handlers[event_type].remove(handler)
        else:
            del self.handlers[event_type]
    
    def get_events(self) -> List[Event]:
        """
        Get all events in the stream
        
        Returns:
            Array of events
        """
        return self.events.copy()
    
    def clear(self) -> None:
        """Clear all events from the stream"""
        self.events = []

class BaseAgent(ABC):
    """Base class for all agents in the system"""
    
    def __init__(self, event_stream: EventStream, llm_provider: Any):
        """
        Initialize a new agent
        
        Args:
            event_stream: The event stream for the agent
            llm_provider: The LLM provider for the agent
        """
        self.id = str(uuid.uuid4())
        self.name = ""
        self.description = ""
        self.event_stream = event_stream
        self.llm_provider = llm_provider
        self.tools = []
        self.system_message = ""
        self.config = {}
    
    async def initialize(self, config: Dict[str, Any]) -> None:
        """
        Initialize the agent
        
        Args:
            config: Configuration for the agent
        """
        self.id = config.get("id", self.id)
        self.name = config.get("name", "")
        self.description = config.get("description", "")
        self.config = config
        
        if "system_message" in config:
            self.system_message = config["system_message"]
        
        if "tools" in config:
            self.tools = config["tools"]
    
    @abstractmethod
    async def process(self, observation: Observation) -> Action:
        """
        Process an observation and generate an action
        
        Args:
            observation: The observation to process
            
        Returns:
            The action to take
        """
        pass
    
    def get_system_message(self) -> str:
        """
        Get the system message for the agent
        
        Returns:
            The system message
        """
        return self.system_message
    
    def get_tools(self) -> List[AgentTool]:
        """
        Get the tools available to the agent
        
        Returns:
            Array of tools
        """
        return self.tools
    
    def reset(self) -> None:
        """Reset the agent's state"""
        pass
    
    async def process_message(self, message: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Legacy method for backward compatibility
        
        Args:
            message: The message to process
            context: Additional context for the agent
            
        Returns:
            The agent's response
        """
        # Create an observation from the message
        observation = Observation.create_user_message_observation("user", message)
        
        # Add context to the observation if provided
        if context:
            observation.data["context"] = context
        
        # Process the observation
        action = await self.process(observation)
        
        # Convert the action to a legacy response
        return self.action_to_legacy_response(action)
    
    def action_to_legacy_response(self, action: Action) -> Dict[str, Any]:
        """
        Convert an action to a legacy response
        
        Args:
            action: The action to convert
            
        Returns:
            The legacy response
        """
        data = action.data
        
        if data["type"] == "text":
            return {
                "type": "text",
                "content": data["content"]
            }
        elif data["type"] == "code":
            return {
                "type": "code",
                "content": data["content"],
                "metadata": {
                    "language": data["language"],
                    "file_path": data.get("file_path")
                }
            }
        elif data["type"] == "error":
            return {
                "type": "error",
                "content": data["error"]
            }
        elif data["type"] == "tool":
            return {
                "type": "execution",
                "content": f"Executing tool: {data['tool_name']}",
                "metadata": {
                    "tool_name": data["tool_name"],
                    "parameters": data["parameters"],
                    "execution_status": "running"
                }
            }
        else:
            return {
                "type": "text",
                "content": json.dumps(data)
            }

class AgentRegistry:
    """Registry for agent types and instances"""
    
    _instance = None
    
    def __new__(cls):
        """Ensure singleton pattern"""
        if cls._instance is None:
            cls._instance = super(AgentRegistry, cls).__new__(cls)
            cls._instance.agent_types = {}
            cls._instance.agents = {}
        return cls._instance
    
    @classmethod
    def get_instance(cls) -> 'AgentRegistry':
        """
        Get the singleton instance of the registry
        
        Returns:
            The registry instance
        """
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    def register_agent_type(self, agent_type: str, factory: callable) -> None:
        """
        Register an agent type
        
        Args:
            agent_type: Type of the agent
            factory: Factory function to create the agent
        """
        self.agent_types[agent_type] = factory
    
    def get_agent_type(self, agent_type: str) -> Optional[callable]:
        """
        Get an agent type factory
        
        Args:
            agent_type: Type of the agent
            
        Returns:
            The agent factory function
        """
        return self.agent_types.get(agent_type)
    
    def get_agent_types(self) -> List[str]:
        """
        Get all registered agent types
        
        Returns:
            Array of agent type names
        """
        return list(self.agent_types.keys())
    
    async def create_agent(
        self,
        agent_type: str,
        config: Dict[str, Any],
        event_stream: EventStream,
        llm_provider: Any
    ) -> BaseAgent:
        """
        Create an agent instance
        
        Args:
            agent_type: Type of the agent
            config: Configuration for the agent
            event_stream: Event stream for the agent
            llm_provider: LLM provider for the agent
            
        Returns:
            The created agent instance
        """
        factory = self.agent_types.get(agent_type)
        
        if not factory:
            raise ValueError(f"Agent type '{agent_type}' not registered")
        
        agent = factory(event_stream, llm_provider)
        await agent.initialize(config)
        
        self.agents[agent.id] = agent
        
        return agent
    
    def get_agent(self, agent_id: str) -> Optional[BaseAgent]:
        """
        Get an agent instance by ID
        
        Args:
            agent_id: ID of the agent
            
        Returns:
            The agent instance
        """
        return self.agents.get(agent_id)
    
    def get_agents(self) -> List[BaseAgent]:
        """
        Get all agent instances
        
        Returns:
            Array of agent instances
        """
        return list(self.agents.values())
    
    def remove_agent(self, agent_id: str) -> None:
        """
        Remove an agent instance
        
        Args:
            agent_id: ID of the agent
        """
        if agent_id in self.agents:
            del self.agents[agent_id]
    
    def clear_agents(self) -> None:
        """Clear all agent instances"""
        self.agents = {}