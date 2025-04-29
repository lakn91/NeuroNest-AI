/**
 * PreviewEnvironment Component
 * Provides a preview environment for web projects
 */

import React, { useState, useEffect, useRef } from 'react';
import { useRuntime } from '../../contexts/RuntimeContext';
import { Box, Button, Typography, Paper, CircularProgress, Divider, IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DevicesIcon from '@mui/icons-material/Devices';
import PhoneAndroidIcon from '@mui/icons-material/PhoneAndroid';
import TabletIcon from '@mui/icons-material/Tablet';
import LaptopIcon from '@mui/icons-material/Laptop';
import DesktopWindowsIcon from '@mui/icons-material/DesktopWindows';

/**
 * Preview Environment Component
 * @param {Object} props - Component props
 * @param {Object} props.project - Project to preview
 * @returns {JSX.Element} Preview environment component
 */
const PreviewEnvironment = ({ project }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewportSize, setViewportSize] = useState('desktop');
  const iframeRef = useRef(null);

  const { getProjectPreviewUrl } = useRuntime();

  // Get preview URL when project changes
  useEffect(() => {
    if (project) {
      loadPreview();
    }
  }, [project]);

  /**
   * Load the preview
   */
  const loadPreview = async () => {
    setIsLoading(true);
    
    try {
      const url = await getProjectPreviewUrl(project.id);
      setPreviewUrl(url);
    } catch (error) {
      console.error('Failed to get preview URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle refresh button click
   */
  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  /**
   * Handle fullscreen toggle
   */
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  /**
   * Handle opening preview in new tab
   */
  const openInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  /**
   * Get viewport dimensions based on selected size
   */
  const getViewportDimensions = () => {
    switch (viewportSize) {
      case 'mobile':
        return { width: '375px', height: '667px' };
      case 'tablet':
        return { width: '768px', height: '1024px' };
      case 'laptop':
        return { width: '1366px', height: '768px' };
      case 'desktop':
        return { width: '100%', height: '100%' };
      default:
        return { width: '100%', height: '100%' };
    }
  };

  /**
   * Handle iframe load event
   */
  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  if (!project) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">No project selected</Typography>
        <Typography variant="body2">Select a project to preview</Typography>
      </Box>
    );
  }

  // Check if project is a web project
  const isWebProject = project.type === 'web' || 
    (project.files && project.files.some(file => file.name === 'index.html'));

  if (!isWebProject) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6">Preview not available</Typography>
        <Typography variant="body2">
          Preview is only available for web projects. Use the Runtime Engine to run this project.
        </Typography>
      </Box>
    );
  }

  const viewportDimensions = getViewportDimensions();

  return (
    <Box 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        ...(isFullscreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1300,
          bgcolor: 'background.paper',
        })
      }}
    >
      <Paper sx={{ p: 1, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          {project.name} Preview
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tooltip title="Mobile View">
            <IconButton 
              size="small" 
              onClick={() => setViewportSize('mobile')}
              color={viewportSize === 'mobile' ? 'primary' : 'default'}
            >
              <PhoneAndroidIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Tablet View">
            <IconButton 
              size="small" 
              onClick={() => setViewportSize('tablet')}
              color={viewportSize === 'tablet' ? 'primary' : 'default'}
            >
              <TabletIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Laptop View">
            <IconButton 
              size="small" 
              onClick={() => setViewportSize('laptop')}
              color={viewportSize === 'laptop' ? 'primary' : 'default'}
            >
              <LaptopIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Desktop View">
            <IconButton 
              size="small" 
              onClick={() => setViewportSize('desktop')}
              color={viewportSize === 'desktop' ? 'primary' : 'default'}
            >
              <DesktopWindowsIcon />
            </IconButton>
          </Tooltip>
          
          <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
          
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={handleRefresh}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Open in New Tab">
            <IconButton size="small" onClick={openInNewTab}>
              <OpenInNewIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            <IconButton size="small" onClick={toggleFullscreen}>
              {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Paper>
      
      <Box 
        sx={{ 
          flex: 1, 
          display: 'flex', 
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'auto',
          bgcolor: '#f5f5f5',
          p: viewportSize !== 'desktop' ? 2 : 0,
        }}
      >
        {isLoading && (
          <Box sx={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CircularProgress size={40} />
            <Typography variant="body2" sx={{ mt: 2 }}>Loading preview...</Typography>
          </Box>
        )}
        
        {previewUrl ? (
          <Box 
            sx={{ 
              width: viewportDimensions.width,
              height: viewportDimensions.height,
              border: viewportSize !== 'desktop' ? '1px solid #ddd' : 'none',
              borderRadius: viewportSize !== 'desktop' ? 2 : 0,
              overflow: 'hidden',
              boxShadow: viewportSize !== 'desktop' ? 3 : 0,
              transition: 'width 0.3s, height 0.3s',
            }}
          >
            <iframe
              ref={iframeRef}
              src={previewUrl}
              title={`${project.name} Preview`}
              width="100%"
              height="100%"
              style={{ border: 'none' }}
              onLoad={handleIframeLoad}
              sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
            />
          </Box>
        ) : (
          <Typography variant="body1" color="text.secondary">
            Preview not available. Make sure the project is running.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default PreviewEnvironment;