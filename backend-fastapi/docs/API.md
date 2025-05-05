# NeuroNest-AI API Documentation

## Authentication

### Register a new user

```
POST /api/auth/register
```

Request body:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "name": "John Doe",
    "is_active": true
  }
}
```

### Login

```
POST /api/auth/login
```

Request body:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 86400,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "name": "John Doe",
    "is_active": true
  }
}
```

### Get current user

```
GET /api/auth/me
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "name": "John Doe",
  "is_active": true,
  "created_at": "2023-01-01T00:00:00.000Z"
}
```

### Update user profile

```
PUT /api/auth/me
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Request body:
```json
{
  "name": "John Smith",
  "email": "john.smith@example.com"
}
```

Response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "john.smith@example.com",
  "name": "John Smith",
  "is_active": true,
  "created_at": "2023-01-01T00:00:00.000Z"
}
```

### Change password

```
PUT /api/auth/change-password
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Request body:
```json
{
  "current_password": "password123",
  "new_password": "newpassword123"
}
```

Response:
```json
{
  "message": "Password changed successfully"
}
```

### Forgot password

```
POST /api/auth/forgot-password
```

Request body:
```json
{
  "email": "user@example.com"
}
```

Response:
```json
{
  "message": "If the email exists, a password reset link will be sent."
}
```

### Reset password

```
POST /api/auth/reset-password
```

Request body:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "new_password": "newpassword123"
}
```

Response:
```json
{
  "message": "Password reset successfully"
}
```

### Logout

```
POST /api/auth/logout
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response:
```json
{
  "message": "Successfully logged out"
}
```

## Runtime

### Create a runtime environment

```
POST /api/runtimes
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Request body:
```json
{
  "project_id": "123e4567-e89b-12d3-a456-426614174000",
  "language": "python",
  "entry_point": "main.py",
  "environment_vars": {
    "API_KEY": "your-api-key",
    "DEBUG": "true"
  },
  "timeout": 300
}
```

Response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "project_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "language": "python",
  "status": "created",
  "environment_vars": {
    "API_KEY": "your-api-key",
    "DEBUG": "true"
  },
  "entry_point": "main.py",
  "container_id": null,
  "port": null,
  "url": null,
  "timeout": 300,
  "created_at": "2023-01-01T00:00:00.000Z",
  "updated_at": "2023-01-01T00:00:00.000Z"
}
```

### List runtime environments

```
GET /api/runtimes
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Query parameters:
```
project_id=123e4567-e89b-12d3-a456-426614174000
status=running
language=python
```

Response:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "project_id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "language": "python",
    "status": "running",
    "environment_vars": {
      "API_KEY": "your-api-key",
      "DEBUG": "true"
    },
    "entry_point": "main.py",
    "container_id": "abc123def456",
    "port": 8000,
    "url": "http://localhost:8000",
    "timeout": 300,
    "created_at": "2023-01-01T00:00:00.000Z",
    "updated_at": "2023-01-01T00:00:00.000Z"
  }
]
```

### Get a runtime environment

```
GET /api/runtimes/{runtime_id}
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "project_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "language": "python",
  "status": "running",
  "environment_vars": {
    "API_KEY": "your-api-key",
    "DEBUG": "true"
  },
  "entry_point": "main.py",
  "container_id": "abc123def456",
  "port": 8000,
  "url": "http://localhost:8000",
  "timeout": 300,
  "created_at": "2023-01-01T00:00:00.000Z",
  "updated_at": "2023-01-01T00:00:00.000Z"
}
```

### Update a runtime environment

```
PUT /api/runtimes/{runtime_id}
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Request body:
```json
{
  "entry_point": "app.py",
  "environment_vars": {
    "API_KEY": "new-api-key",
    "DEBUG": "false"
  },
  "timeout": 600
}
```

Response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "project_id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "language": "python",
  "status": "stopped",
  "environment_vars": {
    "API_KEY": "new-api-key",
    "DEBUG": "false"
  },
  "entry_point": "app.py",
  "container_id": null,
  "port": null,
  "url": null,
  "timeout": 600,
  "created_at": "2023-01-01T00:00:00.000Z",
  "updated_at": "2023-01-01T00:00:00.000Z"
}
```

### Delete a runtime environment

```
DELETE /api/runtimes/{runtime_id}
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response:
```json
{
  "message": "Runtime deleted successfully"
}
```

### Start a runtime environment

```
POST /api/runtimes/{runtime_id}/start
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response:
```json
{
  "message": "Runtime starting"
}
```

### Stop a runtime environment

```
POST /api/runtimes/{runtime_id}/stop
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response:
```json
{
  "message": "Runtime stopped"
}
```

### Restart a runtime environment

```
POST /api/runtimes/{runtime_id}/restart
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response:
```json
{
  "message": "Runtime restarting"
}
```

### Get runtime logs

```
GET /api/runtimes/{runtime_id}/logs
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Query parameters:
```
limit=100
```

Response:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "runtime_id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "type": "stdout",
    "message": "Starting application...",
    "timestamp": "2023-01-01T00:00:00.000Z"
  },
  {
    "id": "123e4567-e89b-12d3-a456-426614174001",
    "runtime_id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "type": "stdout",
    "message": "Application started successfully",
    "timestamp": "2023-01-01T00:00:01.000Z"
  }
]
```

## Orchestration

### Create a task

```
POST /api/orchestration/tasks
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Request body:
```json
{
  "task_type": "text_generation",
  "input_data": {
    "prompt": "Write a poem about AI"
  },
  "context": {
    "style": "haiku"
  },
  "tools": ["search", "calculator"],
  "memory_id": "123e4567-e89b-12d3-a456-426614174000",
  "agent_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

Response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "task_type": "text_generation",
  "input_data": {
    "prompt": "Write a poem about AI"
  },
  "context": {
    "style": "haiku"
  },
  "tools": ["search", "calculator"],
  "memory_id": "123e4567-e89b-12d3-a456-426614174000",
  "agent_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "created",
  "result": null,
  "error": null,
  "created_at": "2023-01-01T00:00:00.000Z",
  "updated_at": "2023-01-01T00:00:00.000Z"
}
```

### List tasks

```
GET /api/orchestration/tasks
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Query parameters:
```
task_type=text_generation
status=completed
agent_id=123e4567-e89b-12d3-a456-426614174000
```

Response:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "task_type": "text_generation",
    "input_data": {
      "prompt": "Write a poem about AI"
    },
    "context": {
      "style": "haiku"
    },
    "tools": ["search", "calculator"],
    "memory_id": "123e4567-e89b-12d3-a456-426614174000",
    "agent_id": "123e4567-e89b-12d3-a456-426614174000",
    "status": "completed",
    "result": {
      "text": "Silicon thinking\nElectronic neurons fire\nHuman-like wisdom"
    },
    "error": null,
    "created_at": "2023-01-01T00:00:00.000Z",
    "updated_at": "2023-01-01T00:00:01.000Z"
  }
]
```

### Get a task

```
GET /api/orchestration/tasks/{task_id}
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "task_type": "text_generation",
  "input_data": {
    "prompt": "Write a poem about AI"
  },
  "context": {
    "style": "haiku"
  },
  "tools": ["search", "calculator"],
  "memory_id": "123e4567-e89b-12d3-a456-426614174000",
  "agent_id": "123e4567-e89b-12d3-a456-426614174000",
  "status": "completed",
  "result": {
    "text": "Silicon thinking\nElectronic neurons fire\nHuman-like wisdom"
  },
  "error": null,
  "created_at": "2023-01-01T00:00:00.000Z",
  "updated_at": "2023-01-01T00:00:01.000Z"
}
```

### Delete a task

```
DELETE /api/orchestration/tasks/{task_id}
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response:
```json
{
  "message": "Task deleted successfully"
}
```

### Cancel a task

```
POST /api/orchestration/tasks/{task_id}/cancel
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response:
```json
{
  "message": "Task cancelled successfully"
}
```

### Create an agent

```
POST /api/orchestration/agents
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Request body:
```json
{
  "name": "Poetry Agent",
  "description": "An agent that specializes in writing poetry",
  "capabilities": ["text_generation", "poetry", "creative_writing"],
  "configuration": {
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 1000
  }
}
```

Response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Poetry Agent",
  "description": "An agent that specializes in writing poetry",
  "capabilities": ["text_generation", "poetry", "creative_writing"],
  "configuration": {
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 1000
  },
  "created_at": "2023-01-01T00:00:00.000Z",
  "updated_at": "2023-01-01T00:00:00.000Z"
}
```

### List agents

```
GET /api/orchestration/agents
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Poetry Agent",
    "description": "An agent that specializes in writing poetry",
    "capabilities": ["text_generation", "poetry", "creative_writing"],
    "configuration": {
      "model": "gpt-4",
      "temperature": 0.7,
      "max_tokens": 1000
    },
    "created_at": "2023-01-01T00:00:00.000Z",
    "updated_at": "2023-01-01T00:00:00.000Z"
  }
]
```

### Get an agent

```
GET /api/orchestration/agents/{agent_id}
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Poetry Agent",
  "description": "An agent that specializes in writing poetry",
  "capabilities": ["text_generation", "poetry", "creative_writing"],
  "configuration": {
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 1000
  },
  "created_at": "2023-01-01T00:00:00.000Z",
  "updated_at": "2023-01-01T00:00:00.000Z"
}
```

### Update an agent

```
PUT /api/orchestration/agents/{agent_id}
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Request body:
```json
{
  "name": "Advanced Poetry Agent",
  "description": "An agent that specializes in writing poetry in various styles",
  "capabilities": ["text_generation", "poetry", "creative_writing", "haiku", "sonnet"],
  "configuration": {
    "model": "gpt-4",
    "temperature": 0.8,
    "max_tokens": 2000
  }
}
```

Response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Advanced Poetry Agent",
  "description": "An agent that specializes in writing poetry in various styles",
  "capabilities": ["text_generation", "poetry", "creative_writing", "haiku", "sonnet"],
  "configuration": {
    "model": "gpt-4",
    "temperature": 0.8,
    "max_tokens": 2000
  },
  "created_at": "2023-01-01T00:00:00.000Z",
  "updated_at": "2023-01-01T00:00:01.000Z"
}
```

### Delete an agent

```
DELETE /api/orchestration/agents/{agent_id}
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response:
```json
{
  "message": "Agent deleted successfully"
}
```

### Create a workflow

```
POST /api/orchestration/workflows
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Request body:
```json
{
  "name": "Poetry Generation Workflow",
  "description": "A workflow that generates poetry based on a topic",
  "steps": [
    {
      "id": "step1",
      "name": "Research",
      "task_type": "research",
      "input_data": {
        "query": "${topic}"
      }
    },
    {
      "id": "step2",
      "name": "Generate Poetry",
      "task_type": "text_generation",
      "input_data": {
        "prompt": "Write a poem about ${topic} using the following information: ${step1.result.text}"
      },
      "depends_on": ["step1"]
    }
  ]
}
```

Response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Poetry Generation Workflow",
  "description": "A workflow that generates poetry based on a topic",
  "steps": [
    {
      "id": "step1",
      "name": "Research",
      "task_type": "research",
      "input_data": {
        "query": "${topic}"
      }
    },
    {
      "id": "step2",
      "name": "Generate Poetry",
      "task_type": "text_generation",
      "input_data": {
        "prompt": "Write a poem about ${topic} using the following information: ${step1.result.text}"
      },
      "depends_on": ["step1"]
    }
  ],
  "status": "created",
  "result": null,
  "created_at": "2023-01-01T00:00:00.000Z",
  "updated_at": "2023-01-01T00:00:00.000Z"
}
```

### List workflows

```
GET /api/orchestration/workflows
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response:
```json
[
  {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "name": "Poetry Generation Workflow",
    "description": "A workflow that generates poetry based on a topic",
    "steps": [
      {
        "id": "step1",
        "name": "Research",
        "task_type": "research",
        "input_data": {
          "query": "${topic}"
        }
      },
      {
        "id": "step2",
        "name": "Generate Poetry",
        "task_type": "text_generation",
        "input_data": {
          "prompt": "Write a poem about ${topic} using the following information: ${step1.result.text}"
        },
        "depends_on": ["step1"]
      }
    ],
    "status": "created",
    "result": null,
    "created_at": "2023-01-01T00:00:00.000Z",
    "updated_at": "2023-01-01T00:00:00.000Z"
  }
]
```

### Get a workflow

```
GET /api/orchestration/workflows/{workflow_id}
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Poetry Generation Workflow",
  "description": "A workflow that generates poetry based on a topic",
  "steps": [
    {
      "id": "step1",
      "name": "Research",
      "task_type": "research",
      "input_data": {
        "query": "${topic}"
      }
    },
    {
      "id": "step2",
      "name": "Generate Poetry",
      "task_type": "text_generation",
      "input_data": {
        "prompt": "Write a poem about ${topic} using the following information: ${step1.result.text}"
      },
      "depends_on": ["step1"]
    }
  ],
  "status": "created",
  "result": null,
  "created_at": "2023-01-01T00:00:00.000Z",
  "updated_at": "2023-01-01T00:00:00.000Z"
}
```

### Update a workflow

```
PUT /api/orchestration/workflows/{workflow_id}
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Request body:
```json
{
  "name": "Advanced Poetry Generation Workflow",
  "description": "A workflow that generates poetry based on a topic with additional formatting",
  "steps": [
    {
      "id": "step1",
      "name": "Research",
      "task_type": "research",
      "input_data": {
        "query": "${topic}"
      }
    },
    {
      "id": "step2",
      "name": "Generate Poetry",
      "task_type": "text_generation",
      "input_data": {
        "prompt": "Write a poem about ${topic} using the following information: ${step1.result.text}"
      },
      "depends_on": ["step1"]
    },
    {
      "id": "step3",
      "name": "Format Poetry",
      "task_type": "text_formatting",
      "input_data": {
        "text": "${step2.result.text}",
        "format": "markdown"
      },
      "depends_on": ["step2"]
    }
  ]
}
```

Response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Advanced Poetry Generation Workflow",
  "description": "A workflow that generates poetry based on a topic with additional formatting",
  "steps": [
    {
      "id": "step1",
      "name": "Research",
      "task_type": "research",
      "input_data": {
        "query": "${topic}"
      }
    },
    {
      "id": "step2",
      "name": "Generate Poetry",
      "task_type": "text_generation",
      "input_data": {
        "prompt": "Write a poem about ${topic} using the following information: ${step1.result.text}"
      },
      "depends_on": ["step1"]
    },
    {
      "id": "step3",
      "name": "Format Poetry",
      "task_type": "text_formatting",
      "input_data": {
        "text": "${step2.result.text}",
        "format": "markdown"
      },
      "depends_on": ["step2"]
    }
  ],
  "status": "created",
  "result": null,
  "created_at": "2023-01-01T00:00:00.000Z",
  "updated_at": "2023-01-01T00:00:01.000Z"
}
```

### Delete a workflow

```
DELETE /api/orchestration/workflows/{workflow_id}
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Response:
```json
{
  "message": "Workflow deleted successfully"
}
```

### Execute a workflow

```
POST /api/orchestration/workflows/{workflow_id}/execute
```

Headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Request body:
```json
{
  "topic": "artificial intelligence"
}
```

Response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174001",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "task_type": "workflow",
  "input_data": {
    "topic": "artificial intelligence"
  },
  "context": {
    "workflow_id": "123e4567-e89b-12d3-a456-426614174000"
  },
  "tools": null,
  "memory_id": null,
  "agent_id": null,
  "status": "created",
  "result": null,
  "error": null,
  "created_at": "2023-01-01T00:00:00.000Z",
  "updated_at": "2023-01-01T00:00:00.000Z"
}
```