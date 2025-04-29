/**
 * Settings Context
 * Provides application settings functionality to the entire application
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

// Create the settings context
const SettingsContext = createContext();

/**
 * Custom hook to use the settings context
 * @returns {Object} Settings context
 */
export const useSettings = () => {
  return useContext(SettingsContext);
};

/**
 * Settings Provider Component
 * Wraps the application and provides settings functionality
 */
export const SettingsProvider = ({ children }) => {
  // Default settings
  const defaultSettings = {
    theme: 'light',
    language: 'en',
    notifications: true,
    dialect: 'standard',
    fontSize: 'medium',
    codeEditor: {
      theme: 'vs-light',
      fontSize: 14,
      tabSize: 2,
      wordWrap: 'on',
      minimap: true
    },
    speech: {
      voice: 'default',
      rate: 1,
      pitch: 1,
      volume: 1
    }
  };
  
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);
  
  const { currentUser, userSettings, updateSettings } = useAuth();

  /**
   * Update settings
   * @param {Object} newSettings - New settings object or partial settings
   * @returns {Promise} Promise that resolves when settings are updated
   */
  const updateAppSettings = async (newSettings) => {
    // Merge with current settings
    const updatedSettings = {
      ...settings,
      ...newSettings
    };
    
    // Update local state
    setSettings(updatedSettings);
    
    // If user is logged in, save to database
    if (currentUser) {
      return await updateSettings(updatedSettings);
    }
    
    // Otherwise, save to localStorage
    localStorage.setItem('appSettings', JSON.stringify(updatedSettings));
    return { error: null };
  };

  /**
   * Update theme
   * @param {string} theme - Theme name ('light' or 'dark')
   * @returns {Promise} Promise that resolves when theme is updated
   */
  const updateTheme = async (theme) => {
    return await updateAppSettings({ theme });
  };

  /**
   * Update language
   * @param {string} language - Language code
   * @returns {Promise} Promise that resolves when language is updated
   */
  const updateLanguage = async (language) => {
    return await updateAppSettings({ language });
  };

  /**
   * Update dialect
   * @param {string} dialect - Dialect name
   * @returns {Promise} Promise that resolves when dialect is updated
   */
  const updateDialect = async (dialect) => {
    return await updateAppSettings({ dialect });
  };

  /**
   * Update code editor settings
   * @param {Object} codeEditorSettings - Code editor settings
   * @returns {Promise} Promise that resolves when code editor settings are updated
   */
  const updateCodeEditorSettings = async (codeEditorSettings) => {
    return await updateAppSettings({
      codeEditor: {
        ...settings.codeEditor,
        ...codeEditorSettings
      }
    });
  };

  /**
   * Update speech settings
   * @param {Object} speechSettings - Speech settings
   * @returns {Promise} Promise that resolves when speech settings are updated
   */
  const updateSpeechSettings = async (speechSettings) => {
    return await updateAppSettings({
      speech: {
        ...settings.speech,
        ...speechSettings
      }
    });
  };

  /**
   * Reset settings to defaults
   * @returns {Promise} Promise that resolves when settings are reset
   */
  const resetSettings = async () => {
    return await updateAppSettings(defaultSettings);
  };

  /**
   * Get available dialects
   * @returns {Array} Array of available dialects
   */
  const getAvailableDialects = () => {
    return [
      { id: 'standard', name: 'Standard Arabic', code: 'ar-SA' },
      { id: 'egyptian', name: 'Egyptian', code: 'ar-EG' },
      { id: 'levantine', name: 'Levantine', code: 'ar-LB' },
      { id: 'gulf', name: 'Gulf', code: 'ar-AE' },
      { id: 'maghrebi', name: 'Maghrebi', code: 'ar-MA' },
      { id: 'iraqi', name: 'Iraqi', code: 'ar-IQ' },
      { id: 'sudanese', name: 'Sudanese', code: 'ar-SD' }
    ];
  };

  /**
   * Get dialect by ID
   * @param {string} dialectId - Dialect ID
   * @returns {Object} Dialect object
   */
  const getDialectById = (dialectId) => {
    const dialects = getAvailableDialects();
    return dialects.find(dialect => dialect.id === dialectId) || dialects[0];
  };

  /**
   * Get current dialect
   * @returns {Object} Current dialect object
   */
  const getCurrentDialect = () => {
    return getDialectById(settings.dialect);
  };

  // Load settings from user profile or localStorage
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      
      if (currentUser && userSettings) {
        // If user is logged in and has settings, use those
        setSettings({
          ...defaultSettings,
          ...userSettings
        });
      } else {
        // Otherwise, try to load from localStorage
        const storedSettings = localStorage.getItem('appSettings');
        
        if (storedSettings) {
          try {
            const parsedSettings = JSON.parse(storedSettings);
            setSettings({
              ...defaultSettings,
              ...parsedSettings
            });
          } catch (error) {
            console.error('Error parsing stored settings:', error);
            setSettings(defaultSettings);
          }
        } else {
          setSettings(defaultSettings);
        }
      }
      
      setLoading(false);
    };
    
    loadSettings();
  }, [currentUser, userSettings]);

  // Apply theme to document
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Value to be provided by the context
  const value = {
    settings,
    loading,
    updateAppSettings,
    updateTheme,
    updateLanguage,
    updateDialect,
    updateCodeEditorSettings,
    updateSpeechSettings,
    resetSettings,
    getAvailableDialects,
    getDialectById,
    getCurrentDialect
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;