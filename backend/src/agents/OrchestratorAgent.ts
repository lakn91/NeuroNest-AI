import { BaseAgent } from './BaseAgent';
import { AgentResponse, AgentConfig } from './AgentInterface';
import { EventStream, DefaultEventStream } from './EventStream';
import { LLMProvider } from './LLMProvider';
import { Action } from './Action';
import { Observation } from './Observation';
import { AgentRegistry } from './AgentRegistry';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
// Temporarily use a simpler implementation
// import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
const AgentExecutor = {
  fromAgentAndTools: () => ({
    run: async (input: string) => `Processed: ${input}`
  })
};
const createOpenAIFunctionsAgent = () => ({});
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredTool } from '@langchain/core/tools';
import { BufferMemory } from 'langchain/memory';
// Temporarily comment out imports that are causing issues
// import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
// import { TextLoader } from 'langchain/document_loaders/fs/text';
// import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
// import { MemoryVectorStore } from 'langchain/vectorstores/memory';
// import { OpenAIEmbeddings } from '@langchain/openai';
// import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';

/**
 * Agent responsible for coordinating between other agents
 */
export class OrchestratorAgent extends BaseAgent {
  private agentExecutor: AgentExecutor | null = null;
  private vectorStores: Map<string, any> = new Map();
  private agentRegistry: AgentRegistry;
  
  /**
   * Create a new OrchestratorAgent
   * @param eventStream The event stream for the agent
   * @param llmProvider The LLM provider for the agent
   */
  constructor(eventStream: EventStream, llmProvider: LLMProvider) {
    super(eventStream, llmProvider);
    this.agentRegistry = AgentRegistry.getInstance();
  }
  
  /**
   * Initialize the agent
   * @param config Configuration for the agent
   */
  async initialize(config: AgentConfig): Promise<void> {
    await super.initialize(config);
    
    // Set default system message if not provided
    if (!this.systemMessage) {
      this.systemMessage = `You are an Orchestrator Agent that coordinates the work of specialized agents to complete complex tasks.
Your job is to:
1. Understand the user's request
2. Break it down into subtasks
3. Assign each subtask to the appropriate specialized agent
4. Combine the results into a coherent response

You have access to the following specialized agents:
- ThinkingAgent: Analyzes requests and creates execution plans
- DeveloperAgent: Generates code based on specifications
- EditorAgent: Reviews and improves code

Always think step by step and use the most appropriate agent for each subtask.`;
    }
  }
  
  /**
   * Create a chat model based on provider and API key
   */
  private createChatModel(provider: string, apiKey: string) {
    switch (provider.toLowerCase()) {
      case 'openai':
        return new ChatOpenAI({
          openAIApiKey: apiKey,
          modelName: 'gpt-3.5-turbo',
          temperature: 0.7,
        });
      case 'gemini':
        return new ChatGoogleGenerativeAI({
          apiKey: apiKey,
          modelName: 'gemini-pro',
          temperature: 0.7,
        });
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
  
  /**
   * Initialize the LangChain agent executor
   */
  private async initializeAgentExecutor(provider: string, apiKey: string): Promise<any> {
    if (this.agentExecutor) {
      return this.agentExecutor;
    }
    
    console.log('Using simplified agent executor implementation');
    
    // Create specialized agents if they don't exist
    const thinkingAgentId = 'thinking-agent';
    const developerAgentId = 'developer-agent';
    const editorAgentId = 'editor-agent';
    
    let thinkingAgent = this.agentRegistry.getAgent(thinkingAgentId);
    let developerAgent = this.agentRegistry.getAgent(developerAgentId);
    let editorAgent = this.agentRegistry.getAgent(editorAgentId);
    
    if (!thinkingAgent) {
      thinkingAgent = await this.agentRegistry.createAgent(
        'thinking',
        { id: thinkingAgentId, name: 'ThinkingAgent', description: 'Analyzes requests and creates execution plans' },
        new DefaultEventStream(),
        this.llmProvider
      );
    }
    
    if (!developerAgent) {
      developerAgent = await this.agentRegistry.createAgent(
        'developer',
        { id: developerAgentId, name: 'DeveloperAgent', description: 'Generates code based on specifications' },
        new DefaultEventStream(),
        this.llmProvider
      );
    }
    
    if (!editorAgent) {
      editorAgent = await this.agentRegistry.createAgent(
        'editor',
        { id: editorAgentId, name: 'EditorAgent', description: 'Reviews and improves code' },
        new DefaultEventStream(),
        this.llmProvider
      );
    }
    
    // Create a simplified executor that delegates to the appropriate agent
    this.agentExecutor = {
      run: async (input: string) => {
        console.log('Running simplified agent executor with input:', input);
        
        // Default to thinking agent for processing
        if (thinkingAgent) {
          const observation = Observation.createUserMessageObservation('user', input);
          const action = await thinkingAgent.process(observation);
          return JSON.stringify(action.data);
        }
        
        return `Processed by simplified orchestrator: ${input}`;
      }
    };
    
    return this.agentExecutor;
  }
  
  /**
   * Process a document and create a vector store
   */
  private async processDocument(fileContent: string, fileName: string, provider: string, apiKey: string): Promise<string> {
    try {
      // Create a unique ID for the vector store
      const storeId = `doc_${Date.now()}`;
      
      console.log(`Processing document ${fileName} with simplified implementation`);
      
      // Create a simple mock vector store
      const mockVectorStore = {
        similaritySearch: async (query: string, k: number) => {
          console.log(`Searching for: ${query}, k=${k}`);
          // Return a simple mock result
          return [
            { pageContent: `Content from ${fileName}: This is a mock result for "${query}"`, metadata: {} },
            { pageContent: `More content from ${fileName}: Another mock result for "${query}"`, metadata: {} }
          ];
        }
      };
      
      // Store the mock vector store for later use
      this.vectorStores.set(storeId, mockVectorStore);
      
      return storeId;
    } catch (error) {
      console.error('Error processing document:', error);
      throw error;
    }
  }
  
  /**
   * Process an observation and generate an action
   * @param observation The observation to process
   * @returns The action to take
   */
  async process(observation: Observation): Promise<Action> {
    try {
      // Extract message and context from observation
      let message = '';
      let context: any = {};
      
      if (observation.data.type === 'user_message') {
        message = observation.data.message;
        context = observation.data.context || {};
      } else if (observation.data.type === 'text') {
        message = observation.data.content;
        context = observation.data.context || {};
      } else {
        // For other observation types, convert to string
        message = JSON.stringify(observation.data);
      }
      
      // Get API settings from context or use defaults
      const provider = context?.apiSettings?.provider || process.env.DEFAULT_AI_PROVIDER || 'gemini';
      const apiKey = context?.apiSettings?.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        return Action.createErrorAction(this.id, 'No API key provided. Please configure your API key in settings.');
      }
      
      const responses: any[] = [];
      
      // Process any files in the context
      if (context?.files && context.files.length > 0) {
        for (const file of context.files) {
          try {
            const storeId = await this.processDocument(file.content, file.name, provider, apiKey);
            responses.push({
              type: 'agent',
              content: `Processed file: ${file.name}`,
              metadata: { fileId: storeId }
            });
          } catch (error) {
            console.error(`Error processing file ${file.name}:`, error);
            responses.push({
              type: 'error',
              content: `Failed to process file: ${file.name}`
            });
          }
        }
      }
      
      // Initialize the LangChain agent
      const agentExecutor = await this.initializeAgentExecutor(provider, apiKey);
      
      // Execute the agent
      const result = {
        output: await agentExecutor.run(message)
      };
      
      // Parse the agent's output
      let agentResponses: any[] = [];
      
      try {
        // Try to parse the output as JSON
        const parsedOutput = JSON.parse(result.output);
        
        if (Array.isArray(parsedOutput)) {
          agentResponses = parsedOutput;
        } else {
          // If it's a single response object
          agentResponses = [parsedOutput];
        }
      } catch (error) {
        // If parsing fails, treat it as a text response
        agentResponses = [{
          type: 'text',
          content: result.output
        }];
      }
      
      // Add the agent responses to the final responses
      responses.push(...agentResponses);
      
      // If no responses were generated, add a fallback response
      if (responses.length === 0) {
        // Fallback to the traditional approach
        const thinkingAgent = this.agentRegistry.getAgent('thinking-agent');
        if (thinkingAgent) {
          const thinkingObservation = Observation.createUserMessageObservation('user', message);
          thinkingObservation.data.context = context;
          const thinkingAction = await thinkingAgent.process(thinkingObservation);
          
          responses.push(thinkingAction.data);
          
          if (thinkingAction.data.type !== 'error' && thinkingAction.data.type === 'plan') {
            // Extract the plan from the thinking agent's response
            const plan = thinkingAction.data.content;
            
            // Execute each step in the plan
            for (const step of plan.steps) {
              let stepAction: Action;
              
              switch (step.agent) {
                case 'DeveloperAgent': {
                  const developerAgent = this.agentRegistry.getAgent('developer-agent');
                  if (developerAgent) {
                    const devObservation = Observation.createUserMessageObservation('user', message);
                    devObservation.data.context = step.params;
                    stepAction = await developerAgent.process(devObservation);
                  } else {
                    stepAction = Action.createErrorAction(this.id, 'DeveloperAgent not found');
                  }
                  break;
                }
                case 'EditorAgent': {
                  // Find the most recent code response to edit
                  const codeResponses = responses.filter(r => r.type === 'code');
                  if (codeResponses.length > 0 && this.agentRegistry.getAgent('editor-agent')) {
                    const latestCode = codeResponses[codeResponses.length - 1];
                    const editorAgent = this.agentRegistry.getAgent('editor-agent');
                    const editorObservation = Observation.createCodeObservation(
                      'user',
                      latestCode.content,
                      latestCode.language || 'text'
                    );
                    editorObservation.data.context = { 
                      type: 'code',
                      language: latestCode.language
                    };
                    stepAction = editorAgent ? await editorAgent.process(editorObservation) : null;
                  } else {
                    stepAction = Action.createErrorAction(this.id, 'No code found to edit or EditorAgent not found');
                  }
                  break;
                }
                default:
                  stepAction = Action.createErrorAction(this.id, `Unknown agent: ${step.agent}`);
              }
              
              responses.push(stepAction.data);
              
              if (stepAction.data.type === 'error') {
                break;
              }
            }
          }
        } else {
          responses.push({
            type: 'error',
            content: 'ThinkingAgent not found and no responses generated'
          });
        }
      }
      
      // Create a composite action with all responses
      return new Action(this.id, {
        type: 'composite',
        responses: responses
      });
    } catch (error) {
      console.error('Error in OrchestratorAgent:', error);
      return Action.createErrorAction(this.id, 'Failed to orchestrate agents');
    }
  }
  
  /**
   * Legacy method for backward compatibility
   * @param message The message to process
   * @param context Additional context
   * @returns The final response after processing through all necessary agents
   * @deprecated Use process(observation) instead
   */
  async processMessage(message: string, context?: any): Promise<AgentResponse> {
    // Create an observation from the message
    const observation = Observation.createUserMessageObservation('user', message);
    
    // Add context to the observation if provided
    if (context) {
      observation.data.context = context;
    }
    
    // Process the observation
    const action = await this.process(observation);
    
    // Convert the composite action to a single legacy response
    if (action.data.type === 'composite' && Array.isArray(action.data.responses)) {
      // Return the first response or create a combined response
      const firstResponse = action.data.responses[0];
      if (firstResponse) {
        return {
          type: firstResponse.type || 'text',
          content: firstResponse.content || JSON.stringify(action.data.responses)
        };
      }
    }
    
    // Default response if no valid responses found
    return {
      type: 'text',
      content: 'Processed by orchestrator agent'
    };
  }
}