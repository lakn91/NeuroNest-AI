/**
 * Agent Memory routes for NeuroNest AI
 * Handles agent memory storage with both Firebase and Supabase
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
    memoriesRef: db.collection("memories")
  };
};

/**
 * Get all memories for a user
 * @route GET /api/memories
 */
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const { agentId } = req.query;

    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';

    if (useSupabase) {
      if (!isSupabaseInitialized()) {
        return res.status(500).json({ error: "Supabase client not initialized" });
      }
      
      const supabase = getSupabaseClient();
      let query = supabase
        .from('agent_memories')
        .select('*')
        .eq('user_id', userId);

      if (agentId) {
        query = query.eq('agent_id', agentId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      res.json({ memories: data });
    } else {
      // Check if Firebase is initialized
      const refs = getFirestoreRefs();
      if (!refs) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }
      
      const { memoriesRef } = refs;
      let query = memoriesRef.where('userId', '==', userId);

      if (agentId) {
        query = query.where('agentId', '==', agentId);
      }

      const snapshot = await query.orderBy('createdAt', 'desc').get();

      const memories = [];
      snapshot.forEach(doc => {
        memories.push({
          id: doc.id,
          ...doc.data()
        });
      });

      res.json({ memories });
    }
  } catch (error) {
    console.error('Error getting memories:', error);
    res.status(500).json({ error: 'Failed to get memories' });
  }
});

/**
 * Get a memory by ID
 * @route GET /api/memories/:id
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const memoryId = req.params.id;

    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';

    if (useSupabase) {
      if (!isSupabaseInitialized()) {
        return res.status(500).json({ error: "Supabase client not initialized" });
      }
      
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('agent_memories')
        .select('*')
        .eq('id', memoryId)
        .eq('user_id', userId)
        .single();

      if (error) {
        return res.status(404).json({ error: 'Memory not found' });
      }

      res.json({ memory: data });
    } else {
      // Check if Firebase is initialized
      const refs = getFirestoreRefs();
      if (!refs) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }
      
      const { memoriesRef } = refs;
      const doc = await memoriesRef.doc(memoryId).get();

      if (!doc.exists || doc.data().userId !== userId) {
        return res.status(404).json({ error: 'Memory not found' });
      }

      res.json({ memory: { id: doc.id, ...doc.data() } });
    }
  } catch (error) {
    console.error('Error getting memory:', error);
    res.status(500).json({ error: 'Failed to get memory' });
  }
});

/**
 * Create a new memory
 * @route POST /api/memories
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const { agentId, content, context, metadata = {} } = req.body;

    if (!agentId || !content) {
      return res.status(400).json({ error: 'Agent ID and content are required' });
    }

    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';

    if (useSupabase) {
      if (!isSupabaseInitialized()) {
        return res.status(500).json({ error: "Supabase client not initialized" });
      }
      
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('agent_memories')
        .insert({
          user_id: userId,
          agent_id: agentId,
          content,
          context,
          metadata,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.status(201).json({ memory: data });
    } else {
      // Check if Firebase is initialized
      const refs = getFirestoreRefs();
      if (!refs) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }
      
      const { memoriesRef } = refs;
      const admin = getFirebaseAdmin();
      
      const memoryData = {
        userId,
        agentId,
        content,
        context,
        metadata,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await memoriesRef.add(memoryData);
      const doc = await docRef.get();

      res.status(201).json({ memory: { id: doc.id, ...doc.data() } });
    }
  } catch (error) {
    console.error('Error creating memory:', error);
    res.status(500).json({ error: 'Failed to create memory' });
  }
});

/**
 * Update a memory
 * @route PUT /api/memories/:id
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const memoryId = req.params.id;
    const { content, context, metadata } = req.body;

    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';

    if (useSupabase) {
      if (!isSupabaseInitialized()) {
        return res.status(500).json({ error: "Supabase client not initialized" });
      }
      
      const supabase = getSupabaseClient();
      // First check if memory exists and belongs to user
      const { data: existingMemory, error: fetchError } = await supabase
        .from('agent_memories')
        .select('*')
        .eq('id', memoryId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !existingMemory) {
        return res.status(404).json({ error: 'Memory not found' });
      }

      // Update the memory
      const updateData = {};
      if (content !== undefined) updateData.content = content;
      if (context !== undefined) updateData.context = context;
      if (metadata !== undefined) updateData.metadata = metadata;
      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('agent_memories')
        .update(updateData)
        .eq('id', memoryId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      res.json({ memory: data });
    } else {
      // Check if Firebase is initialized
      const refs = getFirestoreRefs();
      if (!refs) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }
      
      const { memoriesRef } = refs;
      const admin = getFirebaseAdmin();
      
      // First check if memory exists and belongs to user
      const doc = await memoriesRef.doc(memoryId).get();

      if (!doc.exists || doc.data().userId !== userId) {
        return res.status(404).json({ error: 'Memory not found' });
      }

      // Update the memory
      const updateData = {};
      if (content !== undefined) updateData.content = content;
      if (context !== undefined) updateData.context = context;
      if (metadata !== undefined) updateData.metadata = metadata;
      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      await memoriesRef.doc(memoryId).update(updateData);

      const updatedDoc = await memoriesRef.doc(memoryId).get();

      res.json({ memory: { id: updatedDoc.id, ...updatedDoc.data() } });
    }
  } catch (error) {
    console.error('Error updating memory:', error);
    res.status(500).json({ error: 'Failed to update memory' });
  }
});

/**
 * Delete a memory
 * @route DELETE /api/memories/:id
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const memoryId = req.params.id;

    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';

    if (useSupabase) {
      if (!isSupabaseInitialized()) {
        return res.status(500).json({ error: "Supabase client not initialized" });
      }
      
      const supabase = getSupabaseClient();
      // First check if memory exists and belongs to user
      const { data: existingMemory, error: fetchError } = await supabase
        .from('agent_memories')
        .select('*')
        .eq('id', memoryId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !existingMemory) {
        return res.status(404).json({ error: 'Memory not found' });
      }

      // Delete the memory
      const { error } = await supabase
        .from('agent_memories')
        .delete()
        .eq('id', memoryId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      res.json({ success: true });
    } else {
      // Check if Firebase is initialized
      const refs = getFirestoreRefs();
      if (!refs) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }
      
      const { memoriesRef } = refs;
      
      // First check if memory exists and belongs to user
      const doc = await memoriesRef.doc(memoryId).get();

      if (!doc.exists || doc.data().userId !== userId) {
        return res.status(404).json({ error: 'Memory not found' });
      }

      // Delete the memory
      await memoriesRef.doc(memoryId).delete();

      res.json({ success: true });
    }
  } catch (error) {
    console.error('Error deleting memory:', error);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

/**
 * Search memories
 * @route GET /api/memories/search
 */
router.get('/search', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const { agentId, query, limit = 10 } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';

    if (useSupabase) {
      if (!isSupabaseInitialized()) {
        return res.status(500).json({ error: "Supabase client not initialized" });
      }
      
      const supabase = getSupabaseClient();
      let dbQuery = supabase
        .from('agent_memories')
        .select('*')
        .eq('user_id', userId)
        .ilike('content', `%${query}%`)
        .order('created_at', { ascending: false })
        .limit(parseInt(limit));

      if (agentId) {
        dbQuery = dbQuery.eq('agent_id', agentId);
      }

      const { data, error } = await dbQuery;

      if (error) {
        throw error;
      }

      res.json({ memories: data });
    } else {
      // Check if Firebase is initialized
      const refs = getFirestoreRefs();
      if (!refs) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }
      
      const { memoriesRef } = refs;
      
      // For Firebase, we need to get all memories and filter them in memory
      // since Firestore doesn't support full-text search
      let dbQuery = memoriesRef.where('userId', '==', userId);

      if (agentId) {
        dbQuery = dbQuery.where('agentId', '==', agentId);
      }

      const snapshot = await dbQuery.orderBy('createdAt', 'desc').get();

      const memories = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.content.toLowerCase().includes(query.toLowerCase())) {
          memories.push({
            id: doc.id,
            ...data
          });
        }
      });

      res.json({ memories: memories.slice(0, parseInt(limit)) });
    }
  } catch (error) {
    console.error('Error searching memories:', error);
    res.status(500).json({ error: 'Failed to search memories' });
  }
});

module.exports = router;