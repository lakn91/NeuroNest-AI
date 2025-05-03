import { Request, Response } from 'express';
import { 
  OrchestratorAgent, 
  DefaultEventStream, 
  AgentRegistry, 
  Observation,
  ThinkingAgent,
  DeveloperAgent,
  EditorAgent,
  LLMProvider
} from '../agents';
import { createLLMProvider } from '../services/llmService';

// Create a default LLM provider
const defaultLLMProvider: LLMProvider = {
  generateChatCompletion: async (messages: any[]) => {
    // This is a placeholder that will be replaced with actual API calls
    // based on the provider and API key from the request
    return {
      content: "This is a placeholder response. Please provide an API key for actual AI responses."
    };
  }
};

// Initialize the agent registry
const registry = AgentRegistry.getInstance();

// Register agent types
registry.registerAgentType('thinking', (es, llm) => new ThinkingAgent(es, llm));
registry.registerAgentType('developer', (es, llm) => new DeveloperAgent(es, llm));
registry.registerAgentType('editor', (es, llm) => new EditorAgent(es, llm));
registry.registerAgentType('orchestrator', (es, llm) => new OrchestratorAgent(es, llm));

// Create a singleton instance of the orchestrator
let orchestrator: OrchestratorAgent;

/**
 * Get or create the orchestrator agent
 */
const getOrchestrator = async () => {
  if (!orchestrator) {
    const eventStream = new DefaultEventStream();
    orchestrator = await registry.createAgent(
      'orchestrator',
      { 
        id: 'main-orchestrator', 
        name: 'Orchestrator Agent', 
        description: 'Coordinates between agents and manages workflow' 
      },
      eventStream,
      defaultLLMProvider
    ) as OrchestratorAgent;
  }
  return orchestrator;
};

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
      apiKey: req.headers['x-api-key'] as string || context?.apiSettings?.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
      modelName: context?.apiSettings?.modelName,
      temperature: context?.apiSettings?.temperature
    };
    
    // Add API settings to context
    const enrichedContext = {
      ...context,
      apiSettings
    };
    
    // Create LLM provider based on API settings
    let llmProvider: LLMProvider;
    
    if (apiSettings.apiKey) {
      try {
        llmProvider = createLLMProvider(
          apiSettings.provider,
          apiSettings.apiKey,
          {
            modelName: apiSettings.modelName,
            temperature: apiSettings.temperature
          }
        );
      } catch (error) {
        console.error('Error creating LLM provider:', error);
        llmProvider = defaultLLMProvider;
      }
    } else {
      llmProvider = defaultLLMProvider;
    }
    
    // Get or create the orchestrator with the appropriate LLM provider
    let orchestratorAgent: OrchestratorAgent;
    
    // Check if we need to create a new orchestrator with a different LLM provider
    if (orchestrator && apiSettings.apiKey) {
      // Create a new event stream
      const eventStream = new DefaultEventStream();
      
      // Create a new orchestrator with the new LLM provider
      orchestratorAgent = await registry.createAgent(
        'orchestrator',
        { 
          id: `orchestrator-${Date.now()}`, 
          name: 'Orchestrator Agent', 
          description: 'Coordinates between agents and manages workflow' 
        },
        eventStream,
        llmProvider
      ) as OrchestratorAgent;
    } else {
      // Use the existing orchestrator
      orchestratorAgent = await getOrchestrator();
    }
    
    // Create an observation from the message
    const observation = Observation.createUserMessageObservation('user', message);
    observation.data.context = enrichedContext;
    
    // Process the observation
    const action = await orchestratorAgent.process(observation);
    
    // Convert the action to a response format
    let responses;
    if (action.data.type === 'composite' && Array.isArray(action.data.responses)) {
      responses = action.data.responses;
    } else {
      responses = [action.data];
    }
    
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
export const getAgents = async (req: Request, res: Response) => {
  try {
    // Get the orchestrator
    const orchestratorAgent = await getOrchestrator();
    
    // Get all registered agent types
    const agentTypes = registry.getAgentTypes();
    
    // Get all agent instances
    const agentInstances = registry.getAgents();
    
    const agents = [
      {
        id: orchestratorAgent.id,
        name: orchestratorAgent.name,
        description: orchestratorAgent.description,
        type: 'orchestrator'
      },
      ...agentInstances
        .filter(agent => agent.id !== orchestratorAgent.id)
        .map(agent => ({
          id: agent.id,
          name: agent.name,
          description: agent.description,
          type: agentTypes.find(type => 
            registry.getAgentType(type)?.name === agent.constructor.name
          ) || 'unknown'
        }))
    ];
    
    return res.status(200).json({ 
      agents,
      availableTypes: agentTypes
    });
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