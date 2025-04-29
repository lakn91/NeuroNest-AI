/**
 * Authentication Context
 * Provides authentication state and methods to the entire application
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDatabase } from './DatabaseContext';
import api from '../services/api';

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
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
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
    setError(null);
    
    // Try to use the database service first
    if (authService && authService.signInWithEmail) {
      try {
        const result = await authService.signInWithEmail(email, password);
        if (!result.error) {
          navigate('/dashboard');
        } else {
          setError(result.error);
        }
        return result;
      } catch (err) {
        setError(err.message || 'Login failed');
        return { error: err.message || 'Login failed' };
      }
    }
    
    // Fallback to API if database service is not available
    try {
      setLoading(true);
      
      const response = await api.post('/api/auth/login', { email, password });
      const { access_token, user } = response.data;
      
      // Save token and set auth header
      localStorage.setItem('token', access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setCurrentUser(user);
      setUserProfile(user);
      navigate('/dashboard');
      
      return { data: user, error: null };
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
      return { error: err.response?.data?.detail || 'Login failed. Please check your credentials.' };
    } finally {
      setLoading(false);
    }
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
    setError(null);
    
    // Try to use the database service first
    if (authService && authService.createUser) {
      try {
        const result = await authService.createUser(email, password, displayName);
        if (!result.error) {
          navigate('/dashboard');
        } else {
          setError(result.error);
        }
        return result;
      } catch (err) {
        setError(err.message || 'Registration failed');
        return { error: err.message || 'Registration failed' };
      }
    }
    
    // Fallback to API if database service is not available
    try {
      setLoading(true);
      
      const response = await api.post('/api/auth/register', {
        email,
        password,
        display_name: displayName || email.split('@')[0]
      });
      
      const { access_token, user } = response.data;
      
      // Save token and set auth header
      localStorage.setItem('token', access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      setCurrentUser(user);
      setUserProfile(user);
      navigate('/dashboard');
      
      return { data: user, error: null };
    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
      return { error: err.response?.data?.detail || 'Registration failed. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sign out the current user
   * @returns {Promise} Promise that resolves when sign out is complete
   */
  const logout = async () => {
    setError(null);
    
    // Try to use the database service first
    if (authService && authService.signOut) {
      try {
        const result = await authService.signOut();
        if (!result.error) {
          navigate('/login');
        } else {
          setError(result.error);
        }
        return result;
      } catch (err) {
        setError(err.message || 'Logout failed');
        return { error: err.message || 'Logout failed' };
      }
    }
    
    // Fallback to API if database service is not available
    try {
      setLoading(true);
      
      // Call logout endpoint if available
      try {
        await api.post('/api/auth/logout');
      } catch (err) {
        console.warn('Logout endpoint failed:', err);
        // Continue with local logout even if API call fails
      }
      
      // Clear token and auth header
      localStorage.removeItem('token');
      api.defaults.headers.common['Authorization'] = '';
      
      setCurrentUser(null);
      setUserProfile(null);
      setUserSettings(null);
      navigate('/login');
      
      return { error: null };
    } catch (err) {
      console.error('Logout failed:', err);
      // Still clear local auth state even if API call fails
      localStorage.removeItem('token');
      api.defaults.headers.common['Authorization'] = '';
      setCurrentUser(null);
      setUserProfile(null);
      setUserSettings(null);
      navigate('/login');
      
      return { error: null };
    } finally {
      setLoading(false);
    }
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

  // Clear error
  const clearError = () => {
    setError(null);
  };

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (token) {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Fetch current user data
          const response = await api.get('/api/auth/me');
          setCurrentUser(response.data);
          setUserProfile(response.data);
          
          // Fetch user settings if available
          try {
            const settingsResponse = await api.get('/api/settings');
            setUserSettings(settingsResponse.data);
          } catch (err) {
            console.warn('Failed to fetch user settings:', err);
          }
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        // Clear invalid token
        localStorage.removeItem('token');
        api.defaults.headers.common['Authorization'] = '';
      } finally {
        setLoading(false);
      }
    };

    // Only run if we're using the API authentication
    if (!authService) {
      checkAuthStatus();
    }
  }, []);

  // Value to be provided by the context
  const value = {
    currentUser,
    userProfile,
    userSettings,
    loading,
    error,
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
    getApiKeys,
    clearError,
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;