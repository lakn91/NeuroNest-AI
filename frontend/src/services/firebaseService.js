/**
 * Enhanced Firebase service for comprehensive data storage and authentication
 * This file provides a complete integration with Firebase for all application needs
 */

import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  updateProfile as firebaseUpdateProfile,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  orderBy,
  limit,
  serverTimestamp,
  onSnapshot,
  arrayUnion,
  arrayRemove,
  Timestamp
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "YOUR_API_KEY",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "YOUR_AUTH_DOMAIN",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "YOUR_STORAGE_BUCKET",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "YOUR_MESSAGING_SENDER_ID",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

/**
 * Authentication service
 */
export const authService = {
  /**
   * Get the current user
   * @returns {Object|null} The current user or null if not authenticated
   */
  getCurrentUser: () => {
    return auth.currentUser;
  },

  /**
   * Sign in with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} Promise with user credentials
   */
  signInWithEmail: async (email, password) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { user: userCredential.user, error: null };
    } catch (error) {
      return { user: null, error: error.message };
    }
  },

  /**
   * Sign in with Google
   * @returns {Promise} Promise with user credentials
   */
  signInWithGoogle: async () => {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      
      // Check if this is a new user (first time sign in)
      const isNewUser = userCredential._tokenResponse.isNewUser;
      
      if (isNewUser) {
        // Create user profile in Firestore
        await userService.createUserProfile(userCredential.user.uid, {
          email: userCredential.user.email,
          displayName: userCredential.user.displayName || userCredential.user.email.split('@')[0],
          photoURL: userCredential.user.photoURL || null,
          createdAt: serverTimestamp()
        });
      }
      
      return { user: userCredential.user, error: null, isNewUser };
    } catch (error) {
      return { user: null, error: error.message };
    }
  },

  /**
   * Create a new user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} displayName - User display name
   * @returns {Promise} Promise with user credentials
   */
  createUser: async (email, password, displayName = null) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile with display name if provided
      if (displayName) {
        await firebaseUpdateProfile(userCredential.user, {
          displayName: displayName
        });
      }
      
      // Create user profile in Firestore
      await userService.createUserProfile(userCredential.user.uid, {
        email: userCredential.user.email,
        displayName: displayName || email.split('@')[0],
        photoURL: userCredential.user.photoURL || null,
        createdAt: serverTimestamp()
      });
      
      return { user: userCredential.user, error: null };
    } catch (error) {
      return { user: null, error: error.message };
    }
  },

  /**
   * Sign out the current user
   * @returns {Promise} Promise that resolves when sign out is complete
   */
  signOut: async () => {
    try {
      await signOut(auth);
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Send password reset email
   * @param {string} email - User email
   * @returns {Promise} Promise that resolves when email is sent
   */
  resetPassword: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Update user password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise} Promise that resolves when password is updated
   */
  updatePassword: async (currentPassword, newPassword) => {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        return { error: 'No user logged in' };
      }
      
      // Re-authenticate user before changing password
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Update user profile in Firebase Auth
   * @param {Object} profileData - Profile data to update
   * @returns {Promise} Promise that resolves when profile is updated
   */
  updateAuthProfile: async (profileData) => {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        return { error: 'No user logged in' };
      }
      
      await firebaseUpdateProfile(user, profileData);
      
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Listen for authentication state changes
   * @param {Function} callback - Callback function to handle auth state changes
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChanged: (callback) => {
    return onAuthStateChanged(auth, callback);
  }
};

/**
 * User service for managing user data
 */
export const userService = {
  /**
   * Create a user profile in Firestore
   * @param {string} userId - User ID
   * @param {Object} userData - User data
   * @returns {Promise} Promise that resolves when profile is created
   */
  createUserProfile: async (userId, userData) => {
    try {
      await setDoc(doc(db, 'users', userId), {
        ...userData,
        settings: {
          theme: 'light',
          language: 'en',
          notifications: true,
          dialect: 'standard'
        },
        apiKeys: {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Get a user profile from Firestore
   * @param {string} userId - User ID
   * @returns {Promise} Promise with user data
   */
  getUserProfile: async (userId) => {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { data: { id: docSnap.id, ...docSnap.data() }, error: null };
      } else {
        return { data: null, error: 'User not found' };
      }
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  /**
   * Update a user profile in Firestore
   * @param {string} userId - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise} Promise that resolves when profile is updated
   */
  updateUserProfile: async (userId, userData) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...userData,
        updatedAt: serverTimestamp()
      });
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Update user settings
   * @param {string} userId - User ID
   * @param {Object} settings - Settings object
   * @returns {Promise} Promise that resolves when settings are updated
   */
  updateUserSettings: async (userId, settings) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'settings': settings,
        updatedAt: serverTimestamp()
      });
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Get user settings
   * @param {string} userId - User ID
   * @returns {Promise} Promise with settings
   */
  getUserSettings: async (userId) => {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && docSnap.data().settings) {
        return { data: docSnap.data().settings, error: null };
      } else {
        return { data: {}, error: 'Settings not found' };
      }
    } catch (error) {
      return { data: {}, error: error.message };
    }
  },

  /**
   * Update user API keys
   * @param {string} userId - User ID
   * @param {Object} apiKeys - API keys object
   * @returns {Promise} Promise that resolves when API keys are updated
   */
  updateApiKeys: async (userId, apiKeys) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        apiKeys,
        updatedAt: serverTimestamp()
      });
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Get user API keys
   * @param {string} userId - User ID
   * @returns {Promise} Promise with API keys
   */
  getApiKeys: async (userId) => {
    try {
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists() && docSnap.data().apiKeys) {
        return { data: docSnap.data().apiKeys, error: null };
      } else {
        return { data: {}, error: 'API keys not found' };
      }
    } catch (error) {
      return { data: {}, error: error.message };
    }
  }
};

/**
 * Project service for managing projects
 */
export const projectService = {
  /**
   * Create a new project
   * @param {string} userId - User ID
   * @param {Object} projectData - Project data
   * @returns {Promise} Promise with project ID
   */
  createProject: async (userId, projectData) => {
    try {
      const projectsRef = collection(db, 'projects');
      const newProjectRef = doc(projectsRef);
      
      await setDoc(newProjectRef, {
        ...projectData,
        userId,
        files: [],
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { id: newProjectRef.id, error: null };
    } catch (error) {
      return { id: null, error: error.message };
    }
  },

  /**
   * Get a project by ID
   * @param {string} projectId - Project ID
   * @returns {Promise} Promise with project data
   */
  getProject: async (projectId) => {
    try {
      const docRef = doc(db, 'projects', projectId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { data: { id: docSnap.id, ...docSnap.data() }, error: null };
      } else {
        return { data: null, error: 'Project not found' };
      }
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  /**
   * Get all projects for a user
   * @param {string} userId - User ID
   * @returns {Promise} Promise with projects array
   */
  getUserProjects: async (userId) => {
    try {
      const projectsRef = collection(db, 'projects');
      const q = query(
        projectsRef, 
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const projects = [];
      
      querySnapshot.forEach((doc) => {
        projects.push({ id: doc.id, ...doc.data() });
      });
      
      return { data: projects, error: null };
    } catch (error) {
      return { data: [], error: error.message };
    }
  },

  /**
   * Update a project
   * @param {string} projectId - Project ID
   * @param {Object} projectData - Project data to update
   * @returns {Promise} Promise that resolves when project is updated
   */
  updateProject: async (projectId, projectData) => {
    try {
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        ...projectData,
        updatedAt: serverTimestamp()
      });
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Add a file to a project
   * @param {string} projectId - Project ID
   * @param {Object} fileData - File data
   * @returns {Promise} Promise that resolves when file is added
   */
  addFileToProject: async (projectId, fileData) => {
    try {
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        files: arrayUnion({
          ...fileData,
          createdAt: Timestamp.now()
        }),
        updatedAt: serverTimestamp()
      });
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Remove a file from a project
   * @param {string} projectId - Project ID
   * @param {Object} fileData - File data
   * @returns {Promise} Promise that resolves when file is removed
   */
  removeFileFromProject: async (projectId, fileData) => {
    try {
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        files: arrayRemove(fileData),
        updatedAt: serverTimestamp()
      });
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Update a file in a project
   * @param {string} projectId - Project ID
   * @param {string} fileId - File ID
   * @param {Object} fileData - Updated file data
   * @returns {Promise} Promise that resolves when file is updated
   */
  updateProjectFile: async (projectId, fileId, fileData) => {
    try {
      // Get the current project
      const { data: project } = await this.getProject(projectId);
      
      if (!project) {
        return { error: 'Project not found' };
      }
      
      // Find and update the file
      const updatedFiles = project.files.map(file => {
        if (file.id === fileId) {
          return { ...file, ...fileData, updatedAt: Timestamp.now() };
        }
        return file;
      });
      
      // Update the project with the new files array
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        files: updatedFiles,
        updatedAt: serverTimestamp()
      });
      
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Delete a project
   * @param {string} projectId - Project ID
   * @returns {Promise} Promise that resolves when project is deleted
   */
  deleteProject: async (projectId) => {
    try {
      await deleteDoc(doc(db, 'projects', projectId));
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Listen for changes to a project
   * @param {string} projectId - Project ID
   * @param {Function} callback - Callback function to handle changes
   * @returns {Function} Unsubscribe function
   */
  onProjectChanged: (projectId, callback) => {
    const projectRef = doc(db, 'projects', projectId);
    return onSnapshot(projectRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() });
      }
    });
  }
};

/**
 * Conversation service for managing conversations with agents
 */
export const conversationService = {
  /**
   * Create a new conversation
   * @param {string} userId - User ID
   * @param {Object} conversationData - Conversation data
   * @returns {Promise} Promise with conversation ID
   */
  createConversation: async (userId, conversationData) => {
    try {
      const conversationsRef = collection(db, 'conversations');
      const newConversationRef = doc(conversationsRef);
      
      await setDoc(newConversationRef, {
        ...conversationData,
        userId,
        messages: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { id: newConversationRef.id, error: null };
    } catch (error) {
      return { id: null, error: error.message };
    }
  },

  /**
   * Get a conversation by ID
   * @param {string} conversationId - Conversation ID
   * @returns {Promise} Promise with conversation data
   */
  getConversation: async (conversationId) => {
    try {
      const docRef = doc(db, 'conversations', conversationId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { data: { id: docSnap.id, ...docSnap.data() }, error: null };
      } else {
        return { data: null, error: 'Conversation not found' };
      }
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  /**
   * Get all conversations for a user
   * @param {string} userId - User ID
   * @returns {Promise} Promise with conversations array
   */
  getUserConversations: async (userId) => {
    try {
      const conversationsRef = collection(db, 'conversations');
      const q = query(
        conversationsRef, 
        where('userId', '==', userId),
        orderBy('updatedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const conversations = [];
      
      querySnapshot.forEach((doc) => {
        conversations.push({ id: doc.id, ...doc.data() });
      });
      
      return { data: conversations, error: null };
    } catch (error) {
      return { data: [], error: error.message };
    }
  },

  /**
   * Add a message to a conversation
   * @param {string} conversationId - Conversation ID
   * @param {Object} message - Message object
   * @returns {Promise} Promise that resolves when message is added
   */
  addMessage: async (conversationId, message) => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const messages = conversationSnap.data().messages || [];
        
        await updateDoc(conversationRef, {
          messages: [...messages, { ...message, timestamp: serverTimestamp() }],
          updatedAt: serverTimestamp()
        });
        
        return { error: null };
      } else {
        return { error: 'Conversation not found' };
      }
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Update conversation metadata
   * @param {string} conversationId - Conversation ID
   * @param {Object} metadata - Metadata to update
   * @returns {Promise} Promise that resolves when metadata is updated
   */
  updateConversationMetadata: async (conversationId, metadata) => {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      await updateDoc(conversationRef, {
        ...metadata,
        updatedAt: serverTimestamp()
      });
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Delete a conversation
   * @param {string} conversationId - Conversation ID
   * @returns {Promise} Promise that resolves when conversation is deleted
   */
  deleteConversation: async (conversationId) => {
    try {
      await deleteDoc(doc(db, 'conversations', conversationId));
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Listen for changes to a conversation
   * @param {string} conversationId - Conversation ID
   * @param {Function} callback - Callback function to handle changes
   * @returns {Function} Unsubscribe function
   */
  onConversationChanged: (conversationId, callback) => {
    const conversationRef = doc(db, 'conversations', conversationId);
    return onSnapshot(conversationRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() });
      }
    });
  }
};

/**
 * Agent Memory service for managing agent memory
 */
export const agentMemoryService = {
  /**
   * Create a new memory entry
   * @param {string} userId - User ID
   * @param {string} agentId - Agent ID
   * @param {Object} memoryData - Memory data
   * @returns {Promise} Promise with memory ID
   */
  createMemory: async (userId, agentId, memoryData) => {
    try {
      const memoriesRef = collection(db, 'agent_memories');
      const newMemoryRef = doc(memoriesRef);
      
      await setDoc(newMemoryRef, {
        userId,
        agentId,
        ...memoryData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return { id: newMemoryRef.id, error: null };
    } catch (error) {
      return { id: null, error: error.message };
    }
  },

  /**
   * Get memories for an agent
   * @param {string} userId - User ID
   * @param {string} agentId - Agent ID
   * @returns {Promise} Promise with memories array
   */
  getAgentMemories: async (userId, agentId) => {
    try {
      const memoriesRef = collection(db, 'agent_memories');
      const q = query(
        memoriesRef, 
        where('userId', '==', userId),
        where('agentId', '==', agentId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const memories = [];
      
      querySnapshot.forEach((doc) => {
        memories.push({ id: doc.id, ...doc.data() });
      });
      
      return { data: memories, error: null };
    } catch (error) {
      return { data: [], error: error.message };
    }
  },

  /**
   * Update a memory entry
   * @param {string} memoryId - Memory ID
   * @param {Object} memoryData - Memory data to update
   * @returns {Promise} Promise that resolves when memory is updated
   */
  updateMemory: async (memoryId, memoryData) => {
    try {
      const memoryRef = doc(db, 'agent_memories', memoryId);
      await updateDoc(memoryRef, {
        ...memoryData,
        updatedAt: serverTimestamp()
      });
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Delete a memory entry
   * @param {string} memoryId - Memory ID
   * @returns {Promise} Promise that resolves when memory is deleted
   */
  deleteMemory: async (memoryId) => {
    try {
      await deleteDoc(doc(db, 'agent_memories', memoryId));
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  }
};

/**
 * File storage service
 */
export const storageService = {
  /**
   * Upload a file to Firebase Storage
   * @param {string} userId - User ID
   * @param {File} file - File to upload
   * @param {string} path - Storage path
   * @returns {Promise} Promise with download URL
   */
  uploadFile: async (userId, file, path = 'files') => {
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `${path}/${userId}/${fileName}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      return { 
        url: downloadURL, 
        path: `${path}/${userId}/${fileName}`,
        name: file.name,
        type: file.type,
        size: file.size,
        error: null 
      };
    } catch (error) {
      return { url: null, error: error.message };
    }
  },

  /**
   * Upload a string as a file to Firebase Storage
   * @param {string} userId - User ID
   * @param {string} content - String content to upload
   * @param {string} fileName - Name for the file
   * @param {string} path - Storage path
   * @returns {Promise} Promise with download URL
   */
  uploadString: async (userId, content, fileName, path = 'files') => {
    try {
      const storageFileName = `${Date.now()}_${fileName}`;
      const storageRef = ref(storage, `${path}/${userId}/${storageFileName}`);
      
      // Convert string to Blob
      const blob = new Blob([content], { type: 'text/plain' });
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return { 
        url: downloadURL, 
        path: `${path}/${userId}/${storageFileName}`,
        name: fileName,
        type: 'text/plain',
        size: content.length,
        error: null 
      };
    } catch (error) {
      return { url: null, error: error.message };
    }
  },

  /**
   * Get a download URL for a file
   * @param {string} path - Storage path
   * @returns {Promise} Promise with download URL
   */
  getFileUrl: async (path) => {
    try {
      const storageRef = ref(storage, path);
      const downloadURL = await getDownloadURL(storageRef);
      
      return { url: downloadURL, error: null };
    } catch (error) {
      return { url: null, error: error.message };
    }
  },

  /**
   * Delete a file from Firebase Storage
   * @param {string} path - Storage path
   * @returns {Promise} Promise that resolves when file is deleted
   */
  deleteFile: async (path) => {
    try {
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * List all files in a directory
   * @param {string} userId - User ID
   * @param {string} path - Storage path
   * @returns {Promise} Promise with files array
   */
  listFiles: async (userId, path = 'files') => {
    try {
      const storageRef = ref(storage, `${path}/${userId}`);
      const res = await listAll(storageRef);
      
      const files = await Promise.all(
        res.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          return {
            name: itemRef.name,
            path: itemRef.fullPath,
            url
          };
        })
      );
      
      return { data: files, error: null };
    } catch (error) {
      return { data: [], error: error.message };
    }
  }
};

export default {
  auth,
  db,
  storage,
  authService,
  userService,
  projectService,
  conversationService,
  agentMemoryService,
  storageService
};