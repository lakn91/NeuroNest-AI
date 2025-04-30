/**
 * Conversations routes for NeuroNest AI
 * Handles conversation management with both Firebase and Supabase
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
    conversationsRef: db.collection("conversations"),
    messagesRef: db.collection("messages")
  };
};

/**
 * Get all conversations for a user
 * @route GET /api/conversations
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
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      res.json({ conversations: data });
    } else {
      // Check if Firebase is initialized
      const refs = getFirestoreRefs();
      if (!refs) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }
      
      const { conversationsRef } = refs;
      
      const snapshot = await conversationsRef
        .where('userId', '==', userId)
        .orderBy('updatedAt', 'desc')
        .get();
      
      const conversations = [];
      snapshot.forEach(doc => {
        conversations.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      res.json({ conversations });
    }
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

/**
 * Get a conversation by ID
 * @route GET /api/conversations/:id
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const conversationId = req.params.id;
    
    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    if (useSupabase) {
      if (!isSupabaseInitialized()) {
        return res.status(500).json({ error: "Supabase client not initialized" });
      }
      
      const supabase = getSupabaseClient();
      
      // Get conversation
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();
      
      if (conversationError) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Get messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (messagesError) {
        throw messagesError;
      }
      
      res.json({
        conversation,
        messages
      });
    } else {
      // Check if Firebase is initialized
      const refs = getFirestoreRefs();
      if (!refs) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }
      
      const { conversationsRef, messagesRef } = refs;
      
      // Get conversation
      const conversationDoc = await conversationsRef.doc(conversationId).get();
      
      if (!conversationDoc.exists || conversationDoc.data().userId !== userId) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Get messages
      const messagesSnapshot = await messagesRef
        .where('conversationId', '==', conversationId)
        .orderBy('createdAt', 'asc')
        .get();
      
      const messages = [];
      messagesSnapshot.forEach(doc => {
        messages.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      res.json({
        conversation: {
          id: conversationDoc.id,
          ...conversationDoc.data()
        },
        messages
      });
    }
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({ error: 'Failed to get conversation' });
  }
});

/**
 * Create a new conversation
 * @route POST /api/conversations
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const { title, agentId, metadata = {} } = req.body;
    
    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    if (useSupabase) {
      if (!isSupabaseInitialized()) {
        return res.status(500).json({ error: "Supabase client not initialized" });
      }
      
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: userId,
          title: title || 'New Conversation',
          agent_id: agentId,
          metadata,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      res.status(201).json({ conversation: data });
    } else {
      // Check if Firebase is initialized
      const refs = getFirestoreRefs();
      if (!refs) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }
      
      const { conversationsRef } = refs;
      const admin = getFirebaseAdmin();
      
      const conversationData = {
        userId,
        title: title || 'New Conversation',
        agentId,
        metadata,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await conversationsRef.add(conversationData);
      const doc = await docRef.get();
      
      res.status(201).json({ conversation: { id: doc.id, ...doc.data() } });
    }
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

/**
 * Update a conversation
 * @route PUT /api/conversations/:id
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const conversationId = req.params.id;
    const { title, metadata } = req.body;
    
    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    if (useSupabase) {
      if (!isSupabaseInitialized()) {
        return res.status(500).json({ error: "Supabase client not initialized" });
      }
      
      const supabase = getSupabaseClient();
      
      // First check if conversation exists and belongs to user
      const { data: existingConversation, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();
      
      if (fetchError || !existingConversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Update the conversation
      const updateData = {
        updated_at: new Date().toISOString()
      };
      
      if (title !== undefined) updateData.title = title;
      if (metadata !== undefined) updateData.metadata = metadata;
      
      const { data, error } = await supabase
        .from('conversations')
        .update(updateData)
        .eq('id', conversationId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      res.json({ conversation: data });
    } else {
      // Check if Firebase is initialized
      const refs = getFirestoreRefs();
      if (!refs) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }
      
      const { conversationsRef } = refs;
      const admin = getFirebaseAdmin();
      
      // First check if conversation exists and belongs to user
      const doc = await conversationsRef.doc(conversationId).get();
      
      if (!doc.exists || doc.data().userId !== userId) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Update the conversation
      const updateData = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      if (title !== undefined) updateData.title = title;
      if (metadata !== undefined) updateData.metadata = metadata;
      
      await conversationsRef.doc(conversationId).update(updateData);
      
      const updatedDoc = await conversationsRef.doc(conversationId).get();
      
      res.json({ conversation: { id: updatedDoc.id, ...updatedDoc.data() } });
    }
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

/**
 * Delete a conversation
 * @route DELETE /api/conversations/:id
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const conversationId = req.params.id;
    
    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    if (useSupabase) {
      if (!isSupabaseInitialized()) {
        return res.status(500).json({ error: "Supabase client not initialized" });
      }
      
      const supabase = getSupabaseClient();
      
      // First check if conversation exists and belongs to user
      const { data: existingConversation, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();
      
      if (fetchError || !existingConversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Delete all messages in the conversation
      const { error: messagesError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);
      
      if (messagesError) {
        throw messagesError;
      }
      
      // Delete the conversation
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
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
      
      const { conversationsRef, messagesRef } = refs;
      
      // First check if conversation exists and belongs to user
      const doc = await conversationsRef.doc(conversationId).get();
      
      if (!doc.exists || doc.data().userId !== userId) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Delete all messages in the conversation
      const messagesSnapshot = await messagesRef
        .where('conversationId', '==', conversationId)
        .get();
      
      const batch = getFirestore().batch();
      messagesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Delete the conversation
      batch.delete(conversationsRef.doc(conversationId));
      
      await batch.commit();
      
      res.json({ success: true });
    }
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

/**
 * Add a message to a conversation
 * @route POST /api/conversations/:id/messages
 */
router.post('/:id/messages', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const conversationId = req.params.id;
    const { content, role, metadata = {} } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }
    
    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    if (useSupabase) {
      if (!isSupabaseInitialized()) {
        return res.status(500).json({ error: "Supabase client not initialized" });
      }
      
      const supabase = getSupabaseClient();
      
      // First check if conversation exists and belongs to user
      const { data: existingConversation, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .single();
      
      if (fetchError || !existingConversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Add the message
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content,
          role: role || 'user',
          metadata,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (messageError) {
        throw messageError;
      }
      
      // Update conversation's updatedAt
      const { error: updateError } = await supabase
        .from('conversations')
        .update({
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId);
      
      if (updateError) {
        throw updateError;
      }
      
      res.status(201).json({ message });
    } else {
      // Check if Firebase is initialized
      const refs = getFirestoreRefs();
      if (!refs) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }
      
      const { conversationsRef, messagesRef } = refs;
      const admin = getFirebaseAdmin();
      
      // First check if conversation exists and belongs to user
      const conversationDoc = await conversationsRef.doc(conversationId).get();
      
      if (!conversationDoc.exists || conversationDoc.data().userId !== userId) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      
      // Add the message
      const messageData = {
        conversationId,
        content,
        role: role || 'user',
        metadata,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const batch = getFirestore().batch();
      
      // Add message
      const messageRef = messagesRef.doc();
      batch.set(messageRef, messageData);
      
      // Update conversation's updatedAt
      batch.update(conversationsRef.doc(conversationId), {
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      await batch.commit();
      
      const messageDoc = await messageRef.get();
      
      res.status(201).json({ message: { id: messageDoc.id, ...messageDoc.data() } });
    }
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

module.exports = router;