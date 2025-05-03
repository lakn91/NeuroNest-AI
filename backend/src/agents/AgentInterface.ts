import { EventStream } from './EventStream';
import { Action } from './Action';
import { Observation } from './Observation';
import { LLMProvider } from './LLMProvider';

/**
 * Agent interface representing an AI agent in the system
 */
export interface AgentInterface {
  /**
   * Unique identifier for the agent
   */
  id: string;
  
  /**
   * Name of the agent
   */
  name: string;
  
  /**
   * Description of the agent
   */
  description: string;
  
  /**
   * The event stream used by the agent
   */
  eventStream: EventStream;
  
  /**
   * The LLM provider used by the agent
   */
  llmProvider: LLMProvider;
  
  /**
   * Initialize the agent
   * @param config Configuration for the agent
   */
  initialize(config: AgentConfig): Promise<void>;
  
  /**
   * Process an observation and generate an action
   * @param observation The observation to process
   * @returns The action to take
   */
  process(observation: Observation): Promise<Action>;
  
  /**
   * Get the system message for the agent
   * @returns The system message
   */
  getSystemMessage(): string;
  
  /**
   * Get the tools available to the agent
   * @returns Array of tools
   */
  getTools(): AgentTool[];
  
  /**
   * Reset the agent's state
   */
  reset(): void;
  
  /**
   * Legacy method for backward compatibility
   * @param message The message to process
   * @param context Additional context for the agent
   * @returns The agent's response
   * @deprecated Use process(observation) instead
   */
  processMessage?(message: string, context?: any): Promise<AgentResponse>;
  
  /**
   * Legacy method for backward compatibility
   * @returns The agent's name
   * @deprecated Access name property directly
   */
  getName?(): string;
  
  /**
   * Legacy method for backward compatibility
   * @returns The agent's description
   * @deprecated Access description property directly
   */
  getDescription?(): string;
}

/**
 * Configuration for an agent
 */
export interface AgentConfig {
  /**
   * Unique identifier for the agent
   */
  id: string;
  
  /**
   * Name of the agent
   */
  name: string;
  
  /**
   * Description of the agent
   */
  description: string;
  
  /**
   * System message for the agent
   */
  systemMessage?: string;
  
  /**
   * Tools available to the agent
   */
  tools?: AgentTool[];
  
  /**
   * Additional configuration options
   */
  [key: string]: any;
}

/**
 * Tool available to an agent
 */
export interface AgentTool {
  /**
   * Name of the tool
   */
  name: string;
  
  /**
   * Description of the tool
   */
  description: string;
  
  /**
   * Parameters for the tool
   */
  parameters: Record<string, any>;
  
  /**
   * Function to execute the tool
   * @param params Parameters for the tool
   * @returns Result of the tool execution
   */
  execute(params: Record<string, any>): Promise<any>;
}

/**
 * Response from an agent (legacy format)
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