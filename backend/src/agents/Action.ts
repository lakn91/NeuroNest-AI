import { BaseEvent } from './Event';

/**
 * Action event representing an action taken by an agent
 */
export class Action extends BaseEvent {
  /**
   * Create a new action event
   * @param source Source of the action
   * @param data Data associated with the action
   */
  constructor(source: string, data: any) {
    super('action', source, data);
  }
  
  /**
   * Create a text action
   * @param source Source of the action
   * @param text Text content
   * @returns A new action event
   */
  static createTextAction(source: string, text: string): Action {
    return new Action(source, {
      type: 'text',
      content: text
    });
  }
  
  /**
   * Create a code action
   * @param source Source of the action
   * @param code Code content
   * @param language Programming language
   * @param filePath Optional file path
   * @returns A new action event
   */
  static createCodeAction(source: string, code: string, language: string, filePath?: string): Action {
    return new Action(source, {
      type: 'code',
      content: code,
      language,
      filePath
    });
  }
  
  /**
   * Create a tool action
   * @param source Source of the action
   * @param toolName Name of the tool
   * @param parameters Parameters for the tool
   * @returns A new action event
   */
  static createToolAction(source: string, toolName: string, parameters: Record<string, any>): Action {
    return new Action(source, {
      type: 'tool',
      toolName,
      parameters
    });
  }
  
  /**
   * Create an error action
   * @param source Source of the action
   * @param error Error message
   * @returns A new action event
   */
  static createErrorAction(source: string, error: string): Action {
    return new Action(source, {
      type: 'error',
      error
    });
  }
}