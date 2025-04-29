# NeuroNest-AI Backend

## Overview

This directory contains the backend for the NeuroNest-AI project. It's built using Node.js/Express and provides the API endpoints and server-side logic for the application.

## Structure

```
backend/
├── config/           # Configuration files
├── controllers/      # Request handlers
├── middleware/       # Express middleware
├── models/           # Data models
├── routes/           # API route definitions
├── services/         # Business logic
├── utils/            # Helper functions
├── .env.example      # Example environment file
├── package.json      # Project dependencies
└── server.js         # Main server file
```

## Main Components

### Routes

- **auth.js**: Authentication endpoints (register, login, logout).
- **projects.js**: Project management endpoints.
- **conversations.js**: Conversation history endpoints.
- **memories.js**: Agent memory endpoints.
- **runtime.js**: Code execution environment endpoints.
- **settings.js**: User settings endpoints.

### Services

- **firebaseService.js**: Firebase integration.
- **supabaseService.js**: Supabase integration.
- **agentService.js**: Agent orchestration logic.
- **runtimeService.js**: Code execution environment.

## API Endpoints

### Authentication

- `POST /api/auth/register`: Register a new user.
- `POST /api/auth/login`: Log in a user.
- `POST /api/auth/logout`: Log out a user.
- `GET /api/auth/user`: Get the current user.

### Projects

- `GET /api/projects`: Get all projects for the current user.
- `GET /api/projects/:id`: Get a specific project.
- `POST /api/projects`: Create a new project.
- `PUT /api/projects/:id`: Update a project.
- `DELETE /api/projects/:id`: Delete a project.
- `GET /api/projects/:id/files`: Get all files for a project.
- `POST /api/projects/:id/files`: Add a file to a project.

### Conversations

- `GET /api/conversations`: Get all conversations for the current user.
- `GET /api/conversations/:id`: Get a specific conversation.
- `POST /api/conversations`: Create a new conversation.
- `PUT /api/conversations/:id`: Update a conversation.
- `DELETE /api/conversations/:id`: Delete a conversation.

### Agent Memory

- `GET /api/memories/:agentId`: Get memories for a specific agent.
- `POST /api/memories/:agentId`: Add a memory for an agent.
- `DELETE /api/memories/:agentId/:memoryId`: Delete a specific memory.

## Installation and Running

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and modify values as needed.

3. Run the server:
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

## Environment Variables

- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment (development, production)
- `FIREBASE_API_KEY`: Firebase API key
- `FIREBASE_AUTH_DOMAIN`: Firebase auth domain
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `FIREBASE_STORAGE_BUCKET`: Firebase storage bucket
- `FIREBASE_MESSAGING_SENDER_ID`: Firebase messaging sender ID
- `FIREBASE_APP_ID`: Firebase app ID
- `SUPABASE_URL`: Supabase URL
- `SUPABASE_KEY`: Supabase API key
- `JWT_SECRET`: Secret for JWT tokens
- `OPENROUTER_API_KEY`: OpenRouter API key

## Documentation

For more information about specific endpoints and functions, see the comments in the code.
