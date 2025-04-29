/**
 * Code Editor Component
 * Advanced code editor with syntax highlighting and analysis
 */

import React, { useState, useEffect, useRef } from 'react';
import { useCodeAnalysis } from '../../contexts/CodeAnalysisContext';
import { FaCode, FaSearch, FaExclamationTriangle, FaCheck, FaSpinner } from 'react-icons/fa';
import Editor from '@monaco-editor/react';

const CodeEditor = ({ 
  code = '', 
  language = 'javascript', 
  onChange = () => {}, 
  height = '500px',
  readOnly = false,
  showAnalysis = true
}) => {
  const { analyzeCode, loading, issues } = useCodeAnalysis();
  const [value, setValue] = useState(code);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [showIssues, setShowIssues] = useState(false);
  const editorRef = useRef(null);
  
  // Update value when code prop changes
  useEffect(() => {
    setValue(code);
  }, [code]);
  
  // Handle editor mount
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Add custom theme
    monaco.editor.defineTheme('neuronest-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#1a1a2e',
        'editor.foreground': '#e6e6e6',
        'editor.lineHighlightBackground': '#2a2a3e',
        'editorCursor.foreground': '#ffffff',
        'editorWhitespace.foreground': '#3a3a4e'
      }
    });
    
    monaco.editor.setTheme('neuronest-dark');
  };
  
  // Handle code change
  const handleChange = (newValue) => {
    setValue(newValue);
    onChange(newValue);
  };
  
  // Handle language change
  const handleLanguageChange = (e) => {
    setSelectedLanguage(e.target.value);
  };
  
  // Analyze code
  const handleAnalyze = async () => {
    if (!value.trim()) return;
    
    await analyzeCode(value, selectedLanguage);
    setShowIssues(true);
  };
  
  // Format code
  const handleFormat = () => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument').run();
    }
  };
  
  // Get issue severity icon
  const getIssueSeverityIcon = (severity) => {
    switch (severity.toLowerCase()) {
      case 'error':
        return <FaExclamationTriangle className="text-red-500" />;
      case 'warning':
        return <FaExclamationTriangle className="text-yellow-500" />;
      default:
        return <FaExclamationTriangle className="text-gray-500" />;
    }
  };
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center">
          <FaCode className="text-indigo-600 mr-2" />
          <h2 className="text-lg font-medium text-gray-800">Code Editor</h2>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={selectedLanguage}
            onChange={handleLanguageChange}
            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="json">JSON</option>
          </select>
          
          {showAnalysis && (
            <>
              <button
                onClick={handleFormat}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Format
              </button>
              
              <button
                onClick={handleAnalyze}
                disabled={loading || !value.trim()}
                className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-400 flex items-center"
              >
                {loading ? (
                  <>
                    <FaSpinner className="animate-spin mr-1" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <FaSearch className="mr-1" />
                    Analyze
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
        <div className={`${showIssues && issues.length > 0 ? 'md:col-span-2' : 'md:col-span-3'}`}>
          <Editor
            height={height}
            language={selectedLanguage}
            value={value}
            onChange={handleChange}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              fontSize: 14,
              readOnly: readOnly,
              wordWrap: 'on',
              automaticLayout: true
            }}
          />
        </div>
        
        {showAnalysis && showIssues && issues.length > 0 && (
          <div className="border-l border-gray-200 h-full overflow-auto">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-medium text-gray-800 flex items-center">
                <FaExclamationTriangle className="text-yellow-500 mr-2" />
                Issues ({issues.length})
              </h3>
            </div>
            
            <ul className="divide-y divide-gray-200">
              {issues.map((issue, index) => (
                <li key={index} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start">
                    <div className="mr-2 mt-0.5">
                      {getIssueSeverityIcon(issue.severity)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{issue.message}</p>
                      <p className="text-xs text-gray-500">
                        Line {issue.line}, Column {issue.column}
                      </p>
                      {issue.ruleId && (
                        <p className="text-xs text-gray-500 mt-1">
                          Rule: {issue.ruleId}
                        </p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;