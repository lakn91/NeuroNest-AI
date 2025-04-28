from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, Any, List, Optional
import logging
from app.core.dependencies import get_current_user
from app.models.project import ProjectCreate, ProjectUpdate, ProjectResponse, ProjectListResponse, ProjectFileCreate, ProjectFileUpdate, ProjectFileResponse
from app.services.project_service import create_project, get_project, get_projects, update_project, delete_project, add_file_to_project, update_file_in_project, delete_file_from_project

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("", response_model=Dict[str, str], status_code=status.HTTP_201_CREATED)
async def create_new_project(
    project_data: ProjectCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Create a new project
    """
    try:
        project_id = await create_project(current_user["uid"], project_data)
        return {"id": project_id}
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create project"
        )

@router.get("", response_model=ProjectListResponse)
async def get_user_projects(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get all projects for the current user
    """
    try:
        projects = await get_projects(current_user["uid"])
        return ProjectListResponse(projects=projects, total=len(projects))
    except Exception as e:
        logger.error(f"Error getting projects: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get projects"
        )

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project_by_id(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Get a project by ID
    """
    try:
        project = await get_project(project_id)
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Check if user owns the project
        if project.user_id != current_user["uid"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this project"
            )
        
        return project
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting project: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get project"
        )

@router.put("/{project_id}", response_model=Dict[str, str])
async def update_project_by_id(
    project_id: str,
    project_data: ProjectUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a project
    """
    try:
        success = await update_project(
            project_id,
            current_user["uid"],
            project_data.model_dump(exclude_unset=True)
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or you don't have permission to update it"
            )
        
        return {"message": "Project updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating project: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update project"
        )

@router.delete("/{project_id}")
async def delete_project_by_id(
    project_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a project
    """
    try:
        success = await delete_project(project_id, current_user["uid"])
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or you don't have permission to delete it"
            )
        
        return {"message": "Project deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting project: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete project"
        )

@router.post("/{project_id}/files", response_model=Dict[str, str])
async def add_file(
    project_id: str,
    file_data: ProjectFileCreate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Add a file to a project
    """
    try:
        success = await add_file_to_project(
            project_id,
            current_user["uid"],
            file_data.path,
            file_data.content,
            file_data.language
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found or you don't have permission to add files to it"
            )
        
        return {"message": "File added successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding file to project: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to add file to project"
        )

@router.put("/{project_id}/files/{file_path:path}", response_model=Dict[str, str])
async def update_file(
    project_id: str,
    file_path: str,
    file_data: ProjectFileUpdate,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Update a file in a project
    """
    try:
        success = await update_file_in_project(
            project_id,
            current_user["uid"],
            file_path,
            file_data.content,
            file_data.language
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project or file not found, or you don't have permission to update it"
            )
        
        return {"message": "File updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating file in project: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update file in project"
        )

@router.delete("/{project_id}/files/{file_path:path}")
async def delete_file(
    project_id: str,
    file_path: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Delete a file from a project
    """
    try:
        success = await delete_file_from_project(
            project_id,
            current_user["uid"],
            file_path
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project or file not found, or you don't have permission to delete it"
            )
        
        return {"message": "File deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting file from project: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete file from project"
        )