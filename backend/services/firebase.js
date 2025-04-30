/**
 * Firebase service for NeuroNest AI
 * Provides centralized Firebase Admin SDK instance
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

// Only initialize Firebase if it's not already initialized and if USE_SUPABASE is not true
if (process.env.USE_SUPABASE !== 'true' && admin.apps.length === 0) {
  try {
    let firebaseCredentials;
    
    // Try to load credentials from environment variable
    if (process.env.FIREBASE_CREDENTIALS) {
      try {
        firebaseCredentials = JSON.parse(process.env.FIREBASE_CREDENTIALS);
      } catch (parseError) {
        console.error('Error parsing FIREBASE_CREDENTIALS JSON:', parseError);
        throw new Error('Invalid FIREBASE_CREDENTIALS format');
      }
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      // Use individual environment variables
      firebaseCredentials = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      };
    } else {
      // Try to load credentials from file
      try {
        const credentialsPath = path.join(__dirname, '..', 'firebase-credentials.json');
        const credentialsFile = require(credentialsPath);
        firebaseCredentials = credentialsFile;
      } catch (fileError) {
        console.error('Error loading firebase-credentials.json:', fileError);
        throw new Error('Firebase credentials not found');
      }
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(firebaseCredentials),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET
    });
    
    firebaseInitialized = true;
    console.log('Firebase Admin SDK initialized successfully in firebase service');
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK in firebase service:', error);
    console.warn('Continuing without Firebase Admin SDK');
  }
} else {
  if (process.env.USE_SUPABASE === 'true') {
    console.log('Using Supabase instead of Firebase, skipping Firebase initialization in firebase service');
  } else if (admin.apps.length > 0) {
    console.log('Firebase Admin SDK already initialized');
    firebaseInitialized = true;
  }
}

/**
 * Get the Firebase Admin SDK instance
 * @returns {Object} The Firebase Admin SDK instance
 */
const getFirebaseAdmin = () => {
  return admin;
};

/**
 * Check if Firebase Admin SDK is initialized
 * @returns {boolean} True if Firebase Admin SDK is initialized, false otherwise
 */
const isFirebaseInitialized = () => {
  return firebaseInitialized;
};

/**
 * Get Firestore database instance
 * @returns {Object|null} The Firestore database instance or null if not initialized
 */
const getFirestore = () => {
  if (!firebaseInitialized) return null;
  return admin.firestore();
};

/**
 * Get Firebase Storage bucket
 * @returns {Object|null} The Firebase Storage bucket or null if not initialized
 */
const getStorageBucket = () => {
  if (!firebaseInitialized) return null;
  return admin.storage().bucket();
};

module.exports = {
  getFirebaseAdmin,
  isFirebaseInitialized,
  getFirestore,
  getStorageBucket
};