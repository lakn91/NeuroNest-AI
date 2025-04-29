# Services

This directory contains service modules that implement business logic for the NeuroNest-AI backend.

## Available Services

- **firebaseService.js**: Provides Firebase integration.
  - Authentication (login, register, logout)
  - Firestore database operations
  - Storage operations

- **supabaseService.js**: Provides Supabase integration.
  - Authentication (login, register, logout)
  - PostgreSQL database operations
  - Storage operations

- **agentService.js**: Handles agent-related operations.
  - Agent selection and orchestration
  - Agent communication
  - Agent memory management

- **runtimeService.js**: Handles code execution.
  - Code execution in various languages
  - Sandbox environment management
  - Output capture and formatting

## Service Structure

Each service typically exports functions that handle specific operations. For example:

```javascript
// firebaseService.js
const admin = require('firebase-admin');
const serviceAccount = require('../config/firebase-service-account.json');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

const auth = admin.auth();
const db = admin.firestore();
const storage = admin.storage();

/**
 * Verify a Firebase ID token
 * 
 * @param {string} idToken - Firebase ID token
 * @returns {Promise<Object>} User object
 */
async function verifyIdToken(idToken) {
  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying ID token:', error);
    throw new Error('Invalid token');
  }
}

/**
 * Get a user by UID
 * 
 * @param {string} uid - User ID
 * @returns {Promise<Object>} User object
 */
async function getUserByUid(uid) {
  try {
    const userRecord = await auth.getUser(uid);
    return userRecord;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw new Error('User not found');
  }
}

/**
 * Create a new user
 * 
 * @param {Object} userData - User data
 * @param {string} userData.email - User's email
 * @param {string} userData.password - User's password
 * @param {string} userData.displayName - User's display name
 * @returns {Promise<Object>} Created user object
 */
async function createUser(userData) {
  try {
    const { email, password, displayName } = userData;
    
    const userRecord = await auth.createUser({
      email,
      password,
      displayName
    });
    
    // Create user profile in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email,
      displayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return userRecord;
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create user');
  }
}

module.exports = {
  verifyIdToken,
  getUserByUid,
  createUser,
  // Other Firebase operations...
};
```

## Usage

Services are typically used by controllers to implement API endpoints:

```javascript
// authController.js
const firebaseService = require('../services/firebaseService');
// or
const supabaseService = require('../services/supabaseService');

async function register(req, res, next) {
  try {
    const { email, password, displayName } = req.body;
    
    const user = await firebaseService.createUser({
      email,
      password,
      displayName
    });
    
    // Generate token
    const token = await firebaseService.generateToken(user.uid);
    
    res.status(201).json({
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName
      },
      token
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  register,
  // Other controller functions...
};
```

## Error Handling

Services should handle errors appropriately and provide meaningful error messages. Use try/catch blocks and consider creating custom error classes for specific error types.

## Configuration

Services may require configuration from environment variables. Make sure to document required environment variables in the `.env.example` file.
