import { Event } from '../events/Event';
import { Agent } from '../agents/Agent';

/**
 * Status of a task
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * Priority of a task
 */
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Interface for tasks
 */
export interface Task {
  /**
   * Unique identifier for the task
   */
  id: string;
  
  /**
   * Name of the task
   */
  name: string;
  
  /**
   * Description of the task
   */
  description: string;
  
  /**
   * Status of the task
   */
  status: TaskStatus;
  
  /**
   * Priority of the task
   */
  priority: TaskPriority;
  
  /**
   * Agent assigned to the task
   */
  agent: Agent;
  
  /**
   * Start time of the task
   */
  startTime?: Date;
  
  /**
   * End time of the task
   */
  endTime?: Date;
  
  /**
   * Parent task, if this is a subtask
   */
  parentTask?: Task;
  
  /**
   * Subtasks of this task
   */
  subtasks: Task[];
  
  /**
   * Events related to this task
   */
  events: Event[];
  
  /**
   * Start the task
   */
  start(): Promise<void>;
  
  /**
   * Cancel the task
   */
  cancel(): Promise<void>;
  
  /**
   * Add a subtask
   * @param subtask The subtask to add
   */
  addSubtask(subtask: Task): void;
  
  /**
   * Add an event to the task
   * @param event The event to add
   */
  addEvent(event: Event): void;
  
  /**
   * Get the progress of the task
   * @returns The progress as a number between 0 and 1
   */
  getProgress(): number;
  
  /**
   * Get the result of the task
   * @returns The result of the task
   */
  getResult(): any;
}

/**
 * Configuration for a task
 */
export interface TaskConfig {
  /**
   * Name of the task
   */
  name: string;
  
  /**
   * Description of the task
   */
  description: string;
  
  /**
   * Priority of the task
   */
  priority?: TaskPriority;
  
  /**
   * Agent for the task
   */
  agent: Agent;
  
  /**
   * Parent task, if this is a subtask
   */
  parentTask?: Task;
  
  /**
   * Additional configuration options
   */
  [key: string]: any;
}

/**
 * Base class for tasks
 */
export abstract class BaseTask implements Task {
  id: string;
  name: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  agent: Agent;
  startTime?: Date;
  endTime?: Date;
  parentTask?: Task;
  subtasks: Task[] = [];
  events: Event[] = [];
  protected result: any = null;
  
  constructor(config: TaskConfig) {
    this.id = this.generateId();
    this.name = config.name;
    this.description = config.description;
    this.status = TaskStatus.PENDING;
    this.priority = config.priority || TaskPriority.MEDIUM;
    this.agent = config.agent;
    this.parentTask = config.parentTask;
  }
  
  /**
   * Generate a unique ID for the task
   * @returns A unique ID
   */
  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Start the task
   */
  async start(): Promise<void> {
    if (this.status === TaskStatus.RUNNING) {
      return;
    }
    
    this.status = TaskStatus.RUNNING;
    this.startTime = new Date();
    
    try {
      await this.execute();
      this.status = TaskStatus.COMPLETED;
    } catch (error) {
      this.status = TaskStatus.FAILED;
      this.result = { error: error.message };
    }
    
    this.endTime = new Date();
  }
  
  /**
   * Execute the task
   */
  protected abstract execute(): Promise<void>;
  
  /**
   * Cancel the task
   */
  async cancel(): Promise<void> {
    if (this.status === TaskStatus.COMPLETED || this.status === TaskStatus.FAILED) {
      return;
    }
    
    // Cancel all subtasks
    for (const subtask of this.subtasks) {
      await subtask.cancel();
    }
    
    this.status = TaskStatus.CANCELLED;
    this.endTime = new Date();
  }
  
  /**
   * Add a subtask
   * @param subtask The subtask to add
   */
  addSubtask(subtask: Task): void {
    this.subtasks.push(subtask);
  }
  
  /**
   * Add an event to the task
   * @param event The event to add
   */
  addEvent(event: Event): void {
    this.events.push(event);
  }
  
  /**
   * Get the progress of the task
   * @returns The progress as a number between 0 and 1
   */
  getProgress(): number {
    if (this.status === TaskStatus.COMPLETED) {
      return 1;
    }
    
    if (this.status === TaskStatus.PENDING) {
      return 0;
    }
    
    if (this.subtasks.length === 0) {
      return this.status === TaskStatus.RUNNING ? 0.5 : 0;
    }
    
    // Calculate progress based on subtasks
    const subtaskProgress = this.subtasks.reduce(
      (sum, subtask) => sum + subtask.getProgress(),
      0
    );
    
    return subtaskProgress / this.subtasks.length;
  }
  
  /**
   * Get the result of the task
   * @returns The result of the task
   */
  getResult(): any {
    return this.result;
  }
}