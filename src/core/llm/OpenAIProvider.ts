import { BaseLLMProvider, ChatMessage, CompletionOptions } from './LLMProvider';

/**
 * OpenAI provider configuration
 */
export interface OpenAIProviderConfig {
  /**
   * API key for OpenAI
   */
  apiKey: string;
  
  /**
   * Model to use for completions
   */
  model?: string;
  
  /**
   * Base URL for the API
   */
  baseUrl?: string;
  
  /**
   * Organization ID
   */
  organizationId?: string;
}

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends BaseLLMProvider {
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private organizationId?: string;
  
  constructor(config: OpenAIProviderConfig) {
    super('openai');
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-3.5-turbo';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.organizationId = config.organizationId;
  }
  
  /**
   * Generate a completion from OpenAI
   * @param prompt The prompt to send to OpenAI
   * @param options Options for the completion
   * @returns The generated completion
   */
  async generateCompletion(prompt: string, options?: CompletionOptions): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'user', content: prompt }
    ];
    
    const response = await this.generateChatCompletion(messages, options);
    return response.content;
  }
  
  /**
   * Generate a chat completion from OpenAI
   * @param messages The messages to send to OpenAI
   * @param options Options for the completion
   * @returns The generated completion
   */
  async generateChatCompletion(messages: ChatMessage[], options?: CompletionOptions): Promise<ChatMessage> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };
    
    if (this.organizationId) {
      headers['OpenAI-Organization'] = this.organizationId;
    }
    
    const requestBody: any = {
      model: this.model,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        ...(msg.name ? { name: msg.name } : {}),
        ...(msg.functionCall ? { function_call: {
          name: msg.functionCall.name,
          arguments: msg.functionCall.arguments
        } } : {})
      })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      top_p: options?.topP,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      stop: options?.stopSequences
    };
    
    if (options?.tools) {
      requestBody.tools = options.tools;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      const choice = data.choices[0];
      
      const result: ChatMessage = {
        role: 'assistant',
        content: choice.message.content || ''
      };
      
      if (choice.message.function_call) {
        result.functionCall = {
          name: choice.message.function_call.name,
          arguments: choice.message.function_call.arguments
        };
      }
      
      if (choice.message.tool_calls) {
        result.toolCalls = choice.message.tool_calls.map((toolCall: any) => ({
          id: toolCall.id,
          type: toolCall.type,
          function: {
            name: toolCall.function.name,
            arguments: toolCall.function.arguments
          }
        }));
      }
      
      return result;
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      throw error;
    }
  }
  
  /**
   * Generate embeddings for a text using OpenAI
   * @param text The text to generate embeddings for
   * @returns The generated embeddings
   */
  async generateEmbeddings(text: string): Promise<number[]> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };
    
    if (this.organizationId) {
      headers['OpenAI-Organization'] = this.organizationId;
    }
    
    try {
      const response = await fetch(`${this.baseUrl}/embeddings`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'text-embedding-ada-002',
          input: text
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
      }
      
      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw error;
    }
  }
}