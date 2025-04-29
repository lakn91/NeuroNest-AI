/**
 * Sandbox Environment Component
 * Provides a secure environment for executing code
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSandbox } from '../../contexts/SandboxContext';
import { FaPlay, FaStop, FaSpinner, FaDownload, FaUpload, FaTrash, FaPlus } from 'react-icons/fa';
import CodeEditor from '../code/CodeEditor';

const SandboxEnvironment = ({ language = 'python' }) => {
  const { 
    createSession, 
    executeCode, 
    installPackage, 
    uploadFile,
    listFiles,
    readFile,
    closeSession,
    loading,
    output,
    error,
    sessionId
  } = useSandbox();
  
  const [code, setCode] = useState('');
  const [packageName, setPackageName] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [executing, setExecuting] = useState(false);
  const outputRef = useRef(null);
  
  // Create session on mount
  useEffect(() => {
    const initSession = async () => {
      await createSession(language);
    };
    
    if (!sessionId) {
      initSession();
    }
    
    return () => {
      if (sessionId) {
        closeSession(sessionId);
      }
    };
  }, [createSession, closeSession, language, sessionId]);
  
  // Scroll to bottom of output when it changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);
  
  // Refresh file list when session changes
  useEffect(() => {
    if (sessionId) {
      handleListFiles();
    }
  }, [sessionId]);
  
  // Handle code execution
  const handleExecute = async () => {
    if (!sessionId || !code.trim()) return;
    
    setExecuting(true);
    
    try {
      if (language === 'python') {
        await executeCode(sessionId, code);
      } else if (language === 'javascript') {
        await executeCode(sessionId, code, 'javascript');
      }
    } finally {
      setExecuting(false);
    }
  };
  
  // Handle package installation
  const handleInstallPackage = async () => {
    if (!sessionId || !packageName.trim()) return;
    
    await installPackage(sessionId, packageName);
    setPackageName('');
  };
  
  // Handle file upload
  const handleUploadFile = async () => {
    if (!sessionId || !fileName.trim() || !fileContent.trim()) return;
    
    await uploadFile(sessionId, fileName, fileContent);
    setFileName('');
    setFileContent('');
    handleListFiles();
  };
  
  // Handle file list refresh
  const handleListFiles = async () => {
    if (!sessionId) return;
    
    const result = await listFiles(sessionId);
    if (result && result.files) {
      setFiles(result.files);
    }
  };
  
  // Handle file selection
  const handleSelectFile = async (file) => {
    if (!sessionId) return;
    
    setSelectedFile(file);
    
    const result = await readFile(sessionId, file.path);
    if (result && result.content) {
      setCode(result.content);
    }
  };
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">
          {language === 'python' ? 'Python' : 'JavaScript'} Sandbox Environment
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Execute code in a secure sandbox environment
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4">
        <div className="md:col-span-1 space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Files</h3>
            
            <div className="space-y-2 mb-4">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="File name (e.g., script.py)"
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                placeholder="File content"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              
              <button
                onClick={handleUploadFile}
                disabled={loading || !fileName.trim() || !fileContent.trim()}
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-400 flex items-center justify-center"
              >
                {loading ? (
                  <FaSpinner className="animate-spin mr-2" />
                ) : (
                  <FaUpload className="mr-2" />
                )}
                Upload File
              </button>
            </div>
            
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-800">File Explorer</h4>
                <button
                  onClick={handleListFiles}
                  className="text-indigo-600 hover:text-indigo-800 focus:outline-none"
                >
                  <FaDownload size={14} />
                </button>
              </div>
              
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded">
                {files.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {files.map((file, index) => (
                      <li
                        key={index}
                        onClick={() => handleSelectFile(file)}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                          selectedFile && selectedFile.path === file.path ? 'bg-indigo-50' : ''
                        }`}
                      >
                        {file.name}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-3 py-2 text-sm text-gray-500 text-center">
                    No files found
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Install Package</h3>
            
            <div className="flex">
              <input
                type="text"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                placeholder={language === 'python' ? 'e.g., numpy' : 'e.g., lodash'}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              
              <button
                onClick={handleInstallPackage}
                disabled={loading || !packageName.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-r text-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:bg-green-400 flex items-center"
              >
                {loading ? (
                  <FaSpinner className="animate-spin mr-1" />
                ) : (
                  <FaPlus className="mr-1" />
                )}
                Install
              </button>
            </div>
          </div>
        </div>
        
        <div className="md:col-span-3 space-y-4">
          <CodeEditor
            code={code}
            language={language}
            onChange={setCode}
            height="300px"
            showAnalysis={false}
          />
          
          <div className="flex justify-between items-center">
            <button
              onClick={handleExecute}
              disabled={executing || !sessionId || !code.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-400 flex items-center"
            >
              {executing ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Executing...
                </>
              ) : (
                <>
                  <FaPlay className="mr-2" />
                  Run Code
                </>
              )}
            </button>
            
            <button
              onClick={() => closeSession(sessionId)}
              disabled={!sessionId || executing}
              className="px-4 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-red-400 flex items-center"
            >
              <FaTrash className="mr-2" />
              Reset Environment
            </button>
          </div>
          
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium text-gray-800 mb-2">Output</h3>
            
            <div
              ref={outputRef}
              className="bg-gray-900 text-gray-100 rounded p-4 font-mono text-sm h-64 overflow-y-auto whitespace-pre-wrap"
            >
              {error ? (
                <div className="text-red-400">{error}</div>
              ) : output ? (
                output
              ) : (
                <div className="text-gray-500">Run your code to see output here</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SandboxEnvironment;