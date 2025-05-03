import { BaseAgent } from './BaseAgent';
import { AgentResponse, AgentConfig } from './AgentInterface';
import { EventStream, DefaultEventStream } from './EventStream';
import { LLMProvider } from './LLMProvider';
import { Action } from './Action';
import { Observation } from './Observation';
import { AgentRegistry } from './AgentRegistry';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StructuredTool } from '@langchain/core/tools';
import { BufferMemory } from 'langchain/memory';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';
import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';

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
  private async initializeAgentExecutor(provider: string, apiKey: string): Promise<AgentExecutor> {
    if (this.agentExecutor) {
      return this.agentExecutor;
    }
    
    const model = this.createChatModel(provider, apiKey);
    const memory = new BufferMemory({
      memoryKey: 'chat_history',
      returnMessages: true,
    });
    
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
    
    // Define tools for the orchestrator
    const tools = [
      new StructuredTool({
        name: 'analyze_request',
        description: 'Analyze the user request and break it down into steps',
        schema: {
          type: 'object',
          properties: {
            request: {
              type: 'string',
              description: 'The user request to analyze',
            },
          },
          required: ['request'],
        },
        func: async ({ request }) => {
          const observation = Observation.createUserMessageObservation('user', request);
          const action = await thinkingAgent.process(observation);
          return JSON.stringify(action.data);
        },
      }),
      new StructuredTool({
        name: 'generate_code',
        description: 'Generate code based on specifications',
        schema: {
          type: 'object',
          properties: {
            specifications: {
              type: 'string',
              description: 'The specifications for the code to generate',
            },
            language: {
              type: 'string',
              description: 'The programming language to use',
            },
            fileType: {
              type: 'string',
              description: 'The type of file to generate',
            },
          },
          required: ['specifications', 'language', 'fileType'],
        },
        func: async ({ specifications, language, fileType }) => {
          const observation = Observation.createUserMessageObservation('user', specifications);
          observation.data.context = { language, fileType };
          const action = await developerAgent.process(observation);
          return JSON.stringify(action.data);
        },
      }),
      new StructuredTool({
        name: 'review_code',
        description: 'Review and improve code',
        schema: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: 'The code to review',
            },
            contentType: {
              type: 'string',
              description: 'The type of content being reviewed',
            },
            language: {
              type: 'string',
              description: 'The programming language of the code',
            },
          },
          required: ['code', 'contentType'],
        },
        func: async ({ code, contentType, language }) => {
          const observation = Observation.createCodeObservation('user', code, language || 'text');
          observation.data.context = { type: contentType };
          const action = await editorAgent.process(observation);
          return JSON.stringify(action.data);
        },
      }),
    ];
    
    // Create the agent
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', this.systemMessage],
      ['human', '{input}'],
    ]);
    
    const agent = createOpenAIFunctionsAgent({
      llm: model,
      tools,
      prompt,
    });
    
    this.agentExecutor = AgentExecutor.fromAgentAndTools({
      agent,
      tools,
      memory,
      verbose: true,
    });
    
    return this.agentExecutor;
  }
  
  /**
   * Process a document and create a vector store
   */
  private async processDocument(fileContent: string, fileName: string, provider: string, apiKey: string): Promise<string> {
    try {
      let loader;
      
      if (fileName.endsWith('.pdf')) {
        // For PDF files
        const uint8Array = Buffer.from(fileContent, 'base64');
        loader = new PDFLoader(uint8Array);
      } else {
        // For text files
        loader = new TextLoader(fileContent);
      }
      
      const docs = await loader.load();
      
      // Split the documents into chunks
      const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200,
      });
      const splitDocs = await textSplitter.splitDocuments(docs);
      
      // Create embeddings based on the provider
      let embeddings;
      if (provider === 'openai') {
        embeddings = new OpenAIEmbeddings({ openAIApiKey: apiKey });
      } else {
        // Fallback to a free model for embeddings
        embeddings = new HuggingFaceInferenceEmbeddings();
      }
      
      // Create a vector store from the documents
      const vectorStore = await MemoryVectorStore.fromDocuments(splitDocs, embeddings);
      
      // Store the vector store with a unique ID
      const storeId = `${Date.now()}-${fileName}`;
      this.vectorStores.set(storeId, vectorStore);
      
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
      const result = await agentExecutor.invoke({
        input: message,
        context: JSON.stringify(context)
      });
      
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
                    stepAction = await editorAgent.process(editorObservation);
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
  async processMessage(message: string, context?: any): Promise<AgentResponse[]> {
    // Create an observation from the message
    const observation = Observation.createUserMessageObservation('user', message);
    
    // Add context to the observation if provided
    if (context) {
      observation.data.context = context;
    }
    
    // Process the observation
    const action = await this.process(observation);
    
    // Convert the composite action to legacy responses
    if (action.data.type === 'composite' && Array.isArray(action.data.responses)) {
      return action.data.responses.map((response: any) => {
        if (response.type === 'text') {
          return {
            type: 'text',
            content: response.content
          };
        } else if (response.type === 'code') {
          return {
            type: 'code',
            content: response.content,
            metadata: {
              language: response.language,
              filePath: response.filePath
            }
          };
        } else if (response.type === 'error') {
          return {
            type: 'error',
            content: response.content
          };
        } else if (response.type === 'plan') {
          return {
            type: 'plan',
            content: response.content
          };
        } else if (response.type === 'agent') {
          return {
            type: 'agent',
            content: response.content,
            metadata: response.metadata
          };
        } else {
          return {
            type: 'text',
            content: JSON.stringify(response)
          };
        }
      });
    } else {
      // If it's not a composite action, convert it to a single response
      return [this.actionToLegacyResponse(action)];
    }
  }
}