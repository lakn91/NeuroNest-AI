import { Memory } from './Memory';

/**
 * Registry for managing memory instances
 */
export class MemoryRegistry {
  private static instance: MemoryRegistry;
  private memories: Map<string, Memory> = new Map();
  
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
}