import { BaseAgent } from './BaseAgent';
import { AgentResponse, AgentConfig } from './AgentInterface';
import { EventStream } from './EventStream';
import { LLMProvider } from './LLMProvider';
import { Action } from './Action';
import { Observation } from './Observation';
import langchainUtils from '../utils/langchain';

/**
 * Agent responsible for reviewing and improving code
 */
export class EditorAgent extends BaseAgent {
  private editorChain;
  
  /**
   * Create a new EditorAgent
   * @param eventStream The event stream for the agent
   * @param llmProvider The LLM provider for the agent
   */
  constructor(eventStream: EventStream, llmProvider: LLMProvider) {
    super(eventStream, llmProvider);
    
    try {
      this.editorChain = langchainUtils.createEditorAgentChain();
    } catch (error) {
      console.error('Error initializing EditorAgent chain:', error);
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
      this.systemMessage = `You are a senior software editor specializing in code review and improvement.
Your task is to review and improve code or content provided to you.

Guidelines for code review:
1. Improve code quality, readability, and maintainability
2. Fix any bugs or potential issues
3. Add appropriate comments to explain complex logic
4. Optimize performance where possible
5. Ensure proper error handling
6. Follow best practices for the specified language

Guidelines for text review:
1. Improve clarity and readability
2. Fix grammar and spelling errors
3. Enhance structure and organization
4. Ensure consistency in tone and style

Provide the improved version along with a brief explanation of the changes made.`;
    }
  }
  
  /**
   * Process an observation and generate an action
   * @param observation The observation to process
   * @returns The action to take
   */
  async process(observation: Observation): Promise<Action> {
    try {
      // Extract content and context from observation
      let content = '';
      let context: any = {};
      
      if (observation.data.type === 'code') {
        content = observation.data.content;
        context = {
          type: 'code',
          language: observation.data.language
        };
      } else if (observation.data.type === 'text') {
        content = observation.data.content;
        context = {
          type: 'text'
        };
      } else if (observation.data.type === 'user_message') {
        content = observation.data.message;
        context = observation.data.context || {};
      } else {
        // For other observation types, convert to string
        content = JSON.stringify(observation.data);
        context = { type: 'text' };
      }
      
      const contentType = context?.type || 'code';
      const language = context?.language;
      
      let improvedContent: string;
      
      // Use LangChain if available, otherwise use mock improvement
      if (this.editorChain) {
        try {
          improvedContent = await this.editorChain.invoke({
            input: content,
            contentType: contentType
          });
        } catch (langchainError) {
          console.error('Error using LangChain:', langchainError);
          improvedContent = this.improveMockContent(content, contentType);
        }
      } else {
        improvedContent = this.improveMockContent(content, contentType);
      }
      
      // Create the appropriate action based on content type
      if (contentType === 'code' && language) {
        return Action.createCodeAction(this.id, improvedContent, language);
      } else {
        return Action.createTextAction(this.id, improvedContent);
      }
    } catch (error) {
      console.error('Error in EditorAgent:', error);
      return Action.createErrorAction(this.id, 'Failed to improve content');
    }
  }
  
  /**
   * Legacy method for backward compatibility
   * @param content The content to improve
   * @param context Additional context including content type and metadata
   * @returns Improved content
   * @deprecated Use process(observation) instead
   */
  async processMessage(content: string, context?: any): Promise<AgentResponse> {
    // Create an observation based on the content type
    let observation: Observation;
    
    const contentType = context?.type || 'code';
    const language = context?.language;
    
    if (contentType === 'code' && language) {
      observation = Observation.createCodeObservation('user', content, language);
    } else {
      observation = Observation.createTextObservation('user', content);
    }
    
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
   * Improve mock content for demonstration purposes
   * @param content The original content
   * @param contentType The type of content
   * @returns Improved content
   */
  private improveMockContent(content: string, contentType: string): string {
    if (contentType === 'code') {
      // Add comments to the code
      const lines = content.split('\n');
      const improvedLines = lines.map(line => {
        // Add a comment to empty lines or closing brackets
        if (line.trim() === '' || line.trim() === '}' || line.trim() === '</div>') {
          return line;
        }
        
        // Don't add comments to lines that already have comments
        if (line.includes('//') || line.includes('/*') || line.includes('*/') || line.includes('<!--')) {
          return line;
        }
        
        // Randomly decide whether to add a comment (20% chance)
        if (Math.random() < 0.2) {
          if (line.includes('<')) {
            // HTML comment
            return line + ' <!-- Improved element -->';
          } else if (line.includes('{')) {
            // CSS or JS comment
            return line + ' // Enhanced structure';
          }
        }
        
        return line;
      });
      
      return improvedLines.join('\n');
    } else {
      // For text content, add some improvements
      return content + '\n\n[Editor\'s note: This content has been reviewed and enhanced for clarity and effectiveness.]';
    }
  }
}