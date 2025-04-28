# NeuroNest-AI

A multi-purpose intelligent agent platform that transforms ideas into functional projects.

## Vision

NeuroNest-AI aims to be a comprehensive platform where users can input their ideas through text, voice, or files, and have specialized AI agents transform these ideas into fully functional projects with executable code.

## Features

### Current Features
- Interactive chat interface
- Multi-modal input (text, voice, files)
- Specialized AI agents powered by LangChain.js:
  - Thinking Agent: Analyzes requests and creates plans
  - Developer Agent: Converts ideas into code (frontend focus)
  - Editor Agent: Reviews and improves outputs
  - Orchestrator Agent: Coordinates between specialized agents
- Advanced document processing (PDF, text files)
- Firebase integration for cloud storage:
  - User settings
  - Project history
  - Conversation history
- Multiple AI provider support:
  - Google Gemini
  - OpenAI
- User API key management
- Code generation and preview
- Project export capabilities

### Planned Features
- Backend server generation
- Multi-language support (Python, Java, Kotlin, Swift, etc.)
- Automatic dependency management
- Live execution environment
- Custom agent creation

## Getting Started

### Prerequisites
- Node.js (v16+)
- Python (v3.8+)
- Docker (for execution environment)

### Installation

#### Option 1: Manual Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/NeuroNest-AI.git
cd NeuroNest-AI
```

2. Install frontend dependencies
```bash
cd frontend
npm install
```

3. Install backend dependencies
```bash
cd ../backend
npm install
```

4. Set up environment variables
```bash
# Backend environment variables
cd ../backend
cp .env.example .env
# Edit .env with your API keys and configuration

# Frontend environment variables
cd ../frontend
cp .env.example .env
# Edit .env with your Firebase configuration
```

5. Set up Firebase
   - Create a new Firebase project at https://console.firebase.google.com/
   - Enable Authentication, Firestore, and Storage
   - Create a web app and copy the configuration to your frontend .env file
   - Generate a service account key for the backend and save it securely

6. Start the development servers
```bash
# Option A: Using the start script
cd ..
chmod +x start.sh
./start.sh

# Option B: Start servers separately
# Terminal 1 - Frontend
cd frontend
npm run dev

# Terminal 2 - Backend
cd backend
npm run dev
```

#### Option 2: Docker Setup

1. Clone the repository
```bash
git clone https://github.com/yourusername/NeuroNest-AI.git
cd NeuroNest-AI
```

2. Set up environment variables
```bash
# Backend environment variables
cd backend
cp .env.example .env
# Edit .env with your API keys and configuration

# Frontend environment variables
cd ../frontend
cp .env.example .env
# Edit .env with your Firebase configuration
```

3. Start the application with Docker Compose
```bash
cd ..
docker-compose up
```

### API Keys Setup

NeuroNest-AI supports multiple AI providers. You can configure your API keys in the settings page or in the environment variables:

1. **Google Gemini API Key**
   - Get your API key from [Google AI Studio](https://ai.google.dev/)
   - Add it to your backend .env file as `GEMINI_API_KEY=your_key_here`
   - Or enter it in the settings page

2. **OpenAI API Key**
   - Get your API key from [OpenAI Dashboard](https://platform.openai.com/api-keys)
   - Add it to your backend .env file as `OPENAI_API_KEY=your_key_here`
   - Or enter it in the settings page

### Accessing the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Documentation: http://localhost:5000/api-docs

## Project Structure

- `/frontend` - React.js frontend application
- `/backend` - Node.js backend server
- `/agents` - AI agent system
- `/execution-env` - Docker-based execution environment
- `/docs` - Documentation

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.