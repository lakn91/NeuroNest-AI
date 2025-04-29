/**
 * Runtime Preview Component
 * Provides a preview of the running application
 */

import React, { useState, useEffect } from 'react';
import { useRuntime } from '../../contexts/RuntimeContext';

const RuntimePreview = ({ className = '' }) => {
  const { 
    activeRuntime, 
    runtimeStatus, 
    previewUrl, 
    runtimeLogs,
    startRuntime, 
    stopRuntime 
  } = useRuntime();
  
  const [activeTab, setActiveTab] = useState('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle runtime start
  const handleStartRuntime = async () => {
    if (activeRuntime) {
      await startRuntime(activeRuntime.id);
    }
  };

  // Handle runtime stop
  const handleStopRuntime = async () => {
    if (activeRuntime) {
      await stopRuntime(activeRuntime.id);
    }
  };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`flex flex-col border border-gray-300 rounded-lg overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 border-b border-gray-300">
        <div className="flex items-center space-x-2">
          <h3 className="text-sm font-medium text-gray-700">
            {activeRuntime ? `Runtime: ${activeRuntime.type}` : 'Runtime Preview'}
          </h3>
          
          {activeRuntime && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              runtimeStatus === 'running' ? 'bg-green-100 text-green-800' :
              runtimeStatus === 'starting' ? 'bg-yellow-100 text-yellow-800' :
              runtimeStatus === 'stopping' ? 'bg-orange-100 text-orange-800' :
              runtimeStatus === 'error' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {runtimeStatus.charAt(0).toUpperCase() + runtimeStatus.slice(1)}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          {activeRuntime && (
            <>
              {runtimeStatus === 'idle' || runtimeStatus === 'error' ? (
                <button
                  type="button"
                  onClick={handleStartRuntime}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  disabled={runtimeStatus === 'starting' || runtimeStatus === 'stopping'}
                >
                  Start
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStopRuntime}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  disabled={runtimeStatus === 'starting' || runtimeStatus === 'stopping'}
                >
                  Stop
                </button>
              )}
            </>
          )}
          
          <button
            type="button"
            onClick={toggleFullscreen}
            className="inline-flex items-center p-1 text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
              </svg>
            )}
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b border-gray-300">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'preview' 
              ? 'text-indigo-600 border-b-2 border-indigo-600' 
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('preview')}
        >
          Preview
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'logs' 
              ? 'text-indigo-600 border-b-2 border-indigo-600' 
              : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
          onClick={() => setActiveTab('logs')}
        >
          Logs
        </button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'preview' ? (
          previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full border-0"
              title="Runtime Preview"
              sandbox="allow-forms allow-modals allow-orientation-lock allow-pointer-lock allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-50">
              <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No preview available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {activeRuntime 
                    ? 'Start the runtime to see a preview of your application.' 
                    : 'Select a runtime to preview your application.'}
                </p>
                {activeRuntime && runtimeStatus === 'idle' && (
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={handleStartRuntime}
                      className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Start Runtime
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          <div className="h-full p-4 overflow-auto bg-gray-900 text-gray-100 font-mono text-sm">
            {runtimeLogs.length > 0 ? (
              runtimeLogs.map((log, index) => (
                <div key={index} className={`mb-1 ${
                  log.level === 'error' ? 'text-red-400' :
                  log.level === 'warning' ? 'text-yellow-400' :
                  log.level === 'info' ? 'text-blue-400' :
                  'text-gray-300'
                }`}>
                  <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                  <span className="uppercase font-bold">{log.level}:</span>{' '}
                  {log.message}
                </div>
              ))
            ) : (
              <div className="text-gray-500">No logs available.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default RuntimePreview;