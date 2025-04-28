import { BaseAgent } from './BaseAgent';
import { AgentResponse } from './AgentInterface';
import langchainUtils from '../utils/langchain';

/**
 * Agent responsible for generating code based on specifications
 */
export class DeveloperAgent extends BaseAgent {
  private developerChain;
  
  constructor() {
    super(
      'Developer Agent',
      'Generates code based on specifications'
    );
    
    try {
      this.developerChain = langchainUtils.createDeveloperAgentChain();
    } catch (error) {
      console.error('Error initializing DeveloperAgent chain:', error);
    }
  }
  
  /**
   * Process a message and generate code
   * @param message The message to process
   * @param context Additional context including language and specifications
   * @returns Generated code
   */
  async process(message: string, context?: any): Promise<AgentResponse> {
    try {
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
      
      return this.createCodeResponse(code, language);
    } catch (error) {
      console.error('Error in DeveloperAgent:', error);
      return this.createErrorResponse('Failed to generate code');
    }
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