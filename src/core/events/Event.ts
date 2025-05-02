/**
 * Base Event interface for the event-driven architecture
 * All events in the system should implement this interface
 */
export interface Event {
  /**
   * Unique identifier for the event
   */
  id: string;
  
  /**
   * Timestamp when the event was created
   */
  timestamp: Date;
  
  /**
   * Type of the event
   */
  type: string;
  
  /**
   * Source of the event (user, agent, system)
   */
  source: EventSource;
  
  /**
   * Optional metadata for the event
   */
  metadata?: Record<string, any>;
}

/**
 * Enum representing possible sources of events
 */
export enum EventSource {
  USER = 'user',
  AGENT = 'agent',
  SYSTEM = 'system',
  RUNTIME = 'runtime'
}

/**
 * Base class for all events in the system
 */
export abstract class BaseEvent implements Event {
  id: string;
  timestamp: Date;
  type: string;
  source: EventSource;
  metadata?: Record<string, any>;
  
  constructor(type: string, source: EventSource, metadata?: Record<string, any>) {
    this.id = this.generateId();
    this.timestamp = new Date();
    this.type = type;
    this.source = source;
    this.metadata = metadata;
  }
  
  /**
   * Generate a unique ID for the event
   * @returns A unique ID string
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}