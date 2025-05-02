import { BaseAgent, AgentTool } from './Agent';
import { Action, MessageAction, FileOperationAction } from '../events/Action';
import { Observation } from '../events/Observation';
import { EventStream } from '../events/EventStream';
import { LLMProvider, ChatMessage } from '../llm/LLMProvider';

/**
 * Agent specialized for text editing and content creation
 */
export class EditorAgent extends BaseAgent {
  private editHistory: string[] = [];
  
  constructor(eventStream: EventStream, llmProvider: LLMProvider) {
    super(eventStream, llmProvider);
    this.systemMessage = `You are an editor agent specialized in improving and creating text content.
Your role is to help users with writing, editing, and refining text.
When you receive content to edit:
1. Improve clarity and readability
2. Fix grammar and spelling errors
3. Enhance structure and organization
4. Adjust tone and style as needed
5. Provide constructive feedback

You can read and write files to complete editing tasks.
Always maintain the original meaning while improving the quality of the text.`;
    
    // Set up editor tools
    this.tools = this.createEditorTools();
  }
  
  /**
   * Process an observation and generate an editing action
   * @param observation The observation to process
   * @returns An action for editing
   */
  async process(observation: Observation): Promise<Action> {
    // Create messages for the LLM
    const messages: ChatMessage[] = [
      { role: 'system', content: this.getSystemMessage() }
    ];
    
    // Add edit history if available
    if (this.editHistory.length > 0) {
      messages.push({
        role: 'system',
        content: `Recent edit history:\n${this.editHistory.join('\n\n')}`
      });
    }
    
    // Add the current observation
    messages.push({
      role: 'user',
      content: `Please help with the following editing task:\n${JSON.stringify(observation)}`
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
        
        // Update edit history
        this.updateEditHistory(tool.name, params);
        
        // Create the appropriate action based on the tool
        switch (tool.name) {
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
          
          case 'editText':
            // For editText, we return a message with the edited content
            return new MessageAction(
              `Edited text:\n\n${params.editedText}`,
              this.id
            );
        }
      }
    }
    
    // If no tool was called, return a message action with the response content
    return new MessageAction(response.content, this.id);
  }
  
  /**
   * Create tools for the editor agent
   * @returns Array of editor tools
   */
  private createEditorTools(): AgentTool[] {
    return [
      {
        name: 'readFile',
        description: 'Read the contents of a file for editing',
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
        description: 'Write edited content to a file',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The path to the file'
            },
            content: {
              type: 'string',
              description: 'The edited content to write to the file'
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
        name: 'editText',
        description: 'Edit and improve text content',
        parameters: {
          type: 'object',
          properties: {
            originalText: {
              type: 'string',
              description: 'The original text to edit'
            },
            editedText: {
              type: 'string',
              description: 'The edited and improved text'
            },
            editNotes: {
              type: 'string',
              description: 'Notes explaining the changes made'
            }
          },
          required: ['originalText', 'editedText']
        },
        execute: async (params) => {
          // This is handled by the process method
          return { success: true };
        }
      }
    ];
  }
  
  /**
   * Update the edit history based on the tool used
   * @param toolName The name of the tool
   * @param params The parameters for the tool
   */
  private updateEditHistory(toolName: string, params: any): void {
    switch (toolName) {
      case 'writeFile':
        this.editHistory.push(`File edited: ${params.path}`);
        break;
      
      case 'editText':
        const notes = params.editNotes || 'No notes provided';
        this.editHistory.push(`Text edited. Notes: ${notes}`);
        break;
    }
    
    // Limit the history size
    if (this.editHistory.length > 5) {
      this.editHistory = this.editHistory.slice(this.editHistory.length - 5);
    }
  }
  
  /**
   * Reset the agent's state
   */
  reset(): void {
    this.editHistory = [];
  }
  
  /**
   * Get the edit history
   * @returns The edit history
   */
  getEditHistory(): string[] {
    return [...this.editHistory];
  }
  
  /**
   * Edit text content
   * @param text The text to edit
   * @param instructions Optional editing instructions
   * @returns The edited text
   */
  async editText(text: string, instructions?: string): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: this.getSystemMessage() },
      { 
        role: 'user', 
        content: `Please edit the following text${instructions ? ` according to these instructions: ${instructions}` : ''}:\n\n${text}` 
      }
    ];
    
    const response = await this.llmProvider.generateChatCompletion(messages);
    
    // Update edit history
    this.editHistory.push(`Text edited${instructions ? ` with instructions: ${instructions}` : ''}`);
    
    // Limit the history size
    if (this.editHistory.length > 5) {
      this.editHistory = this.editHistory.slice(this.editHistory.length - 5);
    }
    
    return response.content;
  }
}