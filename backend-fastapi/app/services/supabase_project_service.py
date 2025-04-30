"""
Supabase Project Service - Provides integration with Supabase for project storage
"""

import logging
import uuid
from typing import Dict, List, Any, Optional
from app.database.supabase_client import get_supabase_client
from app.models.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectFile

logger = logging.getLogger(__name__)

async def create_project_in_supabase(user_id: str, project_data: ProjectCreate) -> str:
    """
    Create a new project in Supabase
    
    Args:
        user_id: User ID
        project_data: Project data
        
    Returns:
        Project ID
    """
    try:
        supabase = get_supabase_client()
        
        # Generate project ID
        project_id = str(uuid.uuid4())
        
        # Create project data
        project = {
            "id": project_id,
            "user_id": user_id,
            "name": project_data.name,
            "description": project_data.description,
            "language": project_data.language,
            "framework": project_data.framework,
            "is_public": project_data.is_public,
            "tags": project_data.tags,
        }
        
        # Insert project data
        project_response = supabase.table("projects").insert(project).execute()
        
        if len(project_response.data) == 0:
            raise ValueError("Failed to create project")
        
        return project_id
    except Exception as e:
        logger.error(f"Error creating project in Supabase: {e}")
        raise ValueError(f"Failed to create project in Supabase: {str(e)}")

async def get_project_from_supabase(project_id: str, user_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Get project data from Supabase
    
    Args:
        project_id: Project ID
        user_id: User ID (optional, for authorization)
        
    Returns:
        Project data from Supabase
    """
    try:
        supabase = get_supabase_client()
        
        # Get project data
        query = supabase.table("projects").select("*").eq("id", project_id)
        
        # If user_id is provided, check authorization
        if user_id:
            query = query.eq("user_id", user_id)
            
        project_response = query.execute()
        
        if len(project_response.data) == 0:
            raise ValueError("Project not found or access denied")
        
        project = project_response.data[0]
        
        # Get project files
        files_response = supabase.table("project_files").select("*").eq("project_id", project_id).execute()
        
        files = []
        for file_data in files_response.data:
            files.append({
                "id": file_data.get("id"),
                "name": file_data.get("name"),
                "path": file_data.get("path"),
                "content": file_data.get("content"),
                "language": file_data.get("language"),
            })
        
        # Combine project and files
        project_data = {
            "id": project.get("id"),
            "user_id": project.get("user_id"),
            "name": project.get("name"),
            "description": project.get("description"),
            "language": project.get("language"),
            "framework": project.get("framework"),
            "is_public": project.get("is_public"),
            "tags": project.get("tags"),
            "created_at": project.get("created_at"),
            "updated_at": project.get("updated_at"),
            "files": files,
        }
        
        return project_data
    except Exception as e:
        logger.error(f"Error getting project from Supabase: {e}")
        raise ValueError(f"Failed to get project from Supabase: {str(e)}")

async def get_projects_from_supabase(user_id: str) -> List[Dict[str, Any]]:
    """
    Get all projects for a user from Supabase
    
    Args:
        user_id: User ID
        
    Returns:
        List of project data from Supabase
    """
    try:
        supabase = get_supabase_client()
        
        # Get project data
        projects_response = supabase.table("projects").select("*").eq("user_id", user_id).execute()
        
        projects = []
        for project in projects_response.data:
            projects.append({
                "id": project.get("id"),
                "name": project.get("name"),
                "description": project.get("description"),
                "language": project.get("language"),
                "framework": project.get("framework"),
                "is_public": project.get("is_public"),
                "tags": project.get("tags"),
                "created_at": project.get("created_at"),
                "updated_at": project.get("updated_at"),
            })
        
        return projects
    except Exception as e:
        logger.error(f"Error getting projects from Supabase: {e}")
        raise ValueError(f"Failed to get projects from Supabase: {str(e)}")

async def update_project_in_supabase(project_id: str, user_id: str, project_data: ProjectUpdate) -> Dict[str, Any]:
    """
    Update project data in Supabase
    
    Args:
        project_id: Project ID
        user_id: User ID
        project_data: Project data to update
        
    Returns:
        Updated project data from Supabase
    """
    try:
        supabase = get_supabase_client()
        
        # Check if project exists and user has access
        project_check = supabase.table("projects").select("id").eq("id", project_id).eq("user_id", user_id).execute()
        
        if len(project_check.data) == 0:
            raise ValueError("Project not found or access denied")
        
        # Update project data
        update_data = {}
        if project_data.name:
            update_data["name"] = project_data.name
        if project_data.description:
            update_data["description"] = project_data.description
        if project_data.language:
            update_data["language"] = project_data.language
        if project_data.framework:
            update_data["framework"] = project_data.framework
        if project_data.is_public is not None:
            update_data["is_public"] = project_data.is_public
        if project_data.tags:
            update_data["tags"] = project_data.tags
            
        # Only update if there's data to update
        if update_data:
            project_response = supabase.table("projects").update(update_data).eq("id", project_id).execute()
            
            if len(project_response.data) == 0:
                raise ValueError("Failed to update project")
        
        # Get updated project data
        return await get_project_from_supabase(project_id, user_id)
    except Exception as e:
        logger.error(f"Error updating project in Supabase: {e}")
        raise ValueError(f"Failed to update project in Supabase: {str(e)}")

async def delete_project_from_supabase(project_id: str, user_id: str) -> bool:
    """
    Delete project from Supabase
    
    Args:
        project_id: Project ID
        user_id: User ID
        
    Returns:
        True if project was deleted
    """
    try:
        supabase = get_supabase_client()
        
        # Check if project exists and user has access
        project_check = supabase.table("projects").select("id").eq("id", project_id).eq("user_id", user_id).execute()
        
        if len(project_check.data) == 0:
            raise ValueError("Project not found or access denied")
        
        # Delete project files first
        supabase.table("project_files").delete().eq("project_id", project_id).execute()
        
        # Delete project
        supabase.table("projects").delete().eq("id", project_id).execute()
        
        return True
    except Exception as e:
        logger.error(f"Error deleting project from Supabase: {e}")
        raise ValueError(f"Failed to delete project from Supabase: {str(e)}")

async def add_file_to_project_in_supabase(project_id: str, user_id: str, file_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Add file to project in Supabase
    
    Args:
        project_id: Project ID
        user_id: User ID
        file_data: File data
        
    Returns:
        File data from Supabase
    """
    try:
        supabase = get_supabase_client()
        
        # Check if project exists and user has access
        project_check = supabase.table("projects").select("id").eq("id", project_id).eq("user_id", user_id).execute()
        
        if len(project_check.data) == 0:
            raise ValueError("Project not found or access denied")
        
        # Generate file ID
        file_id = str(uuid.uuid4())
        
        # Create file data
        file = {
            "id": file_id,
            "project_id": project_id,
            "name": file_data.get("name"),
            "path": file_data.get("path"),
            "content": file_data.get("content"),
            "language": file_data.get("language"),
        }
        
        # Insert file data
        file_response = supabase.table("project_files").insert(file).execute()
        
        if len(file_response.data) == 0:
            raise ValueError("Failed to add file to project")
        
        return file_response.data[0]
    except Exception as e:
        logger.error(f"Error adding file to project in Supabase: {e}")
        raise ValueError(f"Failed to add file to project in Supabase: {str(e)}")

async def update_file_in_project_in_supabase(file_id: str, project_id: str, user_id: str, file_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Update file in project in Supabase
    
    Args:
        file_id: File ID
        project_id: Project ID
        user_id: User ID
        file_data: File data to update
        
    Returns:
        Updated file data from Supabase
    """
    try:
        supabase = get_supabase_client()
        
        # Check if project exists and user has access
        project_check = supabase.table("projects").select("id").eq("id", project_id).eq("user_id", user_id).execute()
        
        if len(project_check.data) == 0:
            raise ValueError("Project not found or access denied")
        
        # Check if file exists
        file_check = supabase.table("project_files").select("id").eq("id", file_id).eq("project_id", project_id).execute()
        
        if len(file_check.data) == 0:
            raise ValueError("File not found")
        
        # Update file data
        update_data = {}
        if "name" in file_data:
            update_data["name"] = file_data["name"]
        if "path" in file_data:
            update_data["path"] = file_data["path"]
        if "content" in file_data:
            update_data["content"] = file_data["content"]
        if "language" in file_data:
            update_data["language"] = file_data["language"]
            
        # Only update if there's data to update
        if update_data:
            file_response = supabase.table("project_files").update(update_data).eq("id", file_id).execute()
            
            if len(file_response.data) == 0:
                raise ValueError("Failed to update file")
        
            return file_response.data[0]
        else:
            # No data to update, just return current file data
            file_response = supabase.table("project_files").select("*").eq("id", file_id).execute()
            return file_response.data[0]
    except Exception as e:
        logger.error(f"Error updating file in project in Supabase: {e}")
        raise ValueError(f"Failed to update file in project in Supabase: {str(e)}")

async def delete_file_from_project_in_supabase(file_id: str, project_id: str, user_id: str) -> bool:
    """
    Delete file from project in Supabase
    
    Args:
        file_id: File ID
        project_id: Project ID
        user_id: User ID
        
    Returns:
        True if file was deleted
    """
    try:
        supabase = get_supabase_client()
        
        # Check if project exists and user has access
        project_check = supabase.table("projects").select("id").eq("id", project_id).eq("user_id", user_id).execute()
        
        if len(project_check.data) == 0:
            raise ValueError("Project not found or access denied")
        
        # Check if file exists
        file_check = supabase.table("project_files").select("id").eq("id", file_id).eq("project_id", project_id).execute()
        
        if len(file_check.data) == 0:
            raise ValueError("File not found")
        
        # Delete file
        supabase.table("project_files").delete().eq("id", file_id).execute()
        
        return True
    except Exception as e:
        logger.error(f"Error deleting file from project in Supabase: {e}")
        raise ValueError(f"Failed to delete file from project in Supabase: {str(e)}")