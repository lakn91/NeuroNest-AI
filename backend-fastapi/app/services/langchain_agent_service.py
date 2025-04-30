"""
LangChain Agent Service - Provides intelligent agents using LangChain
"""

import os
import logging
from typing import Dict, List, Any, Optional, Union
from langchain.agents import AgentExecutor, create_openai_functions_agent, create_openai_tools_agent
from langchain.agents.format_scratchpad import format_to_openai_functions
from langchain.agents.output_parsers import OpenAIFunctionsAgentOutputParser
from langchain.memory import ConversationBufferMemory
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import AIMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langchain.tools import BaseTool
from langchain.chains import LLMChain
from langchain.chains.router import MultiPromptChain
from langchain.chains.router.llm_router import LLMRouterChain, RouterOutputParser
from langchain.chains.router.multi_prompt_prompt import MULTI_PROMPT_ROUTER_TEMPLATE

# Import custom tools
from .github_service import GitHubService
from .code_analysis_service import CodeAnalysisService
from .docker_sandbox_service import DockerSandboxService
from .memory_service import memory_service
from .document_index_service import DocumentIndexService

# Import tool wrappers
from ..tools.github_tools import (
    GitHubListReposTool,
    GitHubCloneRepoTool,
    GitHubPullTool,
    GitHubPushTool,
    GitHubCreateBranchTool
)
from ..tools.code_analysis_tools import (
    AnalyzePythonCodeTool,
    AnalyzeJavaScriptCodeTool,
    AnalyzeTypeScriptCodeTool
)
from ..tools.docker_sandbox_tools import (
    CreateSandboxSessionTool,
    ExecutePythonCodeTool,
    ExecuteJavaScriptCodeTool,
    InstallPackageTool,
    UploadFileTool,
    ListFilesTool,
    ReadFileTool,
    CloseSandboxSessionTool
)

class LangChainAgentService:
    """Service for creating and managing LangChain agents"""
    
    def __init__(self, openai_api_key: str = None):
        """
        Initialize LangChain agent service
        
        Args:
            openai_api_key: OpenAI API key
        """
        self.openai_api_key = openai_api_key or os.environ.get("OPENAI_API_KEY")
        
        if not self.openai_api_key:
            raise ValueError("OpenAI API key is required")
        
        # Initialize services
        self.github_service = GitHubService()
        self.code_analysis_service = CodeAnalysisService()
        self.docker_sandbox_service = DockerSandboxService()
        
        # Initialize agent instances
        self.agents = {}
    
    def create_agent(self, agent_type: str, user_id: str, github_token: Optional[str] = None) -> str:
        """
        Create a new agent
        
        Args:
            agent_type: Type of agent to create ('developer', 'code_analyst', 'executor')
            user_id: User ID
            github_token: Optional GitHub token for GitHub operations
            
        Returns:
            Agent ID
        """
        # Set up GitHub service if token provided
        if github_token:
            self.github_service.set_access_token(github_token)
        
        # Create a unique agent ID
        import uuid
        agent_id = str(uuid.uuid4())
        
        # Create the appropriate agent based on type
        if agent_type == "developer":
            agent = self._create_developer_agent(user_id)
        elif agent_type == "code_analyst":
            agent = self._create_code_analyst_agent(user_id)
        elif agent_type == "executor":
            agent = self._create_executor_agent(user_id)
        else:
            raise ValueError(f"Unsupported agent type: {agent_type}")
        
        # Store the agent
        self.agents[agent_id] = {
            "agent": agent,
            "type": agent_type,
            "user_id": user_id,
            "memory": [],  # Store conversation history
            "created_at": import time; time.time()
        }
        
        return agent_id
    
    def _create_developer_agent(self, user_id: str) -> AgentExecutor:
        """
        Create a developer agent with GitHub and code analysis tools
        
        Args:
            user_id: User ID
            
        Returns:
            AgentExecutor instance
        """
        # Initialize LLM
        llm = ChatOpenAI(
            temperature=0,
            model="gpt-4o",
            api_key=self.openai_api_key
        )
        
        # Initialize tools
        tools = [
            # GitHub tools
            GitHubListReposTool(github_service=self.github_service),
            GitHubCloneRepoTool(github_service=self.github_service),
            GitHubPullTool(github_service=self.github_service),
            GitHubPushTool(github_service=self.github_service),
            GitHubCreateBranchTool(github_service=self.github_service),
            
            # Code analysis tools
            AnalyzePythonCodeTool(code_analysis_service=self.code_analysis_service),
            AnalyzeJavaScriptCodeTool(code_analysis_service=self.code_analysis_service),
            AnalyzeTypeScriptCodeTool(code_analysis_service=self.code_analysis_service)
        ]
        
        # Create prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert software developer assistant. You can help with:
1. GitHub operations (listing repositories, cloning, pulling, pushing, creating branches)
2. Code analysis (analyzing Python, JavaScript, and TypeScript code)

Always think step by step and use the appropriate tools to help the user.
When analyzing code, provide clear explanations and suggestions for improvements.
When working with GitHub, be careful with operations that modify repositories.

Remember to:
- Ask clarifying questions when needed
- Explain your reasoning
- Provide code examples when appropriate
- Follow best practices for the language/framework being used
"""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        # Create agent
        agent = create_openai_functions_agent(llm, tools, prompt)
        
        # Create agent executor
        return AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=True,
            handle_parsing_errors=True
        )
    
    def _create_code_analyst_agent(self, user_id: str) -> AgentExecutor:
        """
        Create a code analyst agent focused on code analysis
        
        Args:
            user_id: User ID
            
        Returns:
            AgentExecutor instance
        """
        # Initialize LLM
        llm = ChatOpenAI(
            temperature=0,
            model="gpt-4o",
            api_key=self.openai_api_key
        )
        
        # Initialize tools
        tools = [
            # Code analysis tools
            AnalyzePythonCodeTool(code_analysis_service=self.code_analysis_service),
            AnalyzeJavaScriptCodeTool(code_analysis_service=self.code_analysis_service),
            AnalyzeTypeScriptCodeTool(code_analysis_service=self.code_analysis_service)
        ]
        
        # Create prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert code analyst. You specialize in:
1. Analyzing code for bugs, security issues, and performance problems
2. Suggesting improvements to code quality and readability
3. Explaining complex code patterns and architectures

Always analyze code thoroughly and provide detailed explanations of:
- Potential bugs or issues
- Security vulnerabilities
- Performance bottlenecks
- Code style and readability issues
- Architecture and design patterns

When analyzing code:
- Be specific about line numbers and code sections
- Explain why something is an issue
- Provide concrete suggestions for improvement
- Consider best practices for the specific language
"""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        # Create agent
        agent = create_openai_functions_agent(llm, tools, prompt)
        
        # Create agent executor
        return AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=True,
            handle_parsing_errors=True
        )
    
    def _create_executor_agent(self, user_id: str) -> AgentExecutor:
        """
        Create an executor agent focused on running code in sandboxes
        
        Args:
            user_id: User ID
            
        Returns:
            AgentExecutor instance
        """
        # Initialize LLM
        llm = ChatOpenAI(
            temperature=0,
            model="gpt-4o",
            api_key=self.openai_api_key
        )
        
        # Initialize tools
        tools = [
            # Docker sandbox tools
            CreateSandboxSessionTool(docker_sandbox_service=self.docker_sandbox_service),
            ExecutePythonCodeTool(docker_sandbox_service=self.docker_sandbox_service),
            ExecuteJavaScriptCodeTool(docker_sandbox_service=self.docker_sandbox_service),
            InstallPackageTool(docker_sandbox_service=self.docker_sandbox_service),
            UploadFileTool(docker_sandbox_service=self.docker_sandbox_service),
            ListFilesTool(docker_sandbox_service=self.docker_sandbox_service),
            ReadFileTool(docker_sandbox_service=self.docker_sandbox_service),
            CloseSandboxSessionTool(docker_sandbox_service=self.docker_sandbox_service)
        ]
        
        # Create prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an expert code execution assistant. You can help with:
1. Creating secure sandbox environments for running code
2. Executing Python and JavaScript code safely
3. Installing packages and managing files in the sandbox

Always follow these steps when executing code:
1. Create a sandbox session for the appropriate language
2. Upload any necessary files or install required packages
3. Execute the code and analyze the results
4. Clean up resources when done

Remember:
- Always use sandboxes for code execution to ensure security
- Explain the results of code execution clearly
- Help debug any issues that arise during execution
- Close sessions when they're no longer needed to free resources
"""),
            MessagesPlaceholder(variable_name="chat_history"),
            ("human", "{input}"),
            MessagesPlaceholder(variable_name="agent_scratchpad"),
        ])
        
        # Create agent
        agent = create_openai_functions_agent(llm, tools, prompt)
        
        # Create agent executor
        return AgentExecutor(
            agent=agent,
            tools=tools,
            verbose=True,
            handle_parsing_errors=True
        )
    
    async def run_agent(self, agent_id: str, query: str) -> Dict[str, Any]:
        """
        Run an agent with a query
        
        Args:
            agent_id: Agent ID
            query: User query
            
        Returns:
            Dictionary with agent response
        """
        if agent_id not in self.agents:
            raise ValueError(f"Agent not found: {agent_id}")
        
        agent_data = self.agents[agent_id]
        agent = agent_data["agent"]
        
        # Update memory with user query
        agent_data["memory"].append({"role": "user", "content": query})
        
        # Format chat history for the agent
        chat_history = []
        for message in agent_data["memory"]:
            if message["role"] == "user":
                chat_history.append(HumanMessage(content=message["content"]))
            elif message["role"] == "assistant":
                chat_history.append(AIMessage(content=message["content"]))
        
        # Run the agent
        try:
            result = await agent.ainvoke({
                "input": query,
                "chat_history": chat_history
            })
            
            # Extract the output
            output = result["output"]
            
            # Update memory with assistant response
            agent_data["memory"].append({"role": "assistant", "content": output})
            
            return {
                "agent_id": agent_id,
                "type": agent_data["type"],
                "query": query,
                "response": output,
                "success": True
            }
        
        except Exception as e:
            return {
                "agent_id": agent_id,
                "type": agent_data["type"],
                "query": query,
                "response": f"Error: {str(e)}",
                "success": False
            }
    
    def get_agent_info(self, agent_id: str) -> Dict[str, Any]:
        """
        Get information about an agent
        
        Args:
            agent_id: Agent ID
            
        Returns:
            Dictionary with agent information
        """
        if agent_id not in self.agents:
            raise ValueError(f"Agent not found: {agent_id}")
        
        agent_data = self.agents[agent_id]
        
        return {
            "agent_id": agent_id,
            "type": agent_data["type"],
            "user_id": agent_data["user_id"],
            "memory_length": len(agent_data["memory"]),
            "created_at": agent_data["created_at"]
        }
    
    def get_agent_memory(self, agent_id: str) -> List[Dict[str, str]]:
        """
        Get the conversation history for an agent
        
        Args:
            agent_id: Agent ID
            
        Returns:
            List of conversation messages
        """
        if agent_id not in self.agents:
            raise ValueError(f"Agent not found: {agent_id}")
        
        return self.agents[agent_id]["memory"]
    
    def clear_agent_memory(self, agent_id: str) -> Dict[str, Any]:
        """
        Clear the conversation history for an agent
        
        Args:
            agent_id: Agent ID
            
        Returns:
            Dictionary with operation result
        """
        if agent_id not in self.agents:
            raise ValueError(f"Agent not found: {agent_id}")
        
        self.agents[agent_id]["memory"] = []
        
        return {
            "agent_id": agent_id,
            "success": True,
            "message": "Memory cleared successfully"
        }
    
    def delete_agent(self, agent_id: str) -> Dict[str, Any]:
        """
        Delete an agent
        
        Args:
            agent_id: Agent ID
            
        Returns:
            Dictionary with operation result
        """
        if agent_id not in self.agents:
            raise ValueError(f"Agent not found: {agent_id}")
        
        # Remove the agent
        del self.agents[agent_id]
        
        return {
            "agent_id": agent_id,
            "success": True,
            "message": "Agent deleted successfully"
        }
    
    def cleanup(self):
        """Clean up all resources"""
        # Clean up Docker sandbox service
        self.docker_sandbox_service.cleanup()
        
        # Clean up GitHub service
        self.github_service.cleanup()