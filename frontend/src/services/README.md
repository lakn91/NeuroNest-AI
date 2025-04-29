# Services

This directory contains service modules that handle external API interactions and business logic for the NeuroNest-AI frontend.

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

- **apiService.js**: Handles communication with the backend API.
  - HTTP requests to backend endpoints
  - Request/response formatting
  - Error handling

## Usage

Import and use services in your components or contexts:

```jsx
import { loginUser, registerUser } from '../services/firebaseService';
// or
import { loginUser, registerUser } from '../services/supabaseService';

// In a component or context
async function handleLogin(email, password) {
  try {
    const user = await loginUser(email, password);
    // Handle successful login
    return user;
  } catch (error) {
    // Handle error
    console.error('Login failed:', error.message);
    throw error;
  }
}
```

## Service Structure

Each service typically exports functions that handle specific operations. For example:

```javascript
// firebaseService.js
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { getFirestore, collection, doc, getDoc, setDoc } from 'firebase/firestore';

// Initialize Firebase
const firebaseConfig = {
  // Configuration from environment variables
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/**
 * Login a user with email and password
 * 
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} User object
 */
export async function loginUser(email, password) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

/**
 * Register a new user
 * 
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} displayName - User's display name
 * @returns {Promise<Object>} User object
 */
export async function registerUser(email, password, displayName) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Create user profile
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    email,
    displayName,
    createdAt: new Date(),
  });
  
  return userCredential.user;
}

/**
 * Logout the current user
 * 
 * @returns {Promise<void>}
 */
export async function logoutUser() {
  return signOut(auth);
}

// Other Firebase operations...
```

## Error Handling

Services should handle errors appropriately and provide meaningful error messages. Use try/catch blocks and consider creating custom error classes for specific error types.

## Configuration

Services may require configuration from environment variables. Make sure to document required environment variables in the `.env.example` file.
