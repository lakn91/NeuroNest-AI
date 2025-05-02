import { Event } from '../events/Event';

/**
 * Interface for memory systems
 */
export interface Memory {
  /**
   * Name of the memory
   */
  name: string;
  
  /**
   * Add an event to memory
   * @param event The event to add
   */
  addEvent(event: Event): Promise<void>;
  
  /**
   * Get events from memory
   * @param filter Optional filter for events
   * @param limit Optional limit on the number of events
   * @returns Array of events
   */
  getEvents(filter?: MemoryFilter, limit?: number): Promise<Event[]>;
  
  /**
   * Search for events in memory
   * @param query The search query
   * @param limit Optional limit on the number of results
   * @returns Array of events matching the query
   */
  searchEvents(query: string, limit?: number): Promise<Event[]>;
  
  /**
   * Clear all events from memory
   */
  clear(): Promise<void>;
  
  /**
   * Get a summary of the memory
   * @returns A summary of the memory
   */
  getSummary(): Promise<string>;
}

/**
 * Filter for memory events
 */
export interface MemoryFilter {
  /**
   * Filter by event type
   */
  type?: string;
  
  /**
   * Filter by event source
   */
  source?: string;
  
  /**
   * Filter by time range
   */
  timeRange?: {
    start?: Date;
    end?: Date;
  };
  
  /**
   * Custom filter function
   */
  custom?: (event: Event) => boolean;
}

/**
 * Base class for memory implementations
 */
export abstract class BaseMemory implements Memory {
  name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  abstract addEvent(event: Event): Promise<void>;
  abstract getEvents(filter?: MemoryFilter, limit?: number): Promise<Event[]>;
  abstract searchEvents(query: string, limit?: number): Promise<Event[]>;
  abstract clear(): Promise<void>;
  
  /**
   * Get a summary of the memory
   * Default implementation returns a simple count
   * @returns A summary of the memory
   */
  async getSummary(): Promise<string> {
    const events = await this.getEvents();
    return `Memory '${this.name}' contains ${events.length} events.`;
  }
}