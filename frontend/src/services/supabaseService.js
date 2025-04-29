/**
 * Supabase service for comprehensive data storage and authentication
 * This file provides a complete integration with Supabase for all application needs
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Initialize Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Authentication service
 */
export const authService = {
  /**
   * Get the current user
   * @returns {Object|null} The current user or null if not authenticated
   */
  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  /**
   * Sign in with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} Promise with user credentials
   */
  signInWithEmail: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      return { user: data.user, error: null };
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
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) throw error;
      
      // Note: This will redirect the user to Google's auth page
      // The actual user data will be handled in the callback
      return { user: data.user, error: null };
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName || email.split('@')[0]
          }
        }
      });
      
      if (error) throw error;
      
      // Create user profile in the profiles table
      if (data.user) {
        await userService.createUserProfile(data.user.id, {
          email: data.user.email,
          display_name: displayName || email.split('@')[0],
          avatar_url: null
        });
      }
      
      return { user: data.user, error: null };
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
      const { error } = await supabase.auth.signOut();
      
      if (error) throw error;
      
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Update user password
   * @param {string} newPassword - New password
   * @returns {Promise} Promise that resolves when password is updated
   */
  updatePassword: async (newPassword) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Update user profile in Supabase Auth
   * @param {Object} profileData - Profile data to update
   * @returns {Promise} Promise that resolves when profile is updated
   */
  updateAuthProfile: async (profileData) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: profileData.displayName,
          avatar_url: profileData.photoURL
        }
      });
      
      if (error) throw error;
      
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(session?.user || null);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }
};

/**
 * User service for managing user data
 */
export const userService = {
  /**
   * Create a user profile in the database
   * @param {string} userId - User ID
   * @param {Object} userData - User data
   * @returns {Promise} Promise that resolves when profile is created
   */
  createUserProfile: async (userId, userData) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          email: userData.email,
          display_name: userData.display_name,
          avatar_url: userData.avatar_url,
          settings: {
            theme: 'light',
            language: 'en',
            notifications: true,
            dialect: 'standard'
          },
          api_keys: {},
          created_at: new Date().toISOString()
        }]);
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Get a user profile from the database
   * @param {string} userId - User ID
   * @returns {Promise} Promise with user data
   */
  getUserProfile: async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      return { 
        data: {
          id: data.id,
          email: data.email,
          displayName: data.display_name,
          photoURL: data.avatar_url,
          settings: data.settings,
          apiKeys: data.api_keys,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }, 
        error: null 
      };
    } catch (error) {
      return { data: null, error: error.message };
    }
  },

  /**
   * Update a user profile in the database
   * @param {string} userId - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise} Promise that resolves when profile is updated
   */
  updateUserProfile: async (userId, userData) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: userData.displayName,
          avatar_url: userData.photoURL,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) throw error;
      
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
      const { error } = await supabase
        .from('profiles')
        .update({
          settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) throw error;
      
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
      const { data, error } = await supabase
        .from('profiles')
        .select('settings')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      return { data: data.settings, error: null };
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
      const { error } = await supabase
        .from('profiles')
        .update({
          api_keys: apiKeys,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) throw error;
      
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
      const { data, error } = await supabase
        .from('profiles')
        .select('api_keys')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      return { data: data.api_keys, error: null };
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
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          user_id: userId,
          title: projectData.title,
          description: projectData.description,
          type: projectData.type,
          files: [],
          status: 'active',
          created_at: new Date().toISOString()
        }])
        .select();
      
      if (error) throw error;
      
      return { id: data[0].id, error: null };
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
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      
      return { 
        data: {
          id: data.id,
          userId: data.user_id,
          title: data.title,
          description: data.description,
          type: data.type,
          files: data.files,
          status: data.status,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }, 
        error: null 
      };
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
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      return { 
        data: data.map(project => ({
          id: project.id,
          userId: project.user_id,
          title: project.title,
          description: project.description,
          type: project.type,
          files: project.files,
          status: project.status,
          createdAt: project.created_at,
          updatedAt: project.updated_at
        })), 
        error: null 
      };
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
      const { error } = await supabase
        .from('projects')
        .update({
          title: projectData.title,
          description: projectData.description,
          type: projectData.type,
          status: projectData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);
      
      if (error) throw error;
      
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
      // First get the current project
      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('files')
        .eq('id', projectId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Add the new file to the files array
      const files = [...(project.files || []), {
        ...fileData,
        id: Date.now().toString(),
        created_at: new Date().toISOString()
      }];
      
      // Update the project with the new files array
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          files,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);
      
      if (updateError) throw updateError;
      
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * Remove a file from a project
   * @param {string} projectId - Project ID
   * @param {string} fileId - File ID
   * @returns {Promise} Promise that resolves when file is removed
   */
  removeFileFromProject: async (projectId, fileId) => {
    try {
      // First get the current project
      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('files')
        .eq('id', projectId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Filter out the file to remove
      const files = (project.files || []).filter(file => file.id !== fileId);
      
      // Update the project with the new files array
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          files,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);
      
      if (updateError) throw updateError;
      
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
      // First get the current project
      const { data: project, error: fetchError } = await supabase
        .from('projects')
        .select('files')
        .eq('id', projectId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Update the file in the files array
      const files = (project.files || []).map(file => {
        if (file.id === fileId) {
          return { ...file, ...fileData, updated_at: new Date().toISOString() };
        }
        return file;
      });
      
      // Update the project with the new files array
      const { error: updateError } = await supabase
        .from('projects')
        .update({
          files,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);
      
      if (updateError) throw updateError;
      
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
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
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
      const { data, error } = await supabase
        .from('conversations')
        .insert([{
          user_id: userId,
          title: conversationData.title,
          description: conversationData.description,
          messages: [],
          created_at: new Date().toISOString()
        }])
        .select();
      
      if (error) throw error;
      
      return { id: data[0].id, error: null };
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
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();
      
      if (error) throw error;
      
      return { 
        data: {
          id: data.id,
          userId: data.user_id,
          title: data.title,
          description: data.description,
          messages: data.messages,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }, 
        error: null 
      };
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
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      
      return { 
        data: data.map(conversation => ({
          id: conversation.id,
          userId: conversation.user_id,
          title: conversation.title,
          description: conversation.description,
          messages: conversation.messages,
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at
        })), 
        error: null 
      };
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
      // First get the current conversation
      const { data: conversation, error: fetchError } = await supabase
        .from('conversations')
        .select('messages')
        .eq('id', conversationId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Add the new message to the messages array
      const messages = [...(conversation.messages || []), {
        ...message,
        timestamp: new Date().toISOString()
      }];
      
      // Update the conversation with the new messages array
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          messages,
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
      
      if (updateError) throw updateError;
      
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
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
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
      const { data, error } = await supabase
        .from('agent_memories')
        .insert([{
          user_id: userId,
          agent_id: agentId,
          content: memoryData.content,
          context: memoryData.context,
          metadata: memoryData.metadata,
          created_at: new Date().toISOString()
        }])
        .select();
      
      if (error) throw error;
      
      return { id: data[0].id, error: null };
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
      const { data, error } = await supabase
        .from('agent_memories')
        .select('*')
        .eq('user_id', userId)
        .eq('agent_id', agentId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return { 
        data: data.map(memory => ({
          id: memory.id,
          userId: memory.user_id,
          agentId: memory.agent_id,
          content: memory.content,
          context: memory.context,
          metadata: memory.metadata,
          createdAt: memory.created_at,
          updatedAt: memory.updated_at
        })), 
        error: null 
      };
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
      const { error } = await supabase
        .from('agent_memories')
        .update({
          content: memoryData.content,
          context: memoryData.context,
          metadata: memoryData.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', memoryId);
      
      if (error) throw error;
      
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
      const { error } = await supabase
        .from('agent_memories')
        .delete()
        .eq('id', memoryId);
      
      if (error) throw error;
      
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
   * Upload a file to Supabase Storage
   * @param {string} userId - User ID
   * @param {File} file - File to upload
   * @param {string} bucket - Storage bucket
   * @returns {Promise} Promise with download URL
   */
  uploadFile: async (userId, file, bucket = 'files') => {
    try {
      const fileName = `${userId}/${Date.now()}_${file.name}`;
      
      const { data, error } = await supabase
        .storage
        .from(bucket)
        .upload(fileName, file);
      
      if (error) throw error;
      
      // Get the public URL
      const { data: urlData } = supabase
        .storage
        .from(bucket)
        .getPublicUrl(data.path);
      
      return { 
        url: urlData.publicUrl, 
        path: data.path,
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
   * Upload a string as a file to Supabase Storage
   * @param {string} userId - User ID
   * @param {string} content - String content to upload
   * @param {string} fileName - Name for the file
   * @param {string} bucket - Storage bucket
   * @returns {Promise} Promise with download URL
   */
  uploadString: async (userId, content, fileName, bucket = 'files') => {
    try {
      const storageFileName = `${userId}/${Date.now()}_${fileName}`;
      
      // Convert string to Blob
      const blob = new Blob([content], { type: 'text/plain' });
      
      const { data, error } = await supabase
        .storage
        .from(bucket)
        .upload(storageFileName, blob);
      
      if (error) throw error;
      
      // Get the public URL
      const { data: urlData } = supabase
        .storage
        .from(bucket)
        .getPublicUrl(data.path);
      
      return { 
        url: urlData.publicUrl, 
        path: data.path,
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
   * @param {string} bucket - Storage bucket
   * @returns {Promise} Promise with download URL
   */
  getFileUrl: async (path, bucket = 'files') => {
    try {
      const { data } = supabase
        .storage
        .from(bucket)
        .getPublicUrl(path);
      
      return { url: data.publicUrl, error: null };
    } catch (error) {
      return { url: null, error: error.message };
    }
  },

  /**
   * Delete a file from Supabase Storage
   * @param {string} path - Storage path
   * @param {string} bucket - Storage bucket
   * @returns {Promise} Promise that resolves when file is deleted
   */
  deleteFile: async (path, bucket = 'files') => {
    try {
      const { error } = await supabase
        .storage
        .from(bucket)
        .remove([path]);
      
      if (error) throw error;
      
      return { error: null };
    } catch (error) {
      return { error: error.message };
    }
  },

  /**
   * List all files in a directory
   * @param {string} userId - User ID
   * @param {string} bucket - Storage bucket
   * @returns {Promise} Promise with files array
   */
  listFiles: async (userId, bucket = 'files') => {
    try {
      const { data, error } = await supabase
        .storage
        .from(bucket)
        .list(`${userId}`);
      
      if (error) throw error;
      
      const files = data.map(file => {
        const { data: urlData } = supabase
          .storage
          .from(bucket)
          .getPublicUrl(`${userId}/${file.name}`);
        
        return {
          name: file.name,
          path: `${userId}/${file.name}`,
          url: urlData.publicUrl,
          size: file.metadata?.size,
          created: file.metadata?.lastModified
        };
      });
      
      return { data: files, error: null };
    } catch (error) {
      return { data: [], error: error.message };
    }
  }
};

export default {
  supabase,
  authService,
  userService,
  projectService,
  conversationService,
  agentMemoryService,
  storageService
};