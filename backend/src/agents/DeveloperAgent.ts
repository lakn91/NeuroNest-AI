import { BaseAgent } from './BaseAgent';
import { AgentResponse, AgentConfig } from './AgentInterface';
import { EventStream } from './EventStream';
import { LLMProvider } from './LLMProvider';
import { Action } from './Action';
import { Observation } from './Observation';
import langchainUtils from '../utils/langchain';

/**
 * Agent responsible for generating code based on specifications
 */
export class DeveloperAgent extends BaseAgent {
  private developerChain;
  
  /**
   * Create a new DeveloperAgent
   * @param eventStream The event stream for the agent
   * @param llmProvider The LLM provider for the agent
   */
  constructor(eventStream: EventStream, llmProvider: LLMProvider) {
    super(eventStream, llmProvider);
    
    try {
      this.developerChain = langchainUtils.createDeveloperAgentChain();
    } catch (error) {
      console.error('Error initializing DeveloperAgent chain:', error);
    }
  }
  
  /**
   * Initialize the agent
   * @param config Configuration for the agent
   */
  async initialize(config: AgentConfig): Promise<void> {
    await super.initialize(config);
    
    // Set default system message if not provided
    if (!this.systemMessage) {
      this.systemMessage = `You are a senior software developer specializing in multiple programming languages.
Your task is to generate high-quality, production-ready code based on the requirements provided.

Guidelines:
1. Write clean, efficient, and well-documented code
2. Follow best practices and design patterns for the specified language
3. Include appropriate error handling
4. Structure the code logically
5. Include comments to explain complex logic
6. If a framework is specified, use it appropriately
7. Include any necessary imports or dependencies

The code should be complete and ready to use without requiring significant modifications.`;
    }
  }
  
  /**
   * Process an observation and generate an action
   * @param observation The observation to process
   * @returns The action to take
   */
  async process(observation: Observation): Promise<Action> {
    try {
      // Extract message and context from observation
      let message = '';
      let context: any = {};
      
      if (observation.data.type === 'user_message') {
        message = observation.data.message;
        context = observation.data.context || {};
      } else if (observation.data.type === 'text') {
        message = observation.data.content;
        context = observation.data.context || {};
      } else {
        // For other observation types, convert to string
        message = JSON.stringify(observation.data);
      }
      
      const language = context?.language || 'html';
      const fileType = context?.fileType || this.getFileTypeFromLanguage(language);
      
      let code: string;
      
      // Use LangChain if available, otherwise use mock code
      if (this.developerChain) {
        try {
          code = await this.developerChain.invoke({
            input: message,
            language: language,
            fileType: fileType
          });
        } catch (langchainError) {
          console.error('Error using LangChain:', langchainError);
          code = this.generateMockCode(language, message);
        }
      } else {
        code = this.generateMockCode(language, message);
      }
      
      // Create a code action
      return Action.createCodeAction(this.id, code, language);
    } catch (error) {
      console.error('Error in DeveloperAgent:', error);
      return Action.createErrorAction(this.id, 'Failed to generate code');
    }
  }
  
  /**
   * Legacy method for backward compatibility
   * @param message The message to process
   * @param context Additional context including language and specifications
   * @returns Generated code
   * @deprecated Use process(observation) instead
   */
  async processMessage(message: string, context?: any): Promise<AgentResponse> {
    // Create an observation from the message
    const observation = Observation.createUserMessageObservation('user', message);
    
    // Add context to the observation if provided
    if (context) {
      observation.data.context = context;
    }
    
    // Process the observation
    const action = await this.process(observation);
    
    // Convert the action to a legacy response
    return this.actionToLegacyResponse(action);
  }
  
  /**
   * Get file type from language
   * @param language The programming language
   * @returns The file type
   */
  private getFileTypeFromLanguage(language: string): string {
    switch (language.toLowerCase()) {
      case 'html':
        return 'HTML';
      case 'css':
        return 'CSS';
      case 'javascript':
      case 'js':
        return 'JavaScript';
      case 'typescript':
      case 'ts':
        return 'TypeScript';
      case 'python':
      case 'py':
        return 'Python';
      case 'java':
        return 'Java';
      case 'c#':
      case 'csharp':
        return 'C#';
      case 'go':
        return 'Go';
      case 'rust':
        return 'Rust';
      default:
        return language;
    }
  }
  
  /**
   * Generate mock code for demonstration purposes
   * @param language The programming language
   * @param message The user message
   * @returns Mock code in the specified language
   */
  private generateMockCode(language: string, message: string): string {
    switch (language.toLowerCase()) {
      case 'html':
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated Page</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header>
    <h1>Welcome to the Generated Page</h1>
    <nav>
      <ul>
        <li><a href="#">Home</a></li>
        <li><a href="#">About</a></li>
        <li><a href="#">Contact</a></li>
      </ul>
    </nav>
  </header>
  
  <main>
    <section>
      <h2>About This Page</h2>
      <p>This page was generated based on your request: "${message}"</p>
    </section>
  </main>
  
  <footer>
    <p>&copy; 2025 NeuroNest-AI</p>
  </footer>
  
  <script src="script.js"></script>
</body>
</html>`;
      
      case 'css':
        return `/* Generated CSS styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Arial', sans-serif;
  line-height: 1.6;
  color: #333;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

header {
  background-color: #f4f4f4;
  padding: 20px;
  margin-bottom: 20px;
}

nav ul {
  display: flex;
  list-style: none;
}

nav ul li {
  margin-right: 20px;
}

nav ul li a {
  text-decoration: none;
  color: #333;
}

nav ul li a:hover {
  color: #0066cc;
}

section {
  margin-bottom: 30px;
}

footer {
  text-align: center;
  margin-top: 40px;
  padding: 20px;
  background-color: #f4f4f4;
}`;
      
      case 'javascript':
        return `// Generated JavaScript code
document.addEventListener('DOMContentLoaded', function() {
  console.log('Page loaded successfully!');
  
  // Add event listeners to navigation links
  const navLinks = document.querySelectorAll('nav a');
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      alert('Navigation to: ' + this.textContent);
    });
  });
  
  // Create a simple interactive element
  const main = document.querySelector('main');
  const interactiveSection = document.createElement('section');
  interactiveSection.innerHTML = \`
    <h2>Interactive Section</h2>
    <p>Click the button below to see a message.</p>
    <button id="messageButton">Show Message</button>
    <p id="messageOutput" style="display: none; margin-top: 10px;"></p>
  \`;
  main.appendChild(interactiveSection);
  
  // Add functionality to the button
  const messageButton = document.getElementById('messageButton');
  const messageOutput = document.getElementById('messageOutput');
  
  messageButton.addEventListener('click', function() {
    messageOutput.textContent = 'Hello from NeuroNest-AI! This page responds to your request.';
    messageOutput.style.display = 'block';
  });
});`;
      
      default:
        return `// Generated code for ${language}\n// This is a placeholder for actual code generation`;
    }
  }
}