/**
 * LangChain Agent Context
 * Provides LangChain agent functionality to the application
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

// Create context
const LangChainAgentContext = createContext();

// Custom hook to use the LangChain agent context
export const useLangChainAgent = () => {
  return useContext(LangChainAgentContext);
};

// LangChain Agent Provider component
export const LangChainAgentProvider = ({ children }) => {
  const [agentId, setAgentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  
  // API base URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  // Set up axios instance
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  // Create a new agent
  const createAgent = useCallback(async (agentType, githubToken = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/agent', { 
        agent_type: agentType,
        github_token: githubToken
      });
      
      setAgentId(response.data.agent_id);
      setMessages([]);
      
      return response.data.agent_id;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create agent');
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);
  
  // Query an agent
  const queryAgent = useCallback(async (agentId, query) => {
    if (!agentId) {
      setError('No active agent');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    // Add user message immediately
    setMessages(prev => [...prev, { role: 'user', content: query }]);
    
    try {
      const response = await api.post(`/api/agent/${agentId}/query`, { query });
      
      // Add agent response
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to query agent');
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);
  
  // Get agent memory
  const getAgentMemory = useCallback(async (agentId) => {
    if (!agentId) {
      setError('No active agent');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get(`/api/agent/${agentId}/memory`);
      
      if (response.data.messages) {
        setMessages(response.data.messages);
      }
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to get agent memory');
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);
  
  // Clear agent memory
  const clearAgentMemory = useCallback(async (agentId) => {
    if (!agentId) {
      setError('No active agent');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await api.delete(`/api/agent/${agentId}/memory`);
      
      setMessages([]);
      
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to clear agent memory');
      return false;
    } finally {
      setLoading(false);
    }
  }, [api]);
  
  // Delete an agent
  const deleteAgent = useCallback(async (agentId) => {
    if (!agentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await api.delete(`/api/agent/${agentId}`);
      
      setAgentId(null);
      setMessages([]);
      
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete agent');
      return false;
    } finally {
      setLoading(false);
    }
  }, [api]);
  
  // Context value
  const value = {
    agentId,
    loading,
    error,
    messages,
    createAgent,
    queryAgent,
    getAgentMemory,
    clearAgentMemory,
    deleteAgent
  };
  
  return (
    <LangChainAgentContext.Provider value={value}>
      {children}
    </LangChainAgentContext.Provider>
  );
};

export default LangChainAgentContext;