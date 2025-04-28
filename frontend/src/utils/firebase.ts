// Import the functions you need from the SDKs you need
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, limit, doc, getDoc, updateDoc, deleteDoc, Firestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject, FirebaseStorage } from 'firebase/storage';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, User, Auth } from 'firebase/auth';

// Mock implementations for when Firebase is not configured
const mockAuth = {
  currentUser: null,
  onAuthStateChanged: (callback: (user: null) => void) => {
    callback(null);
    return () => {};
  },
  signInWithEmailAndPassword: () => Promise.reject(new Error('Firebase not configured')),
  createUserWithEmailAndPassword: () => Promise.reject(new Error('Firebase not configured')),
  signOut: () => Promise.resolve(),
} as unknown as Auth;

const mockFirestore = {
  collection: () => ({
    addDoc: () => Promise.resolve({ id: 'mock-id' }),
    getDocs: () => Promise.resolve({ docs: [] }),
  }),
} as unknown as Firestore;

const mockStorage = {} as FirebaseStorage;
let app: FirebaseApp;
let db: Firestore;
let storage: FirebaseStorage;
let auth: Auth;

// Check if Firebase configuration is available
const hasFirebaseConfig = 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

try {
  if (hasFirebaseConfig) {
    // Your web app's Firebase configuration
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
    };

    // Initialize Firebase only if it hasn't been initialized already
    app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    storage = getStorage(app);
    auth = getAuth(app);
    
    console.log('Firebase initialized successfully');
  } else {
    console.warn('Firebase configuration not found. Using mock implementations.');
    app = {} as FirebaseApp;
    db = mockFirestore;
    storage = mockStorage;
    auth = mockAuth;
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
  app = {} as FirebaseApp;
  db = mockFirestore;
  storage = mockStorage;
  auth = mockAuth;
}

// Conversation history functions
export const saveConversation = async (userId: string, conversation: any) => {
  try {
    const conversationsRef = collection(db, 'conversations');
    const docRef = await addDoc(conversationsRef, {
      userId,
      messages: conversation.messages,
      title: conversation.title || 'New Conversation',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving conversation:', error);
    throw error;
  }
};

export const getConversations = async (userId: string) => {
  try {
    const conversationsRef = collection(db, 'conversations');
    const q = query(
      conversationsRef, 
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw error;
  }
};

// Project functions
export const saveProject = async (userId: string, project: any) => {
  try {
    const projectsRef = collection(db, 'projects');
    const docRef = await addDoc(projectsRef, {
      userId,
      title: project.title,
      description: project.description,
      files: project.files,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving project:', error);
    throw error;
  }
};

export const getProjects = async (userId: string) => {
  try {
    const projectsRef = collection(db, 'projects');
    const q = query(
      projectsRef, 
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting projects:', error);
    throw error;
  }
};

export const getProject = async (projectId: string) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectDoc = await getDoc(projectRef);
    
    if (!projectDoc.exists()) {
      throw new Error('Project not found');
    }
    
    return {
      id: projectDoc.id,
      ...projectDoc.data()
    };
  } catch (error) {
    console.error('Error getting project:', error);
    throw error;
  }
};

export const updateProject = async (projectId: string, projectData: any) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      ...projectData,
      updatedAt: new Date()
    });
    return projectId;
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
};

export const deleteProject = async (projectId: string) => {
  try {
    const projectRef = doc(db, 'projects', projectId);
    await deleteDoc(projectRef);
    return true;
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

// User settings functions
export const saveUserSettings = async (userId: string, settings: any) => {
  try {
    const settingsRef = collection(db, 'userSettings');
    const q = query(settingsRef, where('userId', '==', userId), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // Create new settings
      const docRef = await addDoc(settingsRef, {
        userId,
        ...settings,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return docRef.id;
    } else {
      // Update existing settings
      const docRef = doc(db, 'userSettings', querySnapshot.docs[0].id);
      await updateDoc(docRef, {
        ...settings,
        updatedAt: new Date()
      });
      return querySnapshot.docs[0].id;
    }
  } catch (error) {
    console.error('Error saving user settings:', error);
    throw error;
  }
};

export const getUserSettings = async (userId: string) => {
  try {
    const settingsRef = collection(db, 'userSettings');
    const q = query(settingsRef, where('userId', '==', userId), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    } else {
      return {
        id: querySnapshot.docs[0].id,
        ...querySnapshot.docs[0].data()
      };
    }
  } catch (error) {
    console.error('Error getting user settings:', error);
    throw error;
  }
};

export { app, db, storage, auth };