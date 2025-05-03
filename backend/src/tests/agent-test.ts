import { 
  DefaultEventStream, 
  ThinkingAgent, 
  Observation,
  AgentRegistry
} from '../agents';

// Create a simple LLM provider for testing
const testLLMProvider = {
  generateChatCompletion: async (messages: any[]) => {
    console.log('Test LLM Provider received messages:', JSON.stringify(messages, null, 2));
    return {
      content: "This is a test response from the LLM provider."
    };
  }
};

async function testAgentSystem() {
  try {
    console.log('Starting agent system test...');
    
    // Initialize the agent registry
    const registry = AgentRegistry.getInstance();
    
    // Register agent types
    registry.registerAgentType('thinking', (es, llm) => new ThinkingAgent(es, llm));
    
    console.log('Registered agent types:', registry.getAgentTypes());
    
    // Create an event stream
    const eventStream = new DefaultEventStream();
    
    // Add event listeners
    eventStream.on('action', (action) => {
      console.log('Action received:', JSON.stringify(action, null, 2));
    });
    
    // Create a thinking agent
    const thinkingAgent = await registry.createAgent(
      'thinking',
      { 
        id: 'test-thinking-agent', 
        name: 'Test Thinking Agent', 
        description: 'A test thinking agent' 
      },
      eventStream,
      testLLMProvider
    );
    
    console.log('Created agent:', thinkingAgent.id, thinkingAgent.name);
    
    // Create an observation
    const observation = Observation.createUserMessageObservation('user', 'Hello, can you help me think about a problem?');
    
    // Process the observation
    console.log('Processing observation...');
    const action = await thinkingAgent.process(observation);
    
    console.log('Received action:', JSON.stringify(action, null, 2));
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testAgentSystem();