/**
 * Agent Workflow Component
 * Visualizes the agent workflow and task processing
 */

import React, { useState, useEffect } from 'react';
import { useAgent } from '../../contexts/AgentContext';

const AgentWorkflow = ({ className = '' }) => {
  const { 
    agents, 
    currentTask, 
    taskQueue, 
    taskHistory, 
    agentOutput,
    orchestratorBusy
  } = useAgent();
  
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showTaskHistory, setShowTaskHistory] = useState(false);

  // Get agent status class
  const getAgentStatusClass = (agent) => {
    if (agent.busy) {
      return 'bg-yellow-100 border-yellow-500 text-yellow-800';
    } else if (agent.active) {
      return 'bg-green-100 border-green-500 text-green-800';
    } else {
      return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  // Get task status class
  const getTaskStatusClass = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'queued':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  return (
    <div className={`flex flex-col border border-gray-300 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-gray-100 border-b border-gray-300">
        <h3 className="text-sm font-medium text-gray-700">Agent Workflow</h3>
      </div>
      
      {/* Workflow Visualization */}
      <div className="flex-1 p-4 overflow-auto">
        <div className="flex flex-col space-y-4">
          {/* Agents */}
          <div className="grid grid-cols-2 gap-4">
            {Object.values(agents).map((agent) => (
              <div
                key={agent.id}
                className={`p-3 border-2 rounded-lg cursor-pointer transition-colors duration-200 ${
                  selectedAgent === agent.id ? 'ring-2 ring-indigo-500' : ''
                } ${getAgentStatusClass(agent)}`}
                onClick={() => setSelectedAgent(agent.id === selectedAgent ? null : agent.id)}
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">{agent.name}</h4>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    agent.busy ? 'bg-yellow-200 text-yellow-800' : 
                    agent.active ? 'bg-green-200 text-green-800' : 
                    'bg-gray-200 text-gray-800'
                  }`}>
                    {agent.busy ? 'Busy' : agent.active ? 'Active' : 'Idle'}
                  </span>
                </div>
                
                {selectedAgent === agent.id && agentOutput[agent.id] && agentOutput[agent.id].length > 0 && (
                  <div className="mt-2 p-2 bg-white rounded border border-gray-300 text-xs font-mono max-h-32 overflow-auto">
                    {agentOutput[agent.id].map((output, index) => (
                      <div key={index} className="mb-1">
                        <span className="text-gray-500">[{formatTime(output.timestamp)}]</span> {output.content}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Current Task */}
          {currentTask && (
            <div className="p-4 border border-yellow-300 bg-yellow-50 rounded-lg">
              <h4 className="text-sm font-medium text-yellow-800">Current Task</h4>
              <div className="mt-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{currentTask.description}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800`}>
                    Processing
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Type: {currentTask.type} | Priority: {currentTask.priority} | Started: {formatTime(currentTask.startedAt)}
                </div>
              </div>
            </div>
          )}
          
          {/* Task Queue */}
          {taskQueue.length > 0 && (
            <div className="p-4 border border-gray-300 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700">Task Queue ({taskQueue.length})</h4>
              <div className="mt-2 space-y-2">
                {taskQueue.map((task) => (
                  <div key={task.id} className="p-2 bg-white border border-gray-300 rounded text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{task.description}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTaskStatusClass(task.status)}`}>
                        {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Type: {task.type} | Priority: {task.priority} | Created: {formatTime(task.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Task History Toggle */}
          <button
            type="button"
            className="flex items-center justify-between px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            onClick={() => setShowTaskHistory(!showTaskHistory)}
          >
            <span>Task History ({taskHistory.length})</span>
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${showTaskHistory ? 'transform rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          
          {/* Task History */}
          {showTaskHistory && taskHistory.length > 0 && (
            <div className="p-4 border border-gray-300 bg-gray-50 rounded-lg">
              <div className="mt-2 space-y-2">
                {taskHistory.map((task) => (
                  <div key={task.id} className="p-2 bg-white border border-gray-300 rounded text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{task.description}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTaskStatusClass(task.status)}`}>
                        {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      Type: {task.type} | Completed: {formatTime(task.completedAt)}
                    </div>
                    {task.error && (
                      <div className="mt-1 p-1 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        Error: {task.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentWorkflow;