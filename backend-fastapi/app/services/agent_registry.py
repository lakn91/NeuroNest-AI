"""
Agent Registry for the NeuroNest AI system.
This module provides a registry for agent types and instances.
"""

import logging
from typing import Dict, List, Any, Optional, Callable, Type

from app.services.base_agent import BaseAgent, EventStream
from app.services.orchestrator_agent import OrchestratorAgent
from app.services.thinking_agent import ThinkingAgent
from app.services.specialized_agents import CodeGenerationAgent, DebuggingAgent, ProjectPlanningAgent

logger = logging.getLogger(__name__)

# Type for agent factory functions
AgentFactory = Callable[[EventStream, Any], BaseAgent]

class AgentRegistry:
    """Registry for agent types and instances"""
    
    _instance = None
    
    def __new__(cls):
        """Ensure singleton pattern"""
        if cls._instance is None:
            cls._instance = super(AgentRegistry, cls).__new__(cls)
            cls._instance.agent_types = {}
            cls._instance.agents = {}
            cls._instance._register_default_agents()
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
    
    def _register_default_agents(self) -> None:
        """Register default agent types"""
        self.register_agent_type("orchestrator", lambda es, llm: OrchestratorAgent(es, llm))
        self.register_agent_type("thinking", lambda es, llm: ThinkingAgent(es, llm))
        self.register_agent_type("code_generation", lambda es, llm: CodeGenerationAgent(es, llm))
        self.register_agent_type("debugging", lambda es, llm: DebuggingAgent(es, llm))
        self.register_agent_type("project_planning", lambda es, llm: ProjectPlanningAgent(es, llm))
    
    def register_agent_type(self, agent_type: str, factory: AgentFactory) -> None:
        """
        Register an agent type
        
        Args:
            agent_type: Type of the agent
            factory: Factory function to create the agent
        """
        self.agent_types[agent_type] = factory
        logger.info(f"Registered agent type: {agent_type}")
    
    def get_agent_type(self, agent_type: str) -> Optional[AgentFactory]:
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
        logger.info(f"Created agent instance: {agent.id} ({agent_type})")
        
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
            logger.info(f"Removed agent instance: {agent_id}")
            del self.agents[agent_id]
    
    def clear_agents(self) -> None:
        """Clear all agent instances"""
        self.agents = {}
        logger.info("Cleared all agent instances")