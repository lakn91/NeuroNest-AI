import { AgentInterface, AgentResponse } from './AgentInterface';

/**
 * Base class for all agents in the system
 */
export abstract class BaseAgent implements AgentInterface {
  protected name: string;
  protected description: string;
  
  /**
   * Create a new agent
   * @param name The agent's name
   * @param description The agent's description
   */
  constructor(name: string, description: string) {
    this.name = name;
    this.description = description;
  }
  
  /**
   * Process a message and generate a response
   * @param message The message to process
   * @param context Additional context for the agent
   * @returns The agent's response
   */
  abstract process(message: string, context?: any): Promise<AgentResponse>;
  
  /**
   * Get the agent's name
   * @returns The agent's name
   */
  getName(): string {
    return this.name;
  }
  
  /**
   * Get the agent's description
   * @returns The agent's description
   */
  getDescription(): string {
    return this.description;
  }
  
  /**
   * Create a text response
   * @param content The text content
   * @returns An agent response with type 'text'
   */
  protected createTextResponse(content: string): AgentResponse {
    return {
      type: 'text',
      content
    };
  }
  
  /**
   * Create a code response
   * @param content The code content
   * @param language The programming language
   * @param filePath Optional file path
   * @returns An agent response with type 'code'
   */
  protected createCodeResponse(content: string, language: string, filePath?: string): AgentResponse {
    return {
      type: 'code',
      content,
      metadata: {
        language,
        filePath
      }
    };
  }
  
  /**
   * Create an error response
   * @param content The error message
   * @returns An agent response with type 'error'
   */
  protected createErrorResponse(content: string): AgentResponse {
    return {
      type: 'error',
      content
    };
  }
  
  /**
   * Create a thinking response
   * @param content The thinking process
   * @returns An agent response with type 'thinking'
   */
  protected createThinkingResponse(content: string): AgentResponse {
    return {
      type: 'thinking',
      content
    };
  }
}