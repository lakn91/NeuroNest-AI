/**
 * GitHub Integration Page
 * Page for managing GitHub integration
 */

import React from 'react';
import { FaGithub } from 'react-icons/fa';
import GitHubConnect from '../components/github/GitHubConnect';
import { GitHubProvider } from '../contexts/GitHubContext';

const GitHubIntegrationPage = () => {
  return (
    <GitHubProvider>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
          <FaGithub className="mr-3 text-gray-800" />
          GitHub Integration
        </h1>
        
        <p className="text-gray-600 mb-8">
          Connect your GitHub account to access and manage your repositories directly from NeuroNest-AI.
        </p>
        
        <GitHubConnect />
      </div>
    </GitHubProvider>
  );
};

export default GitHubIntegrationPage;