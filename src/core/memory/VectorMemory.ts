import { BaseMemory, MemoryFilter } from './Memory';
import { Event } from '../events/Event';
import { LLMProvider } from '../llm/LLMProvider';

/**
 * Configuration for vector memory
 */
export interface VectorMemoryConfig {
  /**
   * LLM provider for generating embeddings
   */
  llmProvider: LLMProvider;
  
  /**
   * Maximum number of events to store
   */
  maxSize?: number;
}

/**
 * Memory entry with embedding
 */
interface MemoryEntry {
  /**
   * The event
   */
  event: Event;
  
  /**
   * The embedding for the event
   */
  embedding: number[];
}

/**
 * Memory implementation that stores events with vector embeddings for semantic search
 */
export class VectorMemory extends BaseMemory {
  private entries: MemoryEntry[] = [];
  private llmProvider: LLMProvider;
  private maxSize: number;
  
  constructor(name: string, config: VectorMemoryConfig) {
    super(name);
    this.llmProvider = config.llmProvider;
    this.maxSize = config.maxSize || 1000;
  }
  
  /**
   * Alternative constructor for factory pattern
   * @param config Configuration with name and other settings
   */
  static create(config: VectorMemoryConfig & { name: string }): VectorMemory {
    return new VectorMemory(config.name, config);
  }
  
  /**
   * Add an event to the vector memory
   * @param event The event to add
   */
  async addEvent(event: Event): Promise<void> {
    // Generate a text representation of the event
    const text = this.eventToText(event);
    
    // Generate embedding for the text
    const embedding = await this.llmProvider.generateEmbeddings(text);
    
    // Add the entry
    this.entries.push({ event, embedding });
    
    // Trim the entries if they exceed the maximum size
    if (this.entries.length > this.maxSize) {
      this.entries = this.entries.slice(this.entries.length - this.maxSize);
    }
  }
  
  /**
   * Get events from the vector memory
   * @param filter Optional filter for events
   * @param limit Optional limit on the number of events
   * @returns Array of events
   */
  async getEvents(filter?: MemoryFilter, limit?: number): Promise<Event[]> {
    let result = this.entries.map(entry => entry.event);
    
    // Apply filters
    if (filter) {
      if (filter.type) {
        result = result.filter(event => event.type === filter.type);
      }
      
      if (filter.source) {
        result = result.filter(event => event.source && event.source.toString() === filter.source);
      }
      
      if (filter.timeRange) {
        if (filter.timeRange.start) {
          result = result.filter(event => event.timestamp >= filter.timeRange!.start!);
        }
        
        if (filter.timeRange.end) {
          result = result.filter(event => event.timestamp <= filter.timeRange!.end!);
        }
      }
      
      if (filter.custom) {
        result = result.filter(filter.custom);
      }
    }
    
    // Apply limit
    if (limit && limit > 0 && limit < result.length) {
      result = result.slice(result.length - limit);
    }
    
    return result;
  }
  
  /**
   * Search for events in the vector memory using semantic search
   * @param query The search query
   * @param limit Optional limit on the number of results
   * @returns Array of events matching the query
   */
  async searchEvents(query: string, limit?: number): Promise<Event[]> {
    // Generate embedding for the query
    const queryEmbedding = await this.llmProvider.generateEmbeddings(query);
    
    // Calculate similarity scores
    const scoredEntries = this.entries.map(entry => ({
      event: entry.event,
      score: this.cosineSimilarity(queryEmbedding, entry.embedding)
    }));
    
    // Sort by similarity score (descending)
    scoredEntries.sort((a, b) => b.score - a.score);
    
    // Apply limit
    const limitToUse = limit || this.entries.length;
    const results = scoredEntries.slice(0, limitToUse).map(entry => entry.event);
    
    return results;
  }
  
  /**
   * Clear all events from the vector memory
   */
  async clear(): Promise<void> {
    this.entries = [];
  }
  
  /**
   * Convert an event to a text representation for embedding
   * @param event The event to convert
   * @returns Text representation of the event
   */
  private eventToText(event: Event): string {
    let text = `Type: ${event.type}\nSource: ${event.source}\nTimestamp: ${event.timestamp.toISOString()}\n`;
    
    if (event.metadata) {
      text += `Metadata: ${JSON.stringify(event.metadata)}\n`;
    }
    
    return text;
  }
  
  /**
   * Calculate cosine similarity between two vectors
   * @param a First vector
   * @param b Second vector
   * @returns Cosine similarity score
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (normA * normB);
  }
  
  /**
   * Get the current size of the vector memory
   * @returns The number of entries in the memory
   */
  getSize(): number {
    return this.entries.length;
  }
  
  /**
   * Get the maximum size of the vector memory
   * @returns The maximum number of entries the memory can hold
   */
  getMaxSize(): number {
    return this.maxSize;
  }
  
  /**
   * Set the maximum size of the vector memory
   * @param size The new maximum size
   */
  setMaxSize(size: number): void {
    this.maxSize = size;
    
    // Trim the entries if they exceed the new maximum size
    if (this.entries.length > this.maxSize) {
      this.entries = this.entries.slice(this.entries.length - this.maxSize);
    }
  }
}