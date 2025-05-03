import { BaseEvent, EventSource } from './Event';

/**
 * Action interface representing actions that can be performed by agents
 * Actions are events that trigger some behavior in the system
 */
export interface Action extends BaseEvent {
  /**
   * The name of the action
   */
  name: string;
  
  /**
   * Parameters for the action
   */
  parameters: Record<string, any>;
  
  /**
   * The agent that created this action
   */
  agentId: string;
  
  /**
   * Type of the action
   */
  type: string;
  
  /**
   * Execute the action
   * @returns Result of the action execution
   */
  execute(): Promise<any>;
}

/**
 * Base class for all actions in the system
 */
export abstract class BaseAction extends BaseEvent implements Action {
  name: string;
  parameters: Record<string, any>;
  agentId: string;
  type: string;
  
  constructor(
    name: string,
    parameters: Record<string, any>,
    agentId: string,
    source: EventSource = EventSource.AGENT,
    metadata?: Record<string, any>
  ) {
    super(`action.${name}`, source, metadata);
    this.name = name;
    this.parameters = parameters;
    this.agentId = agentId;
    this.type = `action.${name}`;
  }
  
  abstract execute(): Promise<any>;
}

/**
 * Message action for sending text messages
 */
export class MessageAction extends BaseAction {
  content: string;
  
  constructor(content: string, agentId: string, metadata?: Record<string, any>) {
    super('message', { content }, agentId, EventSource.AGENT, metadata);
    this.content = content;
  }
  
  async execute(): Promise<string> {
    return this.content;
  }
}

/**
 * System message action for system-level messages
 */
export class SystemMessageAction extends BaseAction {
  content: string;
  tools?: any[];
  
  constructor(content: string, agentId: string, tools?: any[], metadata?: Record<string, any>) {
    super('system_message', { content, tools }, agentId, EventSource.SYSTEM, metadata);
    this.content = content;
    this.tools = tools;
  }
  
  async execute(): Promise<string> {
    return this.content;
  }
}

/**
 * Code execution action for running code
 */
export class CodeExecutionAction extends BaseAction {
  code: string;
  language: string;
  
  constructor(code: string, language: string, agentId: string, metadata?: Record<string, any>) {
    super('code_execution', { code, language }, agentId, EventSource.AGENT, metadata);
    this.code = code;
    this.language = language;
  }
  
  async execute(): Promise<string> {
    // This would be implemented with actual code execution logic
    return `Executed ${this.language} code: ${this.code.substring(0, 50)}...`;
  }
}

/**
 * Shell command action for running shell commands
 */
export class ShellCommandAction extends BaseAction {
  command: string;
  
  constructor(command: string, agentId: string, metadata?: Record<string, any>) {
    super('shell_command', { command }, agentId, EventSource.AGENT, metadata);
    this.command = command;
  }
  
  async execute(): Promise<string> {
    // This would be implemented with actual shell command execution logic
    return `Executed shell command: ${this.command}`;
  }
}

/**
 * File operation action for file system operations
 */
export class FileOperationAction extends BaseAction {
  operation: 'read' | 'write' | 'delete' | 'list';
  path: string;
  content?: string;
  
  constructor(
    operation: 'read' | 'write' | 'delete' | 'list',
    path: string,
    content: string | undefined,
    agentId: string,
    metadata?: Record<string, any>
  ) {
    super('file_operation', { operation, path, content }, agentId, EventSource.AGENT, metadata);
    this.operation = operation;
    this.path = path;
    this.content = content;
  }
  
  async execute(): Promise<string> {
    // This would be implemented with actual file operation logic
    switch (this.operation) {
      case 'read':
        return `Read file: ${this.path}`;
      case 'write':
        return `Wrote to file: ${this.path}`;
      case 'delete':
        return `Deleted file: ${this.path}`;
      case 'list':
        return `Listed files in: ${this.path}`;
      default:
        return `Unknown file operation: ${this.operation}`;
    }
  }
}

/**
 * Web search action for performing web searches
 */
export class WebSearchAction extends BaseAction {
  query: string;
  
  constructor(query: string, agentId: string, metadata?: Record<string, any>) {
    super('web_search', { query }, agentId, EventSource.AGENT, metadata);
    this.query = query;
  }
  
  async execute(): Promise<string> {
    // This would be implemented with actual web search logic
    return `Searched for: ${this.query}`;
  }
}

/**
 * Task completion action for signaling task completion
 */
export class TaskCompletionAction extends BaseAction {
  success: boolean;
  message: string;
  
  constructor(success: boolean, message: string, agentId: string, metadata?: Record<string, any>) {
    super('task_completion', { success, message }, agentId, EventSource.AGENT, metadata);
    this.success = success;
    this.message = message;
  }
  
  async execute(): Promise<string> {
    return this.message;
  }
}