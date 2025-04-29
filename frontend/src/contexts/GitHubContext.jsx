/**
 * GitHub Context
 * Provides GitHub integration functionality to the application
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

// Create context
const GitHubContext = createContext();

// Custom hook to use the GitHub context
export const useGitHub = () => {
  return useContext(GitHubContext);
};

// GitHub Provider component
export const GitHubProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // API base URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  // Set up axios instance with token
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  // Connect to GitHub with token
  const connect = useCallback(async (githubToken) => {
    setLoading(true);
    setError(null);
    
    try {
      // Set token in backend
      await api.post('/api/github/token', { token: githubToken });
      
      // Get user info
      const userResponse = await api.get('/api/github/user');
      
      // Store token and user info
      setToken(githubToken);
      setUser(userResponse.data);
      setIsConnected(true);
      
      // Store token in localStorage
      localStorage.setItem('github_token', githubToken);
      
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to connect to GitHub');
      return false;
    } finally {
      setLoading(false);
    }
  }, [api]);
  
  // Disconnect from GitHub
  const disconnect = useCallback(() => {
    setToken('');
    setUser(null);
    setRepositories([]);
    setIsConnected(false);
    
    // Remove token from localStorage
    localStorage.removeItem('github_token');
    
    return true;
  }, []);
  
  // Fetch repositories
  const fetchRepositories = useCallback(async () => {
    if (!isConnected) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/github/repositories');
      setRepositories(response.data);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch repositories');
      return [];
    } finally {
      setLoading(false);
    }
  }, [api, isConnected]);
  
  // Clone repository
  const cloneRepository = useCallback(async (repoName, branch = null) => {
    if (!isConnected) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/github/clone', { repo_name: repoName, branch });
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to clone repository');
      return null;
    } finally {
      setLoading(false);
    }
  }, [api, isConnected]);
  
  // Pull repository
  const pullRepository = useCallback(async (repoName) => {
    if (!isConnected) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/github/pull', { repo_name: repoName });
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to pull repository');
      return null;
    } finally {
      setLoading(false);
    }
  }, [api, isConnected]);
  
  // Push repository
  const pushRepository = useCallback(async (repoName, commitMessage) => {
    if (!isConnected) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/github/push', { 
        repo_name: repoName, 
        commit_message: commitMessage 
      });
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to push repository');
      return null;
    } finally {
      setLoading(false);
    }
  }, [api, isConnected]);
  
  // Create branch
  const createBranch = useCallback(async (repoName, branchName, fromBranch = null) => {
    if (!isConnected) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/github/branch', { 
        repo_name: repoName, 
        branch_name: branchName,
        from_branch: fromBranch
      });
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create branch');
      return null;
    } finally {
      setLoading(false);
    }
  }, [api, isConnected]);
  
  // Check for stored token on mount
  React.useEffect(() => {
    const storedToken = localStorage.getItem('github_token');
    if (storedToken) {
      connect(storedToken);
    }
  }, [connect]);
  
  // Context value
  const value = {
    isConnected,
    token,
    user,
    repositories,
    loading,
    error,
    connect,
    disconnect,
    fetchRepositories,
    cloneRepository,
    pullRepository,
    pushRepository,
    createBranch
  };
  
  return (
    <GitHubContext.Provider value={value}>
      {children}
    </GitHubContext.Provider>
  );
};

export default GitHubContext;