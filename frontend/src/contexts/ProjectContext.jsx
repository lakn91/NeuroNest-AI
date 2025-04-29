/**
 * Project Context
 * Provides project management functionality to the entire application
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useDatabase } from './DatabaseContext';

// Create the project context
const ProjectContext = createContext();

/**
 * Custom hook to use the project context
 * @returns {Object} Project context
 */
export const useProject = () => {
  return useContext(ProjectContext);
};

/**
 * Project Provider Component
 * Wraps the application and provides project management functionality
 */
export const ProjectProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const { currentUser } = useAuth();
  const { projectService, storageService } = useDatabase();

  /**
   * Create a new project
   * @param {Object} projectData - Project data
   * @returns {Promise} Promise with project ID
   */
  const createProject = async (projectData) => {
    if (!currentUser) return { id: null, error: 'No user logged in' };
    
    const result = await projectService.createProject(currentUser.uid, projectData);
    
    if (!result.error) {
      // Fetch the new project to add to the projects list
      const { data } = await projectService.getProject(result.id);
      
      if (data) {
        setProjects(prev => [data, ...prev]);
      }
    }
    
    return result;
  };

  /**
   * Get a project by ID
   * @param {string} projectId - Project ID
   * @returns {Promise} Promise with project data
   */
  const getProject = async (projectId) => {
    const result = await projectService.getProject(projectId);
    
    if (!result.error && result.data) {
      setCurrentProject(result.data);
    }
    
    return result;
  };

  /**
   * Get all projects for the current user
   * @returns {Promise} Promise with projects array
   */
  const getUserProjects = async () => {
    if (!currentUser) return { data: [], error: 'No user logged in' };
    
    setLoading(true);
    const result = await projectService.getUserProjects(currentUser.uid);
    
    if (!result.error) {
      setProjects(result.data);
    }
    
    setLoading(false);
    return result;
  };

  /**
   * Update a project
   * @param {string} projectId - Project ID
   * @param {Object} projectData - Project data to update
   * @returns {Promise} Promise that resolves when project is updated
   */
  const updateProject = async (projectId, projectData) => {
    const result = await projectService.updateProject(projectId, projectData);
    
    if (!result.error) {
      // Update the project in the projects list
      setProjects(prev => 
        prev.map(project => 
          project.id === projectId 
            ? { ...project, ...projectData, updatedAt: new Date().toISOString() } 
            : project
        )
      );
      
      // Update current project if it's the one being updated
      if (currentProject && currentProject.id === projectId) {
        setCurrentProject(prev => ({ ...prev, ...projectData, updatedAt: new Date().toISOString() }));
      }
    }
    
    return result;
  };

  /**
   * Add a file to a project
   * @param {string} projectId - Project ID
   * @param {File} file - File to upload
   * @returns {Promise} Promise with file data
   */
  const addFileToProject = async (projectId, file) => {
    if (!currentUser) return { error: 'No user logged in' };
    
    // Upload the file to storage
    const uploadResult = await storageService.uploadFile(currentUser.uid, file, `projects/${projectId}`);
    
    if (uploadResult.error) {
      return { error: uploadResult.error };
    }
    
    // Create file data object
    const fileData = {
      id: Date.now().toString(),
      name: file.name,
      path: uploadResult.path,
      url: uploadResult.url,
      type: file.type,
      size: file.size,
      createdAt: new Date().toISOString()
    };
    
    // Add file to project
    const result = await projectService.addFileToProject(projectId, fileData);
    
    if (!result.error) {
      // Update current project if it's the one being updated
      if (currentProject && currentProject.id === projectId) {
        setCurrentProject(prev => ({
          ...prev,
          files: [...(prev.files || []), fileData],
          updatedAt: new Date().toISOString()
        }));
      }
      
      // Update the project in the projects list
      setProjects(prev => 
        prev.map(project => {
          if (project.id === projectId) {
            return {
              ...project,
              files: [...(project.files || []), fileData],
              updatedAt: new Date().toISOString()
            };
          }
          return project;
        })
      );
    }
    
    return result.error ? result : { data: fileData, error: null };
  };

  /**
   * Add a code file to a project
   * @param {string} projectId - Project ID
   * @param {string} fileName - File name
   * @param {string} content - File content
   * @param {string} type - File type/language
   * @returns {Promise} Promise with file data
   */
  const addCodeToProject = async (projectId, fileName, content, type = 'text/plain') => {
    if (!currentUser) return { error: 'No user logged in' };
    
    // Upload the content as a file
    const uploadResult = await storageService.uploadString(
      currentUser.uid, 
      content, 
      fileName, 
      `projects/${projectId}`
    );
    
    if (uploadResult.error) {
      return { error: uploadResult.error };
    }
    
    // Create file data object
    const fileData = {
      id: Date.now().toString(),
      name: fileName,
      path: uploadResult.path,
      url: uploadResult.url,
      type: type,
      content: content, // Store content directly for code files
      size: content.length,
      createdAt: new Date().toISOString()
    };
    
    // Add file to project
    const result = await projectService.addFileToProject(projectId, fileData);
    
    if (!result.error) {
      // Update current project if it's the one being updated
      if (currentProject && currentProject.id === projectId) {
        setCurrentProject(prev => ({
          ...prev,
          files: [...(prev.files || []), fileData],
          updatedAt: new Date().toISOString()
        }));
      }
      
      // Update the project in the projects list
      setProjects(prev => 
        prev.map(project => {
          if (project.id === projectId) {
            return {
              ...project,
              files: [...(project.files || []), fileData],
              updatedAt: new Date().toISOString()
            };
          }
          return project;
        })
      );
    }
    
    return result.error ? result : { data: fileData, error: null };
  };

  /**
   * Update a file in a project
   * @param {string} projectId - Project ID
   * @param {string} fileId - File ID
   * @param {Object} fileData - Updated file data
   * @returns {Promise} Promise that resolves when file is updated
   */
  const updateProjectFile = async (projectId, fileId, fileData) => {
    // If content is updated, upload the new content
    if (fileData.content && currentUser) {
      const fileName = fileData.name || 'updated_file.txt';
      const content = fileData.content;
      
      // Upload the updated content
      const uploadResult = await storageService.uploadString(
        currentUser.uid, 
        content, 
        fileName, 
        `projects/${projectId}`
      );
      
      if (!uploadResult.error) {
        // Update file data with new URL and path
        fileData.url = uploadResult.url;
        fileData.path = uploadResult.path;
        fileData.size = content.length;
      }
    }
    
    const result = await projectService.updateProjectFile(projectId, fileId, fileData);
    
    if (!result.error) {
      // Update current project if it's the one being updated
      if (currentProject && currentProject.id === projectId) {
        setCurrentProject(prev => ({
          ...prev,
          files: prev.files.map(file => 
            file.id === fileId 
              ? { ...file, ...fileData, updatedAt: new Date().toISOString() } 
              : file
          ),
          updatedAt: new Date().toISOString()
        }));
      }
      
      // Update the project in the projects list
      setProjects(prev => 
        prev.map(project => {
          if (project.id === projectId) {
            return {
              ...project,
              files: (project.files || []).map(file => 
                file.id === fileId 
                  ? { ...file, ...fileData, updatedAt: new Date().toISOString() } 
                  : file
              ),
              updatedAt: new Date().toISOString()
            };
          }
          return project;
        })
      );
    }
    
    return result;
  };

  /**
   * Remove a file from a project
   * @param {string} projectId - Project ID
   * @param {string} fileId - File ID
   * @returns {Promise} Promise that resolves when file is removed
   */
  const removeFileFromProject = async (projectId, fileId) => {
    // Find the file to get its path
    let filePath = null;
    
    if (currentProject && currentProject.id === projectId) {
      const file = currentProject.files.find(f => f.id === fileId);
      if (file) {
        filePath = file.path;
      }
    } else {
      const project = projects.find(p => p.id === projectId);
      if (project && project.files) {
        const file = project.files.find(f => f.id === fileId);
        if (file) {
          filePath = file.path;
        }
      }
    }
    
    // Delete the file from storage if path was found
    if (filePath) {
      await storageService.deleteFile(filePath);
    }
    
    // Find the file data to remove
    let fileData = null;
    
    if (currentProject && currentProject.id === projectId) {
      fileData = currentProject.files.find(f => f.id === fileId);
    } else {
      const project = projects.find(p => p.id === projectId);
      if (project && project.files) {
        fileData = project.files.find(f => f.id === fileId);
      }
    }
    
    if (!fileData) {
      return { error: 'File not found' };
    }
    
    // Remove file from project
    const result = await projectService.removeFileFromProject(projectId, fileData);
    
    if (!result.error) {
      // Update current project if it's the one being updated
      if (currentProject && currentProject.id === projectId) {
        setCurrentProject(prev => ({
          ...prev,
          files: prev.files.filter(file => file.id !== fileId),
          updatedAt: new Date().toISOString()
        }));
      }
      
      // Update the project in the projects list
      setProjects(prev => 
        prev.map(project => {
          if (project.id === projectId) {
            return {
              ...project,
              files: (project.files || []).filter(file => file.id !== fileId),
              updatedAt: new Date().toISOString()
            };
          }
          return project;
        })
      );
    }
    
    return result;
  };

  /**
   * Delete a project
   * @param {string} projectId - Project ID
   * @returns {Promise} Promise that resolves when project is deleted
   */
  const deleteProject = async (projectId) => {
    // Find the project to get its files
    const project = projects.find(p => p.id === projectId) || currentProject;
    
    if (project && project.files && project.files.length > 0) {
      // Delete all files from storage
      for (const file of project.files) {
        if (file.path) {
          await storageService.deleteFile(file.path);
        }
      }
    }
    
    const result = await projectService.deleteProject(projectId);
    
    if (!result.error) {
      // Remove the project from the projects list
      setProjects(prev => prev.filter(project => project.id !== projectId));
      
      // Clear current project if it's the one being deleted
      if (currentProject && currentProject.id === projectId) {
        setCurrentProject(null);
      }
    }
    
    return result;
  };

  /**
   * Set the current project
   * @param {Object|string} project - Project object or ID
   */
  const setActiveProject = async (project) => {
    if (typeof project === 'string') {
      // If project is an ID, fetch the project data
      const { data } = await projectService.getProject(project);
      setCurrentProject(data);
    } else {
      setCurrentProject(project);
    }
  };

  /**
   * Clear the current project
   */
  const clearActiveProject = () => {
    setCurrentProject(null);
  };

  // Load user projects when user changes
  useEffect(() => {
    if (currentUser) {
      getUserProjects();
    } else {
      setProjects([]);
      setCurrentProject(null);
      setLoading(false);
    }
  }, [currentUser]);

  // Value to be provided by the context
  const value = {
    projects,
    currentProject,
    loading,
    createProject,
    getProject,
    getUserProjects,
    updateProject,
    addFileToProject,
    addCodeToProject,
    updateProjectFile,
    removeFileFromProject,
    deleteProject,
    setActiveProject,
    clearActiveProject
  };

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
};

export default ProjectContext;