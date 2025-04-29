/**
 * Authentication routes for NeuroNest AI
 * Supports both Firebase and Supabase authentication
 */

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Middleware to verify Firebase token
 */
const verifyFirebaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying Firebase token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

/**
 * Middleware to verify Supabase token
 */
const verifySupabaseToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const { data, error } = await supabase.auth.getUser(token);
    
    if (error || !data.user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
    
    req.user = data.user;
    next();
  } catch (error) {
    console.error('Error verifying Supabase token:', error);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};

/**
 * Middleware to verify token from either Firebase or Supabase
 */
const verifyToken = async (req, res, next) => {
  // Check if using Supabase
  const useSupabase = process.env.USE_SUPABASE === 'true';
  
  if (useSupabase) {
    return verifySupabaseToken(req, res, next);
  } else {
    return verifyFirebaseToken(req, res, next);
  }
};

/**
 * Get current user
 * @route GET /api/auth/user
 */
router.get('/user', verifyToken, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create custom token for Firebase
 * @route POST /api/auth/token
 */
router.post('/token', async (req, res) => {
  try {
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const customToken = await admin.auth().createCustomToken(uid);
    res.json({ token: customToken });
  } catch (error) {
    console.error('Error creating custom token:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Verify token
 * @route POST /api/auth/verify
 */
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    if (useSupabase) {
      const { data, error } = await supabase.auth.getUser(token);
      
      if (error || !data.user) {
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      res.json({ valid: true, user: data.user });
    } else {
      const decodedToken = await admin.auth().verifyIdToken(token);
      res.json({ valid: true, user: decodedToken });
    }
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

/**
 * Revoke refresh tokens
 * @route POST /api/auth/revoke
 */
router.post('/revoke', verifyToken, async (req, res) => {
  try {
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    if (useSupabase) {
      // For Supabase, we can sign out all sessions for a user
      const { error } = await supabase.auth.admin.signOut({
        scope: 'global',
        userId: uid
      });
      
      if (error) {
        return res.status(500).json({ error: 'Failed to revoke tokens' });
      }
    } else {
      // For Firebase, we can revoke all refresh tokens for a user
      await admin.auth().revokeRefreshTokens(uid);
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error revoking tokens:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = {
  router,
  verifyToken
};