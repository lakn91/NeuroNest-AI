import { LLMProvider } from '../agents/LLMProvider';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

/**
 * OpenAI LLM provider implementation
 */
export class OpenAIProvider implements LLMProvider {
  private model: ChatOpenAI;
  
  constructor(config: { apiKey: string, modelName?: string, temperature?: number }) {
    this.model = new ChatOpenAI({
      openAIApiKey: config.apiKey,
      modelName: config.modelName || 'gpt-3.5-turbo',
      temperature: config.temperature || 0.7,
    });
  }
  
  async generateChatCompletion(messages: any[]): Promise<{ content: string }> {
    try {
      const response = await this.model.invoke(messages);
      return { content: response.content };
    } catch (error) {
      console.error('Error generating chat completion with OpenAI:', error);
      throw error;
    }
  }
}

/**
 * Google Gemini LLM provider implementation
 */
export class GeminiProvider implements LLMProvider {
  private model: ChatGoogleGenerativeAI;
  
  constructor(config: { apiKey: string, modelName?: string, temperature?: number }) {
    this.model = new ChatGoogleGenerativeAI({
      apiKey: config.apiKey,
      modelName: config.modelName || 'gemini-pro',
      temperature: config.temperature || 0.7,
    });
  }
  
  async generateChatCompletion(messages: any[]): Promise<{ content: string }> {
    try {
      const response = await this.model.invoke(messages);
      return { content: response.content };
    } catch (error) {
      console.error('Error generating chat completion with Gemini:', error);
      throw error;
    }
  }
}

/**
 * Factory function to create an LLM provider based on provider name
 * @param provider The provider name
 * @param apiKey The API key
 * @param options Additional options
 * @returns The LLM provider
 */
export function createLLMProvider(
  provider: string,
  apiKey: string,
  options?: { modelName?: string, temperature?: number }
): LLMProvider {
  switch (provider.toLowerCase()) {
    case 'openai':
      return new OpenAIProvider({
        apiKey,
        modelName: options?.modelName,
        temperature: options?.temperature
      });
    case 'gemini':
      return new GeminiProvider({
        apiKey,
        modelName: options?.modelName,
        temperature: options?.temperature
      });
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}