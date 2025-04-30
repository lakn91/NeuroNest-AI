/**
 * NeuroNest AI Backend Server
 * Provides API endpoints for the NeuroNest AI application
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs').promises;

// Import Firebase and Supabase services
const { isFirebaseInitialized } = require('./services/firebase');
const { isSupabaseInitialized } = require('./services/supabase');

// Log initialization status
const firebaseInitialized = isFirebaseInitialized();
const supabaseInitialized = isSupabaseInitialized();

// Create Express app
const app = express();
const port = process.env.PORT || 12000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Create tmp directory if it doesn't exist
const tmpDir = path.join(__dirname, 'tmp');
fs.mkdir(tmpDir, { recursive: true })
  .then(() => console.log('Temporary directory created'))
  .catch(error => console.error('Error creating temporary directory:', error));

// Routes
const authRouter = require('./routes/auth').router;
const projectsRouter = require('./routes/projects');
const conversationsRouter = require('./routes/conversations');
const memoriesRouter = require('./routes/memories');
const runtimeRouter = require('./routes/runtime');
const settingsRouter = require('./routes/settings');

app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/conversations', conversationsRouter);
app.use('/api/memories', memoriesRouter);
app.use('/api/runtime', runtimeRouter);
app.use('/api/settings', settingsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    useSupabase: process.env.USE_SUPABASE === 'true',
    services: {
      firebase: {
        initialized: firebaseInitialized,
        enabled: process.env.USE_SUPABASE !== 'true'
      },
      supabase: {
        initialized: supabaseInitialized,
        enabled: process.env.USE_SUPABASE === 'true'
      }
    },
    server: {
      host: process.env.HOST || '0.0.0.0',
      port: port
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const host = process.env.HOST || '0.0.0.0';
app.listen(port, host, () => {
  console.log(`NeuroNest AI backend server listening on ${host}:${port}`);
  
  // Determine which database to use
  const useSupabase = process.env.USE_SUPABASE === 'true';
  
  if (useSupabase && !supabaseInitialized) {
    console.warn('Supabase is configured but not available. Using in-memory storage.');
  } else if (!useSupabase && !firebaseInitialized) {
    console.warn('Firebase is configured but not available. Using in-memory storage.');
  } else {
    console.log(`Using ${useSupabase ? 'Supabase' : 'Firebase'} for data storage`);
  }
});