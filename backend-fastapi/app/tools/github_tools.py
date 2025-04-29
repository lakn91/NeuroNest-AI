"""
GitHub Tools for LangChain Agents
"""

from typing import Dict, List, Any, Optional
from langchain.tools import BaseTool, StructuredTool, tool
from pydantic import BaseModel, Field

class GitHubListReposTool(BaseTool):
    """Tool for listing GitHub repositories"""
    
    name = "github_list_repositories"
    description = "Lists the GitHub repositories for the authenticated user"
    
    def __init__(self, github_service):
        """Initialize with GitHub service"""
        self.github_service = github_service
        super().__init__()
    
    def _run(self) -> List[Dict[str, Any]]:
        """Run the tool"""
        return self.github_service.get_repositories()
    
    async def _arun(self) -> List[Dict[str, Any]]:
        """Run the tool asynchronously"""
        return self._run()

class GitHubCloneRepoInput(BaseModel):
    """Input for GitHubCloneRepoTool"""
    repo_name: str = Field(..., description="Repository name in format 'owner/repo'")
    branch: Optional[str] = Field(None, description="Optional branch name to checkout")

class GitHubCloneRepoTool(BaseTool):
    """Tool for cloning a GitHub repository"""
    
    name = "github_clone_repository"
    description = "Clones a GitHub repository to a local directory"
    args_schema = GitHubCloneRepoInput
    
    def __init__(self, github_service):
        """Initialize with GitHub service"""
        self.github_service = github_service
        super().__init__()
    
    def _run(self, repo_name: str, branch: Optional[str] = None) -> str:
        """Run the tool"""
        return self.github_service.clone_repository(repo_name, branch)
    
    async def _arun(self, repo_name: str, branch: Optional[str] = None) -> str:
        """Run the tool asynchronously"""
        return self._run(repo_name, branch)

class GitHubPullInput(BaseModel):
    """Input for GitHubPullTool"""
    repo_name: str = Field(..., description="Repository name in format 'owner/repo'")

class GitHubPullTool(BaseTool):
    """Tool for pulling changes from a GitHub repository"""
    
    name = "github_pull"
    description = "Pulls the latest changes for a repository"
    args_schema = GitHubPullInput
    
    def __init__(self, github_service):
        """Initialize with GitHub service"""
        self.github_service = github_service
        super().__init__()
    
    def _run(self, repo_name: str) -> Dict[str, Any]:
        """Run the tool"""
        return self.github_service.pull_repository(repo_name)
    
    async def _arun(self, repo_name: str) -> Dict[str, Any]:
        """Run the tool asynchronously"""
        return self._run(repo_name)

class GitHubPushInput(BaseModel):
    """Input for GitHubPushTool"""
    repo_name: str = Field(..., description="Repository name in format 'owner/repo'")
    commit_message: str = Field(..., description="Commit message")

class GitHubPushTool(BaseTool):
    """Tool for pushing changes to a GitHub repository"""
    
    name = "github_push"
    description = "Commits and pushes changes to a repository"
    args_schema = GitHubPushInput
    
    def __init__(self, github_service):
        """Initialize with GitHub service"""
        self.github_service = github_service
        super().__init__()
    
    def _run(self, repo_name: str, commit_message: str) -> Dict[str, Any]:
        """Run the tool"""
        return self.github_service.push_repository(repo_name, commit_message)
    
    async def _arun(self, repo_name: str, commit_message: str) -> Dict[str, Any]:
        """Run the tool asynchronously"""
        return self._run(repo_name, commit_message)

class GitHubCreateBranchInput(BaseModel):
    """Input for GitHubCreateBranchTool"""
    repo_name: str = Field(..., description="Repository name in format 'owner/repo'")
    branch_name: str = Field(..., description="Name for the new branch")
    from_branch: Optional[str] = Field(None, description="Optional source branch (defaults to current branch)")

class GitHubCreateBranchTool(BaseTool):
    """Tool for creating a new branch in a GitHub repository"""
    
    name = "github_create_branch"
    description = "Creates a new branch in a repository"
    args_schema = GitHubCreateBranchInput
    
    def __init__(self, github_service):
        """Initialize with GitHub service"""
        self.github_service = github_service
        super().__init__()
    
    def _run(self, repo_name: str, branch_name: str, from_branch: Optional[str] = None) -> Dict[str, Any]:
        """Run the tool"""
        return self.github_service.create_branch(repo_name, branch_name, from_branch)
    
    async def _arun(self, repo_name: str, branch_name: str, from_branch: Optional[str] = None) -> Dict[str, Any]:
        """Run the tool asynchronously"""
        return self._run(repo_name, branch_name, from_branch)