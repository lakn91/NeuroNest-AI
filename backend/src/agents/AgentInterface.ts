/**
 * Base interface for all agents in the system
 */
export interface AgentInterface {
  /**
   * Process a message and generate a response
   * @param message The message to process
   * @param context Additional context for the agent
   * @returns The agent's response
   */
  process(message: string, context?: any): Promise<AgentResponse>;
  
  /**
   * Get the agent's name
   * @returns The agent's name
   */
  getName(): string;
  
  /**
   * Get the agent's description
   * @returns The agent's description
   */
  getDescription(): string;
}

/**
 * Response from an agent
 */
export interface AgentResponse {
  /**
   * The type of response
   */
  type: 'text' | 'code' | 'error' | 'thinking' | 'plan' | 'execution';
  
  /**
   * The content of the response
   */
  content: string | object;
  
  /**
   * Optional metadata about the response
   */
  metadata?: {
    /**
     * The language of the code (if type is 'code')
     */
    language?: string;
    
    /**
     * The file path (if type is 'code')
     */
    filePath?: string;
    
    /**
     * The execution status (if type is 'execution')
     */
    executionStatus?: 'success' | 'error' | 'running';
    
    /**
     * Any additional metadata
     */
    [key: string]: any;
  };
}