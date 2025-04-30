import React, { useState, useEffect } from 'react';
import { useRuntime } from '../contexts/RuntimeContext';
import { useProject } from '../contexts/ProjectContext';
import { useAuth } from '../contexts/AuthContext';
import RuntimeEngine from '../components/runtime/RuntimeEngine';
import PreviewEnvironment from '../components/runtime/PreviewEnvironment';
import { Box, Container, Typography, Tabs, Tab, Button, CircularProgress, Alert } from '@mui/material';

const RuntimePage = () => {
  const { user } = useAuth();
  const { projects, getProjects } = useProject();
  const { 
    runtimes, 
    runningProjects, 
    createRuntime, 
    startRuntime, 
    stopRuntime, 
    runProject, 
    stopProject, 
    getProjectStatus, 
    getProjectPreviewUrl,
    listRunningProjects
  } = useRuntime();
  
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  
  useEffect(() => {
    if (user) {
      setLoading(true);
      Promise.all([
        getProjects(),
        listRunningProjects()
      ])
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [user]);
  
  useEffect(() => {
    if (selectedProject && runningProjects[selectedProject.id]) {
      getProjectPreviewUrl(selectedProject.id)
        .then(url => setPreviewUrl(url))
        .catch(err => console.error('Error getting preview URL:', err));
    } else {
      setPreviewUrl('');
    }
  }, [selectedProject, runningProjects]);
  
  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };
  
  const handleProjectSelect = (project) => {
    setSelectedProject(project);
  };
  
  const handleRunProject = async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await runProject(selectedProject.id);
      const url = await getProjectPreviewUrl(selectedProject.id);
      setPreviewUrl(url);
    } catch (err) {
      setError(`Failed to run project: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleStopProject = async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await stopProject(selectedProject.id);
      setPreviewUrl('');
    } catch (err) {
      setError(`Failed to stop project: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  if (!user) {
    return (
      <Container>
        <Typography variant="h5" sx={{ mt: 4, mb: 2 }}>
          Please log in to access the Runtime environment
        </Typography>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="xl">
      <Typography variant="h4" sx={{ mt: 4, mb: 2 }}>
        Runtime & Preview Environment
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Tabs value={selectedTab} onChange={handleTabChange} sx={{ mb: 2 }}>
        <Tab label="Runtime Engine" />
        <Tab label="Preview Environment" />
      </Tabs>
      
      {selectedTab === 0 && (
        <Box>
          <RuntimeEngine 
            projects={projects}
            runtimes={runtimes}
            runningProjects={runningProjects}
            onSelectProject={handleProjectSelect}
            selectedProject={selectedProject}
            onRunProject={handleRunProject}
            onStopProject={handleStopProject}
            loading={loading}
          />
        </Box>
      )}
      
      {selectedTab === 1 && (
        <Box>
          <PreviewEnvironment 
            previewUrl={previewUrl}
            selectedProject={selectedProject}
            isRunning={selectedProject && runningProjects[selectedProject.id]}
          />
        </Box>
      )}
    </Container>
  );
};

export default RuntimePage;