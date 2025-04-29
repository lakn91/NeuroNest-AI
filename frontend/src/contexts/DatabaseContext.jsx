/**
 * Database Context
 * Provides database services (Firebase or Supabase) to the entire application
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import firebaseService from '../services/firebaseService';
import supabaseService from '../services/supabaseService';

// Create the database context
const DatabaseContext = createContext();

/**
 * Custom hook to use the database context
 * @returns {Object} Database context
 */
export const useDatabase = () => {
  return useContext(DatabaseContext);
};

/**
 * Database Provider Component
 * Wraps the application and provides database services
 */
export const DatabaseProvider = ({ children }) => {
  // Default to Firebase, but can be changed to 'supabase'
  const [provider, setProvider] = useState('firebase');
  const [services, setServices] = useState(firebaseService);

  // Switch database provider
  const switchProvider = (newProvider) => {
    if (newProvider === 'firebase' || newProvider === 'supabase') {
      setProvider(newProvider);
    }
  };

  // Update services when provider changes
  useEffect(() => {
    if (provider === 'firebase') {
      setServices(firebaseService);
    } else if (provider === 'supabase') {
      setServices(supabaseService);
    }
  }, [provider]);

  // Value to be provided by the context
  const value = {
    provider,
    switchProvider,
    ...services
  };

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};

export default DatabaseContext;