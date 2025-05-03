"""
GitHub Tools for LangChain Agents
"""

from typing import Dict, List, Any, Optional
import logging
from langchain.tools import tool

# Configure logging
logger = logging.getLogger(__name__)

@tool("github_list_repositories")
def github_list_repositories(github_service) -> List[Dict[str, Any]]:
    """Lists the GitHub repositories for the authenticated user"""
    try:
        return github_service.get_repositories()
    except Exception as e:
        logger.error(f"Error listing GitHub repositories: {e}")
        return [{"error": str(e)}]

@tool("github_clone_repository")
def github_clone_repository(github_service, repo_name: str, branch: Optional[str] = None) -> str:
    """Clones a GitHub repository to a local directory
    
    Args:
        github_service: The GitHub service instance
        repo_name: Repository name in format 'owner/repo'
        branch: Optional branch name to checkout
        
    Returns:
        Path to the cloned repository
    """
    try:
        return github_service.clone_repository(repo_name, branch)
    except Exception as e:
        logger.error(f"Error cloning GitHub repository: {e}")
        return f"Error: {str(e)}"

@tool("github_pull")
def github_pull(github_service, repo_name: str) -> Dict[str, Any]:
    """Pulls the latest changes for a repository
    
    Args:
        github_service: The GitHub service instance
        repo_name: Repository name in format 'owner/repo'
        
    Returns:
        Dictionary with pull results
    """
    try:
        return github_service.pull_repository(repo_name)
    except Exception as e:
        logger.error(f"Error pulling GitHub repository: {e}")
        return {"error": str(e)}

@tool("github_push")
def github_push(github_service, repo_name: str, commit_message: str) -> Dict[str, Any]:
    """Commits and pushes changes to a repository
    
    Args:
        github_service: The GitHub service instance
        repo_name: Repository name in format 'owner/repo'
        commit_message: Commit message
        
    Returns:
        Dictionary with push results
    """
    try:
        return github_service.push_repository(repo_name, commit_message)
    except Exception as e:
        logger.error(f"Error pushing to GitHub repository: {e}")
        return {"error": str(e)}

@tool("github_create_branch")
def github_create_branch(github_service, repo_name: str, branch_name: str, from_branch: Optional[str] = None) -> Dict[str, Any]:
    """Creates a new branch in a repository
    
    Args:
        github_service: The GitHub service instance
        repo_name: Repository name in format 'owner/repo'
        branch_name: Name for the new branch
        from_branch: Optional source branch (defaults to current branch)
        
    Returns:
        Dictionary with branch creation results
    """
    try:
        return github_service.create_branch(repo_name, branch_name, from_branch)
    except Exception as e:
        logger.error(f"Error creating branch in GitHub repository: {e}")
        return {"error": str(e)}