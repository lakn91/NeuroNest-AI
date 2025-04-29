/**
 * RuntimeEngine Component
 * Provides a runtime environment for executing projects
 */

import React, { useState, useEffect } from 'react';
import { useRuntime } from '../../contexts/RuntimeContext';
import { Box, Button, CircularProgress, Typography, Paper, Tabs, Tab, TextField } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import RefreshIcon from '@mui/icons-material/Refresh';
import TerminalIcon from '@mui/icons-material/Terminal';
import SettingsIcon from '@mui/icons-material/Settings';

/**
 * Runtime Engine Component
 * @param {Object} props - Component props
 * @param {Object} props.project - Project to run
 * @returns {JSX.Element} Runtime engine component
 */
const RuntimeEngine = ({ project }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [consoleOutput, setConsoleOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [runtimeConfig, setRuntimeConfig] = useState({
    environment: 'node', // node, python, web
    entryPoint: project?.entryPoint || 'index.js',
    args: '',
    port: 3000,
  });

  const { 
    runProject, 
    stopProject, 
    getProjectStatus, 
    getProjectOutput 
  } = useRuntime();

  useEffect(() => {
    if (project) {
      // Determine environment based on project type or files
      const environment = determineEnvironment(project);
      const entryPoint = determineEntryPoint(project, environment);
      
      setRuntimeConfig({
        ...runtimeConfig,
        environment,
        entryPoint,
      });
    }
  }, [project]);

  // Poll for project status and output when running
  useEffect(() => {
    let outputInterval;
    
    if (isRunning) {
      outputInterval = setInterval(async () => {
        const status = await getProjectStatus(project.id);
        
        if (status === 'running') {
          const output = await getProjectOutput(project.id);
          setConsoleOutput(prev => prev + output);
        } else if (status === 'stopped' || status === 'completed') {
          setIsRunning(false);
          clearInterval(outputInterval);
        }
      }, 1000);
    }
    
    return () => {
      if (outputInterval) clearInterval(outputInterval);
    };
  }, [isRunning, project]);

  /**
   * Determine the runtime environment based on project files
   */
  const determineEnvironment = (project) => {
    const files = project?.files || [];
    
    // Check for package.json (Node.js)
    if (files.some(file => file.name === 'package.json')) {
      return 'node';
    }
    
    // Check for requirements.txt or pyproject.toml (Python)
    if (files.some(file => file.name === 'requirements.txt' || file.name === 'pyproject.toml')) {
      return 'python';
    }
    
    // Check for index.html (Web)
    if (files.some(file => file.name === 'index.html')) {
      return 'web';
    }
    
    // Default to Node.js
    return 'node';
  };

  /**
   * Determine the entry point based on environment and project files
   */
  const determineEntryPoint = (project, environment) => {
    const files = project?.files || [];
    
    if (environment === 'node') {
      // Look for index.js, server.js, app.js
      const nodeEntryPoints = ['index.js', 'server.js', 'app.js'];
      const foundFile = files.find(file => nodeEntryPoints.includes(file.name));
      return foundFile ? foundFile.name : 'index.js';
    }
    
    if (environment === 'python') {
      // Look for main.py, app.py
      const pythonEntryPoints = ['main.py', 'app.py'];
      const foundFile = files.find(file => pythonEntryPoints.includes(file.name));
      return foundFile ? foundFile.name : 'main.py';
    }
    
    if (environment === 'web') {
      return 'index.html';
    }
    
    return 'index.js';
  };

  /**
   * Handle running the project
   */
  const handleRunProject = async () => {
    setConsoleOutput('');
    setIsRunning(true);
    
    try {
      await runProject(project.id, runtimeConfig);
    } catch (error) {
      setConsoleOutput(`Error starting project: ${error.message}`);
      setIsRunning(false);
    }
  };

  /**
   * Handle stopping the project
   */
  const handleStopProject = async () => {
    try {
      await stopProject(project.id);
      setIsRunning(false);
    } catch (error) {
      setConsoleOutput(prev => `${prev}\nError stopping project: ${error.message}`);
    }
  };

  /**
   * Handle clearing the console
   */
  const handleClearConsole = () => {
    setConsoleOutput('');
  };

  /**
   * Handle tab change
   */
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  /**
   * Handle runtime config change
   */
  const handleConfigChange = (e) => {
    const { name, value } = e.target;
    setRuntimeConfig({
      ...runtimeConfig,
      [name]: value,
    });
  };

  if (!project) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">No project selected</Typography>
        <Typography variant="body2">Select a project to run</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
          <Tab icon={<TerminalIcon />} label="Console" />
          <Tab icon={<SettingsIcon />} label="Configuration" />
        </Tabs>
      </Paper>

      {/* Console Tab */}
      {activeTab === 0 && (
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<PlayArrowIcon />}
              onClick={handleRunProject}
              disabled={isRunning}
            >
              Run
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<StopIcon />}
              onClick={handleStopProject}
              disabled={!isRunning}
            >
              Stop
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleClearConsole}
            >
              Clear Console
            </Button>
          </Box>

          <Paper
            sx={{
              flex: 1,
              p: 2,
              bgcolor: '#1e1e1e',
              color: '#fff',
              fontFamily: 'monospace',
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              fontSize: '0.875rem',
            }}
          >
            {consoleOutput || 'Console output will appear here...'}
            {isRunning && (
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <CircularProgress size={16} sx={{ mr: 1 }} />
                <Typography variant="body2">Running...</Typography>
              </Box>
            )}
          </Paper>
        </Box>
      )}

      {/* Configuration Tab */}
      {activeTab === 1 && (
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Runtime Configuration</Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Environment</Typography>
            <TextField
              select
              fullWidth
              name="environment"
              value={runtimeConfig.environment}
              onChange={handleConfigChange}
              SelectProps={{ native: true }}
              variant="outlined"
              margin="dense"
            >
              <option value="node">Node.js</option>
              <option value="python">Python</option>
              <option value="web">Web (HTML/CSS/JS)</option>
            </TextField>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Entry Point</Typography>
            <TextField
              fullWidth
              name="entryPoint"
              value={runtimeConfig.entryPoint}
              onChange={handleConfigChange}
              variant="outlined"
              margin="dense"
              placeholder="e.g., index.js, main.py, index.html"
            />
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Command Line Arguments</Typography>
            <TextField
              fullWidth
              name="args"
              value={runtimeConfig.args}
              onChange={handleConfigChange}
              variant="outlined"
              margin="dense"
              placeholder="e.g., --port=8080 --debug"
            />
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">Port (for web applications)</Typography>
            <TextField
              fullWidth
              name="port"
              type="number"
              value={runtimeConfig.port}
              onChange={handleConfigChange}
              variant="outlined"
              margin="dense"
              InputProps={{ inputProps: { min: 1024, max: 65535 } }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default RuntimeEngine;