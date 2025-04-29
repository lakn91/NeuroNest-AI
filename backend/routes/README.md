# Routes

This directory contains API route definitions for the NeuroNest-AI backend.

## Available Routes

- **auth.js**: Authentication routes.
  - User registration, login, logout
  - User profile management

- **projects.js**: Project management routes.
  - Create, read, update, delete projects
  - Project file management

- **conversations.js**: Conversation history routes.
  - Store and retrieve conversation messages
  - Conversation management

- **memories.js**: Agent memory routes.
  - Store and retrieve agent memories
  - Memory management

- **runtime.js**: Code execution routes.
  - Execute code in various languages
  - Manage execution environments

- **settings.js**: User settings routes.
  - Store and retrieve user settings
  - Dialect preferences

## Route Structure

Each route file typically exports an Express router with defined endpoints. For example:

```javascript
// auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * @route POST /api/auth/register
 * @desc Register a new user
 * @access Public
 */
router.post('/register', authController.register);

/**
 * @route POST /api/auth/login
 * @desc Login a user
 * @access Public
 */
router.post('/login', authController.login);

/**
 * @route POST /api/auth/logout
 * @desc Logout a user
 * @access Private
 */
router.post('/logout', authMiddleware.authenticate, authController.logout);

/**
 * @route GET /api/auth/user
 * @desc Get current user
 * @access Private
 */
router.get('/user', authMiddleware.authenticate, authController.getCurrentUser);

module.exports = router;
```

## API Documentation

### Authentication Routes

#### Register a new user
- **URL**: `/api/auth/register`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123",
    "displayName": "John Doe"
  }
  ```
- **Response**:
  ```json
  {
    "user": {
      "uid": "user123",
      "email": "user@example.com",
      "displayName": "John Doe"
    },
    "token": "jwt-token"
  }
  ```

#### Login a user
- **URL**: `/api/auth/login`
- **Method**: `POST`
- **Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response**:
  ```json
  {
    "user": {
      "uid": "user123",
      "email": "user@example.com",
      "displayName": "John Doe"
    },
    "token": "jwt-token"
  }
  ```

### Project Routes

#### Get all projects
- **URL**: `/api/projects`
- **Method**: `GET`
- **Headers**: `Authorization: Bearer jwt-token`
- **Response**:
  ```json
  {
    "projects": [
      {
        "id": "project123",
        "name": "My Project",
        "description": "Project description",
        "createdAt": "2025-04-29T12:00:00Z",
        "updatedAt": "2025-04-29T12:00:00Z"
      }
    ]
  }
  ```

#### Create a new project
- **URL**: `/api/projects`
- **Method**: `POST`
- **Headers**: `Authorization: Bearer jwt-token`
- **Body**:
  ```json
  {
    "name": "New Project",
    "description": "Project description"
  }
  ```
- **Response**:
  ```json
  {
    "project": {
      "id": "project123",
      "name": "New Project",
      "description": "Project description",
      "createdAt": "2025-04-29T12:00:00Z",
      "updatedAt": "2025-04-29T12:00:00Z"
    }
  }
  ```

## Error Handling

Routes should handle errors appropriately and return meaningful error responses. Use try/catch blocks and consider creating custom error classes for specific error types.

## Middleware

Routes may use middleware for authentication, validation, and other purposes. Common middleware includes:

- **authMiddleware.authenticate**: Verifies JWT token and adds user to request.
- **validationMiddleware**: Validates request body, params, and query.
- **errorMiddleware**: Handles errors and returns appropriate responses.
