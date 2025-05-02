# NeuroNest AI

<div align="center">
  <h3>Advanced AI Agent System with Arabic Language Support</h3>
  
  ![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
  ![License](https://img.shields.io/badge/license-MIT-green.svg)
</div>

## 🌟 Overview

NeuroNest AI is a powerful, modular AI agent system designed to provide advanced capabilities with special focus on Arabic language support. Built with a modern architecture, it offers a secure sandbox environment, dynamic agent system, plugin support, and advanced memory management.

## ✨ Key Features

- **Modular Architecture**: Clean separation of concerns with a well-structured codebase
- **Event-Driven Design**: Flexible communication between components using an event system
- **Secure Sandbox**: Docker-based isolated environment for safe code execution
- **Dynamic Agent System**: Extensible agent framework with registry and factory patterns
- **Advanced Memory Management**: Sophisticated memory system with different storage types
- **Plugin System**: Extend functionality through a robust plugin architecture
- **Arabic Language Support**: Specialized processing for Arabic text with dialect detection
- **LLM Integration**: Support for multiple language model providers
- **Security-First Approach**: Comprehensive permission system and audit logging

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Docker (for sandbox features)
- TypeScript 5.3+
- Firebase account (optional)
- Supabase account (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/neuronest-ai.git
cd neuronest-ai

# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

### Configuration

Create a `.env` file in the root directory with the following variables:

```
# Server
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your_jwt_secret

# LLM Providers
OPENAI_API_KEY=your_openai_api_key
GOOGLE_API_KEY=your_google_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Database
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
FIREBASE_CONFIG=your_firebase_config
```

## 📋 Project Structure

```
neuronest-ai/
├── src/                   # Source code
│   ├── core/              # Core system components
│   │   ├── agents/        # Agent system
│   │   │   ├── Agent.ts             # Base agent interface
│   │   │   ├── AgentRegistry.ts     # Agent registry
│   │   │   ├── ThinkingAgent.ts     # Thinking agent
│   │   │   ├── DeveloperAgent.ts    # Developer agent
│   │   │   └── EditorAgent.ts       # Editor agent
│   │   ├── events/        # Event system
│   │   │   ├── Event.ts             # Event interface
│   │   │   ├── Action.ts            # Action events
│   │   │   ├── Observation.ts       # Observation events
│   │   │   └── EventStream.ts       # Event stream
│   │   ├── i18n/          # Internationalization
│   │   │   └── I18n.ts              # I18n system with Arabic support
│   │   ├── llm/           # LLM integration
│   │   │   ├── LLMProvider.ts       # LLM provider interface
│   │   │   ├── OpenAIProvider.ts    # OpenAI implementation
│   │   │   └── LLMProviderRegistry.ts # Provider registry
│   │   ├── memory/        # Memory system
│   │   │   ├── Memory.ts            # Memory interface
│   │   │   ├── BufferMemory.ts      # In-memory storage
│   │   │   ├── VectorMemory.ts      # Vector-based memory
│   │   │   ├── MemoryView.ts        # Memory views
│   │   │   └── MemoryRegistry.ts    # Memory registry
│   │   ├── monitoring/    # Monitoring and logging
│   │   │   ├── Metrics.ts           # Metrics system
│   │   │   ├── MetricsRegistry.ts   # Metrics registry
│   │   │   └── Logger.ts            # Logging system
│   │   ├── plugins/       # Plugin system
│   │   │   ├── Plugin.ts            # Plugin interface
│   │   │   └── PluginManager.ts     # Plugin manager
│   │   ├── runtime/       # Runtime and sandbox
│   │   │   ├── Runtime.ts           # Runtime interface
│   │   │   ├── DockerRuntime.ts     # Docker runtime
│   │   │   └── RuntimeRegistry.ts   # Runtime registry
│   │   └── tasks/         # Task system
│   │       ├── Task.ts              # Task interface
│   │       ├── SimpleTask.ts        # Simple task
│   │       ├── MultiStageTask.ts    # Multi-stage task
│   │       └── TaskManager.ts       # Task manager
│   ├── NeuroNest.ts       # Main application class
│   ├── index.ts           # Entry point
│   └── cli.ts             # Command-line interface
├── frontend/              # React/Next.js frontend (future)
├── tests/                 # Test files
├── dist/                  # Compiled output
├── docs/                  # Documentation
├── .env                   # Environment variables
├── package.json           # Dependencies
└── tsconfig.json          # TypeScript configuration
```

## 🔧 Development

```bash
# Run in development mode with hot reloading
npm run dev

# Run the CLI interface
npm run cli

# Build the project
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## 🔒 Security

NeuroNest AI implements several security measures:

- Sandboxed execution environment
- Comprehensive permission system
- Audit logging for all sensitive operations
- Rate limiting for API endpoints
- Input validation and sanitization

## 🌐 Arabic Language Support

NeuroNest AI provides specialized support for Arabic language processing:

- Dialect detection and handling
- Text direction management
- Transliteration capabilities
- Arabic-specific NLP utilities
- Enhanced prompts for Arabic language understanding

## 🔌 Plugin System

Extend NeuroNest AI with plugins:

```typescript
import { BasePlugin, PluginMetadata } from './core/plugins/Plugin';

export class MyCustomPlugin extends BasePlugin {
  constructor() {
    const metadata: PluginMetadata = {
      id: 'my-custom-plugin',
      name: 'My Custom Plugin',
      version: '1.0.0',
      description: 'A custom plugin for NeuroNest AI',
      author: 'Your Name'
    };
    
    super(metadata);
  }
  
  // Implement required methods
  async initialize(): Promise<void> {
    // Plugin initialization logic
    this.logger.info('Initializing plugin', this.metadata.id);
  }
  
  async activate(): Promise<void> {
    // Plugin activation logic
    this.logger.info('Activating plugin', this.metadata.id);
    
    // Register event handlers
    this.eventStream.on('action', (event) => {
      this.handleAction(event);
    });
  }
  
  async deactivate(): Promise<void> {
    // Plugin deactivation logic
    this.logger.info('Deactivating plugin', this.metadata.id);
    
    // Unregister event handlers
    this.eventStream.off('action');
  }
  
  private handleAction(event: any): void {
    // Handle action events
    this.logger.debug('Handling action', this.metadata.id, event);
  }
  
  // Custom methods
  async executeCommand(command: string, args?: any): Promise<any> {
    // Command execution logic
    this.logger.info(`Executing command: ${command}`, this.metadata.id);
    return { result: 'success', command, args };
  }
}
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Contact

For questions or support, please open an issue or contact the maintainers.

## Acknowledgments

- OpenAI for providing the foundation models
- OpenRouter for API integration
- Firebase and Supabase for backend services

---

<div align="center">
  <p>Built with ❤️ by the NeuroNest Team</p>
</div>
