import { Agent, AgentConfig } from './Agent';
import { EventStream } from '../events/EventStream';
import { LLMProvider } from '../llm/LLMProvider';

/**
 * Type for agent factory functions
 */
export type AgentFactory = (
  eventStream: EventStream,
  llmProvider: LLMProvider
) => Agent;

/**
 * Registry for managing agent types and instances
 */
export class AgentRegistry {
  private static instance: AgentRegistry;
  private agentFactories: Map<string, AgentFactory> = new Map();
  private agentInstances: Map<string, Agent> = new Map();
  
  /**
   * Get the singleton instance of the registry
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
   * @param type The type of agent
   * @param factory Factory function to create instances of the agent
   */
  registerAgentType(type: string, factory: AgentFactory): void {
    this.agentFactories.set(type, factory);
  }
  
  /**
   * Unregister an agent type
   * @param type The type of agent to unregister
   */
  unregisterAgentType(type: string): void {
    this.agentFactories.delete(type);
  }
  
  /**
   * Get all registered agent types
   * @returns Array of agent type names
   */
  getAgentTypes(): string[] {
    return Array.from(this.agentFactories.keys());
  }
  
  /**
   * Create an agent instance
   * @param type The type of agent to create
   * @param eventStream The event stream for the agent
   * @param llmProvider The LLM provider for the agent
   * @param config Configuration for the agent
   * @returns The created agent instance
   */
  async createAgent(
    type: string,
    eventStream: EventStream,
    llmProvider: LLMProvider,
    config: AgentConfig
  ): Promise<Agent> {
    const factory = this.agentFactories.get(type);
    if (!factory) {
      throw new Error(`Agent type '${type}' not registered`);
    }
    
    const agent = factory(eventStream, llmProvider);
    await agent.initialize(config);
    
    this.agentInstances.set(agent.id, agent);
    return agent;
  }
  
  /**
   * Get an agent instance by ID
   * @param id The ID of the agent
   * @returns The agent instance, or undefined if not found
   */
  getAgent(id: string): Agent | undefined {
    return this.agentInstances.get(id);
  }
  
  /**
   * Get all agent instances
   * @returns Array of all agent instances
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agentInstances.values());
  }
  
  /**
   * Get the default agent (first agent or create a thinking agent if none exists)
   * @returns The default agent
   */
  getDefaultAgent(): Agent {
    const agents = this.getAllAgents();
    if (agents.length > 0) {
      return agents[0];
    }
    
    // If no agents exist, throw an error - the application should create at least one agent
    throw new Error('No agents available. Please initialize the application properly.');
  }
  
  /**
   * Remove an agent instance
   * @param id The ID of the agent to remove
   */
  removeAgent(id: string): void {
    this.agentInstances.delete(id);
  }
  
  /**
   * Clear all agent instances
   */
  clearAgents(): void {
    this.agentInstances.clear();
  }
}