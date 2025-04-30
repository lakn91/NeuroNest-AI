/**
 * Supabase service for NeuroNest AI
 * Provides a centralized Supabase client instance
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
let supabase = null;

// Only initialize Supabase if it's enabled and credentials are provided
if (process.env.USE_SUPABASE === 'true' && supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log('Supabase client initialized in supabase service');
  } catch (error) {
    console.error('Error initializing Supabase client in supabase service:', error);
  }
} else {
  console.log('Supabase not configured or disabled. USE_SUPABASE:', process.env.USE_SUPABASE);
  if (!supabaseUrl) console.log('SUPABASE_URL is missing');
  if (!supabaseServiceKey) console.log('SUPABASE_SERVICE_KEY is missing');
}

/**
 * Get the Supabase client instance
 * @returns {Object|null} The Supabase client or null if not initialized
 */
const getSupabaseClient = () => {
  // Lazy initialization if not already initialized
  if (!supabase && process.env.USE_SUPABASE === 'true' && supabaseUrl && supabaseServiceKey) {
    try {
      supabase = createClient(supabaseUrl, supabaseServiceKey);
      console.log('Supabase client initialized lazily in getSupabaseClient()');
    } catch (error) {
      console.error('Error initializing Supabase client lazily:', error);
    }
  }
  return supabase;
};

/**
 * Check if Supabase is initialized
 * @returns {boolean} True if Supabase is initialized, false otherwise
 */
const isSupabaseInitialized = () => {
  return supabase !== null;
};

module.exports = {
  getSupabaseClient,
  isSupabaseInitialized
};