import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

/**
 * Service for executing code in Docker containers
 */
export class DockerExecutionService {
  private projectsDir: string;
  private dockerEnabled: boolean;
  private dockerNetwork: string;
  private executionTimeout: number;
  
  constructor() {
    this.projectsDir = process.env.PROJECTS_DIR || path.join(__dirname, '../../projects');
    this.dockerEnabled = process.env.DOCKER_ENABLED === 'true';
    this.dockerNetwork = process.env.DOCKER_NETWORK || 'neuronest-network';
    this.executionTimeout = parseInt(process.env.EXECUTION_TIMEOUT || '300000', 10);
    
    // Ensure projects directory exists
    if (!fs.existsSync(this.projectsDir)) {
      fs.mkdirSync(this.projectsDir, { recursive: true });
    }
    
    // Initialize Docker network if enabled
    if (this.dockerEnabled) {
      this.initializeDocker().catch(err => {
        console.error('Failed to initialize Docker:', err);
      });
    }
  }
  
  /**
   * Initialize Docker environment
   */
  private async initializeDocker(): Promise<void> {
    try {
      // Check if Docker is available
      await execPromise('docker --version');
      
      // Create Docker network if it doesn't exist
      try {
        await execPromise(`docker network inspect ${this.dockerNetwork}`);
      } catch (error) {
        await execPromise(`docker network create ${this.dockerNetwork}`);
        console.log(`Created Docker network: ${this.dockerNetwork}`);
      }
    } catch (error) {
      console.error('Docker is not available:', error);
      this.dockerEnabled = false;
    }
  }
  
  /**
   * Create a new project
   * @param projectName Name of the project
   * @returns Project directory path
   */
  async createProject(projectName: string): Promise<string> {
    // Sanitize project name
    const sanitizedName = projectName.replace(/[^a-zA-Z0-9-_]/g, '_');
    
    // Create a unique project ID
    const projectId = `${sanitizedName}_${Date.now()}`;
    
    // Create project directory
    const projectDir = path.join(this.projectsDir, projectId);
    fs.mkdirSync(projectDir, { recursive: true });
    
    return projectDir;
  }
  
  /**
   * Create a file in a project
   * @param projectDir Project directory path
   * @param filePath Path to the file (relative to project directory)
   * @param content File content
   * @returns Full path to the created file
   */
  async createFile(projectDir: string, filePath: string, content: string): Promise<string> {
    const fullPath = path.join(projectDir, filePath);
    
    // Ensure directory exists
    const dirPath = path.dirname(fullPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    
    // Write file
    fs.writeFileSync(fullPath, content);
    
    return fullPath;
  }
  
  /**
   * Execute a project in a Docker container
   * @param projectDir Project directory path
   * @param projectType Type of project (web, node, python)
   * @param port Port to expose
   * @returns Container ID and URL
   */
  async executeProject(
    projectDir: string, 
    projectType: 'web' | 'node' | 'python', 
    port: number = 3000
  ): Promise<{ containerId: string; url: string }> {
    if (!this.dockerEnabled) {
      throw new Error('Docker execution is not enabled');
    }
    
    // Generate a unique container name
    const containerName = `neuronest-${path.basename(projectDir)}`;
    
    try {
      // Build Docker image
      const dockerfilePath = path.join(__dirname, '../../../execution-env/Dockerfile');
      const entrypointPath = path.join(__dirname, '../../../execution-env/entrypoint.sh');
      
      // Copy entrypoint script to project directory
      fs.copyFileSync(entrypointPath, path.join(projectDir, 'entrypoint.sh'));
      
      // Run Docker container
      const cmd = `docker run -d --name ${containerName} \
        --network ${this.dockerNetwork} \
        -p ${port}:${port} \
        -e PROJECT_TYPE=${projectType} \
        -e PORT=${port} \
        -v ${projectDir}:/app/project \
        node:18-slim /app/project/entrypoint.sh`;
      
      const { stdout } = await execPromise(cmd);
      const containerId = stdout.trim();
      
      // Get container IP address
      const { stdout: ipStdout } = await execPromise(
        `docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${containerId}`
      );
      const containerIp = ipStdout.trim();
      
      // Return container ID and URL
      return {
        containerId,
        url: `http://localhost:${port}`
      };
    } catch (error) {
      console.error('Docker execution error:', error);
      throw new Error(`Failed to execute project in Docker: ${error}`);
    }
  }
  
  /**
   * Stop and remove a Docker container
   * @param containerId Container ID
   */
  async stopContainer(containerId: string): Promise<void> {
    if (!this.dockerEnabled) {
      return;
    }
    
    try {
      await execPromise(`docker stop ${containerId}`);
      await execPromise(`docker rm ${containerId}`);
    } catch (error) {
      console.error('Failed to stop container:', error);
    }
  }
  
  /**
   * Get logs from a Docker container
   * @param containerId Container ID
   * @returns Container logs
   */
  async getContainerLogs(containerId: string): Promise<string> {
    if (!this.dockerEnabled) {
      return 'Docker execution is not enabled';
    }
    
    try {
      const { stdout } = await execPromise(`docker logs ${containerId}`);
      return stdout;
    } catch (error) {
      console.error('Failed to get container logs:', error);
      return `Failed to get logs: ${error}`;
    }
  }
}