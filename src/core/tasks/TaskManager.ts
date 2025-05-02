import { Task, TaskStatus, TaskPriority } from './Task';

/**
 * Manager for handling tasks
 */
export class TaskManager {
  private static instance: TaskManager;
  private tasks: Map<string, Task> = new Map();
  private runningTasks: Set<string> = new Set();
  private maxConcurrentTasks: number = 5;
  
  /**
   * Get the singleton instance of the task manager
   */
  public static getInstance(): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager();
    }
    return TaskManager.instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Set the maximum number of concurrent tasks
   * @param max The maximum number of concurrent tasks
   */
  setMaxConcurrentTasks(max: number): void {
    this.maxConcurrentTasks = max;
  }
  
  /**
   * Add a task to the manager
   * @param task The task to add
   */
  addTask(task: Task): void {
    this.tasks.set(task.id, task);
    this.scheduleTasks();
  }
  
  /**
   * Get a task by ID
   * @param id The ID of the task
   * @returns The task, or undefined if not found
   */
  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }
  
  /**
   * Get all tasks
   * @returns Array of all tasks
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }
  
  /**
   * Get tasks by status
   * @param status The status to filter by
   * @returns Array of tasks with the specified status
   */
  getTasksByStatus(status: TaskStatus): Task[] {
    return this.getAllTasks().filter(task => task.status === status);
  }
  
  /**
   * Get tasks by priority
   * @param priority The priority to filter by
   * @returns Array of tasks with the specified priority
   */
  getTasksByPriority(priority: TaskPriority): Task[] {
    return this.getAllTasks().filter(task => task.priority === priority);
  }
  
  /**
   * Remove a task
   * @param id The ID of the task to remove
   */
  removeTask(id: string): void {
    const task = this.tasks.get(id);
    if (task) {
      // Cancel the task if it's running
      if (task.status === TaskStatus.RUNNING) {
        task.cancel();
        this.runningTasks.delete(id);
      }
      
      this.tasks.delete(id);
    }
  }
  
  /**
   * Cancel a task
   * @param id The ID of the task to cancel
   */
  async cancelTask(id: string): Promise<void> {
    const task = this.tasks.get(id);
    if (task) {
      await task.cancel();
      this.runningTasks.delete(id);
      this.scheduleTasks();
    }
  }
  
  /**
   * Schedule tasks for execution
   */
  private scheduleTasks(): void {
    // If we're already at max capacity, don't schedule more
    if (this.runningTasks.size >= this.maxConcurrentTasks) {
      return;
    }
    
    // Get pending tasks sorted by priority
    const pendingTasks = this.getTasksByStatus(TaskStatus.PENDING)
      .sort((a, b) => {
        // Sort by priority (CRITICAL > HIGH > MEDIUM > LOW)
        const priorityOrder = {
          [TaskPriority.CRITICAL]: 0,
          [TaskPriority.HIGH]: 1,
          [TaskPriority.MEDIUM]: 2,
          [TaskPriority.LOW]: 3
        };
        
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    
    // Start tasks until we reach max capacity
    for (const task of pendingTasks) {
      if (this.runningTasks.size >= this.maxConcurrentTasks) {
        break;
      }
      
      this.runningTasks.add(task.id);
      
      // Start the task and handle completion
      task.start().then(() => {
        this.runningTasks.delete(task.id);
        this.scheduleTasks();
      });
    }
  }
  
  /**
   * Clear all tasks
   */
  async clearTasks(): Promise<void> {
    // Cancel all running tasks
    const runningTaskIds = Array.from(this.runningTasks);
    for (const id of runningTaskIds) {
      await this.cancelTask(id);
    }
    
    this.tasks.clear();
    this.runningTasks.clear();
  }
}