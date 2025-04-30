/**
 * Projects routes for NeuroNest AI
 * Handles project management with both Firebase and Supabase
 */

const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

const { verifyToken } = require('./auth');
const { getFirebaseAdmin, getFirestore, getStorageBucket, isFirebaseInitialized } = require('../services/firebase');
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

// Projects directory for code storage
const PROJECTS_DIR = process.env.PROJECTS_DIR || path.join(__dirname, '..', 'projects');

// Ensure projects directory exists
(async () => {
  try {
    await fs.mkdir(PROJECTS_DIR, { recursive: true });
    console.log(`Projects directory created at ${PROJECTS_DIR}`);
  } catch (error) {
    console.error('Error creating projects directory:', error);
  }
})();

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
    const { name, description, type, language, framework, template } = req.body;
    
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
          description: description || '',
          type: type || 'web',
          language: language || 'javascript',
          framework: framework || 'react',
          template: template || 'default',
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
      const projectDir = path.join(PROJECTS_DIR, data.id);
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
        description: description || '',
        type: type || 'web',
        language: language || 'javascript',
        framework: framework || 'react',
        template: template || 'default',
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await projectsRef.add(projectData);
      const doc = await docRef.get();
      
      // Create project directory
      const projectDir = path.join(PROJECTS_DIR, doc.id);
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
    const { name, description, type, language, framework, status } = req.body;
    
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
      if (language !== undefined) updateData.language = language;
      if (framework !== undefined) updateData.framework = framework;
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
      if (language !== undefined) updateData.language = language;
      if (framework !== undefined) updateData.framework = framework;
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
        const projectDir = path.join(PROJECTS_DIR, projectId);
        await fs.rm(projectDir, { recursive: true, force: true });
      } catch (fsError) {
        console.error(`Error deleting project directory for ${projectId}:`, fsError);
        // Continue even if directory deletion fails
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
        const projectDir = path.join(PROJECTS_DIR, projectId);
        await fs.rm(projectDir, { recursive: true, force: true });
      } catch (fsError) {
        console.error(`Error deleting project directory for ${projectId}:`, fsError);
        // Continue even if directory deletion fails
      }
      
      res.json({ success: true });
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

/**
 * Get project files
 * @route GET /api/projects/:id/files
 */
router.get('/:id/files', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const projectId = req.params.id;
    const { path: filePath = '' } = req.query;
    
    // Normalize and secure the file path
    const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const projectDir = path.join(PROJECTS_DIR, projectId);
    const fullPath = path.join(projectDir, normalizedPath);
    
    // Check if project exists and belongs to user
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
    }
    
    // Check if path exists
    try {
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        // List directory contents
        const files = await fs.readdir(fullPath);
        
        // Get file details
        const fileDetails = await Promise.all(
          files.map(async (file) => {
            const fileStat = await fs.stat(path.join(fullPath, file));
            return {
              name: file,
              path: path.join(normalizedPath, file),
              type: fileStat.isDirectory() ? 'directory' : 'file',
              size: fileStat.size,
              modified: fileStat.mtime
            };
          })
        );
        
        res.json({ files: fileDetails });
      } else {
        // Read file content
        const content = await fs.readFile(fullPath, 'utf8');
        res.json({ content });
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Create directory if it doesn't exist
        if (normalizedPath === '') {
          await fs.mkdir(projectDir, { recursive: true });
          res.json({ files: [] });
        } else {
          res.status(404).json({ error: 'File or directory not found' });
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error getting project files:', error);
    res.status(500).json({ error: 'Failed to get project files' });
  }
});

/**
 * Create or update a project file
 * @route POST /api/projects/:id/files
 */
router.post('/:id/files', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const projectId = req.params.id;
    const { path: filePath, content, isDirectory = false } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    // Normalize and secure the file path
    const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const projectDir = path.join(PROJECTS_DIR, projectId);
    const fullPath = path.join(projectDir, normalizedPath);
    
    // Check if project exists and belongs to user
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
    }
    
    // Create directory if it doesn't exist
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    if (isDirectory) {
      // Create directory
      await fs.mkdir(fullPath, { recursive: true });
      res.json({ success: true });
    } else {
      // Write file content
      await fs.writeFile(fullPath, content || '');
      res.json({ success: true });
    }
  } catch (error) {
    console.error('Error creating/updating project file:', error);
    res.status(500).json({ error: 'Failed to create/update project file' });
  }
});

/**
 * Delete a project file
 * @route DELETE /api/projects/:id/files
 */
router.delete('/:id/files', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const projectId = req.params.id;
    const { path: filePath } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    // Normalize and secure the file path
    const normalizedPath = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const projectDir = path.join(PROJECTS_DIR, projectId);
    const fullPath = path.join(projectDir, normalizedPath);
    
    // Check if project exists and belongs to user
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
    }
    
    // Check if path exists
    try {
      const stats = await fs.stat(fullPath);
      
      if (stats.isDirectory()) {
        // Delete directory
        await fs.rm(fullPath, { recursive: true });
      } else {
        // Delete file
        await fs.unlink(fullPath);
      }
      
      res.json({ success: true });
    } catch (error) {
      if (error.code === 'ENOENT') {
        res.status(404).json({ error: 'File or directory not found' });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error deleting project file:', error);
    res.status(500).json({ error: 'Failed to delete project file' });
  }
});

module.exports = router;