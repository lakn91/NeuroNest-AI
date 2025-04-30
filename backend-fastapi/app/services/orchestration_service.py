import uuid
import logging
import asyncio
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import AIMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langchain.tools import BaseTool
from langchain.memory import ConversationBufferMemory
from app.services.agent_service import AgentService
from app.services.memory_service import MemoryService
from app.services.agent_tools import get_tool_by_name

logger = logging.getLogger(__name__)

class OrchestrationService:
    """
    Service for orchestrating agent tasks and workflows
    """
    
    def __init__(self):
        self.agent_service = AgentService()
        self.memory_service = MemoryService()
        
        # In-memory storage for task and workflow metadata
        # In a production environment, this would be stored in a database
        self.tasks = {}
        self.workflows = {}
        self.agents = {}
    
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
        """
        system_messages = {
            "thinking": """You are a Thinking Agent that analyzes problems, creates execution plans, and provides reasoning.
            Your role is to break down complex requests into actionable steps, identify potential challenges, and suggest approaches.
            You should think step-by-step and provide clear, logical reasoning for your conclusions.""",
            
            "coding": """You are a Developer Agent that generates high-quality code based on specifications.
            Your role is to write clean, efficient, and well-documented code that meets the requirements.
            You should follow best practices for the language and framework being used.""",
            
            "frontend": """You are a Frontend Developer Agent that specializes in creating user interfaces.
            Your role is to write HTML, CSS, and JavaScript code that creates responsive, accessible, and visually appealing UIs.
            You should follow modern frontend development practices and ensure cross-browser compatibility.""",
            
            "backend": """You are a Backend Developer Agent that specializes in server-side logic and APIs.
            Your role is to design and implement robust, scalable, and secure backend systems.
            You should follow best practices for API design, database interactions, and error handling.""",
            
            "review": """You are an Editor Agent that reviews and improves code.
            Your role is to identify bugs, inefficiencies, and areas for improvement in code.
            You should suggest specific changes to enhance code quality, performance, and maintainability.""",
            
            "execution": """You are an Execution Agent that runs and tests code.
            Your role is to set up environments, install dependencies, and execute code to verify its functionality.
            You should provide detailed feedback on execution results and troubleshoot any issues.""",
            
            "conversation": """You are a Conversation Agent that provides helpful responses to user queries.
            Your role is to understand the user's intent and provide clear, accurate, and relevant information.
            You should be friendly, concise, and focus on addressing the user's needs.""",
            
            "research": """You are a Research Agent that gathers and synthesizes information.
            Your role is to find relevant information from various sources and present it in a structured format.
            You should verify facts, cite sources, and provide comprehensive answers to research questions.""",
            
            "planning": """You are a Planning Agent that helps organize projects and tasks.
            Your role is to create structured plans, timelines, and task breakdowns for projects.
            You should consider dependencies, priorities, and resource constraints in your planning."""
        }
        
        return system_messages.get(task_type, """You are an AI assistant. You help users by providing thoughtful, 
        accurate responses to their questions and completing tasks using the tools available to you.""")