/**
 * Projects routes for NeuroNest AI
 * Handles project management with both Firebase and Supabase
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

const { verifyToken } = require('./auth');
const { getFirebaseAdmin, getFirestore, isFirebaseInitialized } = require('../services/firebase');
const { getSupabaseClient, isSupabaseInitialized } = require('../services/supabase');

// Function to get Firestore references
const getFirestoreRefs = () => {
  if (!isFirebaseInitialized()) return null;
  
  const db = getFirestore();
  if (!db) return null;
  
  return {
    projectsRef: db.collection("projects")
  };
};

// Create projects directory if it doesn't exist
const projectsDir = path.join(__dirname, '..', 'projects');
fs.mkdir(projectsDir, { recursive: true })
  .then(() => console.log('Projects directory created'))
  .catch(error => console.error('Error creating projects directory:', error));

/**
 * Get all projects for a user
 * @route GET /api/projects
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
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      res.json({ projects: data });
    } else {
      // Check if Firebase is initialized
      const refs = getFirestoreRefs();
      if (!refs) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }
      
      const { projectsRef } = refs;
      
      const snapshot = await projectsRef
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      
      const projects = [];
      snapshot.forEach(doc => {
        projects.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      res.json({ projects });
    }
  } catch (error) {
    console.error('Error getting projects:', error);
    res.status(500).json({ error: 'Failed to get projects' });
  }
});

/**
 * Get a project by ID
 * @route GET /api/projects/:id
 */
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const projectId = req.params.id;
    
    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    if (useSupabase) {
      if (!isSupabaseInitialized()) {
        return res.status(500).json({ error: "Supabase client not initialized" });
      }
      
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();
      
      if (error) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.json({ project: data });
    } else {
      // Check if Firebase is initialized
      const refs = getFirestoreRefs();
      if (!refs) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }
      
      const { projectsRef } = refs;
      
      const doc = await projectsRef.doc(projectId).get();
      
      if (!doc.exists || doc.data().userId !== userId) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.json({ project: { id: doc.id, ...doc.data() } });
    }
  } catch (error) {
    console.error('Error getting project:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

/**
 * Create a new project
 * @route POST /api/projects
 */
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const { name, description, type, settings = {} } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    if (useSupabase) {
      if (!isSupabaseInitialized()) {
        return res.status(500).json({ error: "Supabase client not initialized" });
      }
      
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          name,
          description,
          type: type || 'default',
          settings,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      // Create project directory
      const projectDir = path.join(projectsDir, data.id);
      await fs.mkdir(projectDir, { recursive: true });
      
      res.status(201).json({ project: data });
    } else {
      // Check if Firebase is initialized
      const refs = getFirestoreRefs();
      if (!refs) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }
      
      const { projectsRef } = refs;
      const admin = getFirebaseAdmin();
      
      const projectData = {
        userId,
        name,
        description,
        type: type || 'default',
        settings,
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await projectsRef.add(projectData);
      const doc = await docRef.get();
      
      // Create project directory
      const projectDir = path.join(projectsDir, doc.id);
      await fs.mkdir(projectDir, { recursive: true });
      
      res.status(201).json({ project: { id: doc.id, ...doc.data() } });
    }
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

/**
 * Update a project
 * @route PUT /api/projects/:id
 */
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const projectId = req.params.id;
    const { name, description, type, settings, status } = req.body;
    
    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    if (useSupabase) {
      if (!isSupabaseInitialized()) {
        return res.status(500).json({ error: "Supabase client not initialized" });
      }
      
      const supabase = getSupabaseClient();
      
      // First check if project exists and belongs to user
      const { data: existingProject, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();
      
      if (fetchError || !existingProject) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Update the project
      const updateData = {
        updated_at: new Date().toISOString()
      };
      
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type;
      if (settings !== undefined) updateData.settings = settings;
      if (status !== undefined) updateData.status = status;
      
      const { data, error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', projectId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      res.json({ project: data });
    } else {
      // Check if Firebase is initialized
      const refs = getFirestoreRefs();
      if (!refs) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }
      
      const { projectsRef } = refs;
      const admin = getFirebaseAdmin();
      
      // First check if project exists and belongs to user
      const doc = await projectsRef.doc(projectId).get();
      
      if (!doc.exists || doc.data().userId !== userId) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Update the project
      const updateData = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type;
      if (settings !== undefined) updateData.settings = settings;
      if (status !== undefined) updateData.status = status;
      
      await projectsRef.doc(projectId).update(updateData);
      
      const updatedDoc = await projectsRef.doc(projectId).get();
      
      res.json({ project: { id: updatedDoc.id, ...updatedDoc.data() } });
    }
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

/**
 * Delete a project
 * @route DELETE /api/projects/:id
 */
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const projectId = req.params.id;
    
    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    if (useSupabase) {
      if (!isSupabaseInitialized()) {
        return res.status(500).json({ error: "Supabase client not initialized" });
      }
      
      const supabase = getSupabaseClient();
      
      // First check if project exists and belongs to user
      const { data: existingProject, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', userId)
        .single();
      
      if (fetchError || !existingProject) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Delete the project
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', userId);
      
      if (error) {
        throw error;
      }
      
      // Delete project directory
      try {
        const projectDir = path.join(projectsDir, projectId);
        await fs.rm(projectDir, { recursive: true, force: true });
      } catch (fsError) {
        console.error('Error deleting project directory:', fsError);
      }
      
      res.json({ success: true });
    } else {
      // Check if Firebase is initialized
      const refs = getFirestoreRefs();
      if (!refs) {
        return res.status(500).json({ error: "Firebase not initialized" });
      }
      
      const { projectsRef } = refs;
      
      // First check if project exists and belongs to user
      const doc = await projectsRef.doc(projectId).get();
      
      if (!doc.exists || doc.data().userId !== userId) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Delete the project
      await projectsRef.doc(projectId).delete();
      
      // Delete project directory
      try {
        const projectDir = path.join(projectsDir, projectId);
        await fs.rm(projectDir, { recursive: true, force: true });
      } catch (fsError) {
        console.error('Error deleting project directory:', fsError);
      }
      
      res.json({ success: true });
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;