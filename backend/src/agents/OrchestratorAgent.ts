import { BaseAgent } from './BaseAgent';
import { AgentResponse } from './AgentInterface';
import { ThinkingAgent } from './ThinkingAgent';
import { DeveloperAgent } from './DeveloperAgent';
import { EditorAgent } from './EditorAgent';
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
  private thinkingAgent: ThinkingAgent;
  private developerAgent: DeveloperAgent;
  private editorAgent: EditorAgent;
  private agentExecutor: AgentExecutor | null = null;
  private vectorStores: Map<string, any> = new Map();
  
  constructor() {
    super(
      'Orchestrator Agent',
      'Coordinates between agents and manages workflow using LangChain'
    );
    
    this.thinkingAgent = new ThinkingAgent();
    this.developerAgent = new DeveloperAgent();
    this.editorAgent = new EditorAgent();
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
          const response = await this.thinkingAgent.process(request);
          return JSON.stringify(response.content);
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
          const response = await this.developerAgent.process(specifications, { language, fileType });
          return JSON.stringify(response);
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
          },
          required: ['code', 'contentType'],
        },
        func: async ({ code, contentType }) => {
          const response = await this.editorAgent.process(code, { type: contentType });
          return JSON.stringify(response);
        },
      }),
    ];
    
    // Create the agent
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', `You are an Orchestrator Agent that coordinates the work of specialized agents to complete complex tasks.
      Your job is to:
      1. Understand the user's request
      2. Break it down into subtasks
      3. Assign each subtask to the appropriate specialized agent
      4. Combine the results into a coherent response
      
      You have access to the following tools:
      - analyze_request: Analyze the user request and break it down into steps
      - generate_code: Generate code based on specifications
      - review_code: Review and improve code
      
      Always think step by step and use the most appropriate tool for each subtask.`],
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
   * Process a user request through the agent system
   * @param message The user message
   * @param context Additional context
   * @returns The final response after processing through all necessary agents
   */
  async process(message: string, context?: any): Promise<AgentResponse[]> {
    try {
      // Get API settings from context or use defaults
      const provider = context?.apiSettings?.provider || process.env.DEFAULT_AI_PROVIDER || 'gemini';
      const apiKey = context?.apiSettings?.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        return [this.createErrorResponse('No API key provided. Please configure your API key in settings.')];
      }
      
      const responses: AgentResponse[] = [];
      
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
            responses.push(this.createErrorResponse(`Failed to process file: ${file.name}`));
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
      let agentResponses: AgentResponse[] = [];
      
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
          type: 'agent',
          content: result.output,
          timestamp: new Date()
        }];
      }
      
      // Add the agent responses to the final responses
      responses.push(...agentResponses);
      
      // If no responses were generated, add a fallback response
      if (responses.length === 0) {
        // Fallback to the traditional approach
        const thinkingResponse = await this.thinkingAgent.process(message, context);
        responses.push(thinkingResponse);
        
        if (thinkingResponse.type !== 'error') {
          // Extract the plan from the thinking agent's response
          const plan = thinkingResponse.content as any;
          
          // Execute each step in the plan
          for (const step of plan.steps) {
            let stepResponse: AgentResponse;
            
            switch (step.agent) {
              case 'DeveloperAgent':
                stepResponse = await this.developerAgent.process(message, step.params);
                break;
              case 'EditorAgent':
                // Find the most recent code response to edit
                const codeResponses = responses.filter(r => r.type === 'code');
                if (codeResponses.length > 0) {
                  const latestCode = codeResponses[codeResponses.length - 1];
                  stepResponse = await this.editorAgent.process(
                    latestCode.content as string, 
                    { 
                      type: 'code',
                      language: latestCode.metadata?.language
                    }
                  );
                } else {
                  stepResponse = this.createErrorResponse('No code found to edit');
                }
                break;
              default:
                stepResponse = this.createErrorResponse(`Unknown agent: ${step.agent}`);
            }
            
            responses.push(stepResponse);
            
            if (stepResponse.type === 'error') {
              break;
            }
          }
        }
      }
      
      return responses;
    } catch (error) {
      console.error('Error in OrchestratorAgent:', error);
      return [this.createErrorResponse('Failed to orchestrate agents')];
    }
  }
}