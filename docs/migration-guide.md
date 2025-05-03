# NeuroNest-AI Migration Guide

This guide provides instructions for migrating from the old agent architecture to the new event-driven architecture.

## Overview of Changes

The NeuroNest-AI codebase has been refactored to use a consistent event-driven architecture across all implementations (TypeScript core, Node.js backend, FastAPI Python backend). The main changes include:

1. **Event-Driven Architecture**: Agents now communicate through events (Actions and Observations) instead of direct method calls.
2. **Standardized Interfaces**: All agent implementations now follow the same interface structure.
3. **Backward Compatibility**: Legacy methods are maintained for backward compatibility.
4. **Agent Registry**: A centralized registry for agent types and instances.

## Migration Steps for TypeScript/Node.js

### 1. Update Imports

```typescript
// Old imports
import { AgentInterface, AgentResponse } from './AgentInterface';

// New imports
import { 
  AgentInterface, 
  AgentConfig, 
  AgentTool, 
  AgentResponse,
  EventStream,
  Action,
  Observation,
  LLMProvider
} from './agents';
```

### 2. Update Agent Creation

```typescript
// Old way
const agent = new MyAgent('Agent Name', 'Agent Description');

// New way
const eventStream = new DefaultEventStream();
const llmProvider = new OpenAIProvider({ apiKey: 'your-api-key' });
const agent = new MyAgent(eventStream, llmProvider);
await agent.initialize({
  id: 'unique-id',
  name: 'Agent Name',
  description: 'Agent Description',
  systemMessage: 'Optional system message'
});
```

### 3. Update Agent Processing

```typescript
// Old way
const response = await agent.process('User message', context);

// New way
const observation = Observation.createUserMessageObservation('user', 'User message');
if (context) {
  observation.data.context = context;
}
const action = await agent.process(observation);
```

### 4. Using the Agent Registry

```typescript
// Register agent types
const registry = AgentRegistry.getInstance();
registry.registerAgentType('my-agent', (es, llm) => new MyAgent(es, llm));

// Create agent instances
const agent = await registry.createAgent(
  'my-agent',
  { id: 'unique-id', name: 'Agent Name', description: 'Agent Description' },
  eventStream,
  llmProvider
);

// Get agent instances
const myAgent = registry.getAgent('unique-id');
```

## Migration Steps for Python/FastAPI

### 1. Update Imports

```python
# Old imports
from app.services.agent import BaseAgent

# New imports
from app.services.base_agent import (
    BaseAgent,
    EventStream,
    Action,
    Observation,
    AgentRegistry
)
```

### 2. Update Agent Creation

```python
# Old way
agent = MyAgent()

# New way
event_stream = EventStream()
llm_provider = {"api_key": "your-api-key", "provider": "openai"}
agent = MyAgent(event_stream, llm_provider)
await agent.initialize({
    "id": "unique-id",
    "name": "Agent Name",
    "description": "Agent Description",
    "system_message": "Optional system message"
})
```

### 3. Update Agent Processing

```python
# Old way
response = await agent.process_message("User message", context)

# New way
observation = Observation.create_user_message_observation("user", "User message")
if context:
    observation.data["context"] = context
action = await agent.process(observation)
```

### 4. Using the Agent Registry

```python
# Register agent types
registry = AgentRegistry.get_instance()
registry.register_agent_type("my-agent", lambda es, llm: MyAgent(es, llm))

# Create agent instances
agent = await registry.create_agent(
    "my-agent",
    {"id": "unique-id", "name": "Agent Name", "description": "Agent Description"},
    event_stream,
    llm_provider
)

# Get agent instances
my_agent = registry.get_agent("unique-id")
```

## Implementing a New Agent

### TypeScript/Node.js

```typescript
import { BaseAgent, EventStream, LLMProvider, Action, Observation } from './agents';

export class MyAgent extends BaseAgent {
  constructor(eventStream: EventStream, llmProvider: LLMProvider) {
    super(eventStream, llmProvider);
  }
  
  async initialize(config: AgentConfig): Promise<void> {
    await super.initialize(config);
    
    // Additional initialization
  }
  
  async process(observation: Observation): Promise<Action> {
    // Process the observation
    const message = observation.data.type === 'user_message' 
      ? observation.data.message 
      : JSON.stringify(observation.data);
    
    // Generate a response
    const response = await this.llmProvider.generateChatCompletion([
      { role: 'system', content: this.systemMessage },
      { role: 'user', content: message }
    ]);
    
    // Return an action
    return Action.createTextAction(this.id, response.content);
  }
}
```

### Python/FastAPI

```python
from app.services.base_agent import BaseAgent, EventStream, Action, Observation

class MyAgent(BaseAgent):
    def __init__(self, event_stream: EventStream, llm_provider: Any):
        super().__init__(event_stream, llm_provider)
        
    async def initialize(self, config: Dict[str, Any]) -> None:
        await super().initialize(config)
        
        # Additional initialization
        
    async def process(self, observation: Observation) -> Action:
        # Process the observation
        if observation.data["type"] == "user_message":
            message = observation.data["message"]
        else:
            message = json.dumps(observation.data)
        
        # Generate a response
        # ...
        
        # Return an action
        return Action.create_text_action(self.id, "Response text")
```

## Backward Compatibility

The refactored code maintains backward compatibility through legacy methods:

- `processMessage(message, context)` → Calls `process(observation)`
- `getName()` → Returns `name` property
- `getDescription()` → Returns `description` property

These methods are marked as deprecated and will be removed in a future version.

## Testing

Update your tests to use the new event-driven architecture:

```typescript
// Old test
const response = await agent.process('Test message');
expect(response.type).toBe('text');

// New test
const observation = Observation.createUserMessageObservation('user', 'Test message');
const action = await agent.process(observation);
expect(action.data.type).toBe('text');
```

## Timeline

- **Phase 1**: Core interfaces and base classes updated
- **Phase 2**: Agent implementations updated
- **Phase 3**: Client code updated
- **Phase 4**: Legacy methods removed

## Support

If you encounter any issues during migration, please contact the development team or open an issue on GitHub.