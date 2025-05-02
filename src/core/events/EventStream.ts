import { Event } from './Event';
import { Action } from './Action';
import { Observation } from './Observation';

/**
 * EventStream interface for managing the flow of events in the system
 */
export interface EventStream {
  /**
   * Add an event to the stream
   * @param event The event to add
   */
  addEvent(event: Event): void;
  
  /**
   * Get all events in the stream
   * @returns Array of all events
   */
  getEvents(): Event[];
  
  /**
   * Get events of a specific type
   * @param type The type of events to get
   * @returns Array of events of the specified type
   */
  getEventsByType(type: string): Event[];
  
  /**
   * Get all actions in the stream
   * @returns Array of all actions
   */
  getActions(): Action[];
  
  /**
   * Get all observations in the stream
   * @returns Array of all observations
   */
  getObservations(): Observation[];
  
  /**
   * Get the observation for a specific action
   * @param actionId The ID of the action
   * @returns The observation for the action, or undefined if not found
   */
  getObservationForAction(actionId: string): Observation | undefined;
  
  /**
   * Subscribe to new events
   * @param callback Function to call when a new event is added
   * @returns Subscription ID
   */
  subscribe(callback: (event: Event) => void): string;
  
  /**
   * Unsubscribe from events
   * @param subscriptionId The subscription ID to unsubscribe
   */
  unsubscribe(subscriptionId: string): void;
  
  /**
   * Clear all events from the stream
   */
  clear(): void;
}

/**
 * Implementation of the EventStream interface
 */
export class DefaultEventStream implements EventStream {
  private events: Event[] = [];
  private subscribers: Map<string, (event: Event) => void> = new Map();
  
  addEvent(event: Event): void {
    this.events.push(event);
    
    // Notify subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in event subscriber:', error);
      }
    });
  }
  
  getEvents(): Event[] {
    return [...this.events];
  }
  
  getEventsByType(type: string): Event[] {
    return this.events.filter(event => event.type === type);
  }
  
  getActions(): Action[] {
    return this.events.filter(event => event.type.startsWith('action.')) as Action[];
  }
  
  getObservations(): Observation[] {
    return this.events.filter(event => event.type.startsWith('observation.')) as Observation[];
  }
  
  getObservationForAction(actionId: string): Observation | undefined {
    return this.getObservations().find(obs => obs.actionId === actionId);
  }
  
  subscribe(callback: (event: Event) => void): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.subscribers.set(subscriptionId, callback);
    return subscriptionId;
  }
  
  unsubscribe(subscriptionId: string): void {
    this.subscribers.delete(subscriptionId);
  }
  
  clear(): void {
    this.events = [];
  }
}