/**
 * LangChain Agent Page
 * Page for interacting with LangChain agents
 */

import React, { useState } from 'react';
import { FaCode, FaSearch, FaTools, FaRobot } from 'react-icons/fa';
import LangChainAgentWorkspace from '../components/agents/LangChainAgentWorkspace';
import { LangChainAgentProvider } from '../contexts/LangChainAgentContext';

const LangChainAgentPage = () => {
  const [selectedAgentType, setSelectedAgentType] = useState('developer');
  
  const agentTypes = [
    { id: 'developer', name: 'Developer Agent', icon: <FaCode />, description: 'Helps with coding tasks and project development' },
    { id: 'code_analyst', name: 'Code Analyst Agent', icon: <FaSearch />, description: 'Analyzes code for issues and provides recommendations' },
    { id: 'executor', name: 'Executor Agent', icon: <FaTools />, description: 'Executes code and manages runtime environments' }
  ];
  
  return (
    <LangChainAgentProvider>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">LangChain Agents</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <FaRobot className="mr-2 text-indigo-600" />
                Agent Types
              </h2>
              
              <div className="space-y-3">
                {agentTypes.map((agent) => (
                  <div
                    key={agent.id}
                    onClick={() => setSelectedAgentType(agent.id)}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedAgentType === agent.id
                        ? 'bg-indigo-100 border-l-4 border-indigo-600'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`text-lg ${selectedAgentType === agent.id ? 'text-indigo-600' : 'text-gray-600'}`}>
                        {agent.icon}
                      </div>
                      <div className="ml-3">
                        <h3 className={`font-medium ${selectedAgentType === agent.id ? 'text-indigo-800' : 'text-gray-800'}`}>
                          {agent.name}
                        </h3>
                        <p className="text-sm text-gray-600">{agent.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="md:col-span-3 h-[calc(100vh-12rem)]">
            <LangChainAgentWorkspace agentType={selectedAgentType} />
          </div>
        </div>
      </div>
    </LangChainAgentProvider>
  );
};

export default LangChainAgentPage;