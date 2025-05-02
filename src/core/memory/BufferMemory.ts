import { BaseMemory, MemoryFilter } from './Memory';
import { Event } from '../events/Event';

/**
 * Configuration for buffer memory
 */
export interface BufferMemoryConfig {
  /**
   * Maximum number of events to store
   */
  maxSize?: number;
}

/**
 * Memory implementation that stores events in an in-memory buffer
 */
export class BufferMemory extends BaseMemory {
  private events: Event[] = [];
  private maxSize: number;
  
  constructor(name: string, config?: BufferMemoryConfig) {
    super(name);
    this.maxSize = config?.maxSize || 1000;
  }
  
  /**
   * Add an event to the buffer
   * @param event The event to add
   */
  async addEvent(event: Event): Promise<void> {
    this.events.push(event);
    
    // Trim the buffer if it exceeds the maximum size
    if (this.events.length > this.maxSize) {
      this.events = this.events.slice(this.events.length - this.maxSize);
    }
  }
  
  /**
   * Get events from the buffer
   * @param filter Optional filter for events
   * @param limit Optional limit on the number of events
   * @returns Array of events
   */
  async getEvents(filter?: MemoryFilter, limit?: number): Promise<Event[]> {
    let result = [...this.events];
    
    // Apply filters
    if (filter) {
      if (filter.type) {
        result = result.filter(event => event.type === filter.type);
      }
      
      if (filter.source) {
        result = result.filter(event => event.source.toString() === filter.source);
      }
      
      if (filter.timeRange) {
        if (filter.timeRange.start) {
          result = result.filter(event => event.timestamp >= filter.timeRange!.start!);
        }
        
        if (filter.timeRange.end) {
          result = result.filter(event => event.timestamp <= filter.timeRange!.end!);
        }
      }
      
      if (filter.custom) {
        result = result.filter(filter.custom);
      }
    }
    
    // Apply limit
    if (limit && limit > 0 && limit < result.length) {
      result = result.slice(result.length - limit);
    }
    
    return result;
  }
  
  /**
   * Search for events in the buffer
   * @param query The search query
   * @param limit Optional limit on the number of results
   * @returns Array of events matching the query
   */
  async searchEvents(query: string, limit?: number): Promise<Event[]> {
    const queryLower = query.toLowerCase();
    
    // Simple search implementation that checks if the query is in the event type or metadata
    const results = this.events.filter(event => {
      // Check type
      if (event.type.toLowerCase().includes(queryLower)) {
        return true;
      }
      
      // Check metadata
      if (event.metadata) {
        const metadataStr = JSON.stringify(event.metadata).toLowerCase();
        if (metadataStr.includes(queryLower)) {
          return true;
        }
      }
      
      return false;
    });
    
    // Apply limit
    if (limit && limit > 0 && limit < results.length) {
      return results.slice(results.length - limit);
    }
    
    return results;
  }
  
  /**
   * Clear all events from the buffer
   */
  async clear(): Promise<void> {
    this.events = [];
  }
  
  /**
   * Get the current size of the buffer
   * @returns The number of events in the buffer
   */
  getSize(): number {
    return this.events.length;
  }
  
  /**
   * Get the maximum size of the buffer
   * @returns The maximum number of events the buffer can hold
   */
  getMaxSize(): number {
    return this.maxSize;
  }
  
  /**
   * Set the maximum size of the buffer
   * @param size The new maximum size
   */
  setMaxSize(size: number): void {
    this.maxSize = size;
    
    // Trim the buffer if it exceeds the new maximum size
    if (this.events.length > this.maxSize) {
      this.events = this.events.slice(this.events.length - this.maxSize);
    }
  }
}