import { BaseTask, Task, TaskConfig, TaskStatus } from './Task';
import { Agent } from '../agents/Agent';
import { DefaultEventStream } from '../events/EventStream';

/**
 * Stage in a multi-stage task
 */
export interface TaskStage {
  /**
   * Name of the stage
   */
  name: string;
  
  /**
   * Description of the stage
   */
  description: string;
  
  /**
   * Agent for the stage
   */
  agent: Agent;
  
  /**
   * Function to create the task for this stage
   * @param previousResults Results from previous stages
   * @returns The task for this stage
   */
  createTask: (previousResults: any[]) => Task;
}

/**
 * Configuration for a multi-stage task
 */
export interface MultiStageTaskConfig extends TaskConfig {
  /**
   * Stages of the task
   */
  stages: TaskStage[];
}

/**
 * A task that consists of multiple stages executed sequentially
 */
export class MultiStageTask extends BaseTask {
  private stages: TaskStage[];
  private stageResults: any[] = [];
  private currentStageIndex: number = 0;
  
  constructor(config: MultiStageTaskConfig) {
    super(config);
    this.stages = config.stages;
    
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
      // Execute each stage sequentially
      for (let i = 0; i < this.stages.length; i++) {
        this.currentStageIndex = i;
        const stage = this.stages[i];
        
        // Create the task for this stage
        const task = stage.createTask(this.stageResults);
        
        // Add as a subtask
        this.addSubtask(task);
        
        // Start the task
        await task.start();
        
        // If the task failed, stop execution
        if (task.status === TaskStatus.FAILED) {
          throw new Error(`Stage ${stage.name} failed: ${JSON.stringify(task.getResult())}`);
        }
        
        // Store the result
        this.stageResults.push(task.getResult());
      }
      
      this.result = {
        success: true,
        stageResults: this.stageResults
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.result = {
        success: false,
        error: errorMessage,
        stageResults: this.stageResults
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
              stageName: this.getCurrentStage()?.name
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
   * Get the current stage
   * @returns The current stage
   */
  getCurrentStage(): TaskStage | undefined {
    return this.stages[this.currentStageIndex];
  }
  
  /**
   * Get the results of completed stages
   * @returns Array of stage results
   */
  getStageResults(): any[] {
    return [...this.stageResults];
  }
}