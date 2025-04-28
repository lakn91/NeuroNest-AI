import { Request, Response, NextFunction } from 'express';
import { authMiddleware, adminMiddleware } from '../src/middleware/authMiddleware';
import * as admin from 'firebase-admin';

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => {
  return {
    auth: jest.fn().mockReturnValue({
      verifyIdToken: jest.fn().mockImplementation((token) => {
        if (token === 'valid-token') {
          return Promise.resolve({
            uid: 'test-uid',
            email: 'test@example.com',
            role: 'user',
          });
        } else if (token === 'admin-token') {
          return Promise.resolve({
            uid: 'admin-uid',
            email: 'admin@example.com',
            role: 'admin',
          });
        } else if (token === 'expired-token') {
          return Promise.reject({ code: 'auth/id-token-expired' });
        } else if (token === 'revoked-token') {
          return Promise.reject({ code: 'auth/id-token-revoked' });
        } else {
          return Promise.reject({ code: 'auth/invalid-token' });
        }
      }),
    }),
  };
});

describe('Auth Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;
  let responseObject: any = {};

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock request, response, and next function
    mockRequest = {
      headers: {},
      user: undefined,
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
    
    nextFunction = jest.fn();
  });

  describe('authMiddleware', () => {
    it('should call next() if token is valid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer valid-token',
      };
      
      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(admin.auth().verifyIdToken).toHaveBeenCalledWith('valid-token');
      expect(mockRequest.user).toEqual({
        uid: 'test-uid',
        email: 'test@example.com',
        role: 'user',
      });
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 401 if no token is provided', async () => {
      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(responseObject.statusCode).toBe(401);
      expect(responseObject.data).toHaveProperty('error');
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token is expired', async () => {
      mockRequest.headers = {
        authorization: 'Bearer expired-token',
      };
      
      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(admin.auth().verifyIdToken).toHaveBeenCalledWith('expired-token');
      expect(responseObject.statusCode).toBe(401);
      expect(responseObject.data).toHaveProperty('error');
      expect(responseObject.data.error).toContain('expired');
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token is revoked', async () => {
      mockRequest.headers = {
        authorization: 'Bearer revoked-token',
      };
      
      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(admin.auth().verifyIdToken).toHaveBeenCalledWith('revoked-token');
      expect(responseObject.statusCode).toBe(401);
      expect(responseObject.data).toHaveProperty('error');
      expect(responseObject.data.error).toContain('revoked');
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', async () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token',
      };
      
      await authMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(admin.auth().verifyIdToken).toHaveBeenCalledWith('invalid-token');
      expect(responseObject.statusCode).toBe(401);
      expect(responseObject.data).toHaveProperty('error');
      expect(responseObject.data.error).toContain('Invalid');
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('adminMiddleware', () => {
    it('should call next() if user is admin', () => {
      mockRequest.user = {
        uid: 'admin-uid',
        email: 'admin@example.com',
        role: 'admin',
      };
      
      adminMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(nextFunction).toHaveBeenCalled();
    });

    it('should return 403 if user is not admin', () => {
      mockRequest.user = {
        uid: 'test-uid',
        email: 'test@example.com',
        role: 'user',
      };
      
      adminMiddleware(mockRequest as Request, mockResponse as Response, nextFunction);
      
      expect(responseObject.statusCode).toBe(403);
      expect(responseObject.data).toHaveProperty('error');
      expect(responseObject.data.error).toContain('Admin');
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });
});