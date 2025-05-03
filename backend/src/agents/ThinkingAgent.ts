import { BaseAgent } from './BaseAgent';
import { AgentResponse, AgentConfig } from './AgentInterface';
import { EventStream } from './EventStream';
import { LLMProvider } from './LLMProvider';
import { Action } from './Action';
import { Observation } from './Observation';
import langchainUtils from '../utils/langchain';

/**
 * Agent responsible for analyzing requests and creating execution plans
 */
export class ThinkingAgent extends BaseAgent {
  private thinkingChain;
  
  /**
   * Create a new ThinkingAgent
   * @param eventStream The event stream for the agent
   * @param llmProvider The LLM provider for the agent
   */
  constructor(eventStream: EventStream, llmProvider: LLMProvider) {
    super(eventStream, llmProvider);
    
    try {
      this.thinkingChain = langchainUtils.createThinkingAgentChain();
    } catch (error) {
      console.error('Error initializing ThinkingAgent chain:', error);
    }
  }
  
  /**
   * Initialize the agent
   * @param config Configuration for the agent
   */
  async initialize(config: AgentConfig): Promise<void> {
    await super.initialize(config);
    
    // Set default system message if not provided
    if (!this.systemMessage) {
      this.systemMessage = `You are the Thinking Agent, responsible for analyzing user requests and creating execution plans.
Your role is to break down complex tasks into smaller, manageable steps that other agents can execute.
You should consider the capabilities of other agents in the system when creating your plans.`;
    }
  }
  
  /**
   * Process an observation and generate an action
   * @param observation The observation to process
   * @returns The action to take
   */
  async process(observation: Observation): Promise<Action> {
    try {
      // Extract message from observation
      let message = '';
      let context = {};
      
      if (observation.data.type === 'user_message') {
        message = observation.data.message;
        context = observation.data.context || {};
      } else if (observation.data.type === 'text') {
        message = observation.data.content;
        context = observation.data.context || {};
      } else {
        // For other observation types, convert to string
        message = JSON.stringify(observation.data);
      }
      
      let plan: any;
      
      // Use LangChain if available, otherwise use mock plan
      if (this.thinkingChain) {
        try {
          const result = await this.thinkingChain.invoke({
            input: message,
          });
          
          // Parse the result as JSON
          plan = JSON.parse(result);
          
          // Add the original request to the plan
          plan.originalRequest = message;
        } catch (langchainError) {
          console.error('Error using LangChain:', langchainError);
          plan = this.createMockPlan(message);
        }
      } else {
        plan = this.createMockPlan(message);
      }
      
      // Create an action with the plan
      return new Action(this.id, {
        type: 'plan',
        content: plan
      });
    } catch (error) {
      console.error('Error in ThinkingAgent:', error);
      return Action.createErrorAction(this.id, 'Failed to analyze request and create plan');
    }
  }
  
  /**
   * Legacy method for backward compatibility
   * @param message The message to process
   * @param context Additional context
   * @returns A plan for executing the request
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
    if (action.data.type === 'plan') {
      return {
        type: 'plan',
        content: action.data.content
      };
    } else {
      return this.actionToLegacyResponse(action);
    }
  }
  
  /**
   * Create a mock plan for demonstration purposes
   * @param message The user message
   * @returns A mock plan
   */
  private createMockPlan(message: string): object {
    return {
      originalRequest: message,
      analysis: "The user wants to create a simple web application.",
      steps: [
        {
          id: 1,
          description: "Create HTML structure",
          agent: "DeveloperAgent",
          params: { language: "html" }
        },
        {
          id: 2,
          description: "Add CSS styling",
          agent: "DeveloperAgent",
          params: { language: "css" }
        },
        {
          id: 3,
          description: "Implement JavaScript functionality",
          agent: "DeveloperAgent",
          params: { language: "javascript" }
        },
        {
          id: 4,
          description: "Review and improve code",
          agent: "EditorAgent",
          params: {}
        }
      ]
    };
  }
}