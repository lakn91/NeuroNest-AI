/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Log entry
 */
export interface LogEntry {
  /**
   * Timestamp of the log
   */
  timestamp: Date;
  
  /**
   * Level of the log
   */
  level: LogLevel;
  
  /**
   * Message of the log
   */
  message: string;
  
  /**
   * Context of the log
   */
  context?: string;
  
  /**
   * Additional data for the log
   */
  data?: any;
}

/**
 * Log transport for handling log entries
 */
export interface LogTransport {
  /**
   * Log a message
   * @param entry The log entry
   */
  log(entry: LogEntry): void;
}

/**
 * Console log transport
 */
export class ConsoleTransport implements LogTransport {
  /**
   * Log a message to the console
   * @param entry The log entry
   */
  log(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const context = entry.context ? `[${entry.context}]` : '';
    const message = `${timestamp} ${entry.level.toUpperCase()} ${context} ${entry.message}`;
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(message, entry.data || '');
        break;
      case LogLevel.ERROR:
        console.error(message, entry.data || '');
        break;
    }
  }
}

/**
 * File log transport
 */
export class FileTransport implements LogTransport {
  private filePath: string;
  
  constructor(filePath: string) {
    this.filePath = filePath;
  }
  
  /**
   * Log a message to a file
   * @param entry The log entry
   */
  log(entry: LogEntry): void {
    // In a real implementation, this would write to a file
    // For now, we'll just log to the console
    const timestamp = entry.timestamp.toISOString();
    const context = entry.context ? `[${entry.context}]` : '';
    const message = `${timestamp} ${entry.level.toUpperCase()} ${context} ${entry.message}`;
    const data = entry.data ? JSON.stringify(entry.data) : '';
    
    console.log(`[FileTransport] Would write to ${this.filePath}: ${message} ${data}`);
  }
}

/**
 * Memory log transport for storing logs in memory
 */
export class MemoryTransport implements LogTransport {
  private logs: LogEntry[] = [];
  private maxLogs: number;
  
  constructor(maxLogs: number = 1000) {
    this.maxLogs = maxLogs;
  }
  
  /**
   * Log a message to memory
   * @param entry The log entry
   */
  log(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Trim logs if necessary
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(this.logs.length - this.maxLogs);
    }
  }
  
  /**
   * Get all logs
   * @returns Array of log entries
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }
  
  /**
   * Get logs by level
   * @param level The level to filter by
   * @returns Array of log entries with the specified level
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter(log => log.level === level);
  }
  
  /**
   * Get logs by context
   * @param context The context to filter by
   * @returns Array of log entries with the specified context
   */
  getLogsByContext(context: string): LogEntry[] {
    return this.logs.filter(log => log.context === context);
  }
  
  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }
}

/**
 * Logger for logging messages
 */
export class Logger {
  private static instance: Logger;
  private transports: LogTransport[] = [];
  private minLevel: LogLevel = LogLevel.INFO;
  
  /**
   * Get the singleton instance of the logger
   */
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
      
      // Add default console transport
      Logger.instance.addTransport(new ConsoleTransport());
      
      // Add default memory transport
      Logger.instance.addTransport(new MemoryTransport());
    }
    return Logger.instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Set the minimum log level
   * @param level The minimum log level
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }
  
  /**
   * Add a transport
   * @param transport The transport to add
   */
  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }
  
  /**
   * Remove a transport
   * @param transport The transport to remove
   */
  removeTransport(transport: LogTransport): void {
    const index = this.transports.indexOf(transport);
    if (index !== -1) {
      this.transports.splice(index, 1);
    }
  }
  
  /**
   * Log a debug message
   * @param message The message to log
   * @param context Optional context for the log
   * @param data Optional data for the log
   */
  debug(message: string, context?: string, data?: any): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }
  
  /**
   * Log an info message
   * @param message The message to log
   * @param context Optional context for the log
   * @param data Optional data for the log
   */
  info(message: string, context?: string, data?: any): void {
    this.log(LogLevel.INFO, message, context, data);
  }
  
  /**
   * Log a warning message
   * @param message The message to log
   * @param context Optional context for the log
   * @param data Optional data for the log
   */
  warn(message: string, context?: string, data?: any): void {
    this.log(LogLevel.WARN, message, context, data);
  }
  
  /**
   * Log an error message
   * @param message The message to log
   * @param context Optional context for the log
   * @param data Optional data for the log
   */
  error(message: string, context?: string, data?: any): void {
    this.log(LogLevel.ERROR, message, context, data);
  }
  
  /**
   * Log a message
   * @param level The level of the log
   * @param message The message to log
   * @param context Optional context for the log
   * @param data Optional data for the log
   */
  private log(level: LogLevel, message: string, context?: string, data?: any): void {
    // Check if the level is high enough
    if (!this.shouldLog(level)) {
      return;
    }
    
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context,
      data
    };
    
    // Log to all transports
    for (const transport of this.transports) {
      try {
        transport.log(entry);
      } catch (error) {
        console.error('Error in log transport:', error);
      }
    }
  }
  
  /**
   * Check if a level should be logged
   * @param level The level to check
   * @returns Whether the level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const minLevelIndex = levels.indexOf(this.minLevel);
    const levelIndex = levels.indexOf(level);
    
    return levelIndex >= minLevelIndex;
  }
  
  /**
   * Get the memory transport
   * @returns The memory transport, or undefined if not found
   */
  getMemoryTransport(): MemoryTransport | undefined {
    return this.transports.find(
      transport => transport instanceof MemoryTransport
    ) as MemoryTransport | undefined;
  }
}