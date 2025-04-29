/**
 * Runtime routes for NeuroNest AI
 * Handles runtime environments for project execution
 */

const express = require('express');
const router = express.Router();
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('./auth');

// Map to store running processes
const runningProcesses = new Map();

// Map to store runtime logs
const runtimeLogs = new Map();

// Map to store runtime ports
const runtimePorts = new Map();

// Base port for runtime environments
const BASE_PORT = 8000;

// Maximum number of concurrent runtimes
const MAX_RUNTIMES = 10;

// Available runtime types
const RUNTIME_TYPES = {
  NODE: 'node',
  PYTHON: 'python',
  WEB: 'web'
};

/**
 * Get all runtimes for a user
 * @route GET /api/runtime
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    
    // Get all runtimes for the user
    const userRuntimes = [];
    
    for (const [runtimeId, process] of runningProcesses.entries()) {
      if (process.userId === userId) {
        userRuntimes.push({
          id: runtimeId,
          type: process.type,
          projectId: process.projectId,
          status: process.running ? 'running' : 'idle',
          port: runtimePorts.get(runtimeId),
          startedAt: process.startedAt
        });
      }
    }
    
    res.json({ runtimes: userRuntimes });
  } catch (error) {
    console.error('Error getting runtimes:', error);
    res.status(500).json({ error: 'Failed to get runtimes' });
  }
});

/**
 * Get runtime logs
 * @route GET /api/runtime/:id/logs
 */
router.get('/:id/logs', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const runtimeId = req.params.id;
    
    // Check if runtime exists and belongs to user
    const process = runningProcesses.get(runtimeId);
    
    if (!process || process.userId !== userId) {
      return res.status(404).json({ error: 'Runtime not found' });
    }
    
    // Get logs for the runtime
    const logs = runtimeLogs.get(runtimeId) || [];
    
    res.json({ logs });
  } catch (error) {
    console.error('Error getting runtime logs:', error);
    res.status(500).json({ error: 'Failed to get runtime logs' });
  }
});

/**
 * Create a new runtime
 * @route POST /api/runtime
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const { projectId, type } = req.body;
    
    if (!projectId || !type) {
      return res.status(400).json({ error: 'Project ID and type are required' });
    }
    
    if (!Object.values(RUNTIME_TYPES).includes(type)) {
      return res.status(400).json({ error: `Invalid runtime type. Must be one of: ${Object.values(RUNTIME_TYPES).join(', ')}` });
    }
    
    // Check if user has reached maximum number of runtimes
    let userRuntimeCount = 0;
    
    for (const process of runningProcesses.values()) {
      if (process.userId === userId) {
        userRuntimeCount++;
      }
    }
    
    if (userRuntimeCount >= MAX_RUNTIMES) {
      return res.status(400).json({ error: `Maximum number of runtimes (${MAX_RUNTIMES}) reached` });
    }
    
    // Create a new runtime
    const runtimeId = uuidv4();
    const port = BASE_PORT + runningProcesses.size;
    
    runningProcesses.set(runtimeId, {
      userId,
      projectId,
      type,
      running: false,
      process: null,
      startedAt: null
    });
    
    runtimeLogs.set(runtimeId, []);
    runtimePorts.set(runtimeId, port);
    
    res.status(201).json({
      runtime: {
        id: runtimeId,
        type,
        projectId,
        status: 'idle',
        port
      }
    });
  } catch (error) {
    console.error('Error creating runtime:', error);
    res.status(500).json({ error: 'Failed to create runtime' });
  }
});

/**
 * Start a runtime
 * @route POST /api/runtime/:id/start
 */
router.post('/:id/start', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const runtimeId = req.params.id;
    const { files } = req.body;
    
    // Check if runtime exists and belongs to user
    const runtime = runningProcesses.get(runtimeId);
    
    if (!runtime || runtime.userId !== userId) {
      return res.status(404).json({ error: 'Runtime not found' });
    }
    
    if (runtime.running) {
      return res.status(400).json({ error: 'Runtime is already running' });
    }
    
    // Create temporary directory for runtime
    const runtimeDir = path.join(__dirname, '..', 'tmp', runtimeId);
    await fs.mkdir(runtimeDir, { recursive: true });
    
    // Write files to temporary directory
    if (files && files.length > 0) {
      for (const file of files) {
        const filePath = path.join(runtimeDir, file.name);
        await fs.writeFile(filePath, file.content);
      }
    }
    
    // Start the runtime process based on type
    const port = runtimePorts.get(runtimeId);
    let process;
    
    switch (runtime.type) {
      case RUNTIME_TYPES.NODE:
        // Find main file (index.js or package.json)
        let mainFile = 'index.js';
        if (files) {
          const packageJson = files.find(f => f.name === 'package.json');
          if (packageJson) {
            try {
              const pkg = JSON.parse(packageJson.content);
              if (pkg.main) {
                mainFile = pkg.main;
              }
            } catch (error) {
              console.error('Error parsing package.json:', error);
            }
          }
        }
        
        // Start Node.js process
        process = spawn('node', [mainFile], {
          cwd: runtimeDir,
          env: { ...process.env, PORT: port }
        });
        break;
        
      case RUNTIME_TYPES.PYTHON:
        // Find main file (app.py, main.py, or index.py)
        let pythonMainFile = 'app.py';
        if (files) {
          const appPy = files.find(f => f.name === 'app.py');
          const mainPy = files.find(f => f.name === 'main.py');
          const indexPy = files.find(f => f.name === 'index.py');
          
          if (appPy) {
            pythonMainFile = 'app.py';
          } else if (mainPy) {
            pythonMainFile = 'main.py';
          } else if (indexPy) {
            pythonMainFile = 'index.py';
          }
        }
        
        // Start Python process
        process = spawn('python', [pythonMainFile], {
          cwd: runtimeDir,
          env: { ...process.env, PORT: port }
        });
        break;
        
      case RUNTIME_TYPES.WEB:
        // For web runtime, we'll use a simple HTTP server
        process = spawn('npx', ['http-server', '.', '-p', port, '--cors'], {
          cwd: runtimeDir
        });
        break;
        
      default:
        return res.status(400).json({ error: `Unsupported runtime type: ${runtime.type}` });
    }
    
    // Set up process event handlers
    const logs = runtimeLogs.get(runtimeId);
    
    process.stdout.on('data', (data) => {
      const log = {
        level: 'info',
        message: data.toString(),
        timestamp: new Date().toISOString()
      };
      logs.push(log);
      
      // Limit logs to 1000 entries
      if (logs.length > 1000) {
        logs.shift();
      }
    });
    
    process.stderr.on('data', (data) => {
      const log = {
        level: 'error',
        message: data.toString(),
        timestamp: new Date().toISOString()
      };
      logs.push(log);
      
      // Limit logs to 1000 entries
      if (logs.length > 1000) {
        logs.shift();
      }
    });
    
    process.on('close', (code) => {
      const log = {
        level: 'info',
        message: `Process exited with code ${code}`,
        timestamp: new Date().toISOString()
      };
      logs.push(log);
      
      // Update runtime status
      const runtime = runningProcesses.get(runtimeId);
      if (runtime) {
        runtime.running = false;
        runtime.process = null;
      }
    });
    
    // Update runtime status
    runtime.running = true;
    runtime.process = process;
    runtime.startedAt = new Date().toISOString();
    
    // Add startup log
    logs.push({
      level: 'info',
      message: `Runtime started (${runtime.type})`,
      timestamp: new Date().toISOString()
    });
    
    res.json({
      runtime: {
        id: runtimeId,
        type: runtime.type,
        projectId: runtime.projectId,
        status: 'running',
        port,
        startedAt: runtime.startedAt
      }
    });
  } catch (error) {
    console.error('Error starting runtime:', error);
    res.status(500).json({ error: 'Failed to start runtime' });
  }
});

/**
 * Stop a runtime
 * @route POST /api/runtime/:id/stop
 */
router.post('/:id/stop', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const runtimeId = req.params.id;
    
    // Check if runtime exists and belongs to user
    const runtime = runningProcesses.get(runtimeId);
    
    if (!runtime || runtime.userId !== userId) {
      return res.status(404).json({ error: 'Runtime not found' });
    }
    
    if (!runtime.running || !runtime.process) {
      return res.status(400).json({ error: 'Runtime is not running' });
    }
    
    // Stop the runtime process
    runtime.process.kill();
    
    // Update runtime status
    runtime.running = false;
    runtime.process = null;
    
    // Add stop log
    const logs = runtimeLogs.get(runtimeId);
    logs.push({
      level: 'info',
      message: 'Runtime stopped',
      timestamp: new Date().toISOString()
    });
    
    res.json({
      runtime: {
        id: runtimeId,
        type: runtime.type,
        projectId: runtime.projectId,
        status: 'idle',
        port: runtimePorts.get(runtimeId)
      }
    });
  } catch (error) {
    console.error('Error stopping runtime:', error);
    res.status(500).json({ error: 'Failed to stop runtime' });
  }
});

/**
 * Delete a runtime
 * @route DELETE /api/runtime/:id
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const runtimeId = req.params.id;
    
    // Check if runtime exists and belongs to user
    const runtime = runningProcesses.get(runtimeId);
    
    if (!runtime || runtime.userId !== userId) {
      return res.status(404).json({ error: 'Runtime not found' });
    }
    
    // Stop the runtime process if it's running
    if (runtime.running && runtime.process) {
      runtime.process.kill();
    }
    
    // Clean up runtime resources
    runningProcesses.delete(runtimeId);
    runtimeLogs.delete(runtimeId);
    runtimePorts.delete(runtimeId);
    
    // Delete temporary directory
    const runtimeDir = path.join(__dirname, '..', 'tmp', runtimeId);
    try {
      await fs.rm(runtimeDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Error deleting runtime directory:', error);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting runtime:', error);
    res.status(500).json({ error: 'Failed to delete runtime' });
  }
});

module.exports = router;