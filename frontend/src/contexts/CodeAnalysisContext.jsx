/**
 * Code Analysis Context
 * Provides code analysis functionality to the application
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

// Create context
const CodeAnalysisContext = createContext();

// Custom hook to use the code analysis context
export const useCodeAnalysis = () => {
  return useContext(CodeAnalysisContext);
};

// Code Analysis Provider component
export const CodeAnalysisProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [issues, setIssues] = useState([]);
  const [structure, setStructure] = useState(null);
  
  // API base URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  
  // Set up axios instance
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  // Analyze code
  const analyzeCode = useCallback(async (code, language) => {
    if (!code.trim()) {
      setIssues([]);
      setStructure(null);
      return { issues: [], structure: null };
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/code/analyze', { code, language });
      
      setIssues(response.data.issues || []);
      setStructure(response.data.structure || null);
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze code');
      return { issues: [], structure: null };
    } finally {
      setLoading(false);
    }
  }, [api]);
  
  // Analyze file
  const analyzeFile = useCallback(async (filePath) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/api/code/analyze/file', null, {
        params: { file_path: filePath }
      });
      
      setIssues(response.data.issues || []);
      setStructure(response.data.structure || null);
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze file');
      return { issues: [], structure: null };
    } finally {
      setLoading(false);
    }
  }, [api]);
  
  // Analyze project
  const analyzeProject = useCallback(async (projectPath, includePatterns = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = { project_path: projectPath };
      if (includePatterns) {
        params.include_patterns = includePatterns;
      }
      
      const response = await api.post('/api/code/analyze/project', null, { params });
      
      return response.data;
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to analyze project');
      return { files: [], summary: null };
    } finally {
      setLoading(false);
    }
  }, [api]);
  
  // Clear analysis results
  const clearAnalysis = useCallback(() => {
    setIssues([]);
    setStructure(null);
    setError(null);
  }, []);
  
  // Context value
  const value = {
    loading,
    error,
    issues,
    structure,
    analyzeCode,
    analyzeFile,
    analyzeProject,
    clearAnalysis
  };
  
  return (
    <CodeAnalysisContext.Provider value={value}>
      {children}
    </CodeAnalysisContext.Provider>
  );
};

export default CodeAnalysisContext;