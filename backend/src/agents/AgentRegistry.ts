import { EventStream } from './EventStream';
import { LLMProvider } from './LLMProvider';
import { AgentInterface, AgentConfig } from './AgentInterface';

/**
 * Type for agent factory functions
 */
export type AgentFactory = (eventStream: EventStream, llmProvider: LLMProvider) => AgentInterface;

/**
 * Registry for agent types and instances
 */
export class AgentRegistry {
  private static instance: AgentRegistry;
  private agentTypes: Map<string, AgentFactory> = new Map();
  private agents: Map<string, AgentInterface> = new Map();
  
  /**
   * Get the singleton instance of the registry
   * @returns The registry instance
   */
  public static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Register an agent type
   * @param type Type of the agent
   * @param factory Factory function to create the agent
   */
  registerAgentType(type: string, factory: AgentFactory): void {
    this.agentTypes.set(type, factory);
  }
  
  /**
   * Get an agent type factory
   * @param type Type of the agent
   * @returns The agent factory function
   */
  getAgentType(type: string): AgentFactory | undefined {
    return this.agentTypes.get(type);
  }
  
  /**
   * Get all registered agent types
   * @returns Array of agent type names
   */
  getAgentTypes(): string[] {
    return Array.from(this.agentTypes.keys());
  }
  
  /**
   * Create an agent instance
   * @param type Type of the agent
   * @param config Configuration for the agent
   * @param eventStream Event stream for the agent
   * @param llmProvider LLM provider for the agent
   * @returns The created agent instance
   */
  async createAgent(
    type: string,
    config: AgentConfig,
    eventStream: EventStream,
    llmProvider: LLMProvider
  ): Promise<AgentInterface> {
    const factory = this.agentTypes.get(type);
    
    if (!factory) {
      throw new Error(`Agent type '${type}' not registered`);
    }
    
    const agent = factory(eventStream, llmProvider);
    await agent.initialize(config);
    
    this.agents.set(agent.id, agent);
    
    return agent;
  }
  
  /**
   * Get an agent instance by ID
   * @param id ID of the agent
   * @returns The agent instance
   */
  getAgent(id: string): AgentInterface | undefined {
    return this.agents.get(id);
  }
  
  /**
   * Get all agent instances
   * @returns Array of agent instances
   */
  getAgents(): AgentInterface[] {
    return Array.from(this.agents.values());
  }
  
  /**
   * Remove an agent instance
   * @param id ID of the agent
   */
  removeAgent(id: string): void {
    this.agents.delete(id);
  }
  
  /**
   * Clear all agent instances
   */
  clearAgents(): void {
    this.agents.clear();
  }
}