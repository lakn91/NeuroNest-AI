import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use(
  (config) => {
    // Get the token from localStorage
    const token = localStorage.getItem('auth_token');
    
    // If token exists, add it to the headers
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Get user settings for API configuration
    const userSettingsStr = localStorage.getItem('user_settings');
    if (userSettingsStr) {
      try {
        const userSettings = JSON.parse(userSettingsStr);
        
        // Add API provider if available
        if (userSettings.ai_provider) {
          config.headers['X-API-Provider'] = userSettings.ai_provider;
        }
        
        // Add API key if available
        if (userSettings.api_keys && userSettings.ai_provider) {
          const apiKey = userSettings.api_keys[userSettings.ai_provider];
          if (apiKey) {
            config.headers['X-API-Key'] = apiKey;
          }
        }
      } catch (error) {
        console.error('Error parsing user settings:', error);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle errors globally
    console.error('API Error:', error);

    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('auth_token');
      
      // Only redirect if we're in the browser
      if (typeof window !== 'undefined') {
        // Don't redirect if already on login page
        if (!window.location.pathname.includes('/auth/login')) {
          window.location.href = '/auth/login';
        }
      }
    }
    
    // Log specific error details
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Request error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (email: string, password: string, displayName?: string) => {
    return api.post('/auth/register', { email, password, display_name: displayName });
  },
  
  login: (email: string, password: string) => {
    return api.post('/auth/login', { email, password });
  },
  
  getCurrentUser: () => {
    return api.get('/auth/me');
  },
  
  updateProfile: (displayName?: string, photoURL?: string) => {
    return api.put('/auth/profile', { display_name: displayName, photo_url: photoURL });
  },
  
  changePassword: (currentPassword: string, newPassword: string) => {
    return api.put('/auth/change-password', { current_password: currentPassword, new_password: newPassword });
  },
  
  forgotPassword: (email: string) => {
    return api.post('/auth/forgot-password', { email });
  },
  
  logout: () => {
    return api.post('/auth/logout');
  }
};

// Agents API
export const agentsAPI = {
  getAgents: () => {
    return api.get('/agents');
  },
  
  getProviders: () => {
    return api.get('/agents/providers');
  },
  
  processMessage: (message: string, history?: any[], context?: any, files?: string[]) => {
    return api.post('/agents/process', { message, history, context, files });
  },
  
  generateCode: (requirements: string, language: string = 'javascript', framework?: string) => {
    const formData = new FormData();
    formData.append('requirements', requirements);
    formData.append('language', language);
    if (framework) {
      formData.append('framework', framework);
    }
    
    return api.post('/agents/generate-code', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/agents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
};

// Projects API
export const projectsAPI = {
  createProject: (title: string, description?: string, language?: string, framework?: string, files?: any) => {
    return api.post('/projects', { title, description, language, framework, files });
  },
  
  getProjects: () => {
    return api.get('/projects');
  },
  
  getProject: (projectId: string) => {
    return api.get(`/projects/${projectId}`);
  },
  
  updateProject: (projectId: string, data: any) => {
    return api.put(`/projects/${projectId}`, data);
  },
  
  deleteProject: (projectId: string) => {
    return api.delete(`/projects/${projectId}`);
  },
  
  addFile: (projectId: string, path: string, content: string, language: string = 'plaintext') => {
    return api.post(`/projects/${projectId}/files`, { path, content, language });
  },
  
  updateFile: (projectId: string, path: string, content: string, language?: string) => {
    return api.put(`/projects/${projectId}/files/${path}`, { content, language });
  },
  
  deleteFile: (projectId: string, path: string) => {
    return api.delete(`/projects/${projectId}/files/${path}`);
  }
};

// Execution API
export const executionAPI = {
  getEnvironments: () => {
    return api.get('/execution/environments');
  },
  
  executeProject: (projectId: string, command?: string, timeout?: number) => {
    return api.post('/execution/execute', { project_id: projectId, command, timeout });
  },
  
  stopExecution: (containerId: string) => {
    return api.delete(`/execution/containers/${containerId}`);
  },
  
  getLogs: (containerId: string) => {
    return api.get(`/execution/logs/${containerId}`);
  }
};

// Files API
export const filesAPI = {
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  getFile: (fileId: string) => {
    return api.get(`/files/${fileId}`);
  },
  
  deleteFile: (fileId: string) => {
    return api.delete(`/files/${fileId}`);
  },
  
  analyzeFile: (fileId: string) => {
    return api.post(`/files/analyze/${fileId}`);
  },
  
  processFile: (fileId: string, processingType: string = 'extract_text', options?: any) => {
    return api.post('/files/process', { file_id: fileId, processing_type: processingType, options });
  }
};

// Settings API
export const settingsAPI = {
  getSettings: () => {
    return api.get('/settings');
  },
  
  updateSettings: (settings: any) => {
    return api.put('/settings', settings);
  },
  
  getLanguages: () => {
    return api.get('/settings/languages');
  },
  
  getSpeechLanguages: () => {
    return api.get('/settings/speech/languages');
  },
  
  getProviders: () => {
    return api.get('/settings/providers');
  }
};

// Speech API
export const speechAPI = {
  recognizeSpeech: (audioBlob: Blob, language: string = 'en-US', dialect?: string) => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('language', language);
    if (dialect) {
      formData.append('dialect', dialect);
    }
    
    return api.post('/speech/recognize', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  enhanceAudio: (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    
    return api.post('/speech/enhance', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
};

// Helper function to process a message with context and API settings
export const processMessage = async (message: string, context: any = {}, history: any[] = []) => {
  try {
    // Make the API request
    const response = await agentsAPI.processMessage(message, history, context);
    
    return response.data;
  } catch (error) {
    console.error('Error processing message:', error);
    throw error;
  }
};

export default api;