import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { RunnableSequence } from '@langchain/core/runnables';
import dotenv from 'dotenv';

dotenv.config();

// Define the model provider (can be changed to Gemini or other providers)
export const createChatModel = () => {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new Error('OpenAI API key not found in environment variables');
  }
  
  return new ChatOpenAI({
    openAIApiKey: apiKey,
    modelName: 'gpt-3.5-turbo',
    temperature: 0.7,
  });
};

// Create a thinking agent chain
export const createThinkingAgentChain = () => {
  const model = createChatModel();
  
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
export const createDeveloperAgentChain = () => {
  const model = createChatModel();
  
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
export const createEditorAgentChain = () => {
  const model = createChatModel();
  
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

export default {
  createChatModel,
  createThinkingAgentChain,
  createDeveloperAgentChain,
  createEditorAgentChain,
};