"""
Thinking Agent for the NeuroNest AI system.
This agent analyzes requests and creates execution plans.
"""

import logging
import json
from typing import Dict, List, Any, Optional, Union

from app.services.base_agent import BaseAgent, EventStream, Action, Observation
from app.core.config import settings
from app.services.execution_service import execute_code_snippet
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.chains import LLMChain

logger = logging.getLogger(__name__)

class ThinkingAgent(BaseAgent):
    """
    Agent responsible for analyzing requests and creating execution plans
    """
    
    def __init__(self, event_stream: EventStream, llm_provider: Any):
        """
        Initialize a new ThinkingAgent
        
        Args:
            event_stream: The event stream for the agent
            llm_provider: The LLM provider for the agent
        """
        super().__init__(event_stream, llm_provider)
        self.name = "ThinkingAgent"
        self.description = "Analyzes requests and creates execution plans"
        self.capabilities = [
            "Analyze user requests",
            "Break down complex tasks",
            "Create structured execution plans",
            "Identify required agents and tools",
            "Prioritize tasks"
        ]
        self.thinking_chain = None
    
    async def initialize(self, config: Dict[str, Any]) -> None:
        """
        Initialize the agent
        
        Args:
            config: Configuration for the agent
        """
        await super().initialize(config)
        
        # Set default system message if not provided
        if not self.system_message:
            self.system_message = """You are the Thinking Agent, responsible for analyzing user requests and creating execution plans.
Your role is to break down complex tasks into smaller, manageable steps that other agents can execute.
You should consider the capabilities of other agents in the system when creating your plans.

Available agents:
- DeveloperAgent: Generates code in multiple languages
- EditorAgent: Reviews and improves code
- OrchestratorAgent: Coordinates other agents and tools
- ProjectPlanningAgent: Plans and structures software projects
- DebuggingAgent: Debugs code and fixes issues

Your output should be a JSON object with the following structure:
{
  "analysis": "Brief analysis of the user request",
  "steps": [
    {
      "id": 1,
      "description": "Step description",
      "agent": "AgentName",
      "params": { "param1": "value1", "param2": "value2" }
    },
    ...
  ]
}
"""
        
        # Initialize the thinking chain
        try:
            api_key = None
            if self.llm_provider and hasattr(self.llm_provider, "api_key"):
                api_key = self.llm_provider.api_key
            elif settings.OPENAI_API_KEY:
                api_key = settings.OPENAI_API_KEY
            
            if api_key:
                llm = ChatOpenAI(
                    model="gpt-4-turbo",
                    temperature=0.2,  # Lower temperature for more deterministic output
                    api_key=api_key
                )
                
                prompt = ChatPromptTemplate.from_messages([
                    ("system", self.system_message),
                    ("human", "{input}")
                ])
                
                self.thinking_chain = LLMChain(
                    llm=llm,
                    prompt=prompt,
                    output_key="output"
                )
        except Exception as e:
            logger.error(f"Error initializing thinking chain: {e}")
    
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
            
            if observation.data["type"] == "user_message":
                message = observation.data["message"]
                context = observation.data.get("context", {})
            elif observation.data["type"] == "text":
                message = observation.data["content"]
                context = observation.data.get("context", {})
            else:
                # For other observation types, convert to string
                message = json.dumps(observation.data)
            
            # Generate plan
            plan = None
            
            # Use thinking chain if available
            if self.thinking_chain:
                try:
                    result = await self.thinking_chain.ainvoke({"input": message})
                    
                    # Try to parse the result as JSON
                    try:
                        plan_text = result["output"]
                        
                        # Extract JSON from the text if it's wrapped in markdown code blocks
                        if "```json" in plan_text and "```" in plan_text:
                            start = plan_text.find("```json") + 7
                            end = plan_text.find("```", start)
                            plan_text = plan_text[start:end].strip()
                        elif "```" in plan_text and "```" in plan_text:
                            start = plan_text.find("```") + 3
                            end = plan_text.find("```", start)
                            plan_text = plan_text[start:end].strip()
                        
                        plan = json.loads(plan_text)
                        
                        # Add the original request to the plan
                        plan["originalRequest"] = message
                    except json.JSONDecodeError:
                        logger.error(f"Error parsing JSON from thinking chain result: {result['output']}")
                        plan = self.create_mock_plan(message)
                except Exception as e:
                    logger.error(f"Error using thinking chain: {e}")
                    plan = self.create_mock_plan(message)
            else:
                plan = self.create_mock_plan(message)
            
            # Create an action with the plan
            return Action(self.id, {
                "type": "plan",
                "content": plan
            })
        except Exception as e:
            logger.error(f"Error in ThinkingAgent: {e}")
            return Action.create_error_action(self.id, f"Failed to analyze request and create plan: {str(e)}")
    
    def create_mock_plan(self, message: str) -> Dict[str, Any]:
        """
        Create a mock plan for demonstration purposes
        
        Args:
            message: The user message
            
        Returns:
            A mock plan
        """
        return {
            "originalRequest": message,
            "analysis": "The user wants to create a simple web application.",
            "steps": [
                {
                    "id": 1,
                    "description": "Create HTML structure",
                    "agent": "DeveloperAgent",
                    "params": { "language": "html" }
                },
                {
                    "id": 2,
                    "description": "Add CSS styling",
                    "agent": "DeveloperAgent",
                    "params": { "language": "css" }
                },
                {
                    "id": 3,
                    "description": "Implement JavaScript functionality",
                    "agent": "DeveloperAgent",
                    "params": { "language": "javascript" }
                },
                {
                    "id": 4,
                    "description": "Review and improve code",
                    "agent": "EditorAgent",
                    "params": {}
                }
            ]
        }