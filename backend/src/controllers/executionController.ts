import { Request, Response } from 'express';
import { DockerExecutionService } from '../services/dockerExecutionService';
import { ExecutionService } from '../services/executionService';

// Create service instances
const dockerService = new DockerExecutionService();
const localService = new ExecutionService();

/**
 * Create a new project
 * @param req Express request
 * @param res Express response
 */
export const createProject = async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    const projectDir = await dockerService.createProject(name);
    
    return res.status(201).json({ 
      projectId: projectDir.split('/').pop(),
      projectDir
    });
  } catch (error) {
    console.error('Error creating project:', error);
    return res.status(500).json({ error: 'Failed to create project' });
  }
};

/**
 * Create a file in a project
 * @param req Express request
 * @param res Express response
 */
export const createFile = async (req: Request, res: Response) => {
  try {
    const { projectId, filePath, content } = req.body;
    
    if (!projectId || !filePath || !content) {
      return res.status(400).json({ error: 'Project ID, file path, and content are required' });
    }
    
    const projectDir = `${process.env.PROJECTS_DIR || './projects'}/${projectId}`;
    const fullPath = await dockerService.createFile(projectDir, filePath, content);
    
    return res.status(201).json({ 
      filePath: fullPath,
      success: true
    });
  } catch (error) {
    console.error('Error creating file:', error);
    return res.status(500).json({ error: 'Failed to create file' });
  }
};

/**
 * Execute a project
 * @param req Express request
 * @param res Express response
 */
export const executeProject = async (req: Request, res: Response) => {
  try {
    const { projectId, projectType, port } = req.body;
    
    if (!projectId || !projectType) {
      return res.status(400).json({ error: 'Project ID and type are required' });
    }
    
    const projectDir = `${process.env.PROJECTS_DIR || './projects'}/${projectId}`;
    
    // Use Docker execution if available, otherwise fall back to local execution
    try {
      const result = await dockerService.executeProject(
        projectDir, 
        projectType, 
        port || 3000
      );
      
      return res.status(200).json({
        containerId: result.containerId,
        url: result.url,
        success: true
      });
    } catch (dockerError) {
      console.warn('Docker execution failed, falling back to local execution:', dockerError);
      
      let result: string;
      
      switch (projectType) {
        case 'web':
          result = await localService.executeWebProject(projectDir);
          break;
        case 'node':
          result = await localService.executeNodeProject(projectDir);
          break;
        case 'python':
          result = await localService.executePythonProject(projectDir);
          break;
        default:
          return res.status(400).json({ error: `Unsupported project type: ${projectType}` });
      }
      
      return res.status(200).json({
        output: result,
        success: true
      });
    }
  } catch (error) {
    console.error('Error executing project:', error);
    return res.status(500).json({ error: 'Failed to execute project' });
  }
};

/**
 * Stop project execution
 * @param req Express request
 * @param res Express response
 */
export const stopExecution = async (req: Request, res: Response) => {
  try {
    const { containerId } = req.params;
    
    if (!containerId) {
      return res.status(400).json({ error: 'Container ID is required' });
    }
    
    await dockerService.stopContainer(containerId);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error stopping execution:', error);
    return res.status(500).json({ error: 'Failed to stop execution' });
  }
};

/**
 * Get execution logs
 * @param req Express request
 * @param res Express response
 */
export const getExecutionLogs = async (req: Request, res: Response) => {
  try {
    const { containerId } = req.params;
    
    if (!containerId) {
      return res.status(400).json({ error: 'Container ID is required' });
    }
    
    const logs = await dockerService.getContainerLogs(containerId);
    
    return res.status(200).json({ logs });
  } catch (error) {
    console.error('Error getting execution logs:', error);
    return res.status(500).json({ error: 'Failed to get execution logs' });
  }
};