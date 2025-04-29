/**
 * GitHub Connect Component
 * Allows users to connect their GitHub account and manage repositories
 */

import React, { useState, useEffect } from 'react';
import { useGitHub } from '../../contexts/GitHubContext';
import { FaGithub, FaSpinner, FaCheck, FaTimes, FaCodeBranch, FaDownload, FaUpload } from 'react-icons/fa';

const GitHubConnect = () => {
  const { 
    isConnected, 
    user, 
    repositories, 
    connect, 
    disconnect, 
    fetchRepositories,
    cloneRepository,
    pullRepository,
    pushRepository,
    createBranch,
    loading
  } = useGitHub();
  
  const [token, setToken] = useState('');
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [commitMessage, setCommitMessage] = useState('');
  const [branchName, setBranchName] = useState('');
  const [fromBranch, setFromBranch] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  
  useEffect(() => {
    if (isConnected) {
      fetchRepositories();
    }
  }, [isConnected, fetchRepositories]);
  
  const handleConnect = async () => {
    if (token.trim()) {
      await connect(token);
      setToken('');
      setShowTokenInput(false);
    }
  };
  
  const handleDisconnect = async () => {
    await disconnect();
    setSelectedRepo(null);
  };
  
  const handleSelectRepo = (repo) => {
    setSelectedRepo(repo);
  };
  
  const handleClone = async () => {
    if (selectedRepo) {
      await cloneRepository(selectedRepo.full_name);
    }
  };
  
  const handlePull = async () => {
    if (selectedRepo) {
      await pullRepository(selectedRepo.full_name);
    }
  };
  
  const handlePush = async () => {
    if (selectedRepo && commitMessage.trim()) {
      await pushRepository(selectedRepo.full_name, commitMessage);
      setCommitMessage('');
    }
  };
  
  const handleCreateBranch = async () => {
    if (selectedRepo && branchName.trim()) {
      await createBranch(selectedRepo.full_name, branchName, fromBranch || undefined);
      setBranchName('');
      setFromBranch('');
    }
  };
  
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <FaGithub className="mr-2" /> GitHub Integration
        </h2>
        
        {isConnected ? (
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 flex items-center"
          >
            <FaTimes className="mr-2" /> Disconnect
          </button>
        ) : (
          <button
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 flex items-center"
          >
            <FaGithub className="mr-2" /> Connect GitHub
          </button>
        )}
      </div>
      
      {showTokenInput && !isConnected && (
        <div className="mb-6 p-4 border border-gray-300 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">
            Enter your GitHub personal access token with repo scope:
          </p>
          <div className="flex">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="GitHub token"
            />
            <button
              onClick={handleConnect}
              disabled={!token.trim() || loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-r hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center"
            >
              {loading ? <FaSpinner className="animate-spin mr-2" /> : <FaCheck className="mr-2" />}
              Connect
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Your token is only stored in your browser and used to authenticate with GitHub.
          </p>
        </div>
      )}
      
      {isConnected && user && (
        <div className="mb-6">
          <div className="flex items-center">
            <img src={user.avatar_url} alt={user.login} className="w-10 h-10 rounded-full mr-3" />
            <div>
              <h3 className="font-medium text-gray-800">{user.name || user.login}</h3>
              <p className="text-sm text-gray-600">{user.email}</p>
            </div>
          </div>
        </div>
      )}
      
      {isConnected && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 border border-gray-300 rounded-lg p-4 h-96 overflow-auto">
            <h3 className="font-medium text-gray-800 mb-3">Repositories</h3>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <FaSpinner className="animate-spin text-indigo-600 text-2xl" />
              </div>
            ) : repositories && repositories.length > 0 ? (
              <ul className="space-y-2">
                {repositories.map((repo) => (
                  <li 
                    key={repo.id}
                    onClick={() => handleSelectRepo(repo)}
                    className={`p-2 rounded cursor-pointer hover:bg-gray-100 ${
                      selectedRepo && selectedRepo.id === repo.id ? 'bg-indigo-100' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-800">{repo.name}</div>
                    <div className="text-xs text-gray-600">{repo.full_name}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-500 text-center mt-10">
                No repositories found
              </div>
            )}
          </div>
          
          <div className="md:col-span-2 border border-gray-300 rounded-lg p-4">
            {selectedRepo ? (
              <div>
                <h3 className="font-medium text-gray-800 mb-3">{selectedRepo.full_name}</h3>
                <p className="text-sm text-gray-600 mb-4">
                  {selectedRepo.description || 'No description available'}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="text-sm">
                    <div><span className="font-medium">Default Branch:</span> {selectedRepo.default_branch}</div>
                    <div><span className="font-medium">Language:</span> {selectedRepo.language || 'Not specified'}</div>
                    <div><span className="font-medium">Stars:</span> {selectedRepo.stargazers_count}</div>
                  </div>
                  <div className="text-sm">
                    <div><span className="font-medium">Forks:</span> {selectedRepo.forks_count}</div>
                    <div><span className="font-medium">Private:</span> {selectedRepo.private ? 'Yes' : 'No'}</div>
                    <div>
                      <span className="font-medium">Updated:</span>{' '}
                      {new Date(selectedRepo.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex space-x-2">
                    <button
                      onClick={handleClone}
                      disabled={loading}
                      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-400 flex items-center"
                    >
                      <FaDownload className="mr-2" /> Clone Repository
                    </button>
                    <button
                      onClick={handlePull}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-green-400 flex items-center"
                    >
                      <FaDownload className="mr-2" /> Pull Changes
                    </button>
                  </div>
                  
                  <div className="border-t border-gray-300 pt-4">
                    <h4 className="font-medium text-gray-800 mb-2">Push Changes</h4>
                    <div className="flex">
                      <input
                        type="text"
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Commit message"
                      />
                      <button
                        onClick={handlePush}
                        disabled={!commitMessage.trim() || loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-r hover:bg-blue-700 disabled:bg-blue-400 flex items-center"
                      >
                        <FaUpload className="mr-2" /> Push
                      </button>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-300 pt-4">
                    <h4 className="font-medium text-gray-800 mb-2">Create Branch</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="New branch name"
                      />
                      <input
                        type="text"
                        value={fromBranch}
                        onChange={(e) => setFromBranch(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="From branch (optional, defaults to current)"
                      />
                      <button
                        onClick={handleCreateBranch}
                        disabled={!branchName.trim() || loading}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-purple-400 flex items-center justify-center"
                      >
                        <FaCodeBranch className="mr-2" /> Create Branch
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <FaGithub className="text-gray-400 text-5xl mb-4" />
                <p className="text-gray-500">Select a repository to view details</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GitHubConnect;