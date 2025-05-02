import { Memory, MemoryFilter } from './Memory';
import { Event } from '../events/Event';
import { LLMProvider } from '../llm/LLMProvider';

/**
 * Interface for memory views
 * Memory views provide different perspectives on the same underlying memory
 */
export interface MemoryView {
  /**
   * Name of the memory view
   */
  name: string;
  
  /**
   * Get events from the memory view
   * @param filter Optional filter for events
   * @param limit Optional limit on the number of events
   * @returns Array of events
   */
  getEvents(filter?: MemoryFilter, limit?: number): Promise<Event[]>;
  
  /**
   * Get a summary of the memory view
   * @returns A summary of the memory view
   */
  getSummary(): Promise<string>;
}

/**
 * Configuration for a summarized memory view
 */
export interface SummarizedMemoryViewConfig {
  /**
   * The underlying memory
   */
  memory: Memory;
  
  /**
   * The LLM provider for generating summaries
   */
  llmProvider: LLMProvider;
  
  /**
   * Maximum number of events to include in the summary
   */
  maxEvents?: number;
  
  /**
   * Prompt template for generating summaries
   */
  summaryPrompt?: string;
}

/**
 * Memory view that provides summarized versions of events
 */
export class SummarizedMemoryView implements MemoryView {
  name: string;
  private memory: Memory;
  private llmProvider: LLMProvider;
  private maxEvents: number;
  private summaryPrompt: string;
  
  constructor(name: string, config: SummarizedMemoryViewConfig) {
    this.name = name;
    this.memory = config.memory;
    this.llmProvider = config.llmProvider;
    this.maxEvents = config.maxEvents || 100;
    this.summaryPrompt = config.summaryPrompt || 
      'Summarize the following events in a concise way, focusing on the most important information:\n\n{events}';
  }
  
  /**
   * Get events from the underlying memory
   * @param filter Optional filter for events
   * @param limit Optional limit on the number of events
   * @returns Array of events
   */
  async getEvents(filter?: MemoryFilter, limit?: number): Promise<Event[]> {
    return this.memory.getEvents(filter, limit);
  }
  
  /**
   * Get a summary of the memory view
   * @returns A summary of the memory view
   */
  async getSummary(): Promise<string> {
    // Get events from the underlying memory
    const events = await this.memory.getEvents(undefined, this.maxEvents);
    
    if (events.length === 0) {
      return `Memory view '${this.name}' is empty.`;
    }
    
    // Convert events to text
    const eventsText = events.map(event => {
      let text = `Type: ${event.type}\nSource: ${event.source}\nTimestamp: ${event.timestamp.toISOString()}\n`;
      
      if (event.metadata) {
        text += `Metadata: ${JSON.stringify(event.metadata)}\n`;
      }
      
      return text;
    }).join('\n---\n');
    
    // Generate summary using LLM
    const prompt = this.summaryPrompt.replace('{events}', eventsText);
    const summary = await this.llmProvider.generateCompletion(prompt);
    
    return summary;
  }
}

/**
 * Configuration for a filtered memory view
 */
export interface FilteredMemoryViewConfig {
  /**
   * The underlying memory
   */
  memory: Memory;
  
  /**
   * Filter to apply to events
   */
  filter: MemoryFilter;
}

/**
 * Memory view that applies a fixed filter to events
 */
export class FilteredMemoryView implements MemoryView {
  name: string;
  private memory: Memory;
  private filter: MemoryFilter;
  
  constructor(name: string, config: FilteredMemoryViewConfig) {
    this.name = name;
    this.memory = config.memory;
    this.filter = config.filter;
  }
  
  /**
   * Get events from the underlying memory with the fixed filter applied
   * @param additionalFilter Optional additional filter for events
   * @param limit Optional limit on the number of events
   * @returns Array of events
   */
  async getEvents(additionalFilter?: MemoryFilter, limit?: number): Promise<Event[]> {
    // Combine the fixed filter with the additional filter
    const combinedFilter: MemoryFilter = { ...this.filter };
    
    if (additionalFilter) {
      if (additionalFilter.type) {
        combinedFilter.type = additionalFilter.type;
      }
      
      if (additionalFilter.source) {
        combinedFilter.source = additionalFilter.source;
      }
      
      if (additionalFilter.timeRange) {
        combinedFilter.timeRange = {
          ...this.filter.timeRange,
          ...additionalFilter.timeRange
        };
      }
      
      if (additionalFilter.custom) {
        const originalCustom = combinedFilter.custom;
        combinedFilter.custom = (event: Event) => {
          const passesOriginal = originalCustom ? originalCustom(event) : true;
          return passesOriginal && additionalFilter.custom!(event);
        };
      }
    }
    
    return this.memory.getEvents(combinedFilter, limit);
  }
  
  /**
   * Get a summary of the memory view
   * @returns A summary of the memory view
   */
  async getSummary(): Promise<string> {
    const events = await this.getEvents();
    return `Filtered memory view '${this.name}' contains ${events.length} events.`;
  }
}