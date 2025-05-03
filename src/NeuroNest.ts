import { DefaultEventStream } from './core/events/EventStream';
import { AgentRegistry } from './core/agents/AgentRegistry';
import { ThinkingAgent } from './core/agents/ThinkingAgent';
import { DeveloperAgent } from './core/agents/DeveloperAgent';
import { EditorAgent } from './core/agents/EditorAgent';
import { LLMProviderRegistry } from './core/llm/LLMProviderRegistry';
import { OpenAIProvider } from './core/llm/OpenAIProvider';
import { MemoryRegistry } from './core/memory/MemoryRegistry';
import { BufferMemory } from './core/memory/BufferMemory';
import { VectorMemory } from './core/memory/VectorMemory';
import { PluginManager } from './core/plugins/PluginManager';
import { RuntimeRegistry } from './core/runtime/RuntimeRegistry';
import { DockerRuntime } from './core/runtime/DockerRuntime';
import { TaskManager } from './core/tasks/TaskManager';
import { MetricsRegistry } from './core/monitoring/MetricsRegistry';
import { Logger } from './core/monitoring/Logger';
import { DefaultI18n } from './core/i18n/I18n';

/**
 * Configuration for the NeuroNest application
 */
export interface NeuroNestConfig {
  /**
   * API keys for various services
   */
  apiKeys?: {
    /**
     * OpenAI API key
     */
    openai?: string;
    
    /**
     * Anthropic API key
     */
    anthropic?: string;
    
    /**
     * Google API key
     */
    google?: string;
  };
  
  /**
   * Default locale for the application
   */
  defaultLocale?: string;
  
  /**
   * Maximum number of concurrent tasks
   */
  maxConcurrentTasks?: number;
  
  /**
   * Path to plugin directory
   */
  pluginDir?: string;
  
  /**
   * Additional configuration options
   */
  [key: string]: any;
}

/**
 * Main NeuroNest application class
 */
export class NeuroNest {
  private static instance: NeuroNest;
  private config: NeuroNestConfig;
  private eventStream: DefaultEventStream;
  private agentRegistry: AgentRegistry;
  private llmRegistry: LLMProviderRegistry;
  private memoryRegistry: MemoryRegistry;
  private pluginManager: PluginManager;
  private runtimeRegistry: RuntimeRegistry;
  private taskManager: TaskManager;
  private metricsRegistry: MetricsRegistry;
  private logger: Logger;
  private i18n: DefaultI18n;
  private initialized: boolean = false;
  
  /**
   * Get the agent registry
   * @returns The agent registry
   */
  public getAgentManager(): AgentRegistry {
    return this.agentRegistry;
  }
  
  /**
   * Get the singleton instance of the application
   */
  public static getInstance(): NeuroNest {
    if (!NeuroNest.instance) {
      NeuroNest.instance = new NeuroNest();
    }
    return NeuroNest.instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.config = {};
    this.eventStream = new DefaultEventStream();
    this.agentRegistry = AgentRegistry.getInstance();
    this.llmRegistry = LLMProviderRegistry.getInstance();
    this.memoryRegistry = MemoryRegistry.getInstance();
    this.pluginManager = PluginManager.getInstance();
    this.runtimeRegistry = RuntimeRegistry.getInstance();
    this.taskManager = TaskManager.getInstance();
    this.metricsRegistry = MetricsRegistry.getInstance();
    this.logger = Logger.getInstance();
    this.i18n = DefaultI18n.getInstance();
  }
  
  /**
   * Initialize the application
   * @param config Configuration for the application
   */
  async initialize(config: NeuroNestConfig = {}): Promise<void> {
    if (this.initialized) {
      this.logger.warn('NeuroNest already initialized', 'NeuroNest');
      return;
    }
    
    this.config = config;
    
    try {
      this.logger.info('Initializing NeuroNest', 'NeuroNest');
      
      // Set default locale
      if (config.defaultLocale) {
        this.i18n.setLocale(config.defaultLocale);
      }
      
      // Set max concurrent tasks
      if (config.maxConcurrentTasks) {
        this.taskManager.setMaxConcurrentTasks(config.maxConcurrentTasks);
      }
      
      // Register LLM providers
      this.registerLLMProviders();
      
      // Register memory types
      this.registerMemoryTypes();
      
      // Register agent types
      this.registerAgentTypes();
      
      // Register runtime environments
      this.registerRuntimeEnvironments();
      
      // Load plugins
      if (config.pluginDir && typeof this.pluginManager.loadPluginsFromDirectory === 'function') {
        try {
          await this.pluginManager.loadPluginsFromDirectory(config.pluginDir);
        } catch (pluginError) {
          const errorMessage = pluginError instanceof Error ? pluginError.message : String(pluginError);
          this.logger.warn(`Failed to load plugins: ${errorMessage}`, 'NeuroNest');
        }
      } else if (config.pluginDir) {
        this.logger.warn('Plugin manager does not have loadPluginsFromDirectory method, skipping plugin loading', 'NeuroNest');
      }
      
      this.initialized = true;
      this.logger.info('NeuroNest initialized successfully', 'NeuroNest');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to initialize NeuroNest: ${errorMessage}`, 'NeuroNest', error);
      throw error;
    }
  }
  
  /**
   * Register LLM providers
   */
  private registerLLMProviders(): void {
    // Check if llmRegistry exists and has the registerProvider method
    if (!this.llmRegistry || typeof this.llmRegistry.registerProvider !== 'function') {
      this.logger.warn('LLM registry is not properly initialized or does not have registerProvider method, skipping LLM provider registration', 'NeuroNest');
      return;
    }
    
    try {
      // Register OpenAI provider
      if (this.config.apiKeys?.openai) {
        const openaiProvider = new OpenAIProvider({
          apiKey: this.config.apiKeys.openai
        });
        this.llmRegistry.registerProvider('openai', openaiProvider);
        this.logger.info('Registered OpenAI provider', 'NeuroNest');
      }
      
      // Additional providers can be registered here
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to register LLM providers: ${errorMessage}`, 'NeuroNest');
    }
  }
  
  /**
   * Register memory types
   */
  private registerMemoryTypes(): void {
    // Check if memoryRegistry exists and has the registerMemoryType method
    if (!this.memoryRegistry || typeof this.memoryRegistry.registerMemoryType !== 'function') {
      this.logger.warn('Memory registry is not properly initialized or does not have registerMemoryType method, skipping memory registration', 'NeuroNest');
      return;
    }
    
    try {
      // Register buffer memory
      this.memoryRegistry.registerMemoryType('buffer', (config) => new BufferMemory(config.name, config));
      this.logger.info('Registered buffer memory type', 'NeuroNest');
      
      // Register vector memory
      this.memoryRegistry.registerMemoryType('vector', (config) => VectorMemory.create(config));
      this.logger.info('Registered vector memory type', 'NeuroNest');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to register memory types: ${errorMessage}`, 'NeuroNest');
    }
    
    // Additional memory types can be registered here
  }
  
  /**
   * Register agent types
   */
  private registerAgentTypes(): void {
    // Check if agentRegistry exists and has the registerAgentType method
    if (!this.agentRegistry || typeof this.agentRegistry.registerAgentType !== 'function') {
      this.logger.warn('Agent registry is not properly initialized or does not have registerAgentType method, skipping agent registration', 'NeuroNest');
      return;
    }
    
    try {
      // Register thinking agent
      this.agentRegistry.registerAgentType('thinking', (eventStream, llmProvider) => {
        return new ThinkingAgent(eventStream, llmProvider);
      });
      this.logger.info('Registered thinking agent type', 'NeuroNest');
      
      // Register developer agent
      this.agentRegistry.registerAgentType('developer', (eventStream, llmProvider) => {
        return new DeveloperAgent(eventStream, llmProvider);
      });
      this.logger.info('Registered developer agent type', 'NeuroNest');
      
      // Register editor agent
      this.agentRegistry.registerAgentType('editor', (eventStream, llmProvider) => {
        return new EditorAgent(eventStream, llmProvider);
      });
      this.logger.info('Registered editor agent type', 'NeuroNest');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to register agent types: ${errorMessage}`, 'NeuroNest');
    }
    
    // Additional agent types can be registered here
  }
  
  /**
   * Register runtime environments
   */
  private registerRuntimeEnvironments(): void {
    // Check if runtimeRegistry exists and has the registerRuntime method
    if (!this.runtimeRegistry || typeof this.runtimeRegistry.registerRuntime !== 'function') {
      this.logger.warn('Runtime registry is not properly initialized or does not have registerRuntime method, skipping runtime registration', 'NeuroNest');
      return;
    }
    
    try {
      // Register Docker runtime
      const dockerRuntime = new DockerRuntime();
      this.runtimeRegistry.registerRuntime('docker', dockerRuntime);
      this.logger.info('Registered Docker runtime', 'NeuroNest');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to register runtime environments: ${errorMessage}`, 'NeuroNest');
    }
    
    // Additional runtime environments can be registered here
  }
  
  /**
   * Get the event stream
   * @returns The event stream
   */
  getEventStream(): DefaultEventStream {
    return this.eventStream;
  }
  
  /**
   * Get the agent registry
   * @returns The agent registry
   */
  getAgentRegistry(): AgentRegistry {
    return this.agentRegistry;
  }
  
  /**
   * Get the LLM provider registry
   * @returns The LLM provider registry
   */
  getLLMProviderRegistry(): LLMProviderRegistry {
    return this.llmRegistry;
  }
  
  /**
   * Get the memory registry
   * @returns The memory registry
   */
  getMemoryRegistry(): MemoryRegistry {
    return this.memoryRegistry;
  }
  
  /**
   * Get the plugin manager
   * @returns The plugin manager
   */
  getPluginManager(): PluginManager {
    return this.pluginManager;
  }
  
  /**
   * Get the runtime registry
   * @returns The runtime registry
   */
  getRuntimeRegistry(): RuntimeRegistry {
    return this.runtimeRegistry;
  }
  
  /**
   * Get the task manager
   * @returns The task manager
   */
  getTaskManager(): TaskManager {
    return this.taskManager;
  }
  
  /**
   * Get the metrics registry
   * @returns The metrics registry
   */
  getMetricsRegistry(): MetricsRegistry {
    return this.metricsRegistry;
  }
  
  /**
   * Get the logger
   * @returns The logger
   */
  getLogger(): Logger {
    return this.logger;
  }
  
  /**
   * Get the i18n instance
   * @returns The i18n instance
   */
  getI18n(): DefaultI18n {
    return this.i18n;
  }
  
  /**
   * Get the configuration
   * @returns The configuration
   */
  getConfig(): NeuroNestConfig {
    return { ...this.config };
  }
  
  /**
   * Update the configuration
   * @param config The new configuration
   */
  updateConfig(config: Partial<NeuroNestConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Update components based on new config
    if (config.maxConcurrentTasks) {
      this.taskManager.setMaxConcurrentTasks(config.maxConcurrentTasks);
    }
    
    if (config.defaultLocale) {
      this.i18n.setLocale(config.defaultLocale);
    }
  }
  
  /**
   * Shutdown the application
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    
    this.logger.info('Shutting down NeuroNest', 'NeuroNest');
    
    // Cancel all tasks
    await this.taskManager.clearTasks();
    
    // Unload all plugins
    await this.pluginManager.unloadAllPlugins();
    
    // Clear all agents
    this.agentRegistry.clearAgents();
    
    this.initialized = false;
    this.logger.info('NeuroNest shutdown complete', 'NeuroNest');
  }
}