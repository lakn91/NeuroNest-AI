/**
 * Base interface for all events in the system
 */
export interface Event {
  /**
   * Unique identifier for the event
   */
  id: string;
  
  /**
   * Type of the event
   */
  type: string;
  
  /**
   * Timestamp when the event was created
   */
  timestamp: number;
  
  /**
   * Source of the event
   */
  source: string;
  
  /**
   * Data associated with the event
   */
  data: any;
}

/**
 * Base class for all events in the system
 */
export abstract class BaseEvent implements Event {
  id: string;
  type: string;
  timestamp: number;
  source: string;
  data: any;
  
  /**
   * Create a new event
   * @param type Type of the event
   * @param source Source of the event
   * @param data Data associated with the event
   */
  constructor(type: string, source: string, data: any) {
    this.id = this.generateId();
    this.type = type;
    this.timestamp = Date.now();
    this.source = source;
    this.data = data;
  }
  
  /**
   * Generate a unique identifier for the event
   * @returns A unique identifier
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}