import { BaseRuntime, RuntimeConfig } from './Runtime';
import { Action, CodeExecutionAction, ShellCommandAction } from '../events/Action';
import { 
  Observation, 
  CodeExecutionObservation, 
  ShellCommandObservation, 
  ErrorObservation 
} from '../events/Observation';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

/**
 * Configuration for Docker runtime
 */
export interface DockerRuntimeConfig extends RuntimeConfig {
  /**
   * Base image to use for containers
   */
  baseImage?: string;
  
  /**
   * Working directory inside the container
   */
  workingDir?: string;
  
  /**
   * Directory to mount into the container
   */
  mountDir?: string;
  
  /**
   * Whether to keep containers after execution
   */
  keepContainers?: boolean;
}

/**
 * Runtime implementation that uses Docker for secure execution
 */
export class DockerRuntime extends BaseRuntime {
  private baseImage: string;
  private workingDir: string;
  private mountDir: string;
  private keepContainers: boolean;
  private containers: Map<string, string> = new Map();
  
  constructor() {
    super('docker');
  }
  
  /**
   * Initialize the Docker runtime
   * @param config Configuration for the runtime
   */
  async initialize(config: DockerRuntimeConfig): Promise<void> {
    await super.initialize(config);
    
    this.baseImage = config.baseImage || 'node:18-alpine';
    this.workingDir = config.workingDir || '/workspace';
    this.mountDir = config.mountDir || path.resolve(process.cwd(), 'workspace');
    this.keepContainers = config.keepContainers || false;
    
    // Create mount directory if it doesn't exist
    if (!fs.existsSync(this.mountDir)) {
      fs.mkdirSync(this.mountDir, { recursive: true });
    }
    
    // Check if Docker is available
    try {
      await this.runDockerCommand(['version']);
    } catch (error) {
      throw new Error('Docker is not available. Please install Docker and ensure it is running.');
    }
    
    // Pull the base image
    try {
      await this.runDockerCommand(['pull', this.baseImage]);
    } catch (error) {
      throw new Error(`Failed to pull Docker image ${this.baseImage}: ${error}`);
    }
  }
  
  /**
   * Execute an action in the Docker runtime
   * @param action The action to execute
   * @returns The observation from executing the action
   */
  async executeAction(action: Action): Promise<Observation> {
    if (!this.supportsAction(action)) {
      return new ErrorObservation(
        action.id,
        `Action type ${action.type} is not supported by the Docker runtime`
      );
    }
    
    try {
      if (action.type === 'action.code_execution') {
        return await this.executeCodeAction(action as CodeExecutionAction);
      } else if (action.type === 'action.shell_command') {
        return await this.executeShellAction(action as ShellCommandAction);
      }
      
      return new ErrorObservation(
        action.id,
        `Action type ${action.type} is not implemented in the Docker runtime`
      );
    } catch (error) {
      return new ErrorObservation(
        action.id,
        `Error executing action: ${error}`
      );
    }
  }
  
  /**
   * Check if the Docker runtime supports an action
   * @param action The action to check
   * @returns Whether the action is supported
   */
  supportsAction(action: Action): boolean {
    return action.type === 'action.code_execution' || action.type === 'action.shell_command';
  }
  
  /**
   * Shutdown the Docker runtime
   */
  async shutdown(): Promise<void> {
    // Stop and remove all containers
    for (const [actionId, containerId] of this.containers.entries()) {
      try {
        await this.runDockerCommand(['stop', containerId]);
        if (!this.keepContainers) {
          await this.runDockerCommand(['rm', containerId]);
        }
      } catch (error) {
        console.error(`Error stopping container for action ${actionId}:`, error);
      }
    }
    
    this.containers.clear();
  }
  
  /**
   * Execute a code action in a Docker container
   * @param action The code action to execute
   * @returns The observation from executing the code
   */
  private async executeCodeAction(action: CodeExecutionAction): Promise<Observation> {
    const { code, language } = action;
    
    // Create a temporary file for the code
    const fileName = `code_${crypto.randomBytes(8).toString('hex')}.${this.getFileExtension(language)}`;
    const filePath = path.join(this.mountDir, fileName);
    
    try {
      // Write the code to the file
      fs.writeFileSync(filePath, code);
      
      // Create a container for the code
      const containerId = await this.createContainer(action.id);
      
      // Execute the code in the container
      const command = this.getExecutionCommand(language, fileName);
      const { output, exitCode } = await this.executeInContainer(containerId, command);
      
      return new CodeExecutionObservation(
        action.id,
        output,
        exitCode
      );
    } finally {
      // Clean up the temporary file
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
  
  /**
   * Execute a shell action in a Docker container
   * @param action The shell action to execute
   * @returns The observation from executing the shell command
   */
  private async executeShellAction(action: ShellCommandAction): Promise<Observation> {
    const { command } = action;
    
    // Create a container for the shell command
    const containerId = await this.createContainer(action.id);
    
    // Execute the shell command in the container
    const { output, exitCode } = await this.executeInContainer(containerId, command);
    
    return new ShellCommandObservation(
      action.id,
      output,
      exitCode
    );
  }
  
  /**
   * Create a Docker container for an action
   * @param actionId The ID of the action
   * @returns The ID of the created container
   */
  private async createContainer(actionId: string): Promise<string> {
    // Check if a container already exists for this action
    if (this.containers.has(actionId)) {
      return this.containers.get(actionId)!;
    }
    
    // Create resource limit arguments
    const resourceArgs: string[] = [];
    
    if (this.config.resourceLimits) {
      if (this.config.resourceLimits.cpuLimit) {
        resourceArgs.push('--cpus', this.config.resourceLimits.cpuLimit.toString());
      }
      
      if (this.config.resourceLimits.memoryLimit) {
        resourceArgs.push('--memory', `${this.config.resourceLimits.memoryLimit}m`);
      }
      
      if (this.config.resourceLimits.diskLimit) {
        resourceArgs.push('--storage-opt', `size=${this.config.resourceLimits.diskLimit}m`);
      }
    }
    
    // Create security option arguments
    const securityArgs: string[] = [];
    
    if (this.config.securityOptions) {
      if (this.config.securityOptions.allowNetwork === false) {
        securityArgs.push('--network', 'none');
      }
      
      // Add more security options as needed
    }
    
    // Create the container
    const containerName = `neuronest-${actionId.substring(0, 8)}`;
    const args = [
      'create',
      '--name', containerName,
      '-v', `${this.mountDir}:${this.workingDir}`,
      '-w', this.workingDir,
      ...resourceArgs,
      ...securityArgs,
      this.baseImage,
      'sh'
    ];
    
    const { output } = await this.runDockerCommand(args);
    const containerId = output.trim();
    
    // Start the container
    await this.runDockerCommand(['start', containerId]);
    
    // Store the container ID
    this.containers.set(actionId, containerId);
    
    return containerId;
  }
  
  /**
   * Execute a command in a Docker container
   * @param containerId The ID of the container
   * @param command The command to execute
   * @returns The output and exit code from the command
   */
  private async executeInContainer(
    containerId: string,
    command: string
  ): Promise<{ output: string; exitCode: number }> {
    const { output, exitCode } = await this.runDockerCommand(
      ['exec', containerId, 'sh', '-c', command],
      this.config.resourceLimits?.timeLimit
    );
    
    return { output, exitCode };
  }
  
  /**
   * Run a Docker command
   * @param args Arguments for the Docker command
   * @param timeout Optional timeout for the command
   * @returns The output and exit code from the command
   */
  private async runDockerCommand(
    args: string[],
    timeout?: number
  ): Promise<{ output: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      const docker = spawn('docker', args);
      
      let output = '';
      let error = '';
      let timeoutId: NodeJS.Timeout | null = null;
      
      docker.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      docker.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      docker.on('close', (code) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        if (code === 0) {
          resolve({ output, exitCode: code || 0 });
        } else {
          reject(new Error(`Docker command failed with code ${code}: ${error}`));
        }
      });
      
      docker.on('error', (err) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
        reject(err);
      });
      
      if (timeout) {
        timeoutId = setTimeout(() => {
          docker.kill();
          reject(new Error(`Docker command timed out after ${timeout}ms`));
        }, timeout);
      }
    });
  }
  
  /**
   * Get the file extension for a language
   * @param language The language
   * @returns The file extension
   */
  private getFileExtension(language: string): string {
    switch (language.toLowerCase()) {
      case 'javascript':
        return 'js';
      case 'typescript':
        return 'ts';
      case 'python':
        return 'py';
      case 'ruby':
        return 'rb';
      case 'php':
        return 'php';
      case 'java':
        return 'java';
      case 'c':
        return 'c';
      case 'cpp':
      case 'c++':
        return 'cpp';
      case 'csharp':
      case 'c#':
        return 'cs';
      case 'go':
        return 'go';
      case 'rust':
        return 'rs';
      case 'shell':
      case 'bash':
        return 'sh';
      default:
        return 'txt';
    }
  }
  
  /**
   * Get the command to execute code in a language
   * @param language The language
   * @param fileName The file name
   * @returns The execution command
   */
  private getExecutionCommand(language: string, fileName: string): string {
    switch (language.toLowerCase()) {
      case 'javascript':
        return `node ${fileName}`;
      case 'typescript':
        return `npx ts-node ${fileName}`;
      case 'python':
        return `python ${fileName}`;
      case 'ruby':
        return `ruby ${fileName}`;
      case 'php':
        return `php ${fileName}`;
      case 'java':
        return `javac ${fileName} && java ${fileName.replace('.java', '')}`;
      case 'c':
        return `gcc ${fileName} -o ${fileName.replace('.c', '')} && ./${fileName.replace('.c', '')}`;
      case 'cpp':
      case 'c++':
        return `g++ ${fileName} -o ${fileName.replace('.cpp', '')} && ./${fileName.replace('.cpp', '')}`;
      case 'csharp':
      case 'c#':
        return `dotnet run ${fileName}`;
      case 'go':
        return `go run ${fileName}`;
      case 'rust':
        return `rustc ${fileName} && ./${fileName.replace('.rs', '')}`;
      case 'shell':
      case 'bash':
        return `sh ${fileName}`;
      default:
        return `cat ${fileName}`;
    }
  }
}