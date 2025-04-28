import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser, JsonOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';
import { StructuredTool } from '@langchain/core/tools';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { BufferMemory } from 'langchain/memory';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from '@langchain/openai';
import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf';

// Define the model provider (can be changed to Gemini or other providers)
export const createChatModel = (provider: string, apiKey: string) => {
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
};

// Create a memory instance for conversation history
export const createMemory = () => {
  return new BufferMemory({
    memoryKey: 'chat_history',
    returnMessages: true,
  });
};

// Create a thinking agent chain
export const createThinkingAgentChain = (provider: string, apiKey: string) => {
  const model = createChatModel(provider, apiKey);

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a Thinking Agent that analyzes user requests and creates structured plans.
    Your job is to:
    1. Understand the user's request in detail
    2. Break it down into logical steps
    3. Create a structured plan that can be executed by specialized agents
    4. Return your analysis in a clear, structured format

    Your output should be in the following JSON format:
    {
      "analysis": "Your detailed analysis of the request",
      "steps": [
        {
          "id": 1,
          "description": "Step description",
          "agent": "AgentType",
          "params": { "key": "value" }
        }
      ]
    }`],
    ['human', '{input}'],
  ]);

  return RunnableSequence.from([
    prompt,
    model,
    new StringOutputParser(),
  ]);
};

// Create a developer agent chain
export const createDeveloperAgentChain = (provider: string, apiKey: string) => {
  const model = createChatModel(provider, apiKey);

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are a Developer Agent that generates high-quality code based on specifications.
    Your job is to:
    1. Understand the requirements
    2. Generate clean, efficient, and well-documented code
    3. Follow best practices for the specified language
    4. Return the code with appropriate explanations

    Language: {language}
    File type: {fileType}`],
    ['human', '{input}'],
  ]);

  return RunnableSequence.from([
    prompt,
    model,
    new StringOutputParser(),
  ]);
};

// Create an editor agent chain
export const createEditorAgentChain = (provider: string, apiKey: string) => {
  const model = createChatModel(provider, apiKey);

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are an Editor Agent that reviews and improves code or content.
    Your job is to:
    1. Review the provided content for errors, inefficiencies, or improvements
    2. Make necessary corrections and enhancements
    3. Ensure the content follows best practices and standards
    4. Return the improved version with explanations of significant changes

    Content type: {contentType}`],
    ['human', '{input}'],
  ]);

  return RunnableSequence.from([
    prompt,
    model,
    new StringOutputParser(),
  ]);
};

// Create an orchestrator agent
export const createOrchestratorAgent = (provider: string, apiKey: string) => {
  const model = createChatModel(provider, apiKey);
  const memory = createMemory();

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
        const thinkingChain = createThinkingAgentChain(provider, apiKey);
        return await thinkingChain.invoke({ input: request });
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
        const developerChain = createDeveloperAgentChain(provider, apiKey);
        return await developerChain.invoke({
          input: specifications,
          language,
          fileType,
        });
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
        const editorChain = createEditorAgentChain(provider, apiKey);
        return await editorChain.invoke({
          input: code,
          contentType,
        });
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

  return AgentExecutor.fromAgentAndTools({
    agent,
    tools,
    memory,
    verbose: true,
  });
};

// Document processing functions
export const processDocument = async (file: File, provider: string, apiKey: string) => {
  let loader;
  
  if (file.type === 'application/pdf') {
    // For PDF files
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    loader = new PDFLoader(uint8Array);
  } else {
    // For text files
    const text = await file.text();
    loader = new TextLoader(text);
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
  
  return vectorStore;
};

// Create a retrieval chain for document Q&A
export const createRetrievalChain = async (vectorStore: any, provider: string, apiKey: string) => {
  const model = createChatModel(provider, apiKey);
  
  const retriever = vectorStore.asRetriever();
  
  const prompt = ChatPromptTemplate.fromMessages([
    ['system', `You are an assistant that answers questions based on the provided context.
    
    Context:
    {context}`],
    ['human', '{question}'],
  ]);
  
  const chain = RunnableSequence.from([
    {
      context: retriever.pipe(docs => docs.map(doc => doc.pageContent).join('\n\n')),
      question: new RunnablePassthrough(),
    },
    prompt,
    model,
    new StringOutputParser(),
  ]);
  
  return chain;
};

export default {
  createChatModel,
  createMemory,
  createThinkingAgentChain,
  createDeveloperAgentChain,
  createEditorAgentChain,
  createOrchestratorAgent,
  processDocument,
  createRetrievalChain,
};