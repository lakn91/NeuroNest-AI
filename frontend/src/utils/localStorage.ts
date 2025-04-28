/**
 * localStorage.ts
 * 
 * This module provides functions for storing and retrieving data locally
 * using the browser's localStorage API. It replaces Firebase functionality
 * with local storage to keep all user data on their device.
 */

// Types
export interface User {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

export interface Conversation {
  id: string;
  userId: string;
  messages: any[];
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description: string;
  files: Record<string, { content: string; language: string }>;
  language?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  id: string;
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  aiProvider: string;
  apiKeys: {
    [provider: string]: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Helper functions
const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

const getItem = <T>(key: string): T[] => {
  if (typeof window === 'undefined') return [];
  
  const item = localStorage.getItem(key);
  if (!item) return [];
  
  try {
    return JSON.parse(item);
  } catch (error) {
    console.error(`Error parsing ${key} from localStorage:`, error);
    return [];
  }
};

const setItem = <T>(key: string, value: T[]): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error storing ${key} in localStorage:`, error);
  }
};

// Auth functions
let currentUser: User | null = null;

export const registerUser = (email: string, password: string, displayName?: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    try {
      // Check if user already exists
      const users = getItem<User & { password: string }>('users');
      const existingUser = users.find(user => user.email === email);
      
      if (existingUser) {
        reject(new Error('User already exists'));
        return;
      }
      
      // Create new user
      const newUser: User & { password: string } = {
        uid: generateId(),
        email,
        password, // In a real app, this would be hashed
        displayName: displayName || email.split('@')[0],
      };
      
      // Save user
      users.push(newUser);
      setItem('users', users);
      
      // Set current user (without password)
      const { password: _, ...userWithoutPassword } = newUser;
      currentUser = userWithoutPassword;
      
      // Save current user to localStorage
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      resolve(currentUser);
    } catch (error) {
      reject(error);
    }
  });
};

export const loginUser = (email: string, password: string): Promise<User> => {
  return new Promise((resolve, reject) => {
    try {
      // Get users
      const users = getItem<User & { password: string }>('users');
      const user = users.find(user => user.email === email && user.password === password);
      
      if (!user) {
        reject(new Error('Invalid email or password'));
        return;
      }
      
      // Set current user (without password)
      const { password: _, ...userWithoutPassword } = user;
      currentUser = userWithoutPassword;
      
      // Save current user to localStorage
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      
      resolve(currentUser);
    } catch (error) {
      reject(error);
    }
  });
};

export const logoutUser = (): Promise<void> => {
  return new Promise((resolve) => {
    currentUser = null;
    localStorage.removeItem('currentUser');
    resolve();
  });
};

export const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve) => {
    if (currentUser) {
      resolve(currentUser);
      return;
    }
    
    // Try to get from localStorage
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      try {
        currentUser = JSON.parse(storedUser);
        resolve(currentUser);
      } catch (error) {
        console.error('Error parsing currentUser from localStorage:', error);
        resolve(null);
      }
    } else {
      resolve(null);
    }
  });
};

export const onAuthStateChanged = (callback: (user: User | null) => void): (() => void) => {
  // Initial call with current user
  getCurrentUser().then(user => callback(user));
  
  // Set up storage event listener to detect changes in other tabs
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === 'currentUser') {
      if (event.newValue) {
        try {
          const user = JSON.parse(event.newValue);
          callback(user);
        } catch (error) {
          console.error('Error parsing currentUser from storage event:', error);
          callback(null);
        }
      } else {
        callback(null);
      }
    }
  };
  
  window.addEventListener('storage', handleStorageChange);
  
  // Return function to remove listener
  return () => {
    window.removeEventListener('storage', handleStorageChange);
  };
};

export const updateUserProfile = (userId: string, data: { displayName?: string; photoURL?: string }): Promise<User> => {
  return new Promise((resolve, reject) => {
    try {
      // Get users
      const users = getItem<User & { password: string }>('users');
      const userIndex = users.findIndex(user => user.uid === userId);
      
      if (userIndex === -1) {
        reject(new Error('User not found'));
        return;
      }
      
      // Update user
      users[userIndex] = {
        ...users[userIndex],
        ...data,
      };
      
      // Save users
      setItem('users', users);
      
      // Update current user if it's the same user
      if (currentUser && currentUser.uid === userId) {
        currentUser = {
          ...currentUser,
          ...data,
        };
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      }
      
      // Return updated user (without password)
      const { password: _, ...userWithoutPassword } = users[userIndex];
      resolve(userWithoutPassword);
    } catch (error) {
      reject(error);
    }
  });
};

// Conversation functions
export const saveConversation = (userId: string, conversation: Omit<Conversation, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Get conversations
      const conversations = getItem<Conversation>('conversations');
      
      // Create new conversation
      const newConversation: Conversation = {
        id: generateId(),
        userId,
        ...conversation,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Save conversation
      conversations.push(newConversation);
      setItem('conversations', conversations);
      
      resolve(newConversation.id);
    } catch (error) {
      reject(error);
    }
  });
};

export const getConversations = (userId: string): Promise<Conversation[]> => {
  return new Promise((resolve) => {
    try {
      // Get conversations
      const conversations = getItem<Conversation>('conversations');
      
      // Filter by userId
      const userConversations = conversations.filter(conv => conv.userId === userId);
      
      // Sort by updatedAt (newest first)
      userConversations.sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      
      resolve(userConversations);
    } catch (error) {
      console.error('Error getting conversations:', error);
      resolve([]);
    }
  });
};

export const updateConversation = (conversationId: string, data: Partial<Conversation>): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Get conversations
      const conversations = getItem<Conversation>('conversations');
      const index = conversations.findIndex(conv => conv.id === conversationId);
      
      if (index === -1) {
        reject(new Error('Conversation not found'));
        return;
      }
      
      // Update conversation
      conversations[index] = {
        ...conversations[index],
        ...data,
        updatedAt: new Date(),
      };
      
      // Save conversations
      setItem('conversations', conversations);
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

export const deleteConversation = (conversationId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Get conversations
      const conversations = getItem<Conversation>('conversations');
      
      // Filter out the conversation to delete
      const updatedConversations = conversations.filter(conv => conv.id !== conversationId);
      
      // Save conversations
      setItem('conversations', updatedConversations);
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

// Project functions
export const saveProject = (userId: string, project: Omit<Project, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Get projects
      const projects = getItem<Project>('projects');
      
      // Create new project
      const newProject: Project = {
        id: generateId(),
        userId,
        ...project,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Save project
      projects.push(newProject);
      setItem('projects', projects);
      
      resolve(newProject.id);
    } catch (error) {
      reject(error);
    }
  });
};

export const getProjects = (userId: string): Promise<Project[]> => {
  return new Promise((resolve) => {
    try {
      // Get projects
      const projects = getItem<Project>('projects');
      
      // Filter by userId
      const userProjects = projects.filter(proj => proj.userId === userId);
      
      // Sort by updatedAt (newest first)
      userProjects.sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
      
      resolve(userProjects);
    } catch (error) {
      console.error('Error getting projects:', error);
      resolve([]);
    }
  });
};

export const getProject = (projectId: string): Promise<Project | null> => {
  return new Promise((resolve) => {
    try {
      // Get projects
      const projects = getItem<Project>('projects');
      
      // Find project
      const project = projects.find(proj => proj.id === projectId);
      
      resolve(project || null);
    } catch (error) {
      console.error('Error getting project:', error);
      resolve(null);
    }
  });
};

export const updateProject = (projectId: string, data: Partial<Project>): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Get projects
      const projects = getItem<Project>('projects');
      const index = projects.findIndex(proj => proj.id === projectId);
      
      if (index === -1) {
        reject(new Error('Project not found'));
        return;
      }
      
      // Update project
      projects[index] = {
        ...projects[index],
        ...data,
        updatedAt: new Date(),
      };
      
      // Save projects
      setItem('projects', projects);
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

export const deleteProject = (projectId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    try {
      // Get projects
      const projects = getItem<Project>('projects');
      
      // Filter out the project to delete
      const updatedProjects = projects.filter(proj => proj.id !== projectId);
      
      // Save projects
      setItem('projects', updatedProjects);
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};

// User settings functions
export const saveUserSettings = (userId: string, settings: Omit<UserSettings, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Get user settings
      const userSettings = getItem<UserSettings>('userSettings');
      
      // Check if settings already exist for this user
      const existingIndex = userSettings.findIndex(setting => setting.userId === userId);
      
      if (existingIndex !== -1) {
        // Update existing settings
        userSettings[existingIndex] = {
          ...userSettings[existingIndex],
          ...settings,
          updatedAt: new Date(),
        };
        
        // Save settings
        setItem('userSettings', userSettings);
        
        resolve(userSettings[existingIndex].id);
      } else {
        // Create new settings
        const newSettings: UserSettings = {
          id: generateId(),
          userId,
          ...settings,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        // Save settings
        userSettings.push(newSettings);
        setItem('userSettings', userSettings);
        
        resolve(newSettings.id);
      }
    } catch (error) {
      reject(error);
    }
  });
};

export const getUserSettings = (userId: string): Promise<UserSettings | null> => {
  return new Promise((resolve) => {
    try {
      // Get user settings
      const userSettings = getItem<UserSettings>('userSettings');
      
      // Find settings for this user
      const settings = userSettings.find(setting => setting.userId === userId);
      
      resolve(settings || null);
    } catch (error) {
      console.error('Error getting user settings:', error);
      resolve(null);
    }
  });
};