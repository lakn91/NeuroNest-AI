import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin
const initializeFirebase = () => {
  if (admin.apps.length === 0) {
    try {
      // Check if we have the required environment variables
      if (!process.env.FIREBASE_PROJECT_ID) {
        console.warn('Firebase project ID not provided. Firebase functionality will be limited.');
        return null;
      }
      
      // Initialize with environment variables
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace newlines in the private key
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
      
      console.log('Firebase Admin initialized successfully');
      return admin;
    } catch (error) {
      console.error('Firebase initialization error:', error);
      return null;
    }
  }
  
  return admin;
};

// Initialize Firebase
const firebase = initializeFirebase();

// Export Firebase services
export const db = firebase ? firebase.firestore() : null;
export const storage = firebase ? firebase.storage() : null;
export const auth = firebase ? firebase.auth() : null;

export default firebase;