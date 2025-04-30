/**
 * Firebase service for NeuroNest AI
 * Provides centralized Firebase Admin SDK instance
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

// Create a mock Firebase implementation for development/testing
const createMockFirebase = () => {
  console.log('Creating mock Firebase implementation for development/testing');
  
  // Mock Firestore collections and documents
  const collections = {
    users: {},
    memories: {},
    user_settings: {},
    projects: {},
    conversations: {}
  };
  
  // Mock Firestore implementation
  const mockFirestore = {
    collection: (name) => {
      if (!collections[name]) {
        collections[name] = {};
      }
      
      return {
        doc: (id) => {
          if (!collections[name][id]) {
            collections[name][id] = { data: {} };
          }
          
          return {
            get: async () => ({
              exists: !!collections[name][id].data,
              data: () => collections[name][id].data,
              id
            }),
            set: async (data) => {
              collections[name][id].data = { ...data };
              return { id };
            },
            update: async (data) => {
              collections[name][id].data = { ...collections[name][id].data, ...data };
              return { id };
            },
            delete: async () => {
              delete collections[name][id];
              return true;
            }
          };
        },
        where: () => ({
          where: () => ({
            orderBy: () => ({
              get: async () => ({
                forEach: (callback) => {
                  Object.keys(collections[name]).forEach(id => {
                    callback({
                      id,
                      data: () => collections[name][id].data
                    });
                  });
                }
              })
            }),
            get: async () => ({
              forEach: (callback) => {
                Object.keys(collections[name]).forEach(id => {
                  callback({
                    id,
                    data: () => collections[name][id].data
                  });
                });
              }
            })
          }),
          get: async () => ({
            forEach: (callback) => {
              Object.keys(collections[name]).forEach(id => {
                callback({
                  id,
                  data: () => collections[name][id].data
                });
              });
            }
          })
        }),
        add: async (data) => {
          const id = `mock-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
          collections[name][id] = { data };
          return {
            id,
            get: async () => ({
              exists: true,
              data: () => collections[name][id].data,
              id
            })
          };
        }
      };
    }
  };
  
  // Mock Firebase Admin SDK
  const mockAdmin = {
    apps: [{}], // Pretend we have an initialized app
    firestore: () => mockFirestore,
    storage: () => ({
      bucket: () => ({
        upload: async () => [{}],
        file: () => ({
          getSignedUrl: async () => ['https://mock-firebase-storage.example.com/mock-file']
        })
      })
    }),
    auth: () => ({
      verifyIdToken: async () => ({ uid: 'mock-user-id' })
    }),
    firestore: {
      FieldValue: {
        serverTimestamp: () => new Date().toISOString()
      }
    }
  };
  
  return mockAdmin;
};

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
        
        // Check if file exists
        if (fs.existsSync(credentialsPath)) {
          firebaseCredentials = require(credentialsPath);
        } else {
          console.warn('Firebase credentials file not found:', credentialsPath);
          throw new Error('Firebase credentials file not found');
        }
      } catch (fileError) {
        console.error('Error loading firebase-credentials.json:', fileError);
        throw new Error('Firebase credentials not found or invalid');
      }
    }
    
    try {
      admin.initializeApp({
        credential: admin.credential.cert(firebaseCredentials),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
      
      firebaseInitialized = true;
      console.log('Firebase Admin SDK initialized successfully in firebase service');
    } catch (initError) {
      console.error('Error initializing Firebase Admin SDK:', initError);
      
      // If we're in development mode, use mock Firebase
      if (process.env.NODE_ENV === 'development' || process.env.MOCK_FIREBASE === 'true') {
        console.log('Using mock Firebase implementation for development');
        // Replace the admin object with our mock implementation
        Object.assign(admin, createMockFirebase());
        firebaseInitialized = true;
      } else {
        throw initError;
      }
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK in firebase service:', error);
    console.warn('Continuing without Firebase Admin SDK');
    
    // If we're in development mode, use mock Firebase
    if (process.env.NODE_ENV === 'development' || process.env.MOCK_FIREBASE === 'true') {
      console.log('Using mock Firebase implementation for development');
      // Replace the admin object with our mock implementation
      Object.assign(admin, createMockFirebase());
      firebaseInitialized = true;
    }
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