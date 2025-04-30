/**
 * Settings routes for NeuroNest AI
 * Handles user settings with both Firebase and Supabase
 */

const express = require('express');
const router = express.Router();

const { verifyToken } = require('./auth');
const { getFirebaseAdmin, getFirestore, isFirebaseInitialized } = require('../services/firebase');
const { getSupabaseClient, isSupabaseInitialized } = require('../services/supabase');

// Function to get Firestore references
const getFirestoreRefs = () => {
  if (!isFirebaseInitialized()) return null;
  
  const db = getFirestore();
  if (!db) return null;
  
  return {
    settingsRef: db.collection("settings"),
    userSettingsRef: db.collection("user_settings")
  };
};

// Available dialects
const AVAILABLE_DIALECTS = [
  { id: 'standard', name: 'Standard Arabic', code: 'ar-SA' },
  { id: 'egyptian', name: 'Egyptian Arabic', code: 'ar-EG' },
  { id: 'levantine', name: 'Levantine Arabic', code: 'ar-LB' },
  { id: 'gulf', name: 'Gulf Arabic', code: 'ar-AE' },
  { id: 'maghrebi', name: 'Maghrebi Arabic', code: 'ar-MA' },
  { id: 'iraqi', name: 'Iraqi Arabic', code: 'ar-IQ' }
];

/**
 * Get user settings
 * @route GET /api/settings
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    
    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    if (useSupabase) {
      if (!isSupabaseInitialized()) {
        return res.status(500).json({ error: "Supabase client not initialized" });
      }
      
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
        throw error;
      }
      
      // If no settings found, return default settings
      if (!data) {
        return res.json({
          settings: {
            userId,
            theme: 'light',
            language: 'en',
            dialect: 'standard',
            notifications: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          },
          availableDialects: AVAILABLE_DIALECTS
        });
      }
      
      res.json({
        settings: data,
        availableDialects: AVAILABLE_DIALECTS
      });
    } else {
      // Check if Firebase is initialized
      const refs = getFirestoreRefs();
      if (!refs) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }
      
      const { userSettingsRef } = refs;
      
      const doc = await userSettingsRef.doc(userId).get();
      
      // If no settings found, return default settings
      if (!doc.exists) {
        return res.json({
          settings: {
            userId,
            theme: 'light',
            language: 'en',
            dialect: 'standard',
            notifications: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          availableDialects: AVAILABLE_DIALECTS
        });
      }
      
      res.json({
        settings: { id: doc.id, ...doc.data() },
        availableDialects: AVAILABLE_DIALECTS
      });
    }
  } catch (error) {
    console.error('Error getting user settings:', error);
    res.status(500).json({ error: 'Failed to get user settings' });
  }
});

/**
 * Update user settings
 * @route PUT /api/settings
 */
router.put('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const { theme, language, dialect, notifications } = req.body;
    
    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    if (useSupabase) {
      if (!isSupabaseInitialized()) {
        return res.status(500).json({ error: "Supabase client not initialized" });
      }
      
      const supabase = getSupabaseClient();
      
      // Check if settings exist
      const { data: existingSettings, error: fetchError } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      const updateData = {
        updated_at: new Date().toISOString()
      };
      
      if (theme !== undefined) updateData.theme = theme;
      if (language !== undefined) updateData.language = language;
      if (dialect !== undefined) updateData.dialect = dialect;
      if (notifications !== undefined) updateData.notifications = notifications;
      
      let result;
      
      if (fetchError && fetchError.code === 'PGRST116') {
        // No settings found, create new settings
        const { data, error } = await supabase
          .from('user_settings')
          .insert({
            user_id: userId,
            theme: theme || 'light',
            language: language || 'en',
            dialect: dialect || 'standard',
            notifications: notifications !== undefined ? notifications : true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        
        result = data;
      } else if (fetchError) {
        throw fetchError;
      } else {
        // Update existing settings
        const { data, error } = await supabase
          .from('user_settings')
          .update(updateData)
          .eq('user_id', userId)
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        
        result = data;
      }
      
      res.json({
        settings: result,
        availableDialects: AVAILABLE_DIALECTS
      });
    } else {
      // Check if Firebase is initialized
      const refs = getFirestoreRefs();
      if (!refs) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }
      
      const { userSettingsRef } = refs;
      const admin = getFirebaseAdmin();
      
      // Check if settings exist
      const doc = await userSettingsRef.doc(userId).get();
      
      const updateData = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      if (theme !== undefined) updateData.theme = theme;
      if (language !== undefined) updateData.language = language;
      if (dialect !== undefined) updateData.dialect = dialect;
      if (notifications !== undefined) updateData.notifications = notifications;
      
      if (!doc.exists) {
        // No settings found, create new settings
        await userSettingsRef.doc(userId).set({
          userId,
          theme: theme || 'light',
          language: language || 'en',
          dialect: dialect || 'standard',
          notifications: notifications !== undefined ? notifications : true,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else {
        // Update existing settings
        await userSettingsRef.doc(userId).update(updateData);
      }
      
      const updatedDoc = await userSettingsRef.doc(userId).get();
      
      res.json({
        settings: { id: updatedDoc.id, ...updatedDoc.data() },
        availableDialects: AVAILABLE_DIALECTS
      });
    }
  } catch (error) {
    console.error('Error updating user settings:', error);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
});

/**
 * Get available dialects
 * @route GET /api/settings/dialects
 */
router.get('/dialects', async (req, res) => {
  try {
    res.json({ dialects: AVAILABLE_DIALECTS });
  } catch (error) {
    console.error('Error getting dialects:', error);
    res.status(500).json({ error: 'Failed to get dialects' });
  }
});

module.exports = router;