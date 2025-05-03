import { LLMProvider } from './LLMProvider';

/**
 * Registry for managing LLM providers
 */
export class LLMProviderRegistry {
  private static instance: LLMProviderRegistry;
  private providers: Map<string, LLMProvider> = new Map();
  private defaultProvider: string | null = null;
  
  /**
   * Get the singleton instance of the registry
   */
  public static getInstance(): LLMProviderRegistry {
    if (!LLMProviderRegistry.instance) {
      LLMProviderRegistry.instance = new LLMProviderRegistry();
    }
    return LLMProviderRegistry.instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}
  
  /**
   * Register an LLM provider
   * @param name The name of the provider
   * @param provider The provider to register
   * @param isDefault Whether this provider should be the default
   */
  registerProvider(name: string | LLMProvider, provider?: LLMProvider, isDefault: boolean = false): void {
    // Handle both overloads:
    // 1. registerProvider(provider, isDefault)
    // 2. registerProvider(name, provider, isDefault)
    let providerName: string;
    let providerInstance: LLMProvider;
    
    if (typeof name === 'string' && provider) {
      // Overload 2: name and provider provided separately
      providerName = name;
      providerInstance = provider;
      isDefault = isDefault;
    } else if (typeof name !== 'string') {
      // Overload 1: provider object provided directly
      providerInstance = name;
      providerName = providerInstance.name;
      isDefault = provider !== undefined ? Boolean(provider) : false;
    } else {
      throw new Error('Invalid arguments to registerProvider');
    }
    
    this.providers.set(providerName, providerInstance);
    
    if (isDefault || this.defaultProvider === null) {
      this.defaultProvider = providerName;
    }
  }
  
  /**
   * Unregister an LLM provider
   * @param name The name of the provider to unregister
   */
  unregisterProvider(name: string): void {
    this.providers.delete(name);
    
    if (this.defaultProvider === name) {
      this.defaultProvider = this.providers.size > 0 ? 
        Array.from(this.providers.keys())[0] : null;
    }
  }
  
  /**
   * Get an LLM provider by name
   * @param name The name of the provider
   * @returns The provider, or undefined if not found
   */
  getProvider(name: string): LLMProvider | undefined {
    return this.providers.get(name);
  }
  
  /**
   * Get the default LLM provider
   * @returns The default provider, or undefined if none is set
   */
  getDefaultProvider(): LLMProvider | undefined {
    return this.defaultProvider ? this.providers.get(this.defaultProvider) : undefined;
  }
  
  /**
   * Set the default LLM provider
   * @param name The name of the provider to set as default
   */
  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider '${name}' not registered`);
    }
    this.defaultProvider = name;
  }
  
  /**
   * Get all registered LLM providers
   * @returns Array of all providers
   */
  getAllProviders(): LLMProvider[] {
    return Array.from(this.providers.values());
  }
  
  /**
   * Get the names of all registered LLM providers
   * @returns Array of provider names
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }
}