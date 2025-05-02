/**
 * Interface for plugins
 */
export interface Plugin {
  /**
   * Unique identifier for the plugin
   */
  id: string;
  
  /**
   * Name of the plugin
   */
  name: string;
  
  /**
   * Description of the plugin
   */
  description: string;
  
  /**
   * Version of the plugin
   */
  version: string;
  
  /**
   * Author of the plugin
   */
  author: string;
  
  /**
   * Initialize the plugin
   * @param context The plugin context
   */
  initialize(context: PluginContext): Promise<void>;
  
  /**
   * Activate the plugin
   */
  activate(): Promise<void>;
  
  /**
   * Deactivate the plugin
   */
  deactivate(): Promise<void>;
}

/**
 * Context provided to plugins
 */
export interface PluginContext {
  /**
   * Register a service provided by the plugin
   * @param serviceId The ID of the service
   * @param service The service instance
   */
  registerService<T>(serviceId: string, service: T): void;
  
  /**
   * Get a service
   * @param serviceId The ID of the service
   * @returns The service instance, or undefined if not found
   */
  getService<T>(serviceId: string): T | undefined;
  
  /**
   * Register an event listener
   * @param eventType The type of event to listen for
   * @param listener The listener function
   * @returns A function to remove the listener
   */
  addEventListener<T>(eventType: string, listener: (event: T) => void): () => void;
  
  /**
   * Dispatch an event
   * @param eventType The type of event
   * @param event The event data
   */
  dispatchEvent<T>(eventType: string, event: T): void;
  
  /**
   * Get the plugin's data directory
   * @returns Path to the plugin's data directory
   */
  getDataDirectory(): string;
  
  /**
   * Log a message
   * @param level The log level
   * @param message The message to log
   * @param data Additional data to log
   */
  log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void;
}

/**
 * Metadata for a plugin
 */
export interface PluginMetadata {
  /**
   * Unique identifier for the plugin
   */
  id: string;
  
  /**
   * Name of the plugin
   */
  name: string;
  
  /**
   * Description of the plugin
   */
  description: string;
  
  /**
   * Version of the plugin
   */
  version: string;
  
  /**
   * Author of the plugin
   */
  author: string;
  
  /**
   * Main entry point for the plugin
   */
  main: string;
  
  /**
   * Dependencies of the plugin
   */
  dependencies?: Record<string, string>;
  
  /**
   * Whether the plugin is enabled by default
   */
  enabledByDefault?: boolean;
}

/**
 * Base class for plugins
 */
export abstract class BasePlugin implements Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  protected context: PluginContext | null = null;
  
  constructor(metadata: PluginMetadata) {
    this.id = metadata.id;
    this.name = metadata.name;
    this.description = metadata.description;
    this.version = metadata.version;
    this.author = metadata.author;
  }
  
  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
  }
  
  abstract activate(): Promise<void>;
  abstract deactivate(): Promise<void>;
  
  /**
   * Log a debug message
   * @param message The message to log
   * @param data Additional data to log
   */
  protected debug(message: string, data?: any): void {
    this.context?.log('debug', message, data);
  }
  
  /**
   * Log an info message
   * @param message The message to log
   * @param data Additional data to log
   */
  protected info(message: string, data?: any): void {
    this.context?.log('info', message, data);
  }
  
  /**
   * Log a warning message
   * @param message The message to log
   * @param data Additional data to log
   */
  protected warn(message: string, data?: any): void {
    this.context?.log('warn', message, data);
  }
  
  /**
   * Log an error message
   * @param message The message to log
   * @param data Additional data to log
   */
  protected error(message: string, data?: any): void {
    this.context?.log('error', message, data);
  }
}