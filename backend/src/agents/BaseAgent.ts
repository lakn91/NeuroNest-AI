import { AgentInterface, AgentConfig, AgentTool, AgentResponse } from './AgentInterface';
import { EventStream, DefaultEventStream } from './EventStream';
import { Action } from './Action';
import { Observation } from './Observation';
import { LLMProvider } from './LLMProvider';

/**
 * Base class for all agents in the system
 */
export abstract class BaseAgent implements AgentInterface {
  id: string;
  name: string;
  description: string;
  eventStream: EventStream;
  llmProvider: LLMProvider;
  protected config: AgentConfig;
  protected tools: AgentTool[] = [];
  protected systemMessage: string = '';
  
  /**
   * Create a new agent
   * @param eventStream The event stream for the agent
   * @param llmProvider The LLM provider for the agent
   */
  constructor(eventStream: EventStream, llmProvider: LLMProvider) {
    this.id = '';
    this.name = '';
    this.description = '';
    this.eventStream = eventStream;
    this.llmProvider = llmProvider;
    this.config = { id: '', name: '', description: '' };
  }
  
  /**
   * Initialize the agent
   * @param config Configuration for the agent
   */
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
  
  /**
   * Process an observation and generate an action
   * @param observation The observation to process
   * @returns The action to take
   */
  abstract process(observation: Observation): Promise<Action>;
  
  /**
   * Get the system message for the agent
   * @returns The system message
   */
  getSystemMessage(): string {
    return this.systemMessage;
  }
  
  /**
   * Get the tools available to the agent
   * @returns Array of tools
   */
  getTools(): AgentTool[] {
    return this.tools;
  }
  
  /**
   * Reset the agent's state
   */
  reset(): void {
    // Reset any stateful properties
  }
  
  /**
   * Legacy method for backward compatibility
   * @param message The message to process
   * @param context Additional context for the agent
   * @returns The agent's response
   * @deprecated Use process(observation) instead
   */
  async processMessage(message: string, context?: any): Promise<AgentResponse> {
    // Create an observation from the message
    const observation = Observation.createUserMessageObservation('user', message);
    
    // Add context to the observation if provided
    if (context) {
      observation.data.context = context;
    }
    
    // Process the observation
    const action = await this.process(observation);
    
    // Convert the action to a legacy response
    return this.actionToLegacyResponse(action);
  }
  
  /**
   * Legacy method for backward compatibility
   * @returns The agent's name
   * @deprecated Access name property directly
   */
  getName(): string {
    return this.name;
  }
  
  /**
   * Legacy method for backward compatibility
   * @returns The agent's description
   * @deprecated Access description property directly
   */
  getDescription(): string {
    return this.description;
  }
  
  /**
   * Convert an action to a legacy response
   * @param action The action to convert
   * @returns The legacy response
   */
  protected actionToLegacyResponse(action: Action): AgentResponse {
    const data = action.data;
    
    switch (data.type) {
      case 'text':
        return {
          type: 'text',
          content: data.content
        };
        
      case 'code':
        return {
          type: 'code',
          content: data.content,
          metadata: {
            language: data.language,
            filePath: data.filePath
          }
        };
        
      case 'error':
        return {
          type: 'error',
          content: data.error
        };
        
      case 'tool':
        return {
          type: 'execution',
          content: `Executing tool: ${data.toolName}`,
          metadata: {
            toolName: data.toolName,
            parameters: data.parameters,
            executionStatus: 'running'
          }
        };
        
      default:
        return {
          type: 'text',
          content: JSON.stringify(data)
        };
    }
  }
  
  /**
   * Create a text response (legacy helper)
   * @param content The text content
   * @returns An agent response with type 'text'
   * @deprecated Use Action.createTextAction instead
   */
  protected createTextResponse(content: string): AgentResponse {
    return {
      type: 'text',
      content
    };
  }
  
  /**
   * Create a code response (legacy helper)
   * @param content The code content
   * @param language The programming language
   * @param filePath Optional file path
   * @returns An agent response with type 'code'
   * @deprecated Use Action.createCodeAction instead
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
   * Create an error response (legacy helper)
   * @param content The error message
   * @returns An agent response with type 'error'
   * @deprecated Use Action.createErrorAction instead
   */
  protected createErrorResponse(content: string): AgentResponse {
    return {
      type: 'error',
      content
    };
  }
  
  /**
   * Create a thinking response (legacy helper)
   * @param content The thinking process
   * @returns An agent response with type 'thinking'
   * @deprecated Use appropriate Action creator instead
   */
  protected createThinkingResponse(content: string): AgentResponse {
    return {
      type: 'thinking',
      content
    };
  }
}