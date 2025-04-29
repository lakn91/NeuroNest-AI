/**
 * NeuroNest AI Backend Server
 * Provides API endpoints for the NeuroNest AI application
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs').promises;

// Initialize Firebase Admin SDK
let firebaseCredentials;

try {
  // Try to load credentials from environment variable
  if (process.env.FIREBASE_CREDENTIALS) {
    firebaseCredentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);
  } else {
    // Try to load credentials from file
    const credentialsPath = path.join(__dirname, 'firebase-credentials.json');
    const credentialsFile = require(credentialsPath);
    firebaseCredentials = credentialsFile;
  }
  
  admin.initializeApp({
    credential: admin.credential.cert(firebaseCredentials),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
  
  console.log('Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin SDK:', error);
  console.warn('Continuing without Firebase Admin SDK');
}

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (supabaseUrl && supabaseServiceKey) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log('Supabase client initialized successfully');
} else {
  console.warn('Supabase credentials not provided, Supabase features will not be available');
}

// Create Express app
const app = express();
const port = process.env.PORT || 5000;

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
    useSupabase: process.env.USE_SUPABASE === 'true'
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
app.listen(port, () => {
  console.log(`NeuroNest AI backend server listening on port ${port}`);
  console.log(`Using ${process.env.USE_SUPABASE === 'true' ? 'Supabase' : 'Firebase'} for data storage`);
});