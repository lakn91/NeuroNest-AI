import { Action } from '../events/Action';
import { Observation } from '../events/Observation';

/**
 * Interface for runtime environments
 */
export interface Runtime {
  /**
   * Name of the runtime
   */
  name: string;
  
  /**
   * Initialize the runtime
   * @param config Configuration for the runtime
   */
  initialize(config: RuntimeConfig): Promise<void>;
  
  /**
   * Execute an action in the runtime
   * @param action The action to execute
   * @returns The observation from executing the action
   */
  executeAction(action: Action): Promise<Observation>;
  
  /**
   * Check if the runtime supports an action
   * @param action The action to check
   * @returns Whether the action is supported
   */
  supportsAction(action: Action): boolean;
  
  /**
   * Shutdown the runtime
   */
  shutdown(): Promise<void>;
}

/**
 * Configuration for a runtime
 */
export interface RuntimeConfig {
  /**
   * Resource limits for the runtime
   */
  resourceLimits?: ResourceLimits;
  
  /**
   * Security options for the runtime
   */
  securityOptions?: SecurityOptions;
  
  /**
   * Additional configuration options
   */
  [key: string]: any;
}

/**
 * Resource limits for a runtime
 */
export interface ResourceLimits {
  /**
   * Maximum CPU usage (percentage)
   */
  cpuLimit?: number;
  
  /**
   * Maximum memory usage (MB)
   */
  memoryLimit?: number;
  
  /**
   * Maximum execution time (ms)
   */
  timeLimit?: number;
  
  /**
   * Maximum disk usage (MB)
   */
  diskLimit?: number;
  
  /**
   * Maximum network bandwidth (KB/s)
   */
  networkLimit?: number;
}

/**
 * Security options for a runtime
 */
export interface SecurityOptions {
  /**
   * Whether to allow network access
   */
  allowNetwork?: boolean;
  
  /**
   * Whether to allow file system access
   */
  allowFileSystem?: boolean;
  
  /**
   * Whether to allow process execution
   */
  allowProcessExecution?: boolean;
  
  /**
   * Allowed network hosts
   */
  allowedHosts?: string[];
  
  /**
   * Allowed file system paths
   */
  allowedPaths?: string[];
  
  /**
   * Allowed environment variables
   */
  allowedEnvVars?: string[];
}

/**
 * Base class for runtime implementations
 */
export abstract class BaseRuntime implements Runtime {
  name: string;
  protected config: RuntimeConfig = {};
  
  constructor(name: string) {
    this.name = name;
  }
  
  async initialize(config: RuntimeConfig): Promise<void> {
    this.config = config;
  }
  
  abstract executeAction(action: Action): Promise<Observation>;
  
  abstract supportsAction(action: Action): boolean;
  
  async shutdown(): Promise<void> {
    // Default implementation does nothing
  }
}