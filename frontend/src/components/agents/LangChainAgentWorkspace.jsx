/**
 * LangChain Agent Workspace Component
 * Provides an interface for interacting with LangChain AI agents
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLangChainAgent } from '../../contexts/LangChainAgentContext';
import { FaRobot, FaUser, FaSpinner, FaTrash, FaCode, FaGithub, FaTools } from 'react-icons/fa';

const LangChainAgentWorkspace = ({ agentType = 'developer' }) => {
  const { 
    createAgent, 
    queryAgent, 
    getAgentMemory, 
    clearAgentMemory, 
    deleteAgent,
    loading,
    agentId,
    messages
  } = useLangChainAgent();
  
  const [input, setInput] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Create agent on mount
  useEffect(() => {
    const initAgent = async () => {
      await createAgent(agentType, localStorage.getItem('github_token') || null);
    };
    
    if (!agentId) {
      initAgent();
    }
    
    return () => {
      if (agentId) {
        // Don't delete the agent on unmount, just keep it for the session
      }
    };
  }, [createAgent, agentType, agentId]);
  
  // Load agent memory when agent changes
  useEffect(() => {
    if (agentId) {
      getAgentMemory(agentId);
    }
  }, [agentId, getAgentMemory]);
  
  // Scroll to bottom of messages when they change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Handle sending a message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!agentId || !input.trim()) return;
    
    const userMessage = input;
    setInput('');
    
    await queryAgent(agentId, userMessage);
  };
  
  // Handle connecting GitHub
  const handleConnectGitHub = async () => {
    if (!githubToken.trim()) return;
    
    localStorage.setItem('github_token', githubToken);
    
    // Recreate the agent with the GitHub token
    await deleteAgent(agentId);
    await createAgent(agentType, githubToken);
    
    setGithubToken('');
    setShowTokenInput(false);
  };
  
  // Handle clearing memory
  const handleClearMemory = async () => {
    if (!agentId) return;
    
    await clearAgentMemory(agentId);
  };
  
  // Get agent icon based on type
  const getAgentIcon = () => {
    switch (agentType) {
      case 'developer':
        return <FaCode className="text-indigo-600" />;
      case 'code_analyst':
        return <FaCode className="text-green-600" />;
      case 'executor':
        return <FaTools className="text-orange-600" />;
      default:
        return <FaRobot className="text-indigo-600" />;
    }
  };
  
  // Get agent name based on type
  const getAgentName = () => {
    switch (agentType) {
      case 'developer':
        return 'Developer Agent';
      case 'code_analyst':
        return 'Code Analyst Agent';
      case 'executor':
        return 'Executor Agent';
      default:
        return 'AI Agent';
    }
  };
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          {getAgentIcon()}
          <h2 className="text-xl font-semibold text-gray-800 ml-2">
            {getAgentName()} (LangChain)
          </h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowTokenInput(!showTokenInput)}
            className="px-3 py-1 bg-gray-800 text-white rounded text-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center"
          >
            <FaGithub className="mr-1" />
            GitHub
          </button>
          
          <button
            onClick={handleClearMemory}
            disabled={loading || !agentId}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-red-400 flex items-center"
          >
            <FaTrash className="mr-1" />
            Clear Memory
          </button>
        </div>
      </div>
      
      {showTokenInput && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-600 mb-2">
            Connect your GitHub account to enable repository access:
          </p>
          <div className="flex">
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="GitHub personal access token"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-l text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleConnectGitHub}
              disabled={!githubToken.trim() || loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-r text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-400 flex items-center"
            >
              Connect
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Your token is stored locally and used only for GitHub operations.
          </p>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {messages.length > 0 ? (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-3/4 rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  <div className="flex items-center mb-1">
                    {message.role === 'user' ? (
                      <>
                        <span className="font-medium">You</span>
                        <FaUser className="ml-1" size={12} />
                      </>
                    ) : (
                      <>
                        {getAgentIcon()}
                        <span className="font-medium ml-1">{getAgentName()}</span>
                      </>
                    )}
                  </div>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <FaRobot className="text-5xl mb-4 text-gray-400" />
            <p>No messages yet. Start a conversation with the agent.</p>
          </div>
        )}
      </div>
      
      <div className="p-4 border-t border-gray-200">
        <form onSubmit={handleSendMessage}>
          <div className="flex">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={loading || !agentId}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-l focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={loading || !agentId || !input.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-r hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-400 flex items-center"
            >
              {loading ? (
                <FaSpinner className="animate-spin" />
              ) : (
                'Send'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LangChainAgentWorkspace;