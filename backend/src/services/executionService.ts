import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

/**
 * Service for executing code in a controlled environment
 */
export class ExecutionService {
  private projectsDir: string;
  
  constructor() {
    this.projectsDir = process.env.PROJECTS_DIR || path.join(__dirname, '../../projects');
    
    // Ensure projects directory exists
    if (!fs.existsSync(this.projectsDir)) {
      fs.mkdirSync(this.projectsDir, { recursive: true });
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
   * Execute a command in a project directory
   * @param projectDir Project directory path
   * @param command Command to execute
   * @returns Command output
   */
  async executeCommand(projectDir: string, command: string): Promise<string> {
    try {
      const { stdout, stderr } = await execPromise(command, { cwd: projectDir });
      
      if (stderr) {
        console.warn('Command stderr:', stderr);
      }
      
      return stdout;
    } catch (error) {
      console.error('Command execution error:', error);
      throw new Error(`Failed to execute command: ${command}`);
    }
  }
  
  /**
   * Execute a web project (HTML/CSS/JS)
   * @param projectDir Project directory path
   * @returns Server URL
   */
  async executeWebProject(projectDir: string): Promise<string> {
    // For now, we'll just return the path to the index.html file
    // In a real implementation, this would start a web server
    
    const indexPath = path.join(projectDir, 'index.html');
    
    if (!fs.existsSync(indexPath)) {
      throw new Error('index.html not found in project directory');
    }
    
    // In a real implementation, this would be a URL to a running server
    return `file://${indexPath}`;
  }
  
  /**
   * Execute a Node.js project
   * @param projectDir Project directory path
   * @returns Execution output
   */
  async executeNodeProject(projectDir: string): Promise<string> {
    // Check if package.json exists
    const packageJsonPath = path.join(projectDir, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      // Install dependencies
      await this.executeCommand(projectDir, 'npm install');
      
      // Run start script if it exists
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      
      if (packageJson.scripts && packageJson.scripts.start) {
        return await this.executeCommand(projectDir, 'npm start');
      }
    }
    
    // Look for index.js or server.js
    const indexPath = path.join(projectDir, 'index.js');
    const serverPath = path.join(projectDir, 'server.js');
    
    if (fs.existsSync(indexPath)) {
      return await this.executeCommand(projectDir, 'node index.js');
    } else if (fs.existsSync(serverPath)) {
      return await this.executeCommand(projectDir, 'node server.js');
    }
    
    throw new Error('No executable entry point found in project');
  }
  
  /**
   * Execute a Python project
   * @param projectDir Project directory path
   * @returns Execution output
   */
  async executePythonProject(projectDir: string): Promise<string> {
    // Check if requirements.txt exists
    const requirementsPath = path.join(projectDir, 'requirements.txt');
    
    if (fs.existsSync(requirementsPath)) {
      // Install dependencies
      await this.executeCommand(projectDir, 'pip install -r requirements.txt');
    }
    
    // Look for main.py or app.py
    const mainPath = path.join(projectDir, 'main.py');
    const appPath = path.join(projectDir, 'app.py');
    
    if (fs.existsSync(mainPath)) {
      return await this.executeCommand(projectDir, 'python main.py');
    } else if (fs.existsSync(appPath)) {
      return await this.executeCommand(projectDir, 'python app.py');
    }
    
    throw new Error('No executable entry point found in project');
  }
}