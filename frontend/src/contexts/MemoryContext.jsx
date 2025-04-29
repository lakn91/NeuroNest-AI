/**
 * Memory Context
 * Provides agent memory management throughout the application
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useDatabase } from './DatabaseContext';

// Create context
const MemoryContext = createContext();

// Memory provider component
export const MemoryProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const { memoryService } = useDatabase();
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Load memories when user changes
  useEffect(() => {
    if (currentUser) {
      getMemories();
    } else {
      setMemories([]);
    }
  }, [currentUser]);

  // Create a new memory
  const createMemory = async (agentId, content, context = null, metadata = null) => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to use the database service first
      if (memoryService && memoryService.createMemory) {
        const memoryData = {
          agent_id: agentId,
          content,
          context,
          metadata
        };
        
        const result = await memoryService.createMemory(currentUser?.uid, memoryData);
        
        if (!result.error) {
          // Add new memory to state
          setMemories(prev => [result.data, ...prev]);
          return result.data;
        } else {
          setError(result.error);
          return null;
        }
      } else {
        // Fallback to API
        const response = await api.post('/api/memory', {
          agent_id: agentId,
          content,
          context,
          metadata
        });
        
        // Add new memory to state
        setMemories(prev => [response.data, ...prev]);
        
        return response.data;
      }
    } catch (err) {
      console.error('Failed to create memory:', err);
      setError(err.response?.data?.detail || 'Failed to create memory');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get memories for an agent
  const getMemories = async (agentId = null, context = null, limit = 100, offset = 0) => {
    if (!currentUser) return [];
    
    try {
      setLoading(true);
      setError(null);
      
      // Try to use the database service first
      if (memoryService && memoryService.getMemories) {
        const filters = {
          agent_id: agentId,
          context,
          limit,
          offset
        };
        
        const { data, error } = await memoryService.getMemories(currentUser.uid, filters);
        
        if (error) {
          setError(error);
          return [];
        }
        
        setMemories(data || []);
        return data || [];
      } else {
        // Fallback to API
        // Build query parameters
        const params = new URLSearchParams();
        if (agentId) params.append('agent_id', agentId);
        if (context) params.append('context', context);
        params.append('limit', limit);
        params.append('offset', offset);
        
        const response = await api.get(`/api/memory?${params.toString()}`);
        
        setMemories(response.data.memories);
        
        return response.data.memories;
      }
    } catch (err) {
      console.error('Failed to get memories:', err);
      setError(err.response?.data?.detail || 'Failed to get memories');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Get a specific memory by ID
  const getMemoryById = async (memoryId) => {
    if (!currentUser) return null;
    
    try {
      setLoading(true);
      setError(null);
      
      // Try to use the database service first
      if (memoryService && memoryService.getMemory) {
        const { data, error } = await memoryService.getMemory(memoryId);
        
        if (error) {
          setError(error);
          return null;
        }
        
        return data;
      } else {
        // Fallback to API
        const response = await api.get(`/api/memory/${memoryId}`);
        
        return response.data;
      }
    } catch (err) {
      console.error('Failed to get memory:', err);
      setError(err.response?.data?.detail || 'Failed to get memory');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update a memory
  const updateMemory = async (memoryId, content = null, context = null, metadata = null) => {
    if (!currentUser) return null;
    
    try {
      setLoading(true);
      setError(null);
      
      // Build request data with only provided fields
      const updateData = {};
      if (content !== null) updateData.content = content;
      if (context !== null) updateData.context = context;
      if (metadata !== null) updateData.metadata = metadata;
      
      // Try to use the database service first
      if (memoryService && memoryService.updateMemory) {
        const { data, error } = await memoryService.updateMemory(memoryId, updateData);
        
        if (error) {
          setError(error);
          return null;
        }
        
        // Update memory in state
        setMemories(prev => 
          prev.map(memory => 
            memory.id === memoryId ? data : memory
          )
        );
        
        return data;
      } else {
        // Fallback to API
        const response = await api.put(`/api/memory/${memoryId}`, updateData);
        
        // Update memory in state
        setMemories(prev => 
          prev.map(memory => 
            memory.id === memoryId ? response.data : memory
          )
        );
        
        return response.data;
      }
    } catch (err) {
      console.error('Failed to update memory:', err);
      setError(err.response?.data?.detail || 'Failed to update memory');
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Delete a memory
  const deleteMemory = async (memoryId) => {
    if (!currentUser) return false;
    
    try {
      setLoading(true);
      setError(null);
      
      // Try to use the database service first
      if (memoryService && memoryService.deleteMemory) {
        const { error } = await memoryService.deleteMemory(memoryId);
        
        if (error) {
          setError(error);
          return false;
        }
        
        // Remove memory from state
        setMemories(prev => prev.filter(memory => memory.id !== memoryId));
        
        return true;
      } else {
        // Fallback to API
        await api.delete(`/api/memory/${memoryId}`);
        
        // Remove memory from state
        setMemories(prev => prev.filter(memory => memory.id !== memoryId));
        
        return true;
      }
    } catch (err) {
      console.error('Failed to delete memory:', err);
      setError(err.response?.data?.detail || 'Failed to delete memory');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Delete all memories for an agent
  const deleteAgentMemories = async (agentId) => {
    if (!currentUser) return false;
    
    try {
      setLoading(true);
      setError(null);
      
      // Try to use the database service first
      if (memoryService && memoryService.deleteAgentMemories) {
        const { error } = await memoryService.deleteAgentMemories(agentId);
        
        if (error) {
          setError(error);
          return false;
        }
        
        // Remove agent memories from state
        setMemories(prev => prev.filter(memory => memory.agent_id !== agentId));
        
        return true;
      } else {
        // Fallback to API
        await api.delete(`/api/memory/agent/${agentId}`);
        
        // Remove agent memories from state
        setMemories(prev => prev.filter(memory => memory.agent_id !== agentId));
        
        return true;
      }
    } catch (err) {
      console.error('Failed to delete agent memories:', err);
      setError(err.response?.data?.detail || 'Failed to delete agent memories');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Search memories
  const searchMemories = async (query, agentId = null, context = null, limit = 10) => {
    if (!currentUser) return [];
    
    try {
      setLoading(true);
      setError(null);
      
      // Try to use the database service first
      if (memoryService && memoryService.searchMemories) {
        const searchParams = {
          query,
          agent_id: agentId,
          context,
          limit
        };
        
        const { data, error } = await memoryService.searchMemories(currentUser.uid, searchParams);
        
        if (error) {
          setError(error);
          return [];
        }
        
        return data || [];
      } else {
        // Fallback to API
        // Build query parameters
        const params = new URLSearchParams();
        params.append('query', query);
        if (agentId) params.append('agent_id', agentId);
        if (context) params.append('context', context);
        params.append('limit', limit);
        
        const response = await api.get(`/api/memory/search?${params.toString()}`);
        
        return response.data.memories;
      }
    } catch (err) {
      console.error('Failed to search memories:', err);
      setError(err.response?.data?.detail || 'Failed to search memories');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Context value
  const value = {
    memories,
    loading,
    error,
    createMemory,
    getMemories,
    getMemoryById,
    updateMemory,
    deleteMemory,
    deleteAgentMemories,
    searchMemories,
    clearError
  };

  return <MemoryContext.Provider value={value}>{children}</MemoryContext.Provider>;
};

// Custom hook to use memory context
export const useMemory = () => {
  const context = useContext(MemoryContext);
  if (!context) {
    throw new Error('useMemory must be used within a MemoryProvider');
  }
  return context;
};

export default MemoryContext;