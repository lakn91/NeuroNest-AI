import { Action } from '../events/Action';
import { Observation } from '../events/Observation';
import { EventStream } from '../events/EventStream';
import { LLMProvider } from '../llm/LLMProvider';

/**
 * Agent interface representing an AI agent in the system
 */
export interface Agent {
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
 * Base class for all agents in the system
 */
export abstract class BaseAgent implements Agent {
  id: string;
  name: string;
  description: string;
  eventStream: EventStream;
  llmProvider: LLMProvider;
  protected config: AgentConfig;
  protected tools: AgentTool[] = [];
  protected systemMessage: string = '';
  
  constructor(eventStream: EventStream, llmProvider: LLMProvider) {
    this.id = '';
    this.name = '';
    this.description = '';
    this.eventStream = eventStream;
    this.llmProvider = llmProvider;
    this.config = { id: '', name: '', description: '' };
  }
  
  async initialize(config: AgentConfig): Promise<void> {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.config = config;
    
    if (config.systemMessage) {
      this.systemMessage = config.systemMessage;
    }
    
    if (config.tools) {
      this.tools = config.tools;
    }
  }
  
  abstract process(observation: Observation): Promise<Action>;
  
  getSystemMessage(): string {
    return this.systemMessage;
  }
  
  getTools(): AgentTool[] {
    return this.tools;
  }
  
  reset(): void {
    // Reset any stateful properties
  }
}