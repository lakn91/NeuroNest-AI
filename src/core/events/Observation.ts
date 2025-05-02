import { BaseEvent, EventSource } from './Event';

/**
 * Observation interface representing results of actions
 * Observations are events that contain information about the results of actions
 */
export interface Observation extends BaseEvent {
  /**
   * The action ID that this observation is responding to
   */
  actionId: string;
  
  /**
   * Whether the action was successful
   */
  success: boolean;
  
  /**
   * The result of the action
   */
  result: any;
}

/**
 * Base class for all observations in the system
 */
export abstract class BaseObservation extends BaseEvent implements Observation {
  actionId: string;
  success: boolean;
  result: any;
  
  constructor(
    actionId: string,
    success: boolean,
    result: any,
    type: string,
    source: EventSource = EventSource.RUNTIME,
    metadata?: Record<string, any>
  ) {
    super(`observation.${type}`, source, metadata);
    this.actionId = actionId;
    this.success = success;
    this.result = result;
  }
}

/**
 * Message observation for text message responses
 */
export class MessageObservation extends BaseObservation {
  content: string;
  
  constructor(actionId: string, content: string, success: boolean = true, metadata?: Record<string, any>) {
    super(actionId, success, { content }, 'message', EventSource.AGENT, metadata);
    this.content = content;
  }
}

/**
 * Code execution observation for code execution results
 */
export class CodeExecutionObservation extends BaseObservation {
  output: string;
  exitCode: number;
  
  constructor(
    actionId: string,
    output: string,
    exitCode: number,
    success: boolean = exitCode === 0,
    metadata?: Record<string, any>
  ) {
    super(actionId, success, { output, exitCode }, 'code_execution', EventSource.RUNTIME, metadata);
    this.output = output;
    this.exitCode = exitCode;
  }
}

/**
 * Shell command observation for shell command results
 */
export class ShellCommandObservation extends BaseObservation {
  output: string;
  exitCode: number;
  
  constructor(
    actionId: string,
    output: string,
    exitCode: number,
    success: boolean = exitCode === 0,
    metadata?: Record<string, any>
  ) {
    super(actionId, success, { output, exitCode }, 'shell_command', EventSource.RUNTIME, metadata);
    this.output = output;
    this.exitCode = exitCode;
  }
}

/**
 * File operation observation for file operation results
 */
export class FileOperationObservation extends BaseObservation {
  operation: 'read' | 'write' | 'delete' | 'list';
  path: string;
  content?: string;
  files?: string[];
  
  constructor(
    actionId: string,
    operation: 'read' | 'write' | 'delete' | 'list',
    path: string,
    success: boolean,
    content?: string,
    files?: string[],
    metadata?: Record<string, any>
  ) {
    super(
      actionId,
      success,
      { operation, path, content, files },
      'file_operation',
      EventSource.RUNTIME,
      metadata
    );
    this.operation = operation;
    this.path = path;
    this.content = content;
    this.files = files;
  }
}

/**
 * Web search observation for web search results
 */
export class WebSearchObservation extends BaseObservation {
  results: any[];
  
  constructor(actionId: string, results: any[], success: boolean = true, metadata?: Record<string, any>) {
    super(actionId, success, { results }, 'web_search', EventSource.RUNTIME, metadata);
    this.results = results;
  }
}

/**
 * Error observation for error results
 */
export class ErrorObservation extends BaseObservation {
  error: string;
  
  constructor(actionId: string, error: string, metadata?: Record<string, any>) {
    super(actionId, false, { error }, 'error', EventSource.RUNTIME, metadata);
    this.error = error;
  }
}