import os
import re
import logging
import uuid
import json
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import aiofiles
from app.core.config import settings
from app.models.project import ProjectBase, ProjectCreate, ProjectResponse, ProjectFile, FileContent

logger = logging.getLogger(__name__)

async def create_project(
    user_id: str,
    project_data: ProjectCreate
) -> str:
    """
    Create a new project
    """
    try:
        # Generate a project ID
        project_id = str(uuid.uuid4())
        
        # Create project directory
        project_dir = os.path.join(settings.PROJECTS_DIR, project_id)
        os.makedirs(project_dir, exist_ok=True)
        
        # Create project metadata
        metadata = {
            "id": project_id,
            "user_id": user_id,
            "title": project_data.title,
            "description": project_data.description,
            "language": project_data.language,
            "framework": project_data.framework,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
            "files": {}
        }
        
        # Save files if provided
        if project_data.files:
            for file_path, file_content in project_data.files.items():
                # Normalize file path
                normalized_path = file_path.lstrip('/')
                
                # Create directories if needed
                file_dir = os.path.dirname(normalized_path)
                if file_dir:
                    os.makedirs(os.path.join(project_dir, file_dir), exist_ok=True)
                
                # Save file
                full_path = os.path.join(project_dir, normalized_path)
                async with aiofiles.open(full_path, 'w') as f:
                    await f.write(file_content.content)
                
                # Add to metadata
                metadata["files"][normalized_path] = {
                    "content": file_content.content,
                    "language": file_content.language
                }
        
        # Save metadata
        async with aiofiles.open(os.path.join(project_dir, "metadata.json"), 'w') as f:
            await f.write(json.dumps(metadata, indent=2))
        
        return project_id
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise

async def get_project(project_id: str) -> Optional[ProjectResponse]:
    """
    Get a project by ID
    """
    try:
        # Get project directory
        project_dir = os.path.join(settings.PROJECTS_DIR, project_id)
        
        # Check if project exists
        if not os.path.exists(project_dir):
            return None
        
        # Read metadata
        async with aiofiles.open(os.path.join(project_dir, "metadata.json"), 'r') as f:
            metadata = json.loads(await f.read())
        
        # Convert dates
        created_at = datetime.fromisoformat(metadata["created_at"])
        updated_at = datetime.fromisoformat(metadata["updated_at"])
        
        # Create response
        return ProjectResponse(
            id=metadata["id"],
            user_id=metadata["user_id"],
            title=metadata["title"],
            description=metadata.get("description"),
            language=metadata.get("language"),
            framework=metadata.get("framework"),
            files=metadata.get("files", {}),
            file_count=len(metadata.get("files", {})),
            created_at=created_at,
            updated_at=updated_at,
            preview_url=f"/static/projects/{project_id}"
        )
    except Exception as e:
        logger.error(f"Error getting project: {e}")
        return None

async def get_projects(user_id: str) -> List[ProjectResponse]:
    """
    Get all projects for a user
    """
    try:
        projects = []
        
        # List all directories in the projects directory
        for project_id in os.listdir(settings.PROJECTS_DIR):
            project_dir = os.path.join(settings.PROJECTS_DIR, project_id)
            
            # Skip if not a directory
            if not os.path.isdir(project_dir):
                continue
            
            # Read metadata
            try:
                async with aiofiles.open(os.path.join(project_dir, "metadata.json"), 'r') as f:
                    metadata = json.loads(await f.read())
                
                # Skip if not owned by the user
                if metadata["user_id"] != user_id:
                    continue
                
                # Convert dates
                created_at = datetime.fromisoformat(metadata["created_at"])
                updated_at = datetime.fromisoformat(metadata["updated_at"])
                
                # Create response
                projects.append(ProjectResponse(
                    id=metadata["id"],
                    user_id=metadata["user_id"],
                    title=metadata["title"],
                    description=metadata.get("description"),
                    language=metadata.get("language"),
                    framework=metadata.get("framework"),
                    files=metadata.get("files", {}),
                    file_count=len(metadata.get("files", {})),
                    created_at=created_at,
                    updated_at=updated_at,
                    preview_url=f"/static/projects/{project_id}"
                ))
            except Exception as e:
                logger.error(f"Error reading project metadata: {e}")
                continue
        
        # Sort by updated_at (newest first)
        projects.sort(key=lambda p: p.updated_at, reverse=True)
        
        return projects
    except Exception as e:
        logger.error(f"Error getting projects: {e}")
        return []

async def update_project(
    project_id: str,
    user_id: str,
    project_data: Dict[str, Any]
) -> bool:
    """
    Update a project
    """
    try:
        # Get project directory
        project_dir = os.path.join(settings.PROJECTS_DIR, project_id)
        
        # Check if project exists
        if not os.path.exists(project_dir):
            return False
        
        # Read metadata
        async with aiofiles.open(os.path.join(project_dir, "metadata.json"), 'r') as f:
            metadata = json.loads(await f.read())
        
        # Check if user owns the project
        if metadata["user_id"] != user_id:
            return False
        
        # Update metadata
        if "title" in project_data:
            metadata["title"] = project_data["title"]
        if "description" in project_data:
            metadata["description"] = project_data["description"]
        if "language" in project_data:
            metadata["language"] = project_data["language"]
        if "framework" in project_data:
            metadata["framework"] = project_data["framework"]
        
        metadata["updated_at"] = datetime.utcnow().isoformat()
        
        # Save metadata
        async with aiofiles.open(os.path.join(project_dir, "metadata.json"), 'w') as f:
            await f.write(json.dumps(metadata, indent=2))
        
        return True
    except Exception as e:
        logger.error(f"Error updating project: {e}")
        return False

async def delete_project(project_id: str, user_id: str) -> bool:
    """
    Delete a project
    """
    try:
        # Get project directory
        project_dir = os.path.join(settings.PROJECTS_DIR, project_id)
        
        # Check if project exists
        if not os.path.exists(project_dir):
            return False
        
        # Read metadata
        async with aiofiles.open(os.path.join(project_dir, "metadata.json"), 'r') as f:
            metadata = json.loads(await f.read())
        
        # Check if user owns the project
        if metadata["user_id"] != user_id:
            return False
        
        # Delete project directory
        import shutil
        shutil.rmtree(project_dir)
        
        return True
    except Exception as e:
        logger.error(f"Error deleting project: {e}")
        return False

async def add_file_to_project(
    project_id: str,
    user_id: str,
    file_path: str,
    content: str,
    language: str = "plaintext"
) -> bool:
    """
    Add a file to a project
    """
    try:
        # Get project directory
        project_dir = os.path.join(settings.PROJECTS_DIR, project_id)
        
        # Check if project exists
        if not os.path.exists(project_dir):
            return False
        
        # Read metadata
        async with aiofiles.open(os.path.join(project_dir, "metadata.json"), 'r') as f:
            metadata = json.loads(await f.read())
        
        # Check if user owns the project
        if metadata["user_id"] != user_id:
            return False
        
        # Normalize file path
        normalized_path = file_path.lstrip('/')
        
        # Create directories if needed
        file_dir = os.path.dirname(normalized_path)
        if file_dir:
            os.makedirs(os.path.join(project_dir, file_dir), exist_ok=True)
        
        # Save file
        full_path = os.path.join(project_dir, normalized_path)
        async with aiofiles.open(full_path, 'w') as f:
            await f.write(content)
        
        # Update metadata
        metadata["files"][normalized_path] = {
            "content": content,
            "language": language
        }
        metadata["updated_at"] = datetime.utcnow().isoformat()
        
        # Save metadata
        async with aiofiles.open(os.path.join(project_dir, "metadata.json"), 'w') as f:
            await f.write(json.dumps(metadata, indent=2))
        
        return True
    except Exception as e:
        logger.error(f"Error adding file to project: {e}")
        return False

async def update_file_in_project(
    project_id: str,
    user_id: str,
    file_path: str,
    content: str,
    language: Optional[str] = None
) -> bool:
    """
    Update a file in a project
    """
    try:
        # Get project directory
        project_dir = os.path.join(settings.PROJECTS_DIR, project_id)
        
        # Check if project exists
        if not os.path.exists(project_dir):
            return False
        
        # Read metadata
        async with aiofiles.open(os.path.join(project_dir, "metadata.json"), 'r') as f:
            metadata = json.loads(await f.read())
        
        # Check if user owns the project
        if metadata["user_id"] != user_id:
            return False
        
        # Normalize file path
        normalized_path = file_path.lstrip('/')
        
        # Check if file exists in metadata
        if normalized_path not in metadata["files"]:
            return False
        
        # Save file
        full_path = os.path.join(project_dir, normalized_path)
        async with aiofiles.open(full_path, 'w') as f:
            await f.write(content)
        
        # Update metadata
        metadata["files"][normalized_path]["content"] = content
        if language:
            metadata["files"][normalized_path]["language"] = language
        metadata["updated_at"] = datetime.utcnow().isoformat()
        
        # Save metadata
        async with aiofiles.open(os.path.join(project_dir, "metadata.json"), 'w') as f:
            await f.write(json.dumps(metadata, indent=2))
        
        return True
    except Exception as e:
        logger.error(f"Error updating file in project: {e}")
        return False

async def delete_file_from_project(
    project_id: str,
    user_id: str,
    file_path: str
) -> bool:
    """
    Delete a file from a project
    """
    try:
        # Get project directory
        project_dir = os.path.join(settings.PROJECTS_DIR, project_id)
        
        # Check if project exists
        if not os.path.exists(project_dir):
            return False
        
        # Read metadata
        async with aiofiles.open(os.path.join(project_dir, "metadata.json"), 'r') as f:
            metadata = json.loads(await f.read())
        
        # Check if user owns the project
        if metadata["user_id"] != user_id:
            return False
        
        # Normalize file path
        normalized_path = file_path.lstrip('/')
        
        # Check if file exists in metadata
        if normalized_path not in metadata["files"]:
            return False
        
        # Delete file
        full_path = os.path.join(project_dir, normalized_path)
        if os.path.exists(full_path):
            os.remove(full_path)
        
        # Update metadata
        del metadata["files"][normalized_path]
        metadata["updated_at"] = datetime.utcnow().isoformat()
        
        # Save metadata
        async with aiofiles.open(os.path.join(project_dir, "metadata.json"), 'w') as f:
            await f.write(json.dumps(metadata, indent=2))
        
        return True
    except Exception as e:
        logger.error(f"Error deleting file from project: {e}")
        return False

async def create_project_from_code(
    user_id: str,
    title: str,
    description: str,
    code_content: str,
    language: str = "javascript",
    framework: Optional[str] = None
) -> Optional[str]:
    """
    Create a project from generated code
    """
    try:
        # Parse the code content to extract files
        files = await parse_code_blocks(code_content)
        
        if not files:
            # If no files were extracted, create a single file
            files = {
                "main.txt": FileContent(
                    content=code_content,
                    language="plaintext"
                )
            }
        
        # Create project
        project_data = ProjectCreate(
            title=title,
            description=description,
            language=language,
            framework=framework,
            files=files
        )
        
        # Create project
        project_id = await create_project(user_id, project_data)
        
        return project_id
    except Exception as e:
        logger.error(f"Error creating project from code: {e}")
        return None

async def parse_code_blocks(content: str) -> Dict[str, FileContent]:
    """
    Parse code blocks from markdown content
    """
    files = {}
    
    # Regular expression to match code blocks with filenames
    # Format: ```language:filename
    # or: ```language filename
    # or just: ```language
    pattern = r'```(\w+)(?::|\s+)?([^\n]*)\n(.*?)```'
    matches = re.finditer(pattern, content, re.DOTALL)
    
    for match in matches:
        language = match.group(1).lower()
        filename = match.group(2).strip()
        code = match.group(3)
        
        # If no filename is provided, generate one based on language
        if not filename:
            if language == "javascript" or language == "js":
                filename = "index.js"
            elif language == "typescript" or language == "ts":
                filename = "index.ts"
            elif language == "python" or language == "py":
                filename = "main.py"
            elif language == "html":
                filename = "index.html"
            elif language == "css":
                filename = "styles.css"
            elif language == "java":
                filename = "Main.java"
            elif language == "c" or language == "cpp" or language == "c++":
                filename = "main.cpp"
            elif language == "csharp" or language == "cs":
                filename = "Program.cs"
            elif language == "go":
                filename = "main.go"
            elif language == "ruby" or language == "rb":
                filename = "main.rb"
            elif language == "php":
                filename = "index.php"
            else:
                filename = f"file.{language}"
        
        # Add file to dictionary
        files[filename] = FileContent(
            content=code,
            language=language
        )
    
    # If no code blocks were found, try to extract filenames from headings
    if not files:
        # Look for patterns like "# filename.ext" or "## filename.ext"
        pattern = r'#+\s+([a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+)\s*\n(.*?)(?=#+\s+[a-zA-Z0-9_\-\.]+\.[a-zA-Z0-9]+|\Z)'
        matches = re.finditer(pattern, content, re.DOTALL)
        
        for match in matches:
            filename = match.group(1).strip()
            code = match.group(2).strip()
            
            # Guess language from file extension
            ext = os.path.splitext(filename)[1].lower()
            language = "plaintext"
            
            if ext == ".js":
                language = "javascript"
            elif ext == ".ts":
                language = "typescript"
            elif ext == ".py":
                language = "python"
            elif ext == ".html":
                language = "html"
            elif ext == ".css":
                language = "css"
            elif ext == ".java":
                language = "java"
            elif ext == ".cpp" or ext == ".c" or ext == ".h":
                language = "cpp"
            elif ext == ".cs":
                language = "csharp"
            elif ext == ".go":
                language = "go"
            elif ext == ".rb":
                language = "ruby"
            elif ext == ".php":
                language = "php"
            
            # Add file to dictionary
            files[filename] = FileContent(
                content=code,
                language=language
            )
    
    return files