import { BaseAgent, AgentTool } from './Agent';
import { Action, CodeExecutionAction, ShellCommandAction, FileOperationAction } from '../events/Action';
import { Observation } from '../events/Observation';
import { EventStream } from '../events/EventStream';
import { LLMProvider, ChatMessage } from '../llm/LLMProvider';

/**
 * Agent specialized for software development tasks
 */
export class DeveloperAgent extends BaseAgent {
  private codeContext: string[] = [];
  
  constructor(eventStream: EventStream, llmProvider: LLMProvider) {
    super(eventStream, llmProvider);
    this.systemMessage = `You are a developer agent specialized in writing high-quality code and solving programming problems.
Your role is to help users with coding tasks, debugging, and software development.
When you receive a task:
1. Understand the requirements thoroughly
2. Plan your approach before writing code
3. Write clean, efficient, and well-documented code
4. Test your code and fix any issues
5. Explain your solution clearly

You can execute code, run shell commands, and perform file operations to complete tasks.
Always follow best practices for the programming language you're working with.`;
    
    // Set up developer tools
    this.tools = this.createDeveloperTools();
  }
  
  /**
   * Process an observation and generate a development action
   * @param observation The observation to process
   * @returns An action for development
   */
  async process(observation: Observation): Promise<Action> {
    // Create messages for the LLM
    const messages: ChatMessage[] = [
      { role: 'system', content: this.getSystemMessage() }
    ];
    
    // Add code context if available
    if (this.codeContext.length > 0) {
      messages.push({
        role: 'system',
        content: `Current code context:\n${this.codeContext.join('\n\n')}`
      });
    }
    
    // Add the current observation
    messages.push({
      role: 'user',
      content: `Please help with the following development task:\n${JSON.stringify(observation)}`
    });
    
    // Generate a response using the LLM
    const response = await this.llmProvider.generateChatCompletion(messages, {
      tools: this.getTools().map(tool => ({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters
        }
      }))
    });
    
    // Handle tool calls
    if (response.toolCalls && response.toolCalls.length > 0) {
      const toolCall = response.toolCalls[0];
      const tool = this.getTools().find(t => t.name === toolCall.function.name);
      
      if (tool) {
        const params = JSON.parse(toolCall.function.arguments);
        
        // Update code context
        this.updateCodeContext(tool.name, params);
        
        // Create the appropriate action based on the tool
        switch (tool.name) {
          case 'executeCode':
            return new CodeExecutionAction(
              params.code,
              params.language,
              this.id
            );
          
          case 'executeShellCommand':
            return new ShellCommandAction(
              params.command,
              this.id
            );
          
          case 'readFile':
            return new FileOperationAction(
              'read',
              params.path,
              undefined,
              this.id
            );
          
          case 'writeFile':
            return new FileOperationAction(
              'write',
              params.path,
              params.content,
              this.id
            );
          
          case 'listFiles':
            return new FileOperationAction(
              'list',
              params.path,
              undefined,
              this.id
            );
        }
      }
    }
    
    // If no tool was called, return a code execution action with the response content
    return new CodeExecutionAction(
      response.content,
      'javascript',
      this.id
    );
  }
  
  /**
   * Create tools for the developer agent
   * @returns Array of developer tools
   */
  private createDeveloperTools(): AgentTool[] {
    return [
      {
        name: 'executeCode',
        description: 'Execute code in a specified language',
        parameters: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'The code to execute'
            },
            language: {
              type: 'string',
              description: 'The programming language of the code',
              enum: ['javascript', 'typescript', 'python', 'ruby', 'php', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'shell']
            }
          },
          required: ['code', 'language']
        },
        execute: async (params) => {
          // This is handled by the process method
          return { success: true };
        }
      },
      {
        name: 'executeShellCommand',
        description: 'Execute a shell command',
        parameters: {
          type: 'object',
          properties: {
            command: {
              type: 'string',
              description: 'The shell command to execute'
            }
          },
          required: ['command']
        },
        execute: async (params) => {
          // This is handled by the process method
          return { success: true };
        }
      },
      {
        name: 'readFile',
        description: 'Read the contents of a file',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path to the file'
            }
          },
          required: ['path']
        },
        execute: async (params) => {
          // This is handled by the process method
          return { success: true };
        }
      },
      {
        name: 'writeFile',
        description: 'Write content to a file',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path to the file'
            },
            content: {
              type: 'string',
              description: 'The content to write to the file'
            }
          },
          required: ['path', 'content']
        },
        execute: async (params) => {
          // This is handled by the process method
          return { success: true };
        }
      },
      {
        name: 'listFiles',
        description: 'List files in a directory',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path to the directory'
            }
          },
          required: ['path']
        },
        execute: async (params) => {
          // This is handled by the process method
          return { success: true };
        }
      }
    ];
  }
  
  /**
   * Update the code context based on the tool used
   * @param toolName The name of the tool
   * @param params The parameters for the tool
   */
  private updateCodeContext(toolName: string, params: any): void {
    switch (toolName) {
      case 'executeCode':
        this.codeContext.push(`Code (${params.language}):\n${params.code}`);
        break;
      
      case 'readFile':
        this.codeContext.push(`File read: ${params.path}`);
        break;
      
      case 'writeFile':
        this.codeContext.push(`File written: ${params.path}\nContent:\n${params.content}`);
        break;
    }
    
    // Limit the context size
    if (this.codeContext.length > 5) {
      this.codeContext = this.codeContext.slice(this.codeContext.length - 5);
    }
  }
  
  /**
   * Reset the agent's state
   */
  reset(): void {
    this.codeContext = [];
  }
  
  /**
   * Get the current code context
   * @returns The code context
   */
  getCodeContext(): string[] {
    return [...this.codeContext];
  }
}