/**
 * Project routes for NeuroNest AI
 * Handles project CRUD operations with both Firebase and Supabase
 */

const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('./auth');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Firebase references
const db = admin.firestore();
const projectsRef = db.collection('projects');
const bucket = admin.storage().bucket();

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
    const { title, description, type, files = [] } = req.body;
    
    if (!title || !type) {
      return res.status(400).json({ error: 'Title and type are required' });
    }
    
    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    if (useSupabase) {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          title,
          description,
          type,
          files,
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      res.status(201).json({ project: data });
    } else {
      const projectData = {
        userId,
        title,
        description,
        type,
        files,
        status: 'active',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const docRef = await projectsRef.add(projectData);
      const doc = await docRef.get();
      
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
    const { title, description, type, files, status } = req.body;
    
    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    if (useSupabase) {
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
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type;
      if (files !== undefined) updateData.files = files;
      if (status !== undefined) updateData.status = status;
      updateData.updated_at = new Date().toISOString();
      
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
      // First check if project exists and belongs to user
      const doc = await projectsRef.doc(projectId).get();
      
      if (!doc.exists || doc.data().userId !== userId) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Update the project
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (type !== undefined) updateData.type = type;
      if (files !== undefined) updateData.files = files;
      if (status !== undefined) updateData.status = status;
      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();
      
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
      
      // Delete project files from storage
      if (existingProject.files && existingProject.files.length > 0) {
        for (const file of existingProject.files) {
          const { error: storageError } = await supabase.storage
            .from('project-files')
            .remove([`${userId}/${projectId}/${file.path}`]);
          
          if (storageError) {
            console.error('Error deleting file from storage:', storageError);
          }
        }
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
      
      res.json({ success: true });
    } else {
      // First check if project exists and belongs to user
      const doc = await projectsRef.doc(projectId).get();
      
      if (!doc.exists || doc.data().userId !== userId) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Delete project files from storage
      const projectData = doc.data();
      if (projectData.files && projectData.files.length > 0) {
        for (const file of projectData.files) {
          try {
            await bucket.file(`projects/${userId}/${projectId}/${file.path}`).delete();
          } catch (storageError) {
            console.error('Error deleting file from storage:', storageError);
          }
        }
      }
      
      // Delete the project
      await projectsRef.doc(projectId).delete();
      
      res.json({ success: true });
    }
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

/**
 * Upload a file to a project
 * @route POST /api/projects/:id/files
 */
router.post('/:id/files', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const projectId = req.params.id;
    const { fileName, fileContent, fileType } = req.body;
    
    if (!fileName || !fileContent) {
      return res.status(400).json({ error: 'File name and content are required' });
    }
    
    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    if (useSupabase) {
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
      
      // Upload file to storage
      const filePath = `${userId}/${projectId}/${fileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project-files')
        .upload(filePath, Buffer.from(fileContent), {
          contentType: fileType || 'text/plain',
          upsert: true
        });
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get file URL
      const { data: urlData } = await supabase.storage
        .from('project-files')
        .getPublicUrl(filePath);
      
      const fileUrl = urlData.publicUrl;
      
      // Update project with new file
      const fileData = {
        id: uuidv4(),
        name: fileName,
        path: fileName,
        type: fileType || 'text/plain',
        url: fileUrl,
        createdAt: new Date().toISOString()
      };
      
      const files = [...(existingProject.files || [])];
      const existingFileIndex = files.findIndex(f => f.path === fileName);
      
      if (existingFileIndex >= 0) {
        files[existingFileIndex] = fileData;
      } else {
        files.push(fileData);
      }
      
      const { data, error } = await supabase
        .from('projects')
        .update({
          files,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      res.json({ file: fileData, project: data });
    } else {
      // First check if project exists and belongs to user
      const doc = await projectsRef.doc(projectId).get();
      
      if (!doc.exists || doc.data().userId !== userId) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Upload file to storage
      const filePath = `projects/${userId}/${projectId}/${fileName}`;
      const file = bucket.file(filePath);
      
      await file.save(Buffer.from(fileContent), {
        metadata: {
          contentType: fileType || 'text/plain'
        }
      });
      
      // Get file URL
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-01-2500' // Far future expiration
      });
      
      // Update project with new file
      const fileData = {
        id: uuidv4(),
        name: fileName,
        path: fileName,
        type: fileType || 'text/plain',
        url,
        createdAt: new Date().toISOString()
      };
      
      const projectData = doc.data();
      const files = [...(projectData.files || [])];
      const existingFileIndex = files.findIndex(f => f.path === fileName);
      
      if (existingFileIndex >= 0) {
        files[existingFileIndex] = fileData;
      } else {
        files.push(fileData);
      }
      
      await projectsRef.doc(projectId).update({
        files,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const updatedDoc = await projectsRef.doc(projectId).get();
      
      res.json({
        file: fileData,
        project: { id: updatedDoc.id, ...updatedDoc.data() }
      });
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

/**
 * Get a file from a project
 * @route GET /api/projects/:id/files/:fileName
 */
router.get('/:id/files/:fileName', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const projectId = req.params.id;
    const fileName = req.params.fileName;
    
    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    if (useSupabase) {
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
      
      // Get file from storage
      const filePath = `${userId}/${projectId}/${fileName}`;
      const { data, error } = await supabase.storage
        .from('project-files')
        .download(filePath);
      
      if (error) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      // Convert file to text
      const fileContent = await data.text();
      
      // Find file metadata in project
      const fileData = existingProject.files.find(f => f.path === fileName);
      
      res.json({
        file: {
          ...fileData,
          content: fileContent
        }
      });
    } else {
      // First check if project exists and belongs to user
      const doc = await projectsRef.doc(projectId).get();
      
      if (!doc.exists || doc.data().userId !== userId) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Get file from storage
      const filePath = `projects/${userId}/${projectId}/${fileName}`;
      const file = bucket.file(filePath);
      
      const [exists] = await file.exists();
      if (!exists) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      const [fileContent] = await file.download();
      
      // Find file metadata in project
      const projectData = doc.data();
      const fileData = projectData.files.find(f => f.path === fileName);
      
      res.json({
        file: {
          ...fileData,
          content: fileContent.toString()
        }
      });
    }
  } catch (error) {
    console.error('Error getting file:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

/**
 * Delete a file from a project
 * @route DELETE /api/projects/:id/files/:fileName
 */
router.delete('/:id/files/:fileName', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid || req.user.id;
    const projectId = req.params.id;
    const fileName = req.params.fileName;
    
    // Check if using Supabase
    const useSupabase = process.env.USE_SUPABASE === 'true';
    
    if (useSupabase) {
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
      
      // Delete file from storage
      const filePath = `${userId}/${projectId}/${fileName}`;
      const { error: storageError } = await supabase.storage
        .from('project-files')
        .remove([filePath]);
      
      if (storageError) {
        console.error('Error deleting file from storage:', storageError);
      }
      
      // Update project to remove file
      const files = existingProject.files.filter(f => f.path !== fileName);
      
      const { data, error } = await supabase
        .from('projects')
        .update({
          files,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      res.json({ success: true, project: data });
    } else {
      // First check if project exists and belongs to user
      const doc = await projectsRef.doc(projectId).get();
      
      if (!doc.exists || doc.data().userId !== userId) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      // Delete file from storage
      const filePath = `projects/${userId}/${projectId}/${fileName}`;
      try {
        await bucket.file(filePath).delete();
      } catch (storageError) {
        console.error('Error deleting file from storage:', storageError);
      }
      
      // Update project to remove file
      const projectData = doc.data();
      const files = projectData.files.filter(f => f.path !== fileName);
      
      await projectsRef.doc(projectId).update({
        files,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      const updatedDoc = await projectsRef.doc(projectId).get();
      
      res.json({
        success: true,
        project: { id: updatedDoc.id, ...updatedDoc.data() }
      });
    }
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;