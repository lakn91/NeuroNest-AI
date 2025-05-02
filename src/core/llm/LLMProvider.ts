/**
 * Interface for LLM providers
 */
export interface LLMProvider {
  /**
   * Name of the provider
   */
  name: string;
  
  /**
   * Generate a completion from the LLM
   * @param prompt The prompt to send to the LLM
   * @param options Options for the completion
   * @returns The generated completion
   */
  generateCompletion(prompt: string, options?: CompletionOptions): Promise<string>;
  
  /**
   * Generate a chat completion from the LLM
   * @param messages The messages to send to the LLM
   * @param options Options for the completion
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
  stopSequences?: string[];
  
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
   * Tools available for the completion
   */
  tools?: any[];
  
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
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  
  /**
   * Content of the message
   */
  content: string;
  
  /**
   * Name of the sender (optional)
   */
  name?: string;
  
  /**
   * Function call (optional)
   */
  functionCall?: {
    name: string;
    arguments: string;
  };
  
  /**
   * Tool calls (optional)
   */
  toolCalls?: {
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }[];
}

/**
 * Base class for LLM providers
 */
export abstract class BaseLLMProvider implements LLMProvider {
  name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  abstract generateCompletion(prompt: string, options?: CompletionOptions): Promise<string>;
  abstract generateChatCompletion(messages: ChatMessage[], options?: CompletionOptions): Promise<ChatMessage>;
  abstract generateEmbeddings(text: string): Promise<number[]>;
}