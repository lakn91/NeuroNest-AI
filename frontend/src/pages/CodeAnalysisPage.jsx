/**
 * Code Analysis Page
 * Page for analyzing code
 */

import React, { useState } from 'react';
import { FaSearch, FaCode, FaFileCode, FaFolder } from 'react-icons/fa';
import CodeEditor from '../components/code/CodeEditor';
import { CodeAnalysisProvider } from '../contexts/CodeAnalysisContext';

const CodeAnalysisPage = () => {
  const [analysisType, setAnalysisType] = useState('code');
  const [filePath, setFilePath] = useState('');
  const [projectPath, setProjectPath] = useState('');
  const [includePatterns, setIncludePatterns] = useState('');
  
  return (
    <CodeAnalysisProvider>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
          <FaSearch className="mr-3 text-gray-800" />
          Code Analysis
        </h1>
        
        <p className="text-gray-600 mb-8">
          Analyze code for issues, bugs, and structure. Choose an analysis type to get started.
        </p>
        
        <div className="mb-8">
          <div className="flex space-x-4">
            <button
              onClick={() => setAnalysisType('code')}
              className={`px-6 py-3 rounded-lg flex items-center ${
                analysisType === 'code'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              <FaCode className="mr-2" />
              Code Snippet
            </button>
            
            <button
              onClick={() => setAnalysisType('file')}
              className={`px-6 py-3 rounded-lg flex items-center ${
                analysisType === 'file'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              <FaFileCode className="mr-2" />
              File
            </button>
            
            <button
              onClick={() => setAnalysisType('project')}
              className={`px-6 py-3 rounded-lg flex items-center ${
                analysisType === 'project'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              <FaFolder className="mr-2" />
              Project
            </button>
          </div>
        </div>
        
        {analysisType === 'code' && (
          <CodeEditor />
        )}
        
        {analysisType === 'file' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">File Analysis</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="filePath" className="block text-sm font-medium text-gray-700 mb-1">
                  File Path
                </label>
                <input
                  type="text"
                  id="filePath"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="/path/to/your/file.py"
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <button
                disabled={!filePath.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-400 flex items-center"
              >
                <FaSearch className="mr-2" />
                Analyze File
              </button>
            </div>
          </div>
        )}
        
        {analysisType === 'project' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Project Analysis</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="projectPath" className="block text-sm font-medium text-gray-700 mb-1">
                  Project Path
                </label>
                <input
                  type="text"
                  id="projectPath"
                  value={projectPath}
                  onChange={(e) => setProjectPath(e.target.value)}
                  placeholder="/path/to/your/project"
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <div>
                <label htmlFor="includePatterns" className="block text-sm font-medium text-gray-700 mb-1">
                  Include Patterns (optional, comma-separated)
                </label>
                <input
                  type="text"
                  id="includePatterns"
                  value={includePatterns}
                  onChange={(e) => setIncludePatterns(e.target.value)}
                  placeholder="*.py, *.js, src/**/*.ts"
                  className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              
              <button
                disabled={!projectPath.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-400 flex items-center"
              >
                <FaSearch className="mr-2" />
                Analyze Project
              </button>
            </div>
          </div>
        )}
      </div>
    </CodeAnalysisProvider>
  );
};

export default CodeAnalysisPage;