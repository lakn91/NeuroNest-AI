/**
 * Authentication Context
 * Provides authentication state and methods to the entire application
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useDatabase } from './DatabaseContext';

// Create the authentication context
const AuthContext = createContext();

/**
 * Custom hook to use the authentication context
 * @returns {Object} Authentication context
 */
export const useAuth = () => {
  return useContext(AuthContext);
};

/**
 * Authentication Provider Component
 * Wraps the application and provides authentication state and methods
 */
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [userSettings, setUserSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Get database services from context
  const { 
    provider,
    authService, 
    userService 
  } = useDatabase();

  /**
   * Sign in with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise} Promise with user credentials
   */
  const login = async (email, password) => {
    return authService.signInWithEmail(email, password);
  };

  /**
   * Sign in with Google
   * @returns {Promise} Promise with user credentials
   */
  const loginWithGoogle = async () => {
    return authService.signInWithGoogle();
  };

  /**
   * Create a new user with email and password
   * @param {string} email - User email
   * @param {string} password - User password
   * @param {string} displayName - User display name
   * @returns {Promise} Promise with user credentials
   */
  const signup = async (email, password, displayName = null) => {
    return authService.createUser(email, password, displayName);
  };

  /**
   * Sign out the current user
   * @returns {Promise} Promise that resolves when sign out is complete
   */
  const logout = async () => {
    const result = await authService.signOut();
    if (!result.error) {
      router.push('/login');
    }
    return result;
  };

  /**
   * Send password reset email
   * @param {string} email - User email
   * @returns {Promise} Promise that resolves when email is sent
   */
  const resetPassword = async (email) => {
    return authService.resetPassword(email);
  };

  /**
   * Update user password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise} Promise that resolves when password is updated
   */
  const updatePassword = async (currentPassword, newPassword) => {
    return authService.updatePassword(currentPassword, newPassword);
  };

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise} Promise that resolves when profile is updated
   */
  const updateProfile = async (profileData) => {
    if (!currentUser) return { error: 'No user logged in' };
    
    // Update profile in authentication provider
    if (profileData.displayName || profileData.photoURL) {
      const authProfileData = {};
      if (profileData.displayName) authProfileData.displayName = profileData.displayName;
      if (profileData.photoURL) authProfileData.photoURL = profileData.photoURL;
      
      await authService.updateAuthProfile(authProfileData);
    }
    
    // Update profile in database
    const result = await userService.updateUserProfile(currentUser.uid, profileData);
    
    if (!result.error) {
      // Update local user profile state
      setUserProfile(prev => ({
        ...prev,
        ...profileData
      }));
    }
    
    return result;
  };

  /**
   * Update user settings
   * @param {Object} settings - Settings object
   * @returns {Promise} Promise that resolves when settings are updated
   */
  const updateSettings = async (settings) => {
    if (!currentUser) return { error: 'No user logged in' };
    
    const result = await userService.updateUserSettings(currentUser.uid, settings);
    
    if (!result.error) {
      // Update local user settings state
      setUserSettings(settings);
    }
    
    return result;
  };

  /**
   * Get user settings
   * @returns {Promise} Promise with settings
   */
  const getSettings = async () => {
    if (!currentUser) return { data: {}, error: 'No user logged in' };
    
    const result = await userService.getUserSettings(currentUser.uid);
    
    if (!result.error) {
      // Update local user settings state
      setUserSettings(result.data);
    }
    
    return result;
  };

  /**
   * Update user API keys
   * @param {Object} apiKeys - API keys object
   * @returns {Promise} Promise that resolves when API keys are updated
   */
  const updateApiKeys = async (apiKeys) => {
    if (!currentUser) return { error: 'No user logged in' };
    return userService.updateApiKeys(currentUser.uid, apiKeys);
  };

  /**
   * Get user API keys
   * @returns {Promise} Promise with API keys
   */
  const getApiKeys = async () => {
    if (!currentUser) return { data: {}, error: 'No user logged in' };
    return userService.getApiKeys(currentUser.uid);
  };

  // Listen for authentication state changes
  useEffect(() => {
    let unsubscribe = () => {};
    
    if (authService) {
      unsubscribe = authService.onAuthStateChanged(async (user) => {
        setCurrentUser(user);
        
        if (user) {
          // Fetch user profile from database
          const { data } = await userService.getUserProfile(user.uid);
          setUserProfile(data);
          
          // Fetch user settings
          const { data: settingsData } = await userService.getUserSettings(user.uid);
          setUserSettings(settingsData);
        } else {
          setUserProfile(null);
          setUserSettings(null);
        }
        
        setLoading(false);
      });
    }

    return unsubscribe;
  }, [authService, userService, provider]);

  // Value to be provided by the context
  const value = {
    currentUser,
    userProfile,
    userSettings,
    login,
    loginWithGoogle,
    signup,
    logout,
    resetPassword,
    updatePassword,
    updateProfile,
    updateSettings,
    getSettings,
    updateApiKeys,
    getApiKeys
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;