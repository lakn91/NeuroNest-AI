"""
Orchestration Service - Provides agent orchestration and task coordination
"""

import uuid
import logging
import asyncio
import json
from typing import Dict, List, Optional, Any, Tuple, Union
from datetime import datetime

from app.config import settings
from app.services.agent_service_class import AgentService
from app.services.memory_service import MemoryService
# Mock function for getting tools by name
def get_tool_by_name(name: str):
    """Get a tool by name (mock implementation)"""
    return None
from app.services.document_index_service import DocumentIndexService
from app.services.code_analysis_service import CodeAnalysisService

# Import LangChain components
try:
    from langchain.agents import AgentExecutor, create_openai_tools_agent
    from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
    from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
    from langchain_openai import ChatOpenAI
    from langchain.tools import BaseTool, Tool
    from langchain.memory import ConversationBufferMemory, ConversationBufferWindowMemory
    from langchain.callbacks.manager import CallbackManager
    from langchain.callbacks.streaming_stdout import StreamingStdOutCallbackHandler
    
    # Flag to indicate that LangChain is available
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    logging.warning("LangChain components not available. Agent orchestration will be limited.")

logger = logging.getLogger(__name__)

class OrchestrationService:
    """
    Service for orchestrating agent tasks and workflows
    """
    
    def __init__(self):
        self.logger = logger
        self.agent_service = AgentService()
        self.memory_service = MemoryService()
        self.document_index_service = DocumentIndexService()
        self.code_analysis_service = CodeAnalysisService()
        
        # Initialize LangChain components if available
        if LANGCHAIN_AVAILABLE:
            self._init_langchain()
        
        # In-memory storage for task and workflow metadata
        # In a production environment, this would be stored in a database
        self.tasks = {}
        self.workflows = {}
        self.agents = {}
    
    def _init_langchain(self):
        """
        Initialize LangChain components
        """
        try:
            # Initialize LLM based on available API keys
            if settings.OPENAI_API_KEY:
                self.llm = ChatOpenAI(
                    model="gpt-4",
                    temperature=settings.AGENT_TEMPERATURE,
                    max_tokens=settings.AGENT_MAX_TOKENS,
                    streaming=True,
                    verbose=settings.LANGCHAIN_VERBOSE,
                    callback_manager=CallbackManager([StreamingStdOutCallbackHandler()])
                )
                self.logger.info("Using OpenAI for agent orchestration")
            elif settings.ANTHROPIC_API_KEY:
                self.llm = ChatAnthropic(
                    model="claude-2",
                    temperature=settings.AGENT_TEMPERATURE,
                    max_tokens=settings.AGENT_MAX_TOKENS,
                    streaming=True,
                    verbose=settings.LANGCHAIN_VERBOSE,
                    callback_manager=CallbackManager([StreamingStdOutCallbackHandler()])
                )
                self.logger.info("Using Anthropic for agent orchestration")
            else:
                self.logger.warning("No LLM API keys available. Agent orchestration will be limited.")
                self.llm = None
            
            # Initialize tools
            self._init_tools()
            
            self.logger.info("LangChain components initialized")
        except Exception as e:
            self.logger.error(f"Error initializing LangChain components: {e}")
            self.llm = None
    
    def _init_tools(self):
        """
        Initialize LangChain tools
        """
        try:
            # Define basic tools
            self.tools = [
                Tool(
                    name="Search",
                    func=self._search_documents,
                    description="Search for information in indexed documents. Input should be a search query."
                ),
                Tool(
                    name="CodeAnalysis",
                    func=self._analyze_code,
                    description="Analyze code for issues and improvements. Input should be code as a string."
                )
            ]
            
            self.logger.info(f"Initialized {len(self.tools)} LangChain tools")
        except Exception as e:
            self.logger.error(f"Error initializing tools: {e}")
            self.tools = []
    
    async def create_task(
        self,
        task_type: str,
        input_data: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
        tools: Optional[List[str]] = None,
        memory_id: Optional[str] = None
    ) -> Tuple[str, Optional[str]]:
        """
        Create a new task for the orchestrator to assign to an appropriate agent
        """
        task_id = str(uuid.uuid4())
        
        # Determine the appropriate agent for the task
        agent_id = await self._select_agent_for_task(task_type, input_data, context)
        
        # Create task metadata
        task = {
            "id": task_id,
            "type": task_type,
            "input_data": input_data,
            "context": context or {},
            "tools": tools or [],
            "memory_id": memory_id,
            "agent_id": agent_id,
            "status": "pending",
            "result": None,
            "error": None,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # Store task metadata
        self.tasks[task_id] = task
        
        return task_id, agent_id
    
    async def process_task(self, task_id: str) -> Dict[str, Any]:
        """
        Process a task using the assigned agent
        """
        if task_id not in self.tasks:
            raise ValueError(f"Task {task_id} not found")
        
        task = self.tasks[task_id]
        
        # Update task status
        task["status"] = "processing"
        task["updated_at"] = datetime.now().isoformat()
        
        try:
            # Get the agent
            agent_id = task["agent_id"]
            
            # Initialize tools
            tools = []
            for tool_name in task["tools"]:
                tool = get_tool_by_name(tool_name)
                if tool:
                    tools.append(tool)
            
            # Initialize memory if needed
            memory = None
            if task["memory_id"]:
                memory = await self.memory_service.get_memory(task["memory_id"])
            
            # Process the task using LangChain
            result = await self._process_with_langchain(
                task_type=task["type"],
                input_data=task["input_data"],
                context=task["context"],
                tools=tools,
                memory=memory
            )
            
            # Update task with result
            task["result"] = result
            task["status"] = "completed"
            task["updated_at"] = datetime.now().isoformat()
            
            return result
        except Exception as e:
            # Update task with error
            task["error"] = str(e)
            task["status"] = "failed"
            task["updated_at"] = datetime.now().isoformat()
            logger.error(f"Error processing task {task_id}: {str(e)}", exc_info=True)
            raise
    
    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        Get the status of a task
        """
        if task_id not in self.tasks:
            raise ValueError(f"Task {task_id} not found")
        
        task = self.tasks[task_id]
        
        return {
            "task_id": task["id"],
            "status": task["status"],
            "result": task["result"],
            "error": task["error"],
            "agent_id": task["agent_id"],
            "created_at": task["created_at"],
            "updated_at": task["updated_at"]
        }
    
    async def list_tasks(
        self,
        status: Optional[str] = None,
        agent_id: Optional[str] = None,
        limit: int = 10,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        List tasks with optional filtering
        """
        # Filter tasks
        filtered_tasks = self.tasks.values()
        
        if status:
            filtered_tasks = [task for task in filtered_tasks if task["status"] == status]
        
        if agent_id:
            filtered_tasks = [task for task in filtered_tasks if task["agent_id"] == agent_id]
        
        # Sort tasks by creation time (newest first)
        sorted_tasks = sorted(
            filtered_tasks,
            key=lambda task: task["created_at"],
            reverse=True
        )
        
        # Apply pagination
        paginated_tasks = sorted_tasks[offset:offset + limit]
        
        # Format tasks for response
        formatted_tasks = []
        for task in paginated_tasks:
            formatted_tasks.append({
                "task_id": task["id"],
                "status": task["status"],
                "result": task["result"],
                "error": task["error"],
                "agent_id": task["agent_id"],
                "created_at": task["created_at"],
                "updated_at": task["updated_at"]
            })
        
        return formatted_tasks
    
    async def cancel_task(self, task_id: str) -> None:
        """
        Cancel a running task
        """
        if task_id not in self.tasks:
            raise ValueError(f"Task {task_id} not found")
        
        task = self.tasks[task_id]
        
        if task["status"] in ["pending", "processing"]:
            task["status"] = "cancelled"
            task["updated_at"] = datetime.now().isoformat()
    
    async def register_agent(self, agent_data: Dict[str, Any]) -> str:
        """
        Register a new agent with the orchestrator
        """
        agent_id = agent_data.get("id", str(uuid.uuid4()))
        
        # Store agent metadata
        self.agents[agent_id] = {
            "id": agent_id,
            "name": agent_data.get("name", f"Agent-{agent_id}"),
            "description": agent_data.get("description", ""),
            "capabilities": agent_data.get("capabilities", []),
            "status": "active",
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        return agent_id
    
    async def get_agent_info(self, agent_id: str) -> Dict[str, Any]:
        """
        Get information about a registered agent
        """
        if agent_id not in self.agents:
            raise ValueError(f"Agent {agent_id} not found")
        
        return self.agents[agent_id]
    
    async def list_agents(self) -> List[Dict[str, Any]]:
        """
        List all registered agents
        """
        return list(self.agents.values())
    
    async def create_workflow(self, workflow_data: Dict[str, Any]) -> str:
        """
        Create a new workflow for orchestrating multiple agent tasks
        """
        workflow_id = str(uuid.uuid4())
        
        # Create workflow metadata
        workflow = {
            "id": workflow_id,
            "name": workflow_data.get("name", f"Workflow-{workflow_id}"),
            "description": workflow_data.get("description", ""),
            "steps": workflow_data.get("steps", []),
            "status": "created",
            "results": {},
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        # Store workflow metadata
        self.workflows[workflow_id] = workflow
        
        return workflow_id
    
    async def get_workflow_status(self, workflow_id: str) -> Dict[str, Any]:
        """
        Get the status of a workflow
        """
        if workflow_id not in self.workflows:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        return self.workflows[workflow_id]
    
    async def execute_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """
        Execute a workflow
        """
        if workflow_id not in self.workflows:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        workflow = self.workflows[workflow_id]
        
        # Update workflow status
        workflow["status"] = "running"
        workflow["updated_at"] = datetime.now().isoformat()
        
        try:
            # Execute each step in the workflow
            for step in workflow["steps"]:
                step_id = step["id"]
                
                # Create a task for the step
                task_id, _ = await self.create_task(
                    task_type=step["type"],
                    input_data=step["input_data"],
                    context=step.get("context", {}),
                    tools=step.get("tools", []),
                    memory_id=step.get("memory_id")
                )
                
                # Process the task
                result = await self.process_task(task_id)
                
                # Store the result
                workflow["results"][step_id] = {
                    "task_id": task_id,
                    "result": result
                }
                
                # Check if we need to update the context for subsequent steps
                if step.get("update_context", False) and result:
                    for next_step in workflow["steps"]:
                        if next_step["id"] != step_id:
                            next_step["context"] = next_step.get("context", {})
                            next_step["context"].update({"previous_result": result})
            
            # Update workflow status
            workflow["status"] = "completed"
            workflow["updated_at"] = datetime.now().isoformat()
            
            return workflow
        except Exception as e:
            # Update workflow status on failure
            workflow["status"] = "failed"
            workflow["error"] = str(e)
            workflow["updated_at"] = datetime.now().isoformat()
            logger.error(f"Error executing workflow {workflow_id}: {str(e)}", exc_info=True)
            raise
    
    async def _select_agent_for_task(
        self,
        task_type: str,
        input_data: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """
        Select the appropriate agent for a task
        """
        # Define task type to agent mapping
        task_agent_mapping = {
            "thinking": "thinking_agent",
            "coding": "developer_agent",
            "frontend": "frontend_developer_agent",
            "backend": "backend_developer_agent",
            "review": "editor_agent",
            "execution": "execution_agent",
            "conversation": "conversation_agent",
            "research": "research_agent",
            "planning": "planning_agent"
        }
        
        # Get the default agent for the task type
        default_agent = task_agent_mapping.get(task_type)
        
        # If we have a complex task, use LangChain to determine the best agent
        if task_type == "complex" or not default_agent:
            # Use LangChain to analyze the task and select the appropriate agent
            llm = ChatOpenAI(temperature=0)
            
            prompt = ChatPromptTemplate.from_messages([
                ("system", """You are an agent router that determines which specialized agent should handle a task.
                Available agents:
                - thinking_agent: For analysis, reasoning, and planning
                - developer_agent: For general coding tasks
                - frontend_developer_agent: For frontend development (HTML, CSS, JavaScript)
                - backend_developer_agent: For backend development (APIs, databases)
                - editor_agent: For reviewing and improving code
                - execution_agent: For running and testing code
                - conversation_agent: For general conversation and assistance
                - research_agent: For research and information gathering
                - planning_agent: For project planning and management
                
                Based on the task description and context, determine which agent is best suited to handle it.
                Respond with just the agent name, nothing else."""),
                ("human", f"Task type: {task_type}\nInput: {json.dumps(input_data)}\nContext: {json.dumps(context or {})}")
            ])
            
            response = await llm.ainvoke(prompt)
            selected_agent = response.content.strip()
            
            # Validate the selected agent
            if selected_agent not in task_agent_mapping.values():
                selected_agent = "thinking_agent"  # Default to thinking agent if invalid
        else:
            selected_agent = default_agent
        
        # Find an agent with the required capabilities
        for agent_id, agent in self.agents.items():
            if selected_agent in agent["capabilities"]:
                return agent_id
        
        # If no suitable agent is found, return None
        # The orchestrator will handle this case by using a default agent
        return None
    
    async def _process_with_langchain(
        self,
        task_type: str,
        input_data: Dict[str, Any],
        context: Dict[str, Any],
        tools: List[BaseTool],
        memory: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Process a task using LangChain
        """
        # Initialize the language model
        llm = ChatOpenAI(temperature=0.7)
        
        # Initialize memory if not provided
        if not memory:
            memory = ConversationBufferMemory(
                memory_key="chat_history",
                return_messages=True
            )
        
        # Create the system message based on task type
        system_message = self._get_system_message_for_task_type(task_type)
        
        # Create the prompt template
        prompt = ChatPromptTemplate.from_messages([
            ("system", system_message),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}")
        ])
        
        # Create the agent
        agent = create_openai_tools_agent(llm, tools, prompt)
        
        # Create the agent executor
        agent_executor = AgentExecutor(
            agent=agent,
            tools=tools,
            memory=memory,
            verbose=True
        )
        
        # Prepare the input
        agent_input = {
            "input": json.dumps({
                "task": task_type,
                "input_data": input_data,
                "context": context
            })
        }
        
        # Execute the agent
        result = await agent_executor.ainvoke(agent_input)
        
        return {
            "output": result["output"],
            "intermediate_steps": [
                {"tool": step[0].tool, "input": step[0].tool_input, "output": step[1]}
                for step in result.get("intermediate_steps", [])
            ]
        }
    
    def _get_system_message_for_task_type(self, task_type: str) -> str:
        """
        Get the system message for a task type
        
        Args:
            task_type: Task type
            
        Returns:
            System message
        """
        # Define system messages for different task types
        system_messages = {
            "thinking": """You are a thinking agent that excels at analysis, reasoning, and planning.
                Your goal is to carefully analyze the given task and provide thoughtful insights and solutions.
                Think step by step and consider multiple perspectives before reaching a conclusion.""",
            
            "coding": """You are a developer agent that excels at writing clean, efficient code.
                Your goal is to implement the requested functionality with high-quality code that follows best practices.
                Consider edge cases, performance, and maintainability in your solutions.""",
            
            "frontend": """You are a frontend developer agent that excels at creating user interfaces.
                Your goal is to implement the requested UI components with clean HTML, CSS, and JavaScript.
                Focus on user experience, accessibility, and responsive design.""",
            
            "backend": """You are a backend developer agent that excels at building server-side applications.
                Your goal is to implement robust APIs, database interactions, and business logic.
                Focus on security, scalability, and performance.""",
            
            "review": """You are an editor agent that excels at reviewing and improving code.
                Your goal is to identify issues, suggest improvements, and ensure code quality.
                Look for bugs, performance issues, security vulnerabilities, and maintainability concerns.""",
            
            "execution": """You are an execution agent that excels at running and testing code.
                Your goal is to execute the given code, analyze the results, and provide feedback.
                Look for errors, unexpected behavior, and performance issues.""",
            
            "conversation": """You are a conversation agent that excels at providing helpful responses.
                Your goal is to understand the user's query and provide a clear, accurate, and helpful response.
                Be friendly, concise, and informative.""",
            
            "research": """You are a research agent that excels at gathering and synthesizing information.
                Your goal is to find relevant information on the given topic and present it in a clear, organized manner.
                Cite sources and provide comprehensive coverage of the topic.""",
            
            "planning": """You are a planning agent that excels at project planning and management.
                Your goal is to break down complex tasks into manageable steps and create a clear plan of action.
                Consider dependencies, timelines, and resource constraints."""
        }
        
        # Return the system message for the task type, or a default message
        return system_messages.get(
            task_type,
            """You are a helpful AI assistant. Your goal is to complete the given task to the best of your ability.
            Think carefully and provide a high-quality response."""
        )
    
    def _search_documents(self, query: str) -> str:
        """
        Search documents (LangChain tool)
        
        Args:
            query: Search query
            
        Returns:
            Search results as a string
        """
        try:
            # This is a synchronous function for LangChain tools
            # In a real implementation, you would use a synchronous version of the search
            loop = asyncio.get_event_loop()
            results = loop.run_until_complete(
                self.document_index_service.search("default", query, limit=3)
            )
            
            if not results:
                return "No results found."
            
            # Format results
            formatted_results = []
            for i, result in enumerate(results):
                formatted_results.append(f"{i+1}. {result['text']}")
            
            return "\n\n".join(formatted_results)
        except Exception as e:
            self.logger.error(f"Error searching documents: {e}")
            return f"Error searching documents: {str(e)}"
    
    def _analyze_code(self, code: str) -> str:
        """
        Analyze code (LangChain tool)
        
        Args:
            code: Code to analyze
            
        Returns:
            Analysis results as a string
        """
        try:
            # This is a synchronous function for LangChain tools
            # In a real implementation, you would use a synchronous version of the analysis
            loop = asyncio.get_event_loop()
            result = loop.run_until_complete(
                self.code_analysis_service.analyze_code(code)
            )
            
            # Format result
            if isinstance(result, dict):
                formatted_result = json.dumps(result, indent=2)
            else:
                formatted_result = str(result)
            
            return formatted_result
        except Exception as e:
            self.logger.error(f"Error analyzing code: {e}")
            return f"Error analyzing code: {str(e)}"
    
    async def close(self):
        """
        Close the orchestration service
        """
        try:
            # Close document index service
            if hasattr(self.document_index_service, 'close'):
                await self.document_index_service.close()
            
            # Close memory service
            if hasattr(self.memory_service, 'close'):
                await self.memory_service.close()
            
            self.logger.info("Orchestration service closed")
        except Exception as e:
            self.logger.error(f"Error closing orchestration service: {e}")
            
    def _get_system_message(self, task_type: str) -> str:
        """
        Get the system message for a specific task type
        """
        system_messages = {
            "planning": """You are a Planning Agent that helps organize projects and tasks.
            Your role is to create structured plans, timelines, and task breakdowns for projects.
            You should consider dependencies, priorities, and resource constraints in your planning."""
        }
        
        return system_messages.get(task_type, """You are an AI assistant. You help users by providing thoughtful, 
        accurate responses to their questions and completing tasks using the tools available to you.""")