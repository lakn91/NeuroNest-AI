/**
 * Sandbox Page
 * Page for code execution in a sandbox environment
 */

import React, { useState } from 'react';
import { FaCode, FaJs, FaPython } from 'react-icons/fa';
import SandboxEnvironment from '../components/sandbox/SandboxEnvironment';
import { SandboxProvider } from '../contexts/SandboxContext';

const SandboxPage = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  
  return (
    <SandboxProvider>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center">
          <FaCode className="mr-3 text-gray-800" />
          Code Sandbox
        </h1>
        
        <p className="text-gray-600 mb-8">
          Execute code in a secure sandbox environment. Choose a language and start coding.
        </p>
        
        <div className="mb-8">
          <div className="flex space-x-4">
            <button
              onClick={() => setSelectedLanguage('python')}
              className={`px-6 py-3 rounded-lg flex items-center ${
                selectedLanguage === 'python'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              <FaPython className="mr-2" />
              Python
            </button>
            
            <button
              onClick={() => setSelectedLanguage('javascript')}
              className={`px-6 py-3 rounded-lg flex items-center ${
                selectedLanguage === 'javascript'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
              }`}
            >
              <FaJs className="mr-2" />
              JavaScript
            </button>
          </div>
        </div>
        
        <SandboxEnvironment language={selectedLanguage} />
      </div>
    </SandboxProvider>
  );
};

export default SandboxPage;