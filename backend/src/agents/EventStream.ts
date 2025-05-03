import { Event } from './Event';

/**
 * Interface for event stream that agents use to communicate
 */
export interface EventStream {
  /**
   * Emit an event to the stream
   * @param event The event to emit
   */
  emit(event: Event): void;
  
  /**
   * Subscribe to events of a specific type
   * @param eventType The type of event to subscribe to
   * @param handler The handler function to call when an event is emitted
   * @returns A function to unsubscribe
   */
  on(eventType: string, handler: (event: Event) => void): () => void;
  
  /**
   * Unsubscribe from events of a specific type
   * @param eventType The type of event to unsubscribe from
   * @param handler Optional handler function to unsubscribe
   */
  off(eventType: string, handler?: (event: Event) => void): void;
  
  /**
   * Get all events in the stream
   * @returns Array of events
   */
  getEvents(): Event[];
  
  /**
   * Clear all events from the stream
   */
  clear(): void;
}

/**
 * Default implementation of EventStream
 */
export class DefaultEventStream implements EventStream {
  private events: Event[] = [];
  private handlers: Map<string, Set<(event: Event) => void>> = new Map();
  
  /**
   * Emit an event to the stream
   * @param event The event to emit
   */
  emit(event: Event): void {
    this.events.push(event);
    
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      handlers.forEach(handler => handler(event));
    }
  }
  
  /**
   * Subscribe to events of a specific type
   * @param eventType The type of event to subscribe to
   * @param handler The handler function to call when an event is emitted
   * @returns A function to unsubscribe
   */
  on(eventType: string, handler: (event: Event) => void): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    
    this.handlers.get(eventType)!.add(handler);
    
    return () => this.off(eventType, handler);
  }
  
  /**
   * Unsubscribe from events of a specific type
   * @param eventType The type of event to unsubscribe from
   * @param handler Optional handler function to unsubscribe
   */
  off(eventType: string, handler?: (event: Event) => void): void {
    if (!this.handlers.has(eventType)) {
      return;
    }
    
    if (handler) {
      this.handlers.get(eventType)!.delete(handler);
    } else {
      this.handlers.delete(eventType);
    }
  }
  
  /**
   * Get all events in the stream
   * @returns Array of events
   */
  getEvents(): Event[] {
    return [...this.events];
  }
  
  /**
   * Clear all events from the stream
   */
  clear(): void {
    this.events = [];
  }
}