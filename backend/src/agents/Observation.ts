import { BaseEvent } from './Event';

/**
 * Observation event representing an observation made by an agent
 */
export class Observation extends BaseEvent {
  /**
   * Create a new observation event
   * @param source Source of the observation
   * @param data Data associated with the observation
   */
  constructor(source: string, data: any) {
    super('observation', source, data);
  }
  
  /**
   * Create a text observation
   * @param source Source of the observation
   * @param text Text content
   * @returns A new observation event
   */
  static createTextObservation(source: string, text: string): Observation {
    return new Observation(source, {
      type: 'text',
      content: text
    });
  }
  
  /**
   * Create a code observation
   * @param source Source of the observation
   * @param code Code content
   * @param language Programming language
   * @param filePath Optional file path
   * @returns A new observation event
   */
  static createCodeObservation(source: string, code: string, language: string, filePath?: string): Observation {
    return new Observation(source, {
      type: 'code',
      content: code,
      language,
      filePath
    });
  }
  
  /**
   * Create a tool result observation
   * @param source Source of the observation
   * @param toolName Name of the tool
   * @param result Result of the tool execution
   * @returns A new observation event
   */
  static createToolResultObservation(source: string, toolName: string, result: any): Observation {
    return new Observation(source, {
      type: 'tool_result',
      toolName,
      result
    });
  }
  
  /**
   * Create an error observation
   * @param source Source of the observation
   * @param error Error message
   * @returns A new observation event
   */
  static createErrorObservation(source: string, error: string): Observation {
    return new Observation(source, {
      type: 'error',
      error
    });
  }
  
  /**
   * Create a user message observation
   * @param source Source of the observation
   * @param message User message
   * @returns A new observation event
   */
  static createUserMessageObservation(source: string, message: string): Observation {
    return new Observation(source, {
      type: 'user_message',
      message
    });
  }
}