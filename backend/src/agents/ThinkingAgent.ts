import { BaseAgent } from './BaseAgent';
import { AgentResponse } from './AgentInterface';
import langchainUtils from '../utils/langchain';

/**
 * Agent responsible for analyzing requests and creating execution plans
 */
export class ThinkingAgent extends BaseAgent {
  private thinkingChain;
  
  constructor() {
    super(
      'Thinking Agent',
      'Analyzes requests and creates execution plans'
    );
    
    try {
      this.thinkingChain = langchainUtils.createThinkingAgentChain();
    } catch (error) {
      console.error('Error initializing ThinkingAgent chain:', error);
    }
  }
  
  /**
   * Process a message and generate a plan
   * @param message The message to process
   * @param context Additional context
   * @returns A plan for executing the request
   */
  async process(message: string, context?: any): Promise<AgentResponse> {
    try {
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
      
      return {
        type: 'plan',
        content: plan
      };
    } catch (error) {
      console.error('Error in ThinkingAgent:', error);
      return this.createErrorResponse('Failed to analyze request and create plan');
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