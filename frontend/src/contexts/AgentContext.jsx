/**
 * Agent Context
 * Provides agent orchestration functionality to the entire application
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useAgentMemory } from './AgentMemoryContext';
import { useConversation } from './ConversationContext';
import { useProject } from './ProjectContext';

// Create the agent context
const AgentContext = createContext();

/**
 * Custom hook to use the agent context
 * @returns {Object} Agent context
 */
export const useAgent = () => {
  return useContext(AgentContext);
};

/**
 * Agent Provider Component
 * Wraps the application and provides agent orchestration functionality
 */
export const AgentProvider = ({ children }) => {
  // Agent states
  const [agents, setAgents] = useState({
    thinking: { id: 'thinking', name: 'Thinking Agent', active: false, busy: false },
    developer: { id: 'developer', name: 'Developer Agent', active: false, busy: false },
    editor: { id: 'editor', name: 'Editor Agent', active: false, busy: false },
    execution: { id: 'execution', name: 'Execution Agent', active: false, busy: false }
  });
  
  const [orchestratorBusy, setOrchestratorBusy] = useState(false);
  const [currentTask, setCurrentTask] = useState(null);
  const [taskQueue, setTaskQueue] = useState([]);
  const [taskHistory, setTaskHistory] = useState([]);
  const [agentOutput, setAgentOutput] = useState({});
  
  // Get other contexts
  const { currentUser, userSettings } = useAuth();
  const { memories, createMemory, getAgentMemories } = useAgentMemory();
  const { currentConversation, messages, addMessage } = useConversation();
  const { currentProject } = useProject();

  /**
   * Activate an agent
   * @param {string} agentId - Agent ID
   */
  const activateAgent = (agentId) => {
    if (agents[agentId]) {
      setAgents(prev => ({
        ...prev,
        [agentId]: { ...prev[agentId], active: true }
      }));
    }
  };

  /**
   * Deactivate an agent
   * @param {string} agentId - Agent ID
   */
  const deactivateAgent = (agentId) => {
    if (agents[agentId]) {
      setAgents(prev => ({
        ...prev,
        [agentId]: { ...prev[agentId], active: false }
      }));
    }
  };

  /**
   * Set an agent as busy
   * @param {string} agentId - Agent ID
   * @param {boolean} busy - Busy state
   */
  const setAgentBusy = (agentId, busy) => {
    if (agents[agentId]) {
      setAgents(prev => ({
        ...prev,
        [agentId]: { ...prev[agentId], busy }
      }));
    }
  };

  /**
   * Add agent output
   * @param {string} agentId - Agent ID
   * @param {string} output - Agent output
   */
  const addAgentOutput = (agentId, output) => {
    setAgentOutput(prev => ({
      ...prev,
      [agentId]: [...(prev[agentId] || []), {
        content: output,
        timestamp: new Date().toISOString()
      }]
    }));
  };

  /**
   * Clear agent output
   * @param {string} agentId - Agent ID (optional, clears all if not provided)
   */
  const clearAgentOutput = (agentId = null) => {
    if (agentId) {
      setAgentOutput(prev => ({
        ...prev,
        [agentId]: []
      }));
    } else {
      setAgentOutput({});
    }
  };

  /**
   * Add a task to the queue
   * @param {Object} task - Task object
   */
  const addTask = (task) => {
    setTaskQueue(prev => [...prev, {
      ...task,
      id: Date.now().toString(),
      status: 'queued',
      createdAt: new Date().toISOString()
    }]);
  };

  /**
   * Remove a task from the queue
   * @param {string} taskId - Task ID
   */
  const removeTask = (taskId) => {
    setTaskQueue(prev => prev.filter(task => task.id !== taskId));
  };

  /**
   * Start processing the next task in the queue
   */
  const processNextTask = async () => {
    if (orchestratorBusy || taskQueue.length === 0) return;
    
    setOrchestratorBusy(true);
    
    // Get the next task
    const nextTask = taskQueue[0];
    setCurrentTask(nextTask);
    
    // Update task status
    setTaskQueue(prev => prev.map(task => 
      task.id === nextTask.id ? { ...task, status: 'processing', startedAt: new Date().toISOString() } : task
    ));
    
    try {
      // Determine which agent should handle the task
      const agentId = determineAgent(nextTask);
      
      if (!agentId) {
        throw new Error('No suitable agent found for this task');
      }
      
      // Activate and set the agent as busy
      activateAgent(agentId);
      setAgentBusy(agentId, true);
      
      // Process the task with the selected agent
      const result = await processTaskWithAgent(nextTask, agentId);
      
      // Add task to history
      setTaskHistory(prev => [{
        ...nextTask,
        status: 'completed',
        result,
        completedAt: new Date().toISOString()
      }, ...prev]);
      
      // Store in agent memory
      if (currentUser) {
        await createMemory(agentId, {
          content: JSON.stringify(result),
          context: nextTask.type,
          metadata: {
            taskId: nextTask.id,
            conversationId: currentConversation?.id,
            projectId: currentProject?.id
          }
        });
      }
      
      // Add message to conversation if available
      if (currentConversation) {
        await addMessage({
          role: 'agent',
          agentId,
          content: typeof result === 'string' ? result : JSON.stringify(result),
          taskId: nextTask.id
        });
      }
      
    } catch (error) {
      console.error('Error processing task:', error);
      
      // Add task to history with error
      setTaskHistory(prev => [{
        ...nextTask,
        status: 'failed',
        error: error.message,
        completedAt: new Date().toISOString()
      }, ...prev]);
      
      // Add error message to conversation if available
      if (currentConversation) {
        await addMessage({
          role: 'system',
          content: `Error processing task: ${error.message}`,
          taskId: nextTask.id
        });
      }
    } finally {
      // Reset agent states
      Object.keys(agents).forEach(agentId => {
        setAgentBusy(agentId, false);
      });
      
      // Remove task from queue
      removeTask(nextTask.id);
      setCurrentTask(null);
      setOrchestratorBusy(false);
    }
  };

  /**
   * Determine which agent should handle a task
   * @param {Object} task - Task object
   * @returns {string|null} Agent ID or null if no suitable agent
   */
  const determineAgent = (task) => {
    // Simple mapping based on task type
    const agentMap = {
      'analyze': 'thinking',
      'generate_code': 'developer',
      'review_code': 'editor',
      'execute_code': 'execution',
      'default': 'thinking'
    };
    
    return agentMap[task.type] || agentMap.default;
  };

  /**
   * Process a task with a specific agent
   * @param {Object} task - Task object
   * @param {string} agentId - Agent ID
   * @returns {Promise} Promise with task result
   */
  const processTaskWithAgent = async (task, agentId) => {
    // This is a placeholder for the actual agent processing logic
    // In a real implementation, this would call the backend API to process the task
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Add some output
    addAgentOutput(agentId, `Processing task: ${task.description}`);
    
    // Simulate more processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Add more output
    addAgentOutput(agentId, `Task ${task.id} completed successfully`);
    
    // Return a result based on the task type
    switch (task.type) {
      case 'analyze':
        return {
          analysis: `Analysis of ${task.data?.content || 'input'}`,
          recommendations: ['Recommendation 1', 'Recommendation 2']
        };
      case 'generate_code':
        return {
          code: `// Generated code for ${task.description}\nfunction example() {\n  console.log('Hello, world!');\n}`,
          language: 'javascript'
        };
      case 'review_code':
        return {
          review: `Review of code: ${task.data?.code || 'No code provided'}`,
          suggestions: ['Suggestion 1', 'Suggestion 2']
        };
      case 'execute_code':
        return {
          output: `Execution result: Success`,
          logs: ['Log line 1', 'Log line 2']
        };
      default:
        return {
          message: `Processed task: ${task.description}`
        };
    }
  };

  /**
   * Submit a user message and create appropriate tasks
   * @param {string} message - User message
   * @returns {Promise} Promise that resolves when message is processed
   */
  const submitUserMessage = async (message) => {
    if (!currentConversation) return;
    
    // Add user message to conversation
    await addMessage({
      role: 'user',
      content: message
    });
    
    // Create an analysis task
    addTask({
      type: 'analyze',
      description: 'Analyze user message',
      data: {
        content: message,
        conversationId: currentConversation.id,
        projectId: currentProject?.id
      },
      priority: 'high'
    });
  };

  /**
   * Generate code based on a specification
   * @param {string} specification - Code specification
   * @param {string} language - Programming language
   * @returns {Promise} Promise that resolves when code is generated
   */
  const generateCode = async (specification, language = 'javascript') => {
    // Create a code generation task
    addTask({
      type: 'generate_code',
      description: `Generate ${language} code`,
      data: {
        specification,
        language,
        conversationId: currentConversation?.id,
        projectId: currentProject?.id
      },
      priority: 'medium'
    });
  };

  /**
   * Review code
   * @param {string} code - Code to review
   * @param {string} language - Programming language
   * @returns {Promise} Promise that resolves when code is reviewed
   */
  const reviewCode = async (code, language = 'javascript') => {
    // Create a code review task
    addTask({
      type: 'review_code',
      description: `Review ${language} code`,
      data: {
        code,
        language,
        conversationId: currentConversation?.id,
        projectId: currentProject?.id
      },
      priority: 'medium'
    });
  };

  /**
   * Execute code
   * @param {string} code - Code to execute
   * @param {string} language - Programming language
   * @returns {Promise} Promise that resolves when code is executed
   */
  const executeCode = async (code, language = 'javascript') => {
    // Create a code execution task
    addTask({
      type: 'execute_code',
      description: `Execute ${language} code`,
      data: {
        code,
        language,
        conversationId: currentConversation?.id,
        projectId: currentProject?.id
      },
      priority: 'low'
    });
  };

  // Process tasks when the queue changes or orchestrator becomes available
  useEffect(() => {
    if (!orchestratorBusy && taskQueue.length > 0) {
      processNextTask();
    }
  }, [taskQueue, orchestratorBusy]);

  // Load agent memories when user changes
  useEffect(() => {
    if (currentUser) {
      // Load memories for each agent
      Object.keys(agents).forEach(agentId => {
        getAgentMemories(agentId);
      });
    }
  }, [currentUser]);

  // Value to be provided by the context
  const value = {
    agents,
    orchestratorBusy,
    currentTask,
    taskQueue,
    taskHistory,
    agentOutput,
    activateAgent,
    deactivateAgent,
    setAgentBusy,
    addAgentOutput,
    clearAgentOutput,
    addTask,
    removeTask,
    submitUserMessage,
    generateCode,
    reviewCode,
    executeCode
  };

  return (
    <AgentContext.Provider value={value}>
      {children}
    </AgentContext.Provider>
  );
};

export default AgentContext;