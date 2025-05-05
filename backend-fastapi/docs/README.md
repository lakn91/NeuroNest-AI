# NeuroNest-AI Documentation

## Overview

NeuroNest-AI is an advanced AI platform that provides a comprehensive environment for building, training, and deploying AI agents. It offers a wide range of features including:

- Multi-agent orchestration
- Runtime environments for code execution
- Memory management for AI agents
- Authentication and user management
- Project management
- Conversation management
- Document indexing and retrieval

## Architecture

The NeuroNest-AI platform consists of the following components:

### Backend

- **FastAPI**: The main backend framework
- **PostgreSQL**: Primary database for storing user data, projects, agents, etc.
- **Redis**: Caching and message broker
- **Docker**: Container management for runtime environments

### Frontend

- **React**: The main frontend framework
- **Vite**: Build tool
- **TailwindCSS**: Styling
- **React Router**: Routing
- **React Query**: Data fetching
- **Zustand**: State management

## Database Schema

The database schema includes the following tables:

- **users**: User accounts
- **sessions**: User sessions
- **projects**: User projects
- **agents**: AI agents
- **memories**: Agent memories
- **conversations**: User conversations
- **messages**: Conversation messages
- **runtimes**: Runtime environments
- **runtime_logs**: Runtime logs
- **orchestration_tasks**: Orchestration tasks
- **orchestration_agents**: Orchestration agents
- **orchestration_workflows**: Orchestration workflows
- **document_indices**: Document indices
- **documents**: Documents

## API Endpoints

The API is organized into the following routes:

- **/api/auth**: Authentication endpoints
- **/api/users**: User management endpoints
- **/api/projects**: Project management endpoints
- **/api/agents**: Agent management endpoints
- **/api/memories**: Memory management endpoints
- **/api/conversations**: Conversation management endpoints
- **/api/runtimes**: Runtime management endpoints
- **/api/orchestration**: Orchestration endpoints
- **/api/documents**: Document management endpoints

## Authentication

NeuroNest-AI uses JWT (JSON Web Tokens) for authentication. The authentication flow is as follows:

1. User registers or logs in
2. Server validates credentials and returns a JWT token
3. Client includes the JWT token in the Authorization header for subsequent requests
4. Server validates the token and authorizes the request

## Environment Variables

The application uses environment variables for configuration. These are loaded from `.env` files based on the environment:

- `.env.dev`: Development environment
- `.env.prod`: Production environment
- `.env.local`: Local development environment

## Development Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- Docker and Docker Compose
- PostgreSQL 14+
- Redis 6+

### Backend Setup

1. Clone the repository
2. Create a virtual environment: `python -m venv venv`
3. Activate the virtual environment: `source venv/bin/activate` (Linux/Mac) or `venv\Scripts\activate` (Windows)
4. Install dependencies: `pip install -r requirements.txt`
5. Create a `.env.local` file with the required environment variables
6. Start the database and Redis: `docker-compose up -d postgres redis`
7. Run the backend: `uvicorn app.main:app --reload`

### Frontend Setup

1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Create a `.env.local` file with the required environment variables
4. Start the frontend: `npm run dev`

## Deployment

### Docker Deployment

1. Build the Docker images: `docker-compose build`
2. Start the services: `docker-compose up -d`

### Kubernetes Deployment

1. Apply the Kubernetes manifests: `kubectl apply -f k8s/`

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.