import { BaseTask, TaskConfig } from './Task';
import { Action } from '../events/Action';
import { Observation } from '../events/Observation';
import { DefaultEventStream } from '../events/EventStream';

/**
 * Configuration for a simple task
 */
export interface SimpleTaskConfig extends TaskConfig {
  /**
   * Initial action to start the task
   */
  initialAction: Action;
  
  /**
   * Maximum number of steps
   */
  maxSteps?: number;
}

/**
 * A simple task that executes a single action and processes the result
 */
export class SimpleTask extends BaseTask {
  private initialAction: Action;
  private maxSteps: number;
  private steps: number = 0;
  
  constructor(config: SimpleTaskConfig) {
    super(config);
    this.initialAction = config.initialAction;
    this.maxSteps = config.maxSteps || 10;
    
    // Initialize event stream if not provided in config
    if (!this.eventStream) {
      this.eventStream = new DefaultEventStream();
    }
  }
  
  /**
   * Execute the task
   */
  protected async execute(): Promise<void> {
    try {
      // Add the initial action to the event stream
      this.eventStream.addEvent(this.initialAction);
      this.addEvent(this.initialAction);
      
      // Wait for the observation
      const observation = await this.waitForObservation(this.initialAction.id);
      
      if (!observation) {
        throw new Error('No observation received for action');
      }
      
      // Process the observation
      await this.processObservation(observation);
      
      this.result = {
        success: true,
        steps: this.steps,
        finalObservation: observation
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.result = {
        success: false,
        error: errorMessage
      };
      
      // Log the error to the event stream
      if (this.eventStream) {
        try {
          this.eventStream.addEvent({
            id: `error_${Date.now()}`,
            type: 'task.error',
            timestamp: new Date(),
            content: {
              message: errorMessage,
              taskId: this.id,
              step: this.steps
            }
          });
        } catch (streamError) {
          console.error('Failed to log error to event stream:', streamError);
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Wait for an observation for an action
   * @param actionId The ID of the action
   * @returns The observation, or undefined if not received
   */
  private async waitForObservation(actionId: string): Promise<Observation | undefined> {
    return new Promise<Observation | undefined>((resolve) => {
      // Check if the observation already exists
      const observation = this.eventStream.getObservationForAction(actionId);
      if (observation) {
        resolve(observation);
        return;
      }
      
      // Subscribe to new events
      const subscriptionId = this.eventStream.subscribe((event) => {
        if (event.type.startsWith('observation.')) {
          const obs = event as Observation;
          if (obs.actionId === actionId) {
            this.eventStream.unsubscribe(subscriptionId);
            resolve(obs);
          }
        }
      });
      
      // Set a timeout
      setTimeout(() => {
        this.eventStream.unsubscribe(subscriptionId);
        resolve(undefined);
      }, 30000); // 30 second timeout
    });
  }
  
  /**
   * Process an observation
   * @param observation The observation to process
   */
  private async processObservation(observation: Observation): Promise<void> {
    this.steps++;
    
    // Add the observation to the task events
    this.addEvent(observation);
    
    // If we've reached the maximum number of steps, stop
    if (this.steps >= this.maxSteps) {
      return;
    }
    
    // Generate a new action based on the observation
    const action = await this.agent.process(observation);
    
    // Add the action to the event stream
    this.eventStream.addEvent(action);
    this.addEvent(action);
    
    // Wait for the observation
    const nextObservation = await this.waitForObservation(action.id);
    
    if (!nextObservation) {
      throw new Error('No observation received for action');
    }
    
    // Process the next observation
    await this.processObservation(nextObservation);
  }
}