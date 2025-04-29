/**
 * Runtime Context
 * Provides runtime execution environment functionality to the entire application
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useProject } from './ProjectContext';
import { useDatabase } from './DatabaseContext';
import api from '../services/api';

// Create the runtime context
const RuntimeContext = createContext();

/**
 * Custom hook to use the runtime context
 * @returns {Object} Runtime context
 */
export const useRuntime = () => {
  return useContext(RuntimeContext);
};

/**
 * Runtime Provider Component
 * Wraps the application and provides runtime execution environment functionality
 */
export const RuntimeProvider = ({ children }) => {
  const [runtimes, setRuntimes] = useState([]);
  const [activeRuntime, setActiveRuntime] = useState(null);
  const [runtimeStatus, setRuntimeStatus] = useState('idle'); // idle, starting, running, stopping, error
  const [runtimeLogs, setRuntimeLogs] = useState([]);
  const [runtimeOutput, setRuntimeOutput] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [runningProjects, setRunningProjects] = useState({});
  
  const { currentUser } = useAuth();
  const { currentProject } = useProject();
  const { runtimeService } = useDatabase();

  /**
   * Create a new runtime environment
   * @param {Object} runtimeConfig - Runtime configuration
   * @returns {Promise} Promise with runtime ID
   */
  const createRuntime = async (runtimeConfig) => {
    try {
      // This is a placeholder for the actual API call
      // In a real implementation, this would call the backend API to create a runtime
      
      const runtimeId = Date.now().toString();
      const newRuntime = {
        id: runtimeId,
        projectId: currentProject?.id,
        userId: currentUser?.uid,
        status: 'created',
        type: runtimeConfig.type || 'web',
        config: runtimeConfig,
        createdAt: new Date().toISOString()
      };
      
      setRuntimes(prev => [...prev, newRuntime]);
      
      return { id: runtimeId, error: null };
    } catch (error) {
      console.error('Error creating runtime:', error);
      return { id: null, error: error.message };
    }
  };

  /**
   * Start a runtime environment
   * @param {string} runtimeId - Runtime ID
   * @returns {Promise} Promise that resolves when runtime is started
   */
  const startRuntime = async (runtimeId) => {
    try {
      // Find the runtime
      const runtime = runtimes.find(r => r.id === runtimeId);
      
      if (!runtime) {
        throw new Error('Runtime not found');
      }
      
      // Update runtime status
      setRuntimes(prev => prev.map(r => 
        r.id === runtimeId ? { ...r, status: 'starting' } : r
      ));
      
      setRuntimeStatus('starting');
      setActiveRuntime(runtime);
      setRuntimeLogs([{ 
        level: 'info', 
        message: `Starting runtime environment for ${runtime.type} project...`,
        timestamp: new Date().toISOString()
      }]);
      
      // This is a placeholder for the actual API call
      // In a real implementation, this would call the backend API to start the runtime
      
      // Simulate starting time
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Update runtime status
      setRuntimes(prev => prev.map(r => 
        r.id === runtimeId ? { ...r, status: 'running' } : r
      ));
      
      setRuntimeStatus('running');
      addRuntimeLog('info', 'Runtime environment started successfully');
      
      // Set preview URL based on runtime type
      const previewPort = 12000; // This would come from the backend
      const previewHost = `https://work-1-ltxdxnwpwgfjsvph.prod-runtime.all-hands.dev`;
      
      switch (runtime.type) {
        case 'web':
          setPreviewUrl(`${previewHost}:${previewPort}`);
          break;
        case 'node':
          setPreviewUrl(`${previewHost}:${previewPort}/api`);
          break;
        case 'python':
          setPreviewUrl(`${previewHost}:${previewPort}/api`);
          break;
        default:
          setPreviewUrl(`${previewHost}:${previewPort}`);
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error starting runtime:', error);
      
      setRuntimeStatus('error');
      addRuntimeLog('error', `Failed to start runtime: ${error.message}`);
      
      return { error: error.message };
    }
  };

  /**
   * Stop a runtime environment
   * @param {string} runtimeId - Runtime ID
   * @returns {Promise} Promise that resolves when runtime is stopped
   */
  const stopRuntime = async (runtimeId) => {
    try {
      // Find the runtime
      const runtime = runtimes.find(r => r.id === runtimeId);
      
      if (!runtime) {
        throw new Error('Runtime not found');
      }
      
      // Update runtime status
      setRuntimes(prev => prev.map(r => 
        r.id === runtimeId ? { ...r, status: 'stopping' } : r
      ));
      
      setRuntimeStatus('stopping');
      addRuntimeLog('info', 'Stopping runtime environment...');
      
      // This is a placeholder for the actual API call
      // In a real implementation, this would call the backend API to stop the runtime
      
      // Simulate stopping time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update runtime status
      setRuntimes(prev => prev.map(r => 
        r.id === runtimeId ? { ...r, status: 'stopped' } : r
      ));
      
      setRuntimeStatus('idle');
      addRuntimeLog('info', 'Runtime environment stopped successfully');
      setPreviewUrl(null);
      
      return { error: null };
    } catch (error) {
      console.error('Error stopping runtime:', error);
      
      setRuntimeStatus('error');
      addRuntimeLog('error', `Failed to stop runtime: ${error.message}`);
      
      return { error: error.message };
    }
  };

  /**
   * Delete a runtime environment
   * @param {string} runtimeId - Runtime ID
   * @returns {Promise} Promise that resolves when runtime is deleted
   */
  const deleteRuntime = async (runtimeId) => {
    try {
      // Find the runtime
      const runtime = runtimes.find(r => r.id === runtimeId);
      
      if (!runtime) {
        throw new Error('Runtime not found');
      }
      
      // If runtime is running, stop it first
      if (runtime.status === 'running' || runtime.status === 'starting') {
        await stopRuntime(runtimeId);
      }
      
      // This is a placeholder for the actual API call
      // In a real implementation, this would call the backend API to delete the runtime
      
      // Remove runtime from state
      setRuntimes(prev => prev.filter(r => r.id !== runtimeId));
      
      // Clear active runtime if it's the one being deleted
      if (activeRuntime && activeRuntime.id === runtimeId) {
        setActiveRuntime(null);
        setRuntimeStatus('idle');
        setRuntimeLogs([]);
        setRuntimeOutput(null);
        setPreviewUrl(null);
      }
      
      return { error: null };
    } catch (error) {
      console.error('Error deleting runtime:', error);
      return { error: error.message };
    }
  };

  /**
   * Execute code in the runtime environment
   * @param {string} code - Code to execute
   * @param {string} language - Programming language
   * @returns {Promise} Promise with execution result
   */
  const executeCode = async (code, language = 'javascript') => {
    try {
      if (!activeRuntime || activeRuntime.status !== 'running') {
        throw new Error('No active runtime environment');
      }
      
      addRuntimeLog('info', `Executing ${language} code...`);
      
      // This is a placeholder for the actual API call
      // In a real implementation, this would call the backend API to execute the code
      
      // Simulate execution time
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate execution result
      const result = {
        output: `Execution result for ${language} code`,
        logs: ['Log line 1', 'Log line 2', 'Log line 3'],
        error: null
      };
      
      setRuntimeOutput(result);
      addRuntimeLog('info', 'Code executed successfully');
      
      // Add logs from execution
      result.logs.forEach(log => {
        addRuntimeLog('debug', log);
      });
      
      return { data: result, error: null };
    } catch (error) {
      console.error('Error executing code:', error);
      
      addRuntimeLog('error', `Failed to execute code: ${error.message}`);
      
      return { data: null, error: error.message };
    }
  };

  /**
   * Add a log entry to the runtime logs
   * @param {string} level - Log level (info, warning, error, debug)
   * @param {string} message - Log message
   */
  const addRuntimeLog = (level, message) => {
    setRuntimeLogs(prev => [...prev, {
      level,
      message,
      timestamp: new Date().toISOString()
    }]);
  };

  /**
   * Clear runtime logs
   */
  const clearRuntimeLogs = () => {
    setRuntimeLogs([]);
  };

  /**
   * Get runtimes for the current project
   * @returns {Array} Filtered runtimes
   */
  const getProjectRuntimes = () => {
    if (!currentProject) return [];
    
    return runtimes.filter(runtime => 
      runtime.projectId === currentProject.id
    );
  };

  // Reset state when user changes
  useEffect(() => {
    if (!currentUser) {
      setRuntimes([]);
      setActiveRuntime(null);
      setRuntimeStatus('idle');
      setRuntimeLogs([]);
      setRuntimeOutput(null);
      setPreviewUrl(null);
    }
  }, [currentUser]);

  /**
   * Run a project
   * @param {string} projectId - Project ID
   * @param {Object} config - Runtime configuration
   * @returns {Promise} Promise with runtime information
   */
  const runProject = async (projectId, config = {}) => {
    try {
      // Try to use the database service first
      if (runtimeService && runtimeService.runProject) {
        const result = await runtimeService.runProject(projectId, config);
        
        if (!result.error) {
          setRunningProjects(prev => ({
            ...prev,
            [projectId]: {
              status: 'running',
              config,
              startTime: new Date(),
              ...result.data
            }
          }));
        }
        
        return result;
      }
      
      // Fallback to starting a runtime
      const runtimeResult = await createRuntime({
        type: config.environment || 'web',
        entryPoint: config.entryPoint,
        args: config.args,
        port: config.port
      });
      
      if (runtimeResult.error) {
        throw new Error(runtimeResult.error);
      }
      
      const startResult = await startRuntime(runtimeResult.id);
      
      if (startResult.error) {
        throw new Error(startResult.error);
      }
      
      setRunningProjects(prev => ({
        ...prev,
        [projectId]: {
          status: 'running',
          config,
          startTime: new Date(),
          runtimeId: runtimeResult.id
        }
      }));
      
      return { data: { runtimeId: runtimeResult.id }, error: null };
    } catch (err) {
      console.error('Failed to run project:', err);
      return { data: null, error: err.message || 'Failed to run project' };
    }
  };

  /**
   * Stop a running project
   * @param {string} projectId - Project ID
   * @returns {Promise} Promise with stop result
   */
  const stopProject = async (projectId) => {
    try {
      // Try to use the database service first
      if (runtimeService && runtimeService.stopProject) {
        const result = await runtimeService.stopProject(projectId);
        
        if (!result.error) {
          setRunningProjects(prev => {
            const newState = { ...prev };
            if (newState[projectId]) {
              newState[projectId].status = 'stopped';
              newState[projectId].endTime = new Date();
            }
            return newState;
          });
        }
        
        return result;
      }
      
      // Fallback to stopping a runtime
      const projectRuntime = runningProjects[projectId];
      
      if (!projectRuntime || !projectRuntime.runtimeId) {
        throw new Error('No runtime found for this project');
      }
      
      const stopResult = await stopRuntime(projectRuntime.runtimeId);
      
      if (stopResult.error) {
        throw new Error(stopResult.error);
      }
      
      setRunningProjects(prev => {
        const newState = { ...prev };
        if (newState[projectId]) {
          newState[projectId].status = 'stopped';
          newState[projectId].endTime = new Date();
        }
        return newState;
      });
      
      return { data: { stopped: true }, error: null };
    } catch (err) {
      console.error('Failed to stop project:', err);
      return { data: null, error: err.message || 'Failed to stop project' };
    }
  };

  /**
   * Get project status
   * @param {string} projectId - Project ID
   * @returns {Promise<string>} Project status
   */
  const getProjectStatus = async (projectId) => {
    // Check local state first
    if (runningProjects[projectId]) {
      return runningProjects[projectId].status;
    }
    
    try {
      // Try to use the database service first
      if (runtimeService && runtimeService.getProjectStatus) {
        const result = await runtimeService.getProjectStatus(projectId);
        
        if (!result.error && result.data) {
          // Update local state
          setRunningProjects(prev => ({
            ...prev,
            [projectId]: {
              ...prev[projectId],
              status: result.data.status,
              ...result.data
            }
          }));
          
          return result.data.status;
        }
      }
      
      // Fallback to checking runtime status
      const projectRuntimes = getProjectRuntimes().filter(r => r.projectId === projectId);
      
      if (projectRuntimes.length > 0) {
        const latestRuntime = projectRuntimes.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        )[0];
        
        return latestRuntime.status;
      }
      
      return 'unknown';
    } catch (err) {
      console.error('Failed to get project status:', err);
      return 'unknown';
    }
  };

  /**
   * Get project output
   * @param {string} projectId - Project ID
   * @returns {Promise<string>} Project output
   */
  const getProjectOutput = async (projectId) => {
    try {
      // Try to use the database service first
      if (runtimeService && runtimeService.getProjectOutput) {
        const result = await runtimeService.getProjectOutput(projectId);
        
        if (!result.error) {
          return result.data || '';
        }
      }
      
      // Fallback to runtime logs
      return runtimeLogs
        .filter(log => log.level !== 'error')
        .map(log => log.message)
        .join('\n');
    } catch (err) {
      console.error('Failed to get project output:', err);
      return '';
    }
  };

  /**
   * Get project preview URL
   * @param {string} projectId - Project ID
   * @returns {Promise<string>} Preview URL
   */
  const getProjectPreviewUrl = async (projectId) => {
    try {
      // Try to use the database service first
      if (runtimeService && runtimeService.getProjectPreviewUrl) {
        const result = await runtimeService.getProjectPreviewUrl(projectId);
        
        if (!result.error) {
          return result.data || '';
        }
      }
      
      // Fallback to current preview URL
      return previewUrl || '';
    } catch (err) {
      console.error('Failed to get project preview URL:', err);
      return '';
    }
  };

  // Value to be provided by the context
  const value = {
    runtimes,
    activeRuntime,
    runtimeStatus,
    runtimeLogs,
    runtimeOutput,
    previewUrl,
    runningProjects,
    createRuntime,
    startRuntime,
    stopRuntime,
    deleteRuntime,
    executeCode,
    addRuntimeLog,
    clearRuntimeLogs,
    getProjectRuntimes,
    runProject,
    stopProject,
    getProjectStatus,
    getProjectOutput,
    getProjectPreviewUrl
  };

  return (
    <RuntimeContext.Provider value={value}>
      {children}
    </RuntimeContext.Provider>
  );
};

export default RuntimeContext;