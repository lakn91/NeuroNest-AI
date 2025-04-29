/**
 * Code Editor Component
 * Provides a Monaco-based code editor with syntax highlighting and IntelliSense
 */

import React, { useEffect, useRef, useState } from 'react';
import { useSettings } from '../../contexts/SettingsContext';

// Dynamic import for Monaco Editor
const CodeEditor = ({ 
  value, 
  onChange, 
  language = 'javascript', 
  readOnly = false,
  height = '400px',
  className = ''
}) => {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const [editor, setEditor] = useState(null);
  const [monaco, setMonaco] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { settings } = useSettings();
  const { theme, fontSize, tabSize, wordWrap, minimap } = settings.codeEditor || {};

  // Load Monaco editor
  useEffect(() => {
    if (typeof window !== 'undefined' && !isLoaded) {
      import('monaco-editor').then(monaco => {
        setMonaco(monaco);
        setIsLoaded(true);
      }).catch(error => {
        console.error('Failed to load Monaco editor:', error);
      });
    }
    
    return () => {
      if (editor) {
        editor.dispose();
      }
    };
  }, [isLoaded, editor]);

  // Initialize editor when Monaco is loaded
  useEffect(() => {
    if (monaco && containerRef.current && !editor) {
      const newEditor = monaco.editor.create(containerRef.current, {
        value: value || '',
        language,
        theme: theme || 'vs-light',
        fontSize: fontSize || 14,
        tabSize: tabSize || 2,
        wordWrap: wordWrap || 'on',
        minimap: {
          enabled: minimap !== false
        },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        readOnly,
        scrollbar: {
          useShadows: false,
          verticalHasArrows: true,
          horizontalHasArrows: true,
          vertical: 'visible',
          horizontal: 'visible',
          verticalScrollbarSize: 12,
          horizontalScrollbarSize: 12
        }
      });
      
      setEditor(newEditor);
      editorRef.current = newEditor;
      
      // Add change event listener
      newEditor.onDidChangeModelContent(() => {
        if (onChange) {
          onChange(newEditor.getValue());
        }
      });
    }
  }, [monaco, editor, value, language, theme, fontSize, tabSize, wordWrap, minimap, readOnly, onChange]);

  // Update editor options when settings change
  useEffect(() => {
    if (editor) {
      editor.updateOptions({
        theme: theme || 'vs-light',
        fontSize: fontSize || 14,
        tabSize: tabSize || 2,
        wordWrap: wordWrap || 'on',
        minimap: {
          enabled: minimap !== false
        },
        readOnly
      });
    }
  }, [editor, theme, fontSize, tabSize, wordWrap, minimap, readOnly]);

  // Update editor value when prop changes
  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getValue()) {
      editor.setValue(value);
    }
  }, [editor, value]);

  // Update editor language when prop changes
  useEffect(() => {
    if (editor && monaco && language) {
      const model = editor.getModel();
      if (model) {
        monaco.editor.setModelLanguage(model, language);
      }
    }
  }, [editor, monaco, language]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (editor) {
        editor.layout();
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [editor]);

  return (
    <div 
      ref={containerRef} 
      className={`border border-gray-300 rounded-md overflow-hidden ${className}`}
      style={{ height }}
    />
  );
};

export default CodeEditor;