#!/usr/bin/env node
/**
 * NeuroNest AI CLI
 * Command-line interface for the NeuroNest AI application
 */
import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { NeuroNest } from './NeuroNest';
import { Logger, LogLevel } from './core/monitoring/Logger';
import { SimpleTask } from './core/tasks/SimpleTask';
import { TaskStatus } from './core/tasks/Task';

// Load environment variables
dotenv.config();

/**
 * CLI class for interacting with NeuroNest AI
 */
class NeuroNestCLI {
  private neuroNest: NeuroNest;
  private logger: Logger;
  private rl: readline.Interface;
  private running: boolean = false;
  
  /**
   * Constructor
   */
  constructor() {
    this.neuroNest = NeuroNest.getInstance();
    this.logger = Logger.getInstance();
    
    // Create readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'NeuroNest> '
    });
  }
  
  /**
   * Initialize the CLI
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing NeuroNest CLI...', 'CLI');
    
    try {
      // Initialize NeuroNest
      await this.neuroNest.initialize({
        apiKeys: {
          openai: process.env.OPENAI_API_KEY,
          anthropic: process.env.ANTHROPIC_API_KEY,
          google: process.env.GOOGLE_API_KEY
        },
        defaultLocale: process.env.DEFAULT_LOCALE || 'en',
        maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS || '5'),
        pluginDir: process.env.PLUGIN_DIR || './plugins'
      });
      
      this.logger.info('NeuroNest CLI initialized successfully', 'CLI');
    } catch (error) {
      this.logger.error(`Failed to initialize NeuroNest CLI: ${error.message}`, 'CLI', error);
      throw error;
    }
  }
  
  /**
   * Start the CLI
   */
  start(): void {
    if (this.running) {
      return;
    }
    
    this.running = true;
    
    // Print welcome message
    const i18n = this.neuroNest.getI18n();
    console.log(`\n${i18n.t('app.welcome')}`);
    console.log(`${i18n.t('app.tagline')}\n`);
    console.log('Type "help" for a list of commands, or "exit" to quit.\n');
    
    // Start prompt
    this.rl.prompt();
    
    // Handle input
    this.rl.on('line', async (line) => {
      const input = line.trim();
      
      if (input === '') {
        this.rl.prompt();
        return;
      }
      
      try {
        await this.handleCommand(input);
      } catch (error) {
        console.error(`Error: ${error.message}`);
      }
      
      this.rl.prompt();
    });
    
    // Handle close
    this.rl.on('close', async () => {
      await this.stop();
      process.exit(0);
    });
  }
  
  /**
   * Stop the CLI
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }
    
    this.running = false;
    
    // Close readline interface
    this.rl.close();
    
    // Shutdown NeuroNest
    await this.neuroNest.shutdown();
    
    this.logger.info('NeuroNest CLI stopped', 'CLI');
  }
  
  /**
   * Handle a command
   * @param input The command input
   */
  private async handleCommand(input: string): Promise<void> {
    const [command, ...args] = input.split(' ');
    
    switch (command.toLowerCase()) {
      case 'help':
        this.showHelp();
        break;
      
      case 'exit':
      case 'quit':
        await this.stop();
        process.exit(0);
        break;
      
      case 'version':
        this.showVersion();
        break;
      
      case 'status':
        this.showStatus();
        break;
      
      case 'agents':
        this.showAgents();
        break;
      
      case 'tasks':
        this.showTasks();
        break;
      
      case 'plugins':
        this.showPlugins();
        break;
      
      case 'locale':
        if (args.length > 0) {
          this.setLocale(args[0]);
        } else {
          this.showLocale();
        }
        break;
      
      case 'ask':
        await this.askQuestion(args.join(' '));
        break;
      
      default:
        if (input.startsWith('!')) {
          // Execute as a task
          await this.executeTask(input.substring(1));
        } else {
          // Default to ask
          await this.askQuestion(input);
        }
        break;
    }
  }
  
  /**
   * Show help
   */
  private showHelp(): void {
    console.log('\nAvailable commands:');
    console.log('  help                 Show this help message');
    console.log('  exit, quit           Exit the CLI');
    console.log('  version              Show version information');
    console.log('  status               Show system status');
    console.log('  agents               List available agents');
    console.log('  tasks                List running tasks');
    console.log('  plugins              List installed plugins');
    console.log('  locale [code]        Show or set the current locale');
    console.log('  ask <question>       Ask a question (or just type your question directly)');
    console.log('  !<command>           Execute a command as a task');
    console.log('');
  }
  
  /**
   * Show version
   */
  private showVersion(): void {
    console.log('\nNeuroNest AI');
    console.log('Version: 1.0.0');
    console.log('');
  }
  
  /**
   * Show status
   */
  private showStatus(): void {
    const taskManager = this.neuroNest.getTaskManager();
    const memoryRegistry = this.neuroNest.getMemoryRegistry();
    const llmRegistry = this.neuroNest.getLLMProviderRegistry();
    
    console.log('\nSystem Status:');
    console.log(`  Active Tasks: ${taskManager.getActiveTasks().length}`);
    console.log(`  Completed Tasks: ${taskManager.getTasksByStatus(TaskStatus.COMPLETED).length}`);
    console.log(`  Failed Tasks: ${taskManager.getTasksByStatus(TaskStatus.FAILED).length}`);
    console.log(`  Memory Instances: ${memoryRegistry.getAllMemories().length}`);
    console.log(`  LLM Providers: ${llmRegistry.getAllProviders().length}`);
    console.log('');
  }
  
  /**
   * Show agents
   */
  private showAgents(): void {
    const agentRegistry = this.neuroNest.getAgentRegistry();
    const i18n = this.neuroNest.getI18n();
    
    console.log('\nAvailable Agents:');
    
    const agentTypes = agentRegistry.getAgentTypes();
    if (agentTypes.length === 0) {
      console.log('  No agents available');
    } else {
      for (const type of agentTypes) {
        console.log(`  ${type}: ${i18n.t(`agent.${type}.description`)}`);
      }
    }
    
    console.log('');
  }
  
  /**
   * Show tasks
   */
  private showTasks(): void {
    const taskManager = this.neuroNest.getTaskManager();
    
    console.log('\nActive Tasks:');
    
    const activeTasks = taskManager.getActiveTasks();
    if (activeTasks.length === 0) {
      console.log('  No active tasks');
    } else {
      for (const task of activeTasks) {
        console.log(`  ${task.getId()}: ${task.getName()} (${task.getStatus()})`);
      }
    }
    
    console.log('');
  }
  
  /**
   * Show plugins
   */
  private showPlugins(): void {
    const pluginManager = this.neuroNest.getPluginManager();
    
    console.log('\nInstalled Plugins:');
    
    const plugins = pluginManager.getPlugins();
    if (plugins.length === 0) {
      console.log('  No plugins installed');
    } else {
      for (const plugin of plugins) {
        console.log(`  ${plugin.getName()} v${plugin.getVersion()}: ${plugin.getDescription()}`);
      }
    }
    
    console.log('');
  }
  
  /**
   * Show locale
   */
  private showLocale(): void {
    const i18n = this.neuroNest.getI18n();
    
    console.log('\nCurrent Locale:');
    console.log(`  ${i18n.getLocale()}`);
    
    console.log('\nAvailable Locales:');
    for (const locale of i18n.getAvailableLocales()) {
      console.log(`  ${locale}${locale === i18n.getLocale() ? ' (current)' : ''}`);
    }
    
    console.log('');
  }
  
  /**
   * Set locale
   * @param locale The locale to set
   */
  private setLocale(locale: string): void {
    const i18n = this.neuroNest.getI18n();
    
    if (i18n.hasLocale(locale)) {
      i18n.setLocale(locale);
      console.log(`\nLocale set to ${locale}`);
    } else {
      console.log(`\nLocale ${locale} not available`);
      console.log('Available locales:');
      for (const availableLocale of i18n.getAvailableLocales()) {
        console.log(`  ${availableLocale}`);
      }
    }
    
    console.log('');
  }
  
  /**
   * Ask a question
   * @param question The question to ask
   */
  private async askQuestion(question: string): Promise<void> {
    if (!question) {
      console.log('\nPlease provide a question');
      return;
    }
    
    console.log('\nThinking...');
    
    try {
      const taskManager = this.neuroNest.getTaskManager();
      const llmRegistry = this.neuroNest.getLLMProviderRegistry();
      const eventStream = this.neuroNest.getEventStream();
      
      // Get default LLM provider
      const provider = llmRegistry.getProvider('openai');
      if (!provider) {
        console.log('\nNo LLM provider available');
        return;
      }
      
      // Create a simple task
      const task = new SimpleTask({
        name: 'Ask Question',
        description: `Answer the question: ${question}`,
        action: async () => {
          const response = await provider.complete({
            prompt: question,
            maxTokens: 1000
          });
          
          return response.text;
        }
      });
      
      // Execute the task
      const result = await taskManager.executeTask(task);
      
      console.log(`\n${result}`);
    } catch (error) {
      console.error(`\nError: ${error.message}`);
    }
    
    console.log('');
  }
  
  /**
   * Execute a task
   * @param command The command to execute
   */
  private async executeTask(command: string): Promise<void> {
    if (!command) {
      console.log('\nPlease provide a command');
      return;
    }
    
    console.log('\nExecuting...');
    
    try {
      const taskManager = this.neuroNest.getTaskManager();
      
      // Create a simple task
      const task = new SimpleTask({
        name: 'Execute Command',
        description: `Execute command: ${command}`,
        action: async () => {
          // This is a placeholder for actual command execution
          // In a real implementation, this would use the runtime system
          return `Executed command: ${command}`;
        }
      });
      
      // Execute the task
      const result = await taskManager.executeTask(task);
      
      console.log(`\n${result}`);
    } catch (error) {
      console.error(`\nError: ${error.message}`);
    }
    
    console.log('');
  }
}

/**
 * Main function
 */
async function main() {
  // Set log level
  Logger.getInstance().setMinLevel(LogLevel.INFO);
  
  // Create CLI
  const cli = new NeuroNestCLI();
  
  try {
    // Initialize CLI
    await cli.initialize();
    
    // Start CLI
    cli.start();
  } catch (error) {
    console.error(`Failed to start NeuroNest CLI: ${error.message}`);
    process.exit(1);
  }
}

// Start the CLI
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});