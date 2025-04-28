import { Request, Response } from 'express';
import { register, login, getCurrentUser, updateProfile, changePassword, forgotPassword, logout } from '../src/controllers/authController';
import * as admin from 'firebase-admin';

// Mock Firebase Admin SDK
jest.mock('firebase-admin', () => {
  return {
    auth: jest.fn().mockReturnValue({
      createUser: jest.fn().mockResolvedValue({
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
      }),
      createCustomToken: jest.fn().mockResolvedValue('mock-token'),
      getUserByEmail: jest.fn().mockResolvedValue({
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
      }),
      getUser: jest.fn().mockResolvedValue({
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Test User',
        photoURL: 'https://example.com/photo.jpg',
      }),
      updateUser: jest.fn().mockResolvedValue({
        uid: 'test-uid',
        email: 'test@example.com',
        displayName: 'Updated User',
        photoURL: 'https://example.com/new-photo.jpg',
      }),
      generatePasswordResetLink: jest.fn().mockResolvedValue('https://example.com/reset-password'),
      revokeRefreshTokens: jest.fn().mockResolvedValue(undefined),
    }),
  };
});

describe('Auth Controller', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any = {};

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock request and response
    mockRequest = {
      body: {},
      user: {
        uid: 'test-uid',
      },
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

  describe('register', () => {
    it('should register a new user', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      };
      
      await register(mockRequest as Request, mockResponse as Response);
      
      expect(admin.auth().createUser).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      });
      
      expect(admin.auth().createCustomToken).toHaveBeenCalledWith('test-uid');
      
      expect(responseObject.statusCode).toBe(201);
      expect(responseObject.data).toHaveProperty('message');
      expect(responseObject.data).toHaveProperty('user');
      expect(responseObject.data).toHaveProperty('token');
    });

    it('should return 400 if email or password is missing', async () => {
      mockRequest.body = {
        email: 'test@example.com',
      };
      
      await register(mockRequest as Request, mockResponse as Response);
      
      expect(responseObject.statusCode).toBe(400);
      expect(responseObject.data).toHaveProperty('error');
    });
  });

  describe('login', () => {
    it('should login a user', async () => {
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
      };
      
      await login(mockRequest as Request, mockResponse as Response);
      
      expect(admin.auth().getUserByEmail).toHaveBeenCalledWith('test@example.com');
      expect(admin.auth().createCustomToken).toHaveBeenCalledWith('test-uid');
      
      expect(responseObject.statusCode).toBe(200);
      expect(responseObject.data).toHaveProperty('message');
      expect(responseObject.data).toHaveProperty('user');
      expect(responseObject.data).toHaveProperty('token');
    });

    it('should return 400 if email or password is missing', async () => {
      mockRequest.body = {
        email: 'test@example.com',
      };
      
      await login(mockRequest as Request, mockResponse as Response);
      
      expect(responseObject.statusCode).toBe(400);
      expect(responseObject.data).toHaveProperty('error');
    });
  });

  describe('getCurrentUser', () => {
    it('should get current user information', async () => {
      await getCurrentUser(mockRequest as Request, mockResponse as Response);
      
      expect(admin.auth().getUser).toHaveBeenCalledWith('test-uid');
      
      expect(responseObject.statusCode).toBe(200);
      expect(responseObject.data).toHaveProperty('user');
      expect(responseObject.data.user).toHaveProperty('uid');
      expect(responseObject.data.user).toHaveProperty('email');
      expect(responseObject.data.user).toHaveProperty('displayName');
      expect(responseObject.data.user).toHaveProperty('photoURL');
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      
      await getCurrentUser(mockRequest as Request, mockResponse as Response);
      
      expect(responseObject.statusCode).toBe(401);
      expect(responseObject.data).toHaveProperty('error');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile', async () => {
      mockRequest.body = {
        displayName: 'Updated User',
        photoURL: 'https://example.com/new-photo.jpg',
      };
      
      await updateProfile(mockRequest as Request, mockResponse as Response);
      
      expect(admin.auth().updateUser).toHaveBeenCalledWith('test-uid', {
        displayName: 'Updated User',
        photoURL: 'https://example.com/new-photo.jpg',
      });
      
      expect(responseObject.statusCode).toBe(200);
      expect(responseObject.data).toHaveProperty('message');
      expect(responseObject.data).toHaveProperty('user');
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      
      await updateProfile(mockRequest as Request, mockResponse as Response);
      
      expect(responseObject.statusCode).toBe(401);
      expect(responseObject.data).toHaveProperty('error');
    });
  });

  describe('changePassword', () => {
    it('should change user password', async () => {
      mockRequest.body = {
        newPassword: 'newpassword123',
      };
      
      await changePassword(mockRequest as Request, mockResponse as Response);
      
      expect(admin.auth().updateUser).toHaveBeenCalledWith('test-uid', {
        password: 'newpassword123',
      });
      
      expect(responseObject.statusCode).toBe(200);
      expect(responseObject.data).toHaveProperty('message');
    });

    it('should return 400 if new password is missing', async () => {
      mockRequest.body = {};
      
      await changePassword(mockRequest as Request, mockResponse as Response);
      
      expect(responseObject.statusCode).toBe(400);
      expect(responseObject.data).toHaveProperty('error');
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email', async () => {
      mockRequest.body = {
        email: 'test@example.com',
      };
      
      await forgotPassword(mockRequest as Request, mockResponse as Response);
      
      expect(admin.auth().generatePasswordResetLink).toHaveBeenCalledWith('test@example.com');
      
      expect(responseObject.statusCode).toBe(200);
      expect(responseObject.data).toHaveProperty('message');
      expect(responseObject.data).toHaveProperty('resetLink');
    });

    it('should return 400 if email is missing', async () => {
      mockRequest.body = {};
      
      await forgotPassword(mockRequest as Request, mockResponse as Response);
      
      expect(responseObject.statusCode).toBe(400);
      expect(responseObject.data).toHaveProperty('error');
    });
  });

  describe('logout', () => {
    it('should logout user', async () => {
      await logout(mockRequest as Request, mockResponse as Response);
      
      expect(admin.auth().revokeRefreshTokens).toHaveBeenCalledWith('test-uid');
      
      expect(responseObject.statusCode).toBe(200);
      expect(responseObject.data).toHaveProperty('message');
    });

    it('should return 401 if user is not authenticated', async () => {
      mockRequest.user = undefined;
      
      await logout(mockRequest as Request, mockResponse as Response);
      
      expect(responseObject.statusCode).toBe(401);
      expect(responseObject.data).toHaveProperty('error');
    });
  });
});