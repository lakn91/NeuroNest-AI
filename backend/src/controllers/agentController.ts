import { Request, Response } from 'express';
import { OrchestratorAgent } from '../agents';

// Create a singleton instance of the orchestrator
const orchestrator = new OrchestratorAgent();

/**
 * Process a message through the agent system
 * @param req Express request
 * @param res Express response
 */
export const processMessage = async (req: Request, res: Response) => {
  try {
    const { message, context } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Extract API settings from headers or context
    const apiSettings = {
      provider: req.headers['x-ai-provider'] as string || context?.apiSettings?.provider || process.env.DEFAULT_AI_PROVIDER || 'gemini',
      apiKey: req.headers['x-api-key'] as string || context?.apiSettings?.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY
    };
    
    // Add API settings to context
    const enrichedContext = {
      ...context,
      apiSettings
    };
    
    const responses = await orchestrator.process(message, enrichedContext);
    
    return res.status(200).json({ responses });
  } catch (error) {
    console.error('Error processing message:', error);
    return res.status(500).json({ error: 'Failed to process message' });
  }
};

/**
 * Get information about available agents
 * @param req Express request
 * @param res Express response
 */
export const getAgents = (req: Request, res: Response) => {
  try {
    const agents = [
      {
        name: orchestrator.getName(),
        description: orchestrator.getDescription()
      }
    ];
    
    return res.status(200).json({ agents });
  } catch (error) {
    console.error('Error getting agents:', error);
    return res.status(500).json({ error: 'Failed to get agents' });
  }
};

/**
 * Get supported AI providers
 * @param req Express request
 * @param res Express response
 */
export const getProviders = (req: Request, res: Response) => {
  try {
    const providers = [
      {
        id: 'gemini',
        name: 'Google Gemini',
        description: 'Google\'s Gemini AI model',
        requiresApiKey: true,
        apiKeyUrl: 'https://ai.google.dev/'
      },
      {
        id: 'openai',
        name: 'OpenAI',
        description: 'OpenAI\'s GPT models',
        requiresApiKey: true,
        apiKeyUrl: 'https://platform.openai.com/api-keys'
      }
    ];
    
    return res.status(200).json({ providers });
  } catch (error) {
    console.error('Error getting providers:', error);
    return res.status(500).json({ error: 'Failed to get providers' });
  }
};