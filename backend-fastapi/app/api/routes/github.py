"""
GitHub API Routes
"""

from fastapi import APIRouter, HTTPException, Depends, Query, Path
from typing import Dict, List, Any, Optional
from pydantic import BaseModel

# Import services
from app.services.github_service import GitHubService

# Create router
router = APIRouter()

# Initialize services
github_service = GitHubService()

# Define models
class GitHubTokenRequest(BaseModel):
    token: str

class GitHubRepoRequest(BaseModel):
    repo_name: str
    branch: Optional[str] = None

class GitHubPushRequest(BaseModel):
    repo_name: str
    commit_message: str

class GitHubBranchRequest(BaseModel):
    repo_name: str
    branch_name: str
    from_branch: Optional[str] = None

# Routes
@router.post("/token")
async def set_github_token(request: GitHubTokenRequest):
    """Set GitHub access token"""
    try:
        github_service.set_access_token(request.token)
        return {"message": "GitHub token set successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/user")
async def get_github_user():
    """Get authenticated GitHub user information"""
    try:
        return github_service.get_user_info()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/repositories")
async def get_github_repositories():
    """Get GitHub repositories for authenticated user"""
    try:
        return github_service.get_repositories()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/repository/{repo_name}")
async def get_github_repository(repo_name: str):
    """Get GitHub repository details"""
    try:
        return github_service.get_repository(repo_name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/clone")
async def clone_github_repository(request: GitHubRepoRequest):
    """Clone a GitHub repository"""
    try:
        return {"repo_path": github_service.clone_repository(request.repo_name, request.branch)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/pull")
async def pull_github_repository(request: GitHubRepoRequest):
    """Pull latest changes from a GitHub repository"""
    try:
        return github_service.pull_repository(request.repo_name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/push")
async def push_github_repository(request: GitHubPushRequest):
    """Push changes to a GitHub repository"""
    try:
        return github_service.push_repository(request.repo_name, request.commit_message)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/branch")
async def create_github_branch(request: GitHubBranchRequest):
    """Create a new branch in a GitHub repository"""
    try:
        return github_service.create_branch(request.repo_name, request.branch_name, request.from_branch)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))