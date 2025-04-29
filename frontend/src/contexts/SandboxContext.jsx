/**
 * Sandbox Context
 * Provides sandbox environment functionality to the application
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

// Create context
const SandboxContext = createContext();

// Custom hook to use the sandbox context
export const useSandbox = () => {
  return useContext(SandboxContext);
};

// Sandbox Provider component
export const SandboxProvider = ({ children }) => {
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [output, setOutput] = useState('');
  
  // API base URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  // Set up axios instance
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  // Create a new sandbox session
  const createSession = useCallback(async (language = 'python') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/sandbox/session', { language });
      
      setSessionId(response.data.session_id);
      setOutput('');
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create sandbox session');
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);
  
  // Execute code in the sandbox
  const executeCode = useCallback(async (sessionId, code, language = 'python', timeout = 30) => {
    if (!sessionId) {
      setError('No active session');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const endpoint = language === 'python' 
        ? '/api/sandbox/execute/python' 
        : '/api/sandbox/execute/javascript';
      
      const response = await api.post(endpoint, {
        session_id: sessionId,
        code,
        timeout
      });
      
      setOutput(response.data.output || '');
      
      if (response.data.error) {
        setError(response.data.error);
      }
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to execute code');
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);
  
  // Install a package in the sandbox
  const installPackage = useCallback(async (sessionId, packageName) => {
    if (!sessionId) {
      setError('No active session');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/sandbox/install/package', {
        session_id: sessionId,
        package_name: packageName
      });
      
      setOutput(prev => `${prev}\n${response.data.output || ''}`);
      
      if (response.data.error) {
        setError(response.data.error);
      }
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to install package');
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);
  
  // Upload a file to the sandbox
  const uploadFile = useCallback(async (sessionId, filePath, content) => {
    if (!sessionId) {
      setError('No active session');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/sandbox/upload/file', {
        session_id: sessionId,
        file_path: filePath,
        content
      });
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to upload file');
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);
  
  // List files in the sandbox
  const listFiles = useCallback(async (sessionId, directory = '') => {
    if (!sessionId) {
      setError('No active session');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/sandbox/files', {
        params: {
          session_id: sessionId,
          directory
        }
      });
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to list files');
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);
  
  // Read a file from the sandbox
  const readFile = useCallback(async (sessionId, filePath) => {
    if (!sessionId) {
      setError('No active session');
      return null;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.get('/api/sandbox/file', {
        params: {
          session_id: sessionId,
          file_path: filePath
        }
      });
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to read file');
      return null;
    } finally {
      setLoading(false);
    }
  }, [api]);
  
  // Close a sandbox session
  const closeSession = useCallback(async (sessionId) => {
    if (!sessionId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await api.delete(`/api/sandbox/session/${sessionId}`);
      
      setSessionId(null);
      setOutput('');
      
      return true;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to close session');
      return false;
    } finally {
      setLoading(false);
    }
  }, [api]);
  
  // Clear output
  const clearOutput = useCallback(() => {
    setOutput('');
    setError(null);
  }, []);
  
  // Context value
  const value = {
    sessionId,
    loading,
    error,
    output,
    createSession,
    executeCode,
    installPackage,
    uploadFile,
    listFiles,
    readFile,
    closeSession,
    clearOutput
  };
  
  return (
    <SandboxContext.Provider value={value}>
      {children}
    </SandboxContext.Provider>
  );
};

export default SandboxContext;