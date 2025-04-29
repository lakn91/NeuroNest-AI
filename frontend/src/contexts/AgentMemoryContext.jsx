/**
 * Agent Memory Context
 * Provides agent memory management functionality to the entire application
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useDatabase } from './DatabaseContext';

// Create the agent memory context
const AgentMemoryContext = createContext();

/**
 * Custom hook to use the agent memory context
 * @returns {Object} Agent memory context
 */
export const useAgentMemory = () => {
  return useContext(AgentMemoryContext);
};

/**
 * Agent Memory Provider Component
 * Wraps the application and provides agent memory management functionality
 */
export const AgentMemoryProvider = ({ children }) => {
  const [memories, setMemories] = useState({});
  const [loading, setLoading] = useState({});
  
  const { currentUser } = useAuth();
  const { agentMemoryService } = useDatabase();

  /**
   * Create a new memory entry
   * @param {string} agentId - Agent ID
   * @param {Object} memoryData - Memory data
   * @returns {Promise} Promise with memory ID
   */
  const createMemory = async (agentId, memoryData) => {
    if (!currentUser) return { id: null, error: 'No user logged in' };
    
    const result = await agentMemoryService.createMemory(currentUser.uid, agentId, memoryData);
    
    if (!result.error) {
      // Update memories state
      setMemories(prev => ({
        ...prev,
        [agentId]: [
          {
            id: result.id,
            userId: currentUser.uid,
            agentId,
            ...memoryData,
            createdAt: new Date().toISOString()
          },
          ...(prev[agentId] || [])
        ]
      }));
    }
    
    return result;
  };

  /**
   * Get memories for an agent
   * @param {string} agentId - Agent ID
   * @returns {Promise} Promise with memories array
   */
  const getAgentMemories = async (agentId) => {
    if (!currentUser) return { data: [], error: 'No user logged in' };
    
    setLoading(prev => ({ ...prev, [agentId]: true }));
    
    const result = await agentMemoryService.getAgentMemories(currentUser.uid, agentId);
    
    if (!result.error) {
      setMemories(prev => ({
        ...prev,
        [agentId]: result.data
      }));
    }
    
    setLoading(prev => ({ ...prev, [agentId]: false }));
    return result;
  };

  /**
   * Update a memory entry
   * @param {string} memoryId - Memory ID
   * @param {string} agentId - Agent ID
   * @param {Object} memoryData - Memory data to update
   * @returns {Promise} Promise that resolves when memory is updated
   */
  const updateMemory = async (memoryId, agentId, memoryData) => {
    const result = await agentMemoryService.updateMemory(memoryId, memoryData);
    
    if (!result.error) {
      // Update memories state
      setMemories(prev => ({
        ...prev,
        [agentId]: (prev[agentId] || []).map(memory => 
          memory.id === memoryId 
            ? { ...memory, ...memoryData, updatedAt: new Date().toISOString() } 
            : memory
        )
      }));
    }
    
    return result;
  };

  /**
   * Delete a memory entry
   * @param {string} memoryId - Memory ID
   * @param {string} agentId - Agent ID
   * @returns {Promise} Promise that resolves when memory is deleted
   */
  const deleteMemory = async (memoryId, agentId) => {
    const result = await agentMemoryService.deleteMemory(memoryId);
    
    if (!result.error) {
      // Update memories state
      setMemories(prev => ({
        ...prev,
        [agentId]: (prev[agentId] || []).filter(memory => memory.id !== memoryId)
      }));
    }
    
    return result;
  };

  /**
   * Clear all memories for an agent
   * @param {string} agentId - Agent ID
   * @returns {Promise} Promise that resolves when all memories are deleted
   */
  const clearAgentMemories = async (agentId) => {
    if (!currentUser || !memories[agentId]) return { error: null };
    
    // Delete each memory
    const deletePromises = memories[agentId].map(memory => 
      agentMemoryService.deleteMemory(memory.id)
    );
    
    await Promise.all(deletePromises);
    
    // Clear memories state for this agent
    setMemories(prev => ({
      ...prev,
      [agentId]: []
    }));
    
    return { error: null };
  };

  /**
   * Get memories for an agent by context
   * @param {string} agentId - Agent ID
   * @param {string} context - Context to filter by
   * @returns {Array} Filtered memories
   */
  const getMemoriesByContext = (agentId, context) => {
    if (!memories[agentId]) return [];
    
    return memories[agentId].filter(memory => 
      memory.context === context
    );
  };

  /**
   * Search memories for an agent
   * @param {string} agentId - Agent ID
   * @param {string} query - Search query
   * @returns {Array} Filtered memories
   */
  const searchMemories = (agentId, query) => {
    if (!memories[agentId] || !query) return memories[agentId] || [];
    
    const lowerQuery = query.toLowerCase();
    
    return memories[agentId].filter(memory => 
      (memory.content && memory.content.toLowerCase().includes(lowerQuery)) ||
      (memory.context && memory.context.toLowerCase().includes(lowerQuery)) ||
      (memory.metadata && JSON.stringify(memory.metadata).toLowerCase().includes(lowerQuery))
    );
  };

  // Reset state when user changes
  useEffect(() => {
    if (!currentUser) {
      setMemories({});
      setLoading({});
    }
  }, [currentUser]);

  // Value to be provided by the context
  const value = {
    memories,
    loading,
    createMemory,
    getAgentMemories,
    updateMemory,
    deleteMemory,
    clearAgentMemories,
    getMemoriesByContext,
    searchMemories
  };

  return (
    <AgentMemoryContext.Provider value={value}>
      {children}
    </AgentMemoryContext.Provider>
  );
};

export default AgentMemoryContext;