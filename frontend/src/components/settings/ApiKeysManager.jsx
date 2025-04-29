/**
 * API Keys Manager Component
 * Allows users to manage their AI provider API keys
 */

import React, { useState, useEffect } from 'react';
import { userService, authService } from '../../services/firebase';

const ApiKeysManager = () => {
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    google: '',
    anthropic: '',
    huggingface: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  /**
   * Load user's API keys on component mount
   */
  useEffect(() => {
    const loadApiKeys = async () => {
      const currentUser = authService.getCurrentUser();
      
      if (!currentUser) {
        setLoading(false);
        return;
      }
      
      try {
        const { data, error } = await userService.getApiKeys(currentUser.uid);
        
        if (error) {
          setError('Failed to load API keys');
          setLoading(false);
          return;
        }
        
        // Set API keys with defaults for any missing keys
        setApiKeys({
          openai: data.openai || '',
          google: data.google || '',
          anthropic: data.anthropic || '',
          huggingface: data.huggingface || '',
          ...data
        });
        
        setLoading(false);
      } catch (err) {
        setError('An error occurred while loading API keys');
        setLoading(false);
      }
    };
    
    loadApiKeys();
  }, []);

  /**
   * Handle input change for API key fields
   * @param {Event} e - Input change event
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setApiKeys((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Save API keys to user profile
   * @param {Event} e - Form submit event
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    
    const currentUser = authService.getCurrentUser();
    
    if (!currentUser) {
      setError('You must be logged in to save API keys');
      setSaving(false);
      return;
    }
    
    try {
      const { error } = await userService.updateApiKeys(currentUser.uid, apiKeys);
      
      if (error) {
        setError('Failed to save API keys');
        setSaving(false);
        return;
      }
      
      setSuccess('API keys saved successfully');
      setSaving(false);
    } catch (err) {
      setError('An error occurred while saving API keys');
      setSaving(false);
    }
  };

  /**
   * Clear a specific API key
   * @param {string} provider - Provider name
   */
  const clearApiKey = (provider) => {
    setApiKeys((prev) => ({
      ...prev,
      [provider]: ''
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">AI Provider API Keys</h2>
      <p className="text-gray-600 mb-6">
        Add your API keys to use your own AI provider accounts. Your keys are encrypted and stored securely.
      </p>
      
      {error && (
        <div className="p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg" role="alert">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* OpenAI API Key */}
          <div>
            <label htmlFor="openai" className="block text-sm font-medium text-gray-700">
              OpenAI API Key
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="password"
                name="openai"
                id="openai"
                value={apiKeys.openai}
                onChange={handleInputChange}
                className="block w-full pr-10 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="sk-..."
              />
              {apiKeys.openai && (
                <button
                  type="button"
                  onClick={() => clearApiKey('openai')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">OpenAI</a>
            </p>
          </div>
          
          {/* Google AI API Key */}
          <div>
            <label htmlFor="google" className="block text-sm font-medium text-gray-700">
              Google AI API Key (for Gemini)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="password"
                name="google"
                id="google"
                value={apiKeys.google}
                onChange={handleInputChange}
                className="block w-full pr-10 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="AIza..."
              />
              {apiKeys.google && (
                <button
                  type="button"
                  onClick={() => clearApiKey('google')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Get your API key from <a href="https://ai.google.dev/" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">Google AI Studio</a>
            </p>
          </div>
          
          {/* Anthropic API Key */}
          <div>
            <label htmlFor="anthropic" className="block text-sm font-medium text-gray-700">
              Anthropic API Key (for Claude)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="password"
                name="anthropic"
                id="anthropic"
                value={apiKeys.anthropic}
                onChange={handleInputChange}
                className="block w-full pr-10 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="sk-ant-..."
              />
              {apiKeys.anthropic && (
                <button
                  type="button"
                  onClick={() => clearApiKey('anthropic')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Get your API key from <a href="https://console.anthropic.com/keys" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">Anthropic</a>
            </p>
          </div>
          
          {/* HuggingFace API Key */}
          <div>
            <label htmlFor="huggingface" className="block text-sm font-medium text-gray-700">
              HuggingFace API Key
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="password"
                name="huggingface"
                id="huggingface"
                value={apiKeys.huggingface}
                onChange={handleInputChange}
                className="block w-full pr-10 border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="hf_..."
              />
              {apiKeys.huggingface && (
                <button
                  type="button"
                  onClick={() => clearApiKey('huggingface')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Get your API key from <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">HuggingFace</a>
            </p>
          </div>
        </div>
        
        <div className="mt-8">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save API Keys'}
          </button>
        </div>
      </form>
      
      <div className="mt-6 border-t border-gray-200 pt-4">
        <h3 className="text-lg font-medium text-gray-900">Security Information</h3>
        <p className="mt-2 text-sm text-gray-500">
          Your API keys are encrypted before being stored in our database. We never use your keys for any purpose other than making requests to the respective AI providers on your behalf. You can remove your keys at any time.
        </p>
      </div>
    </div>
  );
};

export default ApiKeysManager;