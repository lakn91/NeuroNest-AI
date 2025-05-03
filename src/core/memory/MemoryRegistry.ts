import { Memory } from './Memory';

/**
 * Type for memory factory function
 */
export type MemoryFactory = (config: any) => Memory;

/**
 * Registry for managing memory instances and types
 */
export class MemoryRegistry {
  private static instance: MemoryRegistry;
  private memories: Map<string, Memory> = new Map();
  private memoryTypes: Map<string, MemoryFactory> = new Map();
  
  /**
   * Get the singleton instance of the registry
   */
  public static getInstance(): MemoryRegistry {
    if (!MemoryRegistry.instance) {
      MemoryRegistry.instance = new MemoryRegistry();
    }
    return MemoryRegistry.instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Register a memory instance
   * @param memory The memory to register
   */
  registerMemory(memory: Memory): void {
    this.memories.set(memory.name, memory);
  }
  
  /**
   * Unregister a memory instance
   * @param name The name of the memory to unregister
   */
  unregisterMemory(name: string): void {
    this.memories.delete(name);
  }
  
  /**
   * Get a memory instance by name
   * @param name The name of the memory
   * @returns The memory instance, or undefined if not found
   */
  getMemory(name: string): Memory | undefined {
    return this.memories.get(name);
  }
  
  /**
   * Get all memory instances
   * @returns Array of all memory instances
   */
  getAllMemories(): Memory[] {
    return Array.from(this.memories.values());
  }
  
  /**
   * Get the names of all memory instances
   * @returns Array of memory names
   */
  getMemoryNames(): string[] {
    return Array.from(this.memories.keys());
  }
  
  /**
   * Clear all memory instances
   */
  async clearAllMemories(): Promise<void> {
    const clearPromises = Array.from(this.memories.values()).map(memory => memory.clear());
    await Promise.all(clearPromises);
  }

  /**
   * Register a memory type
   * @param type The type name
   * @param factory The factory function to create memories of this type
   */
  registerMemoryType(type: string, factory: MemoryFactory): void {
    this.memoryTypes.set(type, factory);
  }

  /**
   * Create a memory of the specified type
   * @param type The type of memory to create
   * @param config Configuration for the memory
   * @returns The created memory instance
   */
  createMemory(type: string, config: any): Memory {
    const factory = this.memoryTypes.get(type);
    if (!factory) {
      throw new Error(`Memory type '${type}' not registered`);
    }
    const memory = factory(config);
    this.registerMemory(memory);
    return memory;
  }

  /**
   * Get all registered memory types
   * @returns Array of memory type names
   */
  getMemoryTypes(): string[] {
    return Array.from(this.memoryTypes.keys());
  }
}