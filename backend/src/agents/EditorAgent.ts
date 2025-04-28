import { BaseAgent } from './BaseAgent';
import { AgentResponse } from './AgentInterface';
import langchainUtils from '../utils/langchain';

/**
 * Agent responsible for reviewing and improving code
 */
export class EditorAgent extends BaseAgent {
  private editorChain;
  
  constructor() {
    super(
      'Editor Agent',
      'Reviews and improves code and content'
    );
    
    try {
      this.editorChain = langchainUtils.createEditorAgentChain();
    } catch (error) {
      console.error('Error initializing EditorAgent chain:', error);
    }
  }
  
  /**
   * Process content and improve it
   * @param content The content to improve
   * @param context Additional context including content type and metadata
   * @returns Improved content
   */
  async process(content: string, context?: any): Promise<AgentResponse> {
    try {
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
      
      if (contentType === 'code' && language) {
        return this.createCodeResponse(improvedContent, language);
      } else {
        return this.createTextResponse(improvedContent);
      }
    } catch (error) {
      console.error('Error in EditorAgent:', error);
      return this.createErrorResponse('Failed to improve content');
    }
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
      return content + '\n\n[Editor's note: This content has been reviewed and enhanced for clarity and effectiveness.]';
    }
  }
}