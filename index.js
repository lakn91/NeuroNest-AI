/**
 * NeuroNest AI Entry Point
 * 
 * This file serves as the main entry point for the NeuroNest AI application.
 * It redirects to the appropriate backend server based on configuration.
 */

// Load environment variables from .env file
require('dotenv').config({ path: './backend/.env' });

console.log('Starting NeuroNest AI...');
console.log('Environment variables:');
console.log('- USE_SUPABASE:', process.env.USE_SUPABASE);
console.log('- PORT:', process.env.PORT);
console.log('- HOST:', process.env.HOST);

// Determine which backend to use
const useBackend = process.env.USE_BACKEND || 'express';

try {
  if (useBackend === 'express') {
    console.log('Using Express backend');
    require('./backend/server.js');
  } else if (useBackend === 'typescript') {
    console.log('Using TypeScript backend');
    require('./backend/src/server.ts');
  } else if (useBackend === 'fastapi') {
    console.log('Using FastAPI backend');
    const { spawn } = require('child_process');
    const fastapi = spawn('python', ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', process.env.PORT || '12000'], {
      cwd: './backend-fastapi',
      stdio: 'inherit'
    });
    
    fastapi.on('error', (err) => {
      console.error('Failed to start FastAPI backend:', err);
    });
    
    process.on('SIGINT', () => {
      console.log('Shutting down FastAPI backend...');
      fastapi.kill();
      process.exit();
    });
  } else {
    console.error(`Unknown backend type: ${useBackend}`);
    console.log('Defaulting to Express backend');
    require('./backend/server.js');
  }
} catch (error) {
  console.error('Error starting NeuroNest AI:', error);
  process.exit(1);
}