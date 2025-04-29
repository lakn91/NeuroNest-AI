"""
GitHub Service - Provides integration with GitHub API
"""

import os
from typing import Dict, List, Optional, Any
from github import Github, GithubException
from git import Repo, GitCommandError
import tempfile
import shutil

class GitHubService:
    """Service for interacting with GitHub API and repositories"""
    
    def __init__(self, access_token: str = None):
        """
        Initialize GitHub service with access token
        
        Args:
            access_token: GitHub OAuth token
        """
        self.access_token = access_token
        self.github = Github(access_token) if access_token else None
        self.local_repos = {}  # Map of repo_name -> local_path
    
    def set_access_token(self, access_token: str):
        """
        Set or update GitHub access token
        
        Args:
            access_token: GitHub OAuth token
        """
        self.access_token = access_token
        self.github = Github(access_token)
    
    def get_user_info(self) -> Dict[str, Any]:
        """
        Get authenticated user information
        
        Returns:
            Dict containing user information
        """
        if not self.github:
            raise ValueError("GitHub access token not set")
        
        user = self.github.get_user()
        return {
            "login": user.login,
            "name": user.name,
            "email": user.email,
            "avatar_url": user.avatar_url,
            "html_url": user.html_url,
            "public_repos": user.public_repos,
            "private_repos": user.total_private_repos
        }
    
    def get_repositories(self) -> List[Dict[str, Any]]:
        """
        Get list of repositories for authenticated user
        
        Returns:
            List of repository information dictionaries
        """
        if not self.github:
            raise ValueError("GitHub access token not set")
        
        user = self.github.get_user()
        repos = []
        
        for repo in user.get_repos():
            repos.append({
                "id": repo.id,
                "name": repo.name,
                "full_name": repo.full_name,
                "description": repo.description,
                "html_url": repo.html_url,
                "clone_url": repo.clone_url,
                "ssh_url": repo.ssh_url,
                "default_branch": repo.default_branch,
                "private": repo.private,
                "fork": repo.fork,
                "created_at": repo.created_at.isoformat() if repo.created_at else None,
                "updated_at": repo.updated_at.isoformat() if repo.updated_at else None,
                "language": repo.language,
                "stargazers_count": repo.stargazers_count,
                "forks_count": repo.forks_count
            })
        
        return repos
    
    def get_repository(self, repo_name: str) -> Dict[str, Any]:
        """
        Get detailed information about a specific repository
        
        Args:
            repo_name: Repository name in format "owner/repo"
            
        Returns:
            Dictionary with repository details
        """
        if not self.github:
            raise ValueError("GitHub access token not set")
        
        try:
            repo = self.github.get_repo(repo_name)
            
            branches = []
            for branch in repo.get_branches():
                branches.append({
                    "name": branch.name,
                    "protected": branch.protected
                })
            
            return {
                "id": repo.id,
                "name": repo.name,
                "full_name": repo.full_name,
                "description": repo.description,
                "html_url": repo.html_url,
                "clone_url": repo.clone_url,
                "ssh_url": repo.ssh_url,
                "default_branch": repo.default_branch,
                "private": repo.private,
                "fork": repo.fork,
                "created_at": repo.created_at.isoformat() if repo.created_at else None,
                "updated_at": repo.updated_at.isoformat() if repo.updated_at else None,
                "language": repo.language,
                "stargazers_count": repo.stargazers_count,
                "forks_count": repo.forks_count,
                "branches": branches
            }
        except GithubException as e:
            raise ValueError(f"Error fetching repository: {str(e)}")
    
    def clone_repository(self, repo_name: str, branch: Optional[str] = None) -> str:
        """
        Clone a repository to a local directory
        
        Args:
            repo_name: Repository name in format "owner/repo"
            branch: Optional branch name to checkout
            
        Returns:
            Path to the cloned repository
        """
        if not self.github:
            raise ValueError("GitHub access token not set")
        
        try:
            repo = self.github.get_repo(repo_name)
            clone_url = repo.clone_url
            
            # Use access token in clone URL for private repos
            if self.access_token:
                clone_url = clone_url.replace("https://", f"https://{self.access_token}@")
            
            # Create a temporary directory for the repository
            repo_dir = tempfile.mkdtemp(prefix=f"{repo.name}-")
            
            # Clone the repository
            git_repo = Repo.clone_from(clone_url, repo_dir)
            
            # Checkout specific branch if requested
            if branch and branch != repo.default_branch:
                git_repo.git.checkout(branch)
            
            # Store the local path
            self.local_repos[repo_name] = repo_dir
            
            return repo_dir
        
        except (GithubException, GitCommandError) as e:
            raise ValueError(f"Error cloning repository: {str(e)}")
    
    def pull_repository(self, repo_name: str) -> Dict[str, Any]:
        """
        Pull latest changes for a repository
        
        Args:
            repo_name: Repository name in format "owner/repo"
            
        Returns:
            Dictionary with pull results
        """
        if repo_name not in self.local_repos:
            raise ValueError(f"Repository {repo_name} not cloned yet")
        
        try:
            repo_path = self.local_repos[repo_name]
            repo = Repo(repo_path)
            
            # Get current branch
            current_branch = repo.active_branch.name
            
            # Pull changes
            pull_info = repo.git.pull()
            
            return {
                "success": True,
                "repo_name": repo_name,
                "branch": current_branch,
                "message": pull_info
            }
        
        except GitCommandError as e:
            raise ValueError(f"Error pulling repository: {str(e)}")
    
    def push_repository(self, repo_name: str, commit_message: str) -> Dict[str, Any]:
        """
        Commit and push changes to a repository
        
        Args:
            repo_name: Repository name in format "owner/repo"
            commit_message: Commit message
            
        Returns:
            Dictionary with push results
        """
        if repo_name not in self.local_repos:
            raise ValueError(f"Repository {repo_name} not cloned yet")
        
        try:
            repo_path = self.local_repos[repo_name]
            repo = Repo(repo_path)
            
            # Get current branch
            current_branch = repo.active_branch.name
            
            # Add all changes
            repo.git.add(A=True)
            
            # Commit changes
            repo.git.commit(m=commit_message)
            
            # Push changes
            push_info = repo.git.push("origin", current_branch)
            
            return {
                "success": True,
                "repo_name": repo_name,
                "branch": current_branch,
                "message": push_info
            }
        
        except GitCommandError as e:
            raise ValueError(f"Error pushing repository: {str(e)}")
    
    def create_branch(self, repo_name: str, branch_name: str, from_branch: Optional[str] = None) -> Dict[str, Any]:
        """
        Create a new branch in a repository
        
        Args:
            repo_name: Repository name in format "owner/repo"
            branch_name: Name for the new branch
            from_branch: Optional source branch (defaults to current branch)
            
        Returns:
            Dictionary with branch creation results
        """
        if repo_name not in self.local_repos:
            raise ValueError(f"Repository {repo_name} not cloned yet")
        
        try:
            repo_path = self.local_repos[repo_name]
            repo = Repo(repo_path)
            
            # Get current branch if from_branch not specified
            if not from_branch:
                from_branch = repo.active_branch.name
            
            # Checkout source branch
            repo.git.checkout(from_branch)
            
            # Create and checkout new branch
            repo.git.checkout(b=branch_name)
            
            return {
                "success": True,
                "repo_name": repo_name,
                "branch": branch_name,
                "from_branch": from_branch
            }
        
        except GitCommandError as e:
            raise ValueError(f"Error creating branch: {str(e)}")
    
    def get_file_content(self, repo_name: str, file_path: str, ref: Optional[str] = None) -> Dict[str, Any]:
        """
        Get content of a file from GitHub repository
        
        Args:
            repo_name: Repository name in format "owner/repo"
            file_path: Path to the file in the repository
            ref: Optional reference (branch, tag, commit)
            
        Returns:
            Dictionary with file content and metadata
        """
        if not self.github:
            raise ValueError("GitHub access token not set")
        
        try:
            repo = self.github.get_repo(repo_name)
            file_content = repo.get_contents(file_path, ref=ref)
            
            return {
                "name": file_content.name,
                "path": file_content.path,
                "sha": file_content.sha,
                "size": file_content.size,
                "content": file_content.decoded_content.decode('utf-8'),
                "html_url": file_content.html_url
            }
        
        except GithubException as e:
            raise ValueError(f"Error fetching file content: {str(e)}")
    
    def create_pull_request(self, repo_name: str, title: str, body: str, head: str, base: str) -> Dict[str, Any]:
        """
        Create a pull request
        
        Args:
            repo_name: Repository name in format "owner/repo"
            title: Pull request title
            body: Pull request description
            head: Head branch
            base: Base branch
            
        Returns:
            Dictionary with pull request details
        """
        if not self.github:
            raise ValueError("GitHub access token not set")
        
        try:
            repo = self.github.get_repo(repo_name)
            pr = repo.create_pull(title=title, body=body, head=head, base=base)
            
            return {
                "id": pr.id,
                "number": pr.number,
                "title": pr.title,
                "body": pr.body,
                "html_url": pr.html_url,
                "state": pr.state,
                "created_at": pr.created_at.isoformat() if pr.created_at else None
            }
        
        except GithubException as e:
            raise ValueError(f"Error creating pull request: {str(e)}")
    
    def cleanup(self, repo_name: Optional[str] = None):
        """
        Clean up local repository clones
        
        Args:
            repo_name: Optional repository name to clean up specific repo
        """
        if repo_name:
            if repo_name in self.local_repos:
                shutil.rmtree(self.local_repos[repo_name], ignore_errors=True)
                del self.local_repos[repo_name]
        else:
            # Clean up all repositories
            for path in self.local_repos.values():
                shutil.rmtree(path, ignore_errors=True)
            self.local_repos = {}