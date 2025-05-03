import { Runtime } from './Runtime';
import { Action } from '../events/Action';

/**
 * Registry for managing runtime environments
 */
export class RuntimeRegistry {
  private static instance: RuntimeRegistry;
  private runtimes: Map<string, Runtime> = new Map();
  private defaultRuntime: string | null = null;
  
  /**
   * Get the singleton instance of the registry
   */
  public static getInstance(): RuntimeRegistry {
    if (!RuntimeRegistry.instance) {
      RuntimeRegistry.instance = new RuntimeRegistry();
    }
    return RuntimeRegistry.instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Register a runtime
   * @param name The name of the runtime or the runtime instance
   * @param runtime The runtime to register or isDefault flag
   * @param isDefault Whether this runtime should be the default
   */
  registerRuntime(name: string | Runtime, runtime?: Runtime | boolean, isDefault: boolean = false): void {
    // Handle both overloads:
    // 1. registerRuntime(runtime, isDefault)
    // 2. registerRuntime(name, runtimeFactory, isDefault)
    let runtimeName: string;
    let runtimeInstance: Runtime;
    
    if (typeof name === 'string' && runtime && typeof runtime !== 'boolean') {
      // Overload 2: name and runtime provided separately
      runtimeName = name;
      runtimeInstance = runtime;
    } else if (typeof name !== 'string') {
      // Overload 1: runtime object provided directly
      runtimeInstance = name;
      runtimeName = runtimeInstance.name;
      isDefault = runtime !== undefined ? Boolean(runtime) : false;
    } else {
      throw new Error('Invalid arguments to registerRuntime');
    }
    
    this.runtimes.set(runtimeName, runtimeInstance);
    
    if (isDefault || this.defaultRuntime === null) {
      this.defaultRuntime = runtimeName;
    }
  }
  
  /**
   * Unregister a runtime
   * @param name The name of the runtime to unregister
   */
  unregisterRuntime(name: string): void {
    this.runtimes.delete(name);
    
    if (this.defaultRuntime === name) {
      this.defaultRuntime = this.runtimes.size > 0 ? 
        Array.from(this.runtimes.keys())[0] : null;
    }
  }
  
  /**
   * Get a runtime by name
   * @param name The name of the runtime
   * @returns The runtime, or undefined if not found
   */
  getRuntime(name: string): Runtime | undefined {
    return this.runtimes.get(name);
  }
  
  /**
   * Get the default runtime
   * @returns The default runtime, or undefined if none is set
   */
  getDefaultRuntime(): Runtime | undefined {
    return this.defaultRuntime ? this.runtimes.get(this.defaultRuntime) : undefined;
  }
  
  /**
   * Set the default runtime
   * @param name The name of the runtime to set as default
   */
  setDefaultRuntime(name: string): void {
    if (!this.runtimes.has(name)) {
      throw new Error(`Runtime '${name}' not registered`);
    }
    this.defaultRuntime = name;
  }
  
  /**
   * Get all registered runtimes
   * @returns Array of all runtimes
   */
  getAllRuntimes(): Runtime[] {
    return Array.from(this.runtimes.values());
  }
  
  /**
   * Get the names of all registered runtimes
   * @returns Array of runtime names
   */
  getRuntimeNames(): string[] {
    return Array.from(this.runtimes.keys());
  }
  
  /**
   * Find a runtime that supports an action
   * @param action The action to find a runtime for
   * @returns The runtime, or undefined if none supports the action
   */
  findRuntimeForAction(action: Action): Runtime | undefined {
    // First check the default runtime
    const defaultRuntime = this.getDefaultRuntime();
    if (defaultRuntime && defaultRuntime.supportsAction(action)) {
      return defaultRuntime;
    }
    
    // Then check all other runtimes
    for (const runtime of this.runtimes.values()) {
      if (runtime.name !== this.defaultRuntime && runtime.supportsAction(action)) {
        return runtime;
      }
    }
    
    return undefined;
  }
  
  /**
   * Shutdown all runtimes
   */
  async shutdownAllRuntimes(): Promise<void> {
    const shutdownPromises = Array.from(this.runtimes.values()).map(runtime => runtime.shutdown());
    await Promise.all(shutdownPromises);
  }
}