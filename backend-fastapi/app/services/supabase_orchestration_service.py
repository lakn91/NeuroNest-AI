"""
Supabase Orchestration Service - Provides agent orchestration and task coordination with Supabase integration
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
from app.services.document_index_service import DocumentIndexService
from app.services.code_analysis_service import CodeAnalysisService
from app.database.supabase_client import get_supabase_client

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

class SupabaseOrchestrationService:
    """
    Service for orchestrating agent tasks and workflows with Supabase integration
    """
    
    def __init__(self):
        self.logger = logger
        self.agent_service = AgentService()
        self.memory_service = MemoryService()
        self.document_index_service = DocumentIndexService()
        self.code_analysis_service = CodeAnalysisService()
        
        # Initialize Supabase client
        self.supabase = get_supabase_client()
        
        # Initialize LangChain components if available
        if LANGCHAIN_AVAILABLE:
            self._init_langchain()
        
        # Cache for task and workflow data
        self.task_cache = {}
        self.workflow_cache = {}
        self.agent_cache = {}
    
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
                try:
                    from langchain_anthropic import ChatAnthropic
                    self.llm = ChatAnthropic(
                        model="claude-2",
                        temperature=settings.AGENT_TEMPERATURE,
                        max_tokens=settings.AGENT_MAX_TOKENS,
                        streaming=True,
                        verbose=settings.LANGCHAIN_VERBOSE,
                        callback_manager=CallbackManager([StreamingStdOutCallbackHandler()])
                    )
                    self.logger.info("Using Anthropic for agent orchestration")
                except ImportError:
                    self.logger.warning("Anthropic API key is set but langchain_anthropic is not installed")
                    self.llm = None
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
    
    async def _search_documents(self, query: str) -> str:
        """
        Search for information in indexed documents
        """
        try:
            results = await self.document_index_service.search(query)
            return json.dumps(results)
        except Exception as e:
            self.logger.error(f"Error searching documents: {e}")
            return f"Error searching documents: {str(e)}"
    
    async def _analyze_code(self, code: str) -> str:
        """
        Analyze code for issues and improvements
        """
        try:
            results = await self.code_analysis_service.analyze_code(code)
            return json.dumps(results)
        except Exception as e:
            self.logger.error(f"Error analyzing code: {e}")
            return f"Error analyzing code: {str(e)}"
    
    async def create_task(
        self,
        task_type: str,
        input_data: Dict[str, Any],
        user_id: str,
        context: Optional[Dict[str, Any]] = None,
        tools: Optional[List[str]] = None,
        memory_id: Optional[str] = None
    ) -> Tuple[str, Optional[str]]:
        """
        Create a new task for the orchestrator to assign to an appropriate agent with Supabase integration
        """
        task_id = str(uuid.uuid4())
        
        # Determine the appropriate agent for the task
        agent_id = await self._select_agent_for_task(task_type, input_data, context)
        
        # Create task metadata
        created_at = datetime.now().isoformat()
        task = {
            "id": task_id,
            "user_id": user_id,
            "task_type": task_type,
            "input_data": input_data,
            "context": context or {},
            "tools": tools or [],
            "memory_id": memory_id,
            "agent_id": agent_id,
            "status": "pending",
            "result": None,
            "error": None,
            "created_at": created_at,
            "updated_at": created_at
        }
        
        # Store task metadata in Supabase
        try:
            # Convert input_data, context, and tools to JSON strings
            task_data = {
                "id": task_id,
                "user_id": user_id,
                "task_type": task_type,
                "input_data": json.dumps(input_data),
                "context": json.dumps(context or {}),
                "tools": json.dumps(tools or []),
                "memory_id": memory_id,
                "agent_id": agent_id,
                "status": "pending",
                "result": None,
                "error": None,
                "created_at": created_at,
                "updated_at": created_at
            }
            
            # Insert into Supabase
            response = self.supabase.table("orchestration_tasks").insert(task_data).execute()
            
            if hasattr(response, 'error') and response.error:
                self.logger.error(f"Error storing task in Supabase: {response.error}")
                # Fall back to in-memory storage
                self.task_cache[task_id] = task
            else:
                self.logger.info(f"Task {task_id} stored in Supabase")
                # Cache the task
                self.task_cache[task_id] = task
            
            return task_id, agent_id
        except Exception as e:
            self.logger.error(f"Error creating task: {str(e)}", exc_info=True)
            # Fall back to in-memory storage
            self.task_cache[task_id] = task
            return task_id, agent_id
    
    async def process_task(self, task_id: str) -> Dict[str, Any]:
        """
        Process a task using the assigned agent with Supabase integration
        """
        # Get task from Supabase
        task = await self._get_task(task_id)
        
        if not task:
            raise ValueError(f"Task {task_id} not found")
        
        # Update task status
        task["status"] = "processing"
        task["updated_at"] = datetime.now().isoformat()
        await self._update_task_status(task_id, "processing")
        
        try:
            # Get the agent
            agent_id = task["agent_id"]
            
            # Initialize tools
            tools = []
            for tool_name in task["tools"]:
                tool = self._get_tool_by_name(tool_name)
                if tool:
                    tools.append(tool)
            
            # Initialize memory if needed
            memory = None
            if task["memory_id"]:
                memory = await self.memory_service.get_memory(task["memory_id"])
            
            # Process the task using LangChain
            result = await self._process_with_langchain(
                task_type=task["task_type"],
                input_data=task["input_data"],
                context=task["context"],
                tools=tools,
                memory=memory
            )
            
            # Update task with result
            task["result"] = result
            task["status"] = "completed"
            task["updated_at"] = datetime.now().isoformat()
            
            # Update in Supabase
            await self._update_task(task_id, {
                "result": json.dumps(result) if result else None,
                "status": "completed",
                "updated_at": datetime.now().isoformat()
            })
            
            return result
        except Exception as e:
            # Update task with error
            task["error"] = str(e)
            task["status"] = "failed"
            task["updated_at"] = datetime.now().isoformat()
            
            # Update in Supabase
            await self._update_task(task_id, {
                "error": str(e),
                "status": "failed",
                "updated_at": datetime.now().isoformat()
            })
            
            logger.error(f"Error processing task {task_id}: {str(e)}", exc_info=True)
            raise
    
    async def _process_with_langchain(
        self,
        task_type: str,
        input_data: Dict[str, Any],
        context: Dict[str, Any],
        tools: List[Any],
        memory: Any
    ) -> Dict[str, Any]:
        """
        Process a task using LangChain
        """
        if not LANGCHAIN_AVAILABLE or not self.llm:
            raise ValueError("LangChain is not available or LLM is not initialized")
        
        try:
            # Create system message based on task type
            system_message = self._get_system_message_for_task_type(task_type)
            
            # Create prompt
            prompt = ChatPromptTemplate.from_messages([
                ("system", system_message),
                MessagesPlaceholder(variable_name="chat_history"),
                ("human", "{input}")
            ])
            
            # Create memory
            if memory:
                langchain_memory = ConversationBufferMemory(
                    memory_key="chat_history",
                    return_messages=True
                )
                
                # Load existing messages if available
                if hasattr(memory, "messages") and memory.messages:
                    for msg in memory.messages:
                        if msg.get("role") == "user":
                            langchain_memory.chat_memory.add_user_message(msg.get("content", ""))
                        elif msg.get("role") == "assistant":
                            langchain_memory.chat_memory.add_ai_message(msg.get("content", ""))
            else:
                langchain_memory = ConversationBufferMemory(
                    memory_key="chat_history",
                    return_messages=True
                )
            
            # Create agent
            agent = create_openai_tools_agent(self.llm, tools, prompt)
            
            # Create agent executor
            agent_executor = AgentExecutor(
                agent=agent,
                tools=tools,
                memory=langchain_memory,
                verbose=True,
                handle_parsing_errors=True
            )
            
            # Prepare input
            agent_input = {
                "input": input_data.get("query", ""),
                **context
            }
            
            # Run agent
            result = await agent_executor.ainvoke(agent_input)
            
            return {
                "output": result.get("output", ""),
                "intermediate_steps": [
                    {"tool": step[0].tool, "input": step[0].tool_input, "output": step[1]}
                    for step in result.get("intermediate_steps", [])
                ]
            }
        except Exception as e:
            self.logger.error(f"Error processing with LangChain: {str(e)}", exc_info=True)
            raise
    
    def _get_system_message_for_task_type(self, task_type: str) -> str:
        """
        Get the system message for a task type
        """
        system_messages = {
            "thinking": """You are a thinking agent that helps analyze problems and situations.
            Your goal is to provide thoughtful analysis and insights based on the information provided.
            Think step by step and consider multiple perspectives before providing your analysis.""",
            
            "coding": """You are a developer agent that helps write and improve code.
            Your goal is to write clean, efficient, and well-documented code based on the requirements provided.
            Consider best practices, potential edge cases, and performance implications.""",
            
            "frontend": """You are a frontend developer agent that specializes in UI/UX design and implementation.
            Your goal is to create visually appealing and user-friendly interfaces using modern frontend technologies.
            Consider accessibility, responsiveness, and cross-browser compatibility.""",
            
            "backend": """You are a backend developer agent that specializes in server-side logic and databases.
            Your goal is to design and implement robust, scalable, and secure backend systems.
            Consider performance, security, and maintainability.""",
            
            "review": """You are a code review agent that helps identify issues and improvements in code.
            Your goal is to provide constructive feedback on code quality, potential bugs, and performance issues.
            Be thorough but respectful in your feedback.""",
            
            "execution": """You are an execution agent that helps run and test code.
            Your goal is to execute code, analyze the results, and identify any issues or improvements.
            Be precise in your analysis and provide clear explanations.""",
            
            "conversation": """You are a conversation agent that helps users with their questions and tasks.
            Your goal is to provide helpful, accurate, and concise responses to user queries.
            Be friendly, respectful, and focus on addressing the user's needs.""",
            
            "research": """You are a research agent that helps gather and analyze information.
            Your goal is to find relevant information, synthesize it, and present it in a clear and organized manner.
            Be thorough in your research and critical in your analysis.""",
            
            "planning": """You are a planning agent that helps organize and prioritize tasks.
            Your goal is to create clear, actionable plans based on the requirements and constraints provided.
            Consider dependencies, resources, and timelines in your planning.""",
            
            "complex": """You are a versatile agent that can handle complex tasks requiring multiple skills.
            Your goal is to break down complex problems into manageable parts and address each part effectively.
            Use your diverse skills and knowledge to provide comprehensive solutions."""
        }
        
        return system_messages.get(task_type, """You are a helpful assistant. Your goal is to provide accurate and helpful responses to the user's queries.""")
    
    def _get_tool_by_name(self, name: str) -> Optional[Any]:
        """
        Get a tool by name
        """
        for tool in self.tools:
            if tool.name.lower() == name.lower():
                return tool
        return None
    
    async def get_task_status(self, task_id: str) -> Dict[str, Any]:
        """
        Get the status of a task with Supabase integration
        """
        # Get task from Supabase
        task = await self._get_task(task_id)
        
        if not task:
            raise ValueError(f"Task {task_id} not found")
        
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
        user_id: str,
        status: Optional[str] = None,
        agent_id: Optional[str] = None,
        limit: int = 10,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        List tasks with optional filtering with Supabase integration
        """
        try:
            # Build query
            query = self.supabase.table("orchestration_tasks").select("*").eq("user_id", user_id)
            
            if status:
                query = query.eq("status", status)
            
            if agent_id:
                query = query.eq("agent_id", agent_id)
            
            # Apply pagination and ordering
            query = query.order("created_at", desc=True).limit(limit).offset(offset)
            
            # Execute query
            response = query.execute()
            
            if hasattr(response, 'error') and response.error:
                self.logger.error(f"Error listing tasks from Supabase: {response.error}")
                return []
            
            tasks = []
            for task_data in response.data:
                # Parse JSON fields
                input_data = json.loads(task_data["input_data"]) if task_data["input_data"] else {}
                context = json.loads(task_data["context"]) if task_data["context"] else {}
                tools = json.loads(task_data["tools"]) if task_data["tools"] else []
                result = json.loads(task_data["result"]) if task_data["result"] else None
                
                task = {
                    "task_id": task_data["id"],
                    "status": task_data["status"],
                    "result": result,
                    "error": task_data["error"],
                    "agent_id": task_data["agent_id"],
                    "created_at": task_data["created_at"],
                    "updated_at": task_data["updated_at"]
                }
                tasks.append(task)
                
                # Update cache
                self.task_cache[task_data["id"]] = {
                    "id": task_data["id"],
                    "user_id": task_data["user_id"],
                    "task_type": task_data["task_type"],
                    "input_data": input_data,
                    "context": context,
                    "tools": tools,
                    "memory_id": task_data["memory_id"],
                    "agent_id": task_data["agent_id"],
                    "status": task_data["status"],
                    "result": result,
                    "error": task_data["error"],
                    "created_at": task_data["created_at"],
                    "updated_at": task_data["updated_at"]
                }
            
            return tasks
        except Exception as e:
            self.logger.error(f"Error listing tasks: {str(e)}", exc_info=True)
            return []
    
    async def cancel_task(self, task_id: str) -> None:
        """
        Cancel a running task with Supabase integration
        """
        # Get task from Supabase
        task = await self._get_task(task_id)
        
        if not task:
            raise ValueError(f"Task {task_id} not found")
        
        if task["status"] in ["pending", "processing"]:
            # Update task status
            task["status"] = "cancelled"
            task["updated_at"] = datetime.now().isoformat()
            
            # Update in Supabase
            await self._update_task_status(task_id, "cancelled")
    
    async def register_agent(self, agent_data: Dict[str, Any], user_id: str) -> str:
        """
        Register a new agent with the orchestrator with Supabase integration
        """
        agent_id = str(uuid.uuid4())
        created_at = datetime.now().isoformat()
        
        # Create agent metadata
        agent = {
            "id": agent_id,
            "user_id": user_id,
            "name": agent_data.get("name", f"Agent-{agent_id}"),
            "description": agent_data.get("description", ""),
            "capabilities": agent_data.get("capabilities", []),
            "status": "active",
            "created_at": created_at,
            "updated_at": created_at
        }
        
        # Store agent metadata in Supabase
        try:
            # Convert capabilities to JSON string
            agent_data_db = {
                "id": agent_id,
                "user_id": user_id,
                "name": agent.get("name"),
                "description": agent.get("description", ""),
                "capabilities": json.dumps(agent.get("capabilities", [])),
                "status": "active",
                "created_at": created_at,
                "updated_at": created_at
            }
            
            # Insert into Supabase
            response = self.supabase.table("orchestration_agents").insert(agent_data_db).execute()
            
            if hasattr(response, 'error') and response.error:
                self.logger.error(f"Error storing agent in Supabase: {response.error}")
                # Fall back to in-memory storage
                self.agent_cache[agent_id] = agent
            else:
                self.logger.info(f"Agent {agent_id} stored in Supabase")
                # Cache the agent
                self.agent_cache[agent_id] = agent
            
            return agent_id
        except Exception as e:
            self.logger.error(f"Error registering agent: {str(e)}", exc_info=True)
            # Fall back to in-memory storage
            self.agent_cache[agent_id] = agent
            return agent_id
    
    async def get_agent_info(self, agent_id: str) -> Dict[str, Any]:
        """
        Get information about a registered agent with Supabase integration
        """
        try:
            # Get from Supabase
            response = self.supabase.table("orchestration_agents").select("*").eq("id", agent_id).execute()
            
            if hasattr(response, 'error') and response.error:
                self.logger.error(f"Error getting agent from Supabase: {response.error}")
                # Check cache
                if agent_id in self.agent_cache:
                    return self.agent_cache[agent_id]
                raise ValueError(f"Agent {agent_id} not found")
            
            if not response.data:
                # Check cache
                if agent_id in self.agent_cache:
                    return self.agent_cache[agent_id]
                raise ValueError(f"Agent {agent_id} not found")
            
            agent_data = response.data[0]
            
            # Parse capabilities
            capabilities = json.loads(agent_data["capabilities"]) if agent_data["capabilities"] else []
            
            agent = {
                "id": agent_data["id"],
                "name": agent_data["name"],
                "description": agent_data["description"],
                "capabilities": capabilities,
                "status": agent_data["status"],
                "created_at": agent_data["created_at"],
                "updated_at": agent_data["updated_at"]
            }
            
            # Update cache
            self.agent_cache[agent_id] = agent
            
            return agent
        except Exception as e:
            self.logger.error(f"Error getting agent info: {str(e)}", exc_info=True)
            # Check cache
            if agent_id in self.agent_cache:
                return self.agent_cache[agent_id]
            raise ValueError(f"Agent {agent_id} not found")
    
    async def list_agents(self, user_id: str) -> List[Dict[str, Any]]:
        """
        List all registered agents with Supabase integration
        """
        try:
            # Get from Supabase
            response = self.supabase.table("orchestration_agents").select("*").eq("user_id", user_id).execute()
            
            if hasattr(response, 'error') and response.error:
                self.logger.error(f"Error listing agents from Supabase: {response.error}")
                return []
            
            agents = []
            for agent_data in response.data:
                # Parse capabilities
                capabilities = json.loads(agent_data["capabilities"]) if agent_data["capabilities"] else []
                
                agent = {
                    "id": agent_data["id"],
                    "name": agent_data["name"],
                    "description": agent_data["description"],
                    "capabilities": capabilities,
                    "status": agent_data["status"],
                    "created_at": agent_data["created_at"],
                    "updated_at": agent_data["updated_at"]
                }
                agents.append(agent)
                
                # Update cache
                self.agent_cache[agent_data["id"]] = agent
            
            return agents
        except Exception as e:
            self.logger.error(f"Error listing agents: {str(e)}", exc_info=True)
            return []
    
    async def create_workflow(self, workflow_data: Dict[str, Any], user_id: str) -> str:
        """
        Create a new workflow for orchestrating multiple agent tasks with Supabase integration
        """
        workflow_id = str(uuid.uuid4())
        created_at = datetime.now().isoformat()
        
        # Create workflow metadata
        workflow = {
            "id": workflow_id,
            "user_id": user_id,
            "name": workflow_data.get("name", f"Workflow-{workflow_id}"),
            "description": workflow_data.get("description", ""),
            "steps": workflow_data.get("steps", []),
            "status": "created",
            "results": {},
            "error": None,
            "created_at": created_at,
            "updated_at": created_at
        }
        
        # Store workflow metadata in Supabase
        try:
            # Convert steps and results to JSON strings
            workflow_data_db = {
                "id": workflow_id,
                "user_id": user_id,
                "name": workflow.get("name"),
                "description": workflow.get("description", ""),
                "steps": json.dumps(workflow.get("steps", [])),
                "status": "created",
                "results": json.dumps({}),
                "error": None,
                "created_at": created_at,
                "updated_at": created_at
            }
            
            # Insert into Supabase
            response = self.supabase.table("orchestration_workflows").insert(workflow_data_db).execute()
            
            if hasattr(response, 'error') and response.error:
                self.logger.error(f"Error storing workflow in Supabase: {response.error}")
                # Fall back to in-memory storage
                self.workflow_cache[workflow_id] = workflow
            else:
                self.logger.info(f"Workflow {workflow_id} stored in Supabase")
                # Cache the workflow
                self.workflow_cache[workflow_id] = workflow
            
            return workflow_id
        except Exception as e:
            self.logger.error(f"Error creating workflow: {str(e)}", exc_info=True)
            # Fall back to in-memory storage
            self.workflow_cache[workflow_id] = workflow
            return workflow_id
    
    async def get_workflow_status(self, workflow_id: str) -> Dict[str, Any]:
        """
        Get the status of a workflow with Supabase integration
        """
        try:
            # Get from Supabase
            response = self.supabase.table("orchestration_workflows").select("*").eq("id", workflow_id).execute()
            
            if hasattr(response, 'error') and response.error:
                self.logger.error(f"Error getting workflow from Supabase: {response.error}")
                # Check cache
                if workflow_id in self.workflow_cache:
                    return self.workflow_cache[workflow_id]
                raise ValueError(f"Workflow {workflow_id} not found")
            
            if not response.data:
                # Check cache
                if workflow_id in self.workflow_cache:
                    return self.workflow_cache[workflow_id]
                raise ValueError(f"Workflow {workflow_id} not found")
            
            workflow_data = response.data[0]
            
            # Parse steps and results
            steps = json.loads(workflow_data["steps"]) if workflow_data["steps"] else []
            results = json.loads(workflow_data["results"]) if workflow_data["results"] else {}
            
            workflow = {
                "id": workflow_data["id"],
                "name": workflow_data["name"],
                "description": workflow_data["description"],
                "steps": steps,
                "status": workflow_data["status"],
                "results": results,
                "error": workflow_data["error"],
                "created_at": workflow_data["created_at"],
                "updated_at": workflow_data["updated_at"]
            }
            
            # Update cache
            self.workflow_cache[workflow_id] = workflow
            
            return workflow
        except Exception as e:
            self.logger.error(f"Error getting workflow status: {str(e)}", exc_info=True)
            # Check cache
            if workflow_id in self.workflow_cache:
                return self.workflow_cache[workflow_id]
            raise ValueError(f"Workflow {workflow_id} not found")
    
    async def execute_workflow(self, workflow_id: str) -> Dict[str, Any]:
        """
        Execute a workflow with Supabase integration
        """
        # Get workflow from Supabase
        workflow = await self.get_workflow_status(workflow_id)
        
        if not workflow:
            raise ValueError(f"Workflow {workflow_id} not found")
        
        # Update workflow status
        workflow["status"] = "running"
        workflow["updated_at"] = datetime.now().isoformat()
        
        # Update in Supabase
        await self._update_workflow(workflow_id, {
            "status": "running",
            "updated_at": datetime.now().isoformat()
        })
        
        try:
            # Execute each step in the workflow
            for step in workflow["steps"]:
                step_id = step["id"]
                
                # Create a task for the step
                task_id, _ = await self.create_task(
                    task_type=step["type"],
                    input_data=step["input_data"],
                    user_id=workflow["user_id"],
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
                
                # Update workflow results in Supabase
                await self._update_workflow(workflow_id, {
                    "results": json.dumps(workflow["results"]),
                    "updated_at": datetime.now().isoformat()
                })
                
                # Check if we need to update the context for subsequent steps
                if step.get("update_context", False) and result:
                    for next_step in workflow["steps"]:
                        if next_step["id"] != step_id:
                            next_step["context"] = next_step.get("context", {})
                            next_step["context"].update({"previous_result": result})
            
            # Update workflow status
            workflow["status"] = "completed"
            workflow["updated_at"] = datetime.now().isoformat()
            
            # Update in Supabase
            await self._update_workflow(workflow_id, {
                "status": "completed",
                "updated_at": datetime.now().isoformat()
            })
            
            return workflow
        except Exception as e:
            # Update workflow status on failure
            workflow["status"] = "failed"
            workflow["error"] = str(e)
            workflow["updated_at"] = datetime.now().isoformat()
            
            # Update in Supabase
            await self._update_workflow(workflow_id, {
                "status": "failed",
                "error": str(e),
                "updated_at": datetime.now().isoformat()
            })
            
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
            if LANGCHAIN_AVAILABLE and self.llm:
                try:
                    llm = ChatOpenAI(temperature=0)
                    
                    prompt = ChatPromptTemplate.from_messages([
                        ("system", """You are an agent router that determines which specialized agent should handle a task.
                        Available agents:
                        - thinking_agent: For analysis, reasoning, and problem-solving tasks
                        - developer_agent: For general coding tasks
                        - frontend_developer_agent: For frontend development tasks
                        - backend_developer_agent: For backend development tasks
                        - editor_agent: For reviewing and editing content
                        - execution_agent: For executing and testing code
                        - conversation_agent: For general conversation and assistance
                        - research_agent: For research and information gathering
                        - planning_agent: For planning and organizing tasks
                        
                        Based on the task description, determine which agent is best suited to handle it.
                        Respond with only the agent name, e.g., "thinking_agent".
                        """),
                        ("human", f"Task type: {task_type}\nInput: {json.dumps(input_data)}\nContext: {json.dumps(context or {})}")
                    ])
                    
                    chain = prompt | llm
                    response = await chain.ainvoke({})
                    
                    # Extract agent name from response
                    agent_name = response.content.strip().lower()
                    
                    # Validate agent name
                    if agent_name in task_agent_mapping.values():
                        return agent_name
                    else:
                        # Fall back to default
                        return "conversation_agent"
                except Exception as e:
                    self.logger.error(f"Error selecting agent with LangChain: {str(e)}", exc_info=True)
                    return "conversation_agent"
            else:
                # Fall back to conversation agent
                return "conversation_agent"
        
        return default_agent
    
    async def _get_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a task from Supabase or cache
        """
        # Check cache first
        if task_id in self.task_cache:
            return self.task_cache[task_id]
        
        try:
            # Get from Supabase
            response = self.supabase.table("orchestration_tasks").select("*").eq("id", task_id).execute()
            
            if hasattr(response, 'error') and response.error:
                self.logger.error(f"Error getting task from Supabase: {response.error}")
                return None
            
            if not response.data:
                return None
            
            task_data = response.data[0]
            
            # Parse JSON fields
            input_data = json.loads(task_data["input_data"]) if task_data["input_data"] else {}
            context = json.loads(task_data["context"]) if task_data["context"] else {}
            tools = json.loads(task_data["tools"]) if task_data["tools"] else []
            result = json.loads(task_data["result"]) if task_data["result"] else None
            
            task = {
                "id": task_data["id"],
                "user_id": task_data["user_id"],
                "task_type": task_data["task_type"],
                "input_data": input_data,
                "context": context,
                "tools": tools,
                "memory_id": task_data["memory_id"],
                "agent_id": task_data["agent_id"],
                "status": task_data["status"],
                "result": result,
                "error": task_data["error"],
                "created_at": task_data["created_at"],
                "updated_at": task_data["updated_at"]
            }
            
            # Update cache
            self.task_cache[task_id] = task
            
            return task
        except Exception as e:
            self.logger.error(f"Error getting task: {str(e)}", exc_info=True)
            return None
    
    async def _update_task(self, task_id: str, update_data: Dict[str, Any]) -> None:
        """
        Update a task in Supabase
        """
        try:
            response = self.supabase.table("orchestration_tasks").update(update_data).eq("id", task_id).execute()
            
            if hasattr(response, 'error') and response.error:
                self.logger.error(f"Error updating task in Supabase: {response.error}")
            else:
                # Update cache if it exists
                if task_id in self.task_cache:
                    task = self.task_cache[task_id]
                    for key, value in update_data.items():
                        if key == "input_data" and isinstance(value, str):
                            task[key] = json.loads(value)
                        elif key == "context" and isinstance(value, str):
                            task[key] = json.loads(value)
                        elif key == "tools" and isinstance(value, str):
                            task[key] = json.loads(value)
                        elif key == "result" and isinstance(value, str):
                            task[key] = json.loads(value) if value else None
                        else:
                            task[key] = value
        except Exception as e:
            self.logger.error(f"Error updating task: {str(e)}", exc_info=True)
    
    async def _update_task_status(self, task_id: str, status: str) -> None:
        """
        Update a task status in Supabase
        """
        await self._update_task(task_id, {
            "status": status,
            "updated_at": datetime.now().isoformat()
        })
    
    async def _update_workflow(self, workflow_id: str, update_data: Dict[str, Any]) -> None:
        """
        Update a workflow in Supabase
        """
        try:
            response = self.supabase.table("orchestration_workflows").update(update_data).eq("id", workflow_id).execute()
            
            if hasattr(response, 'error') and response.error:
                self.logger.error(f"Error updating workflow in Supabase: {response.error}")
            else:
                # Update cache if it exists
                if workflow_id in self.workflow_cache:
                    workflow = self.workflow_cache[workflow_id]
                    for key, value in update_data.items():
                        if key == "steps" and isinstance(value, str):
                            workflow[key] = json.loads(value)
                        elif key == "results" and isinstance(value, str):
                            workflow[key] = json.loads(value)
                        else:
                            workflow[key] = value
        except Exception as e:
            self.logger.error(f"Error updating workflow: {str(e)}", exc_info=True)
    
    async def close(self):
        """
        Close the orchestration service
        """
        # Nothing to close for now
        pass