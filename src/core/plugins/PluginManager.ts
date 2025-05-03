import { Plugin, PluginContext, PluginMetadata } from './Plugin';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Manager for loading and managing plugins
 */
export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, Plugin> = new Map();
  private activePlugins: Set<string> = new Set();
  private services: Map<string, any> = new Map();
  private eventListeners: Map<string, Set<(event: any) => void>> = new Map();
  private pluginsDirectory: string;
  
  /**
   * Get the singleton instance of the plugin manager
   */
  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    this.pluginsDirectory = path.resolve(process.cwd(), 'plugins');
    
    // Create plugins directory if it doesn't exist
    if (!fs.existsSync(this.pluginsDirectory)) {
      fs.mkdirSync(this.pluginsDirectory, { recursive: true });
    }
  }
  
  /**
   * Set the plugins directory
   * @param directory The directory to use for plugins
   */
  setPluginsDirectory(directory: string): void {
    this.pluginsDirectory = directory;
    
    // Create plugins directory if it doesn't exist
    if (!fs.existsSync(this.pluginsDirectory)) {
      fs.mkdirSync(this.pluginsDirectory, { recursive: true });
    }
  }
  
  /**
   * Get the plugins directory
   * @returns The plugins directory
   */
  getPluginsDirectory(): string {
    return this.pluginsDirectory;
  }
  
  /**
   * Load all plugins from the plugins directory
   */
  async loadPlugins(): Promise<void> {
    // Get all plugin directories
    const pluginDirs = fs.readdirSync(this.pluginsDirectory, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => path.join(this.pluginsDirectory, dirent.name));
    
    // Load each plugin
    for (const pluginDir of pluginDirs) {
      try {
        await this.loadPlugin(pluginDir);
      } catch (error) {
        console.error(`Error loading plugin from ${pluginDir}:`, error);
      }
    }
  }
  
  /**
   * Load all plugins from a specified directory
   * @param directory The directory to load plugins from
   */
  async loadPluginsFromDirectory(directory: string): Promise<void> {
    if (!fs.existsSync(directory)) {
      throw new Error(`Plugin directory ${directory} does not exist`);
    }
    
    // Get all plugin directories
    const pluginDirs = fs.readdirSync(directory, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => path.join(directory, dirent.name));
    
    // Load each plugin
    for (const pluginDir of pluginDirs) {
      try {
        await this.loadPlugin(pluginDir);
      } catch (error) {
        console.error(`Error loading plugin from ${pluginDir}:`, error);
      }
    }
  }
  
  /**
   * Load a plugin from a directory
   * @param pluginDir The directory containing the plugin
   */
  async loadPlugin(pluginDir: string): Promise<void> {
    // Check if package.json exists
    const packageJsonPath = path.join(pluginDir, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`No package.json found in ${pluginDir}`);
    }
    
    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    
    // Check if plugin metadata exists
    if (!packageJson.neuronest) {
      throw new Error(`No plugin metadata found in ${packageJsonPath}`);
    }
    
    const metadata: PluginMetadata = {
      id: packageJson.name,
      name: packageJson.neuronest.name || packageJson.name,
      description: packageJson.neuronest.description || packageJson.description || '',
      version: packageJson.version,
      author: packageJson.author || 'Unknown',
      main: packageJson.neuronest.main || packageJson.main,
      dependencies: packageJson.neuronest.dependencies || {},
      enabledByDefault: packageJson.neuronest.enabledByDefault !== false
    };
    
    // Check if main file exists
    const mainPath = path.join(pluginDir, metadata.main);
    if (!fs.existsSync(mainPath)) {
      throw new Error(`Main file ${mainPath} not found`);
    }
    
    // Load the plugin
    const pluginModule = require(mainPath);
    const PluginClass = pluginModule.default || pluginModule;
    
    if (typeof PluginClass !== 'function') {
      throw new Error(`Plugin module does not export a class`);
    }
    
    const plugin: Plugin = new PluginClass(metadata);
    
    // Create plugin context
    const context: PluginContext = {
      registerService: <T>(serviceId: string, service: T) => {
        this.registerService(serviceId, service);
      },
      getService: <T>(serviceId: string) => {
        return this.getService<T>(serviceId);
      },
      addEventListener: <T>(eventType: string, listener: (event: T) => void) => {
        return this.addEventListener(eventType, listener);
      },
      dispatchEvent: <T>(eventType: string, event: T) => {
        this.dispatchEvent(eventType, event);
      },
      getDataDirectory: () => {
        const dataDir = path.join(this.pluginsDirectory, 'data', metadata.id);
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        return dataDir;
      },
      log: (level, message, data) => {
        const logMessage = `[${metadata.name}] ${message}`;
        switch (level) {
          case 'debug':
            console.debug(logMessage, data);
            break;
          case 'info':
            console.info(logMessage, data);
            break;
          case 'warn':
            console.warn(logMessage, data);
            break;
          case 'error':
            console.error(logMessage, data);
            break;
        }
      }
    };
    
    // Initialize the plugin
    await plugin.initialize(context);
    
    // Register the plugin
    this.plugins.set(metadata.id, plugin);
    
    // Activate the plugin if enabled by default
    if (metadata.enabledByDefault) {
      await this.activatePlugin(metadata.id);
    }
  }
  
  /**
   * Activate a plugin
   * @param pluginId The ID of the plugin to activate
   */
  async activatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    if (this.activePlugins.has(pluginId)) {
      return; // Already active
    }
    
    await plugin.activate();
    this.activePlugins.add(pluginId);
  }
  
  /**
   * Deactivate a plugin
   * @param pluginId The ID of the plugin to deactivate
   */
  async deactivatePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    if (!this.activePlugins.has(pluginId)) {
      return; // Already inactive
    }
    
    await plugin.deactivate();
    this.activePlugins.delete(pluginId);
  }
  
  /**
   * Get a plugin by ID
   * @param pluginId The ID of the plugin
   * @returns The plugin, or undefined if not found
   */
  getPlugin(pluginId: string): Plugin | undefined {
    return this.plugins.get(pluginId);
  }
  
  /**
   * Get all plugins
   * @returns Array of all plugins
   */
  getAllPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * Get the default plugin (first plugin or null if none exists)
   * @returns The default plugin or null
   */
  getDefaultPlugin(): Plugin | null {
    const plugins = this.getAllPlugins();
    return plugins.length > 0 ? plugins[0] : null;
  }
  
  /**
   * Alias for getAllPlugins for compatibility
   * @returns Array of all plugins
   */
  getPlugins(): Plugin[] {
    return this.getAllPlugins();
  }
  
  /**
   * Unload all plugins
   */
  async unloadAllPlugins(): Promise<void> {
    const pluginIds = Array.from(this.plugins.keys());
    for (const pluginId of pluginIds) {
      try {
        // Deactivate the plugin first
        await this.deactivatePlugin(pluginId);
        
        // Then remove it from the registry
        this.plugins.delete(pluginId);
      } catch (error) {
        console.error(`Error unloading plugin ${pluginId}:`, error);
      }
    }
  }
  
  /**
   * Get all active plugins
   * @returns Array of active plugins
   */
  getActivePlugins(): Plugin[] {
    return Array.from(this.activePlugins).map(id => this.plugins.get(id)!);
  }
  
  /**
   * Check if a plugin is active
   * @param pluginId The ID of the plugin
   * @returns Whether the plugin is active
   */
  isPluginActive(pluginId: string): boolean {
    return this.activePlugins.has(pluginId);
  }
  
  /**
   * Register a service
   * @param serviceId The ID of the service
   * @param service The service instance
   */
  registerService<T>(serviceId: string, service: T): void {
    this.services.set(serviceId, service);
  }
  
  /**
   * Get a service
   * @param serviceId The ID of the service
   * @returns The service instance, or undefined if not found
   */
  getService<T>(serviceId: string): T | undefined {
    return this.services.get(serviceId) as T | undefined;
  }
  
  /**
   * Register an event listener
   * @param eventType The type of event to listen for
   * @param listener The listener function
   * @returns A function to remove the listener
   */
  addEventListener<T>(eventType: string, listener: (event: T) => void): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    
    this.eventListeners.get(eventType)!.add(listener);
    
    return () => {
      const listeners = this.eventListeners.get(eventType);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.eventListeners.delete(eventType);
        }
      }
    };
  }
  
  /**
   * Dispatch an event
   * @param eventType The type of event
   * @param event The event data
   */
  dispatchEvent<T>(eventType: string, event: T): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(event);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      }
    }
  }
}