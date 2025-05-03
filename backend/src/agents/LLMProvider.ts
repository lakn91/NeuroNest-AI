/**
 * Interface for LLM providers
 */
export interface LLMProvider {
  /**
   * Generate a completion from the LLM
   * @param prompt The prompt to send to the LLM
   * @param options Additional options for the completion
   * @returns The generated completion
   */
  generateCompletion(prompt: string, options?: CompletionOptions): Promise<string>;
  
  /**
   * Generate a chat completion from the LLM
   * @param messages The messages to send to the LLM
   * @param options Additional options for the completion
   * @returns The generated completion
   */
  generateChatCompletion(messages: ChatMessage[], options?: CompletionOptions): Promise<ChatMessage>;
  
  /**
   * Generate embeddings for a text
   * @param text The text to generate embeddings for
   * @returns The generated embeddings
   */
  generateEmbeddings(text: string): Promise<number[]>;
}

/**
 * Options for completions
 */
export interface CompletionOptions {
  /**
   * Temperature for the completion
   */
  temperature?: number;
  
  /**
   * Maximum number of tokens to generate
   */
  maxTokens?: number;
  
  /**
   * Stop sequences for the completion
   */
  stop?: string[];
  
  /**
   * Top-p value for the completion
   */
  topP?: number;
  
  /**
   * Frequency penalty for the completion
   */
  frequencyPenalty?: number;
  
  /**
   * Presence penalty for the completion
   */
  presencePenalty?: number;
  
  /**
   * Additional options
   */
  [key: string]: any;
}

/**
 * Chat message for chat completions
 */
export interface ChatMessage {
  /**
   * Role of the message sender
   */
  role: 'system' | 'user' | 'assistant' | 'function';
  
  /**
   * Content of the message
   */
  content: string;
  
  /**
   * Name of the sender (optional)
   */
  name?: string;
  
  /**
   * Function call (if role is 'function')
   */
  functionCall?: {
    /**
     * Name of the function
     */
    name: string;
    
    /**
     * Arguments for the function
     */
    arguments: string;
  };
}