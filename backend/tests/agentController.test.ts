import { Request, Response } from 'express';
import { getAgents, getProviders, processMessage } from '../src/controllers/agentController';
import { OrchestratorAgent } from '../src/agents/OrchestratorAgent';

// Mock the OrchestratorAgent
jest.mock('../src/agents/OrchestratorAgent', () => {
  return {
    OrchestratorAgent: jest.fn().mockImplementation(() => {
      return {
        processMessage: jest.fn().mockResolvedValue({
          content: 'Mock agent response',
          type: 'text',
        }),
      };
    }),
  };
});

describe('Agent Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any = {};

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock request and response
    mockRequest = {
      body: {},
      headers: {},
      query: {},
    };
    
    responseObject = {
      statusCode: 0,
      data: null,
    };
    
    mockResponse = {
      status: jest.fn().mockImplementation((code) => {
        responseObject.statusCode = code;
        return mockResponse;
      }),
      json: jest.fn().mockImplementation((data) => {
        responseObject.data = data;
        return mockResponse;
      }),
    };
  });

  describe('getAgents', () => {
    it('should return a list of available agents', () => {
      getAgents(mockRequest as Request, mockResponse as Response);
      
      expect(responseObject.statusCode).toBe(200);
      expect(responseObject.data).toHaveProperty('agents');
      expect(Array.isArray(responseObject.data.agents)).toBe(true);
    });
  });

  describe('getProviders', () => {
    it('should return a list of supported AI providers', () => {
      getProviders(mockRequest as Request, mockResponse as Response);
      
      expect(responseObject.statusCode).toBe(200);
      expect(responseObject.data).toHaveProperty('providers');
      expect(Array.isArray(responseObject.data.providers)).toBe(true);
      expect(responseObject.data.providers).toContain('gemini');
      expect(responseObject.data.providers).toContain('openai');
    });
  });

  describe('processMessage', () => {
    it('should process a message and return a response', async () => {
      mockRequest.body = {
        message: 'Hello, agent!',
        history: [],
        context: {
          projectId: 'test-project',
        },
      };
      
      mockRequest.headers = {
        'x-api-key': 'test-api-key',
        'x-api-provider': 'gemini',
      };
      
      await processMessage(mockRequest as Request, mockResponse as Response);
      
      expect(OrchestratorAgent).toHaveBeenCalled();
      expect(responseObject.statusCode).toBe(200);
      expect(responseObject.data).toHaveProperty('response');
      expect(responseObject.data.response).toHaveProperty('content');
      expect(responseObject.data.response).toHaveProperty('type');
    });

    it('should return 400 if message is missing', async () => {
      mockRequest.body = {
        history: [],
        context: {},
      };
      
      await processMessage(mockRequest as Request, mockResponse as Response);
      
      expect(responseObject.statusCode).toBe(400);
      expect(responseObject.data).toHaveProperty('error');
    });

    it('should use default API provider if not specified', async () => {
      mockRequest.body = {
        message: 'Hello, agent!',
        history: [],
        context: {},
      };
      
      await processMessage(mockRequest as Request, mockResponse as Response);
      
      expect(OrchestratorAgent).toHaveBeenCalled();
      expect(responseObject.statusCode).toBe(200);
    });
  });
});