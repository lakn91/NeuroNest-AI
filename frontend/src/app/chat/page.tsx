'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { marked } from 'marked';
import Prism from 'prismjs';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-html';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism-tomorrow.css';
import markdownUtils from '@/utils/markdown';
import api from '@/utils/api';
import speechUtils from '@/utils/speech';
import fileReaderUtils from '@/utils/fileReader';

// Message types
type MessageType = 'user' | 'agent' | 'thinking' | 'code' | 'error';

interface Message {
  id: string;
  type: MessageType;
  content: string;
  metadata?: {
    language?: string;
    filePath?: string;
    [key: string]: any;
  };
  timestamp: Date;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'agent',
      content: 'Hello! I\'m NeuroNest-AI. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileContents, setFileContents] = useState<{[key: string]: string}>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Apply syntax highlighting to code blocks
  useEffect(() => {
    Prism.highlightAll();
  }, [messages]);
  
  // Check if speech recognition is supported
  const speechRecognitionSupported = typeof window !== 'undefined' && speechUtils.isSpeechRecognitionSupported();
  
  // Handle speech recognition
  const handleSpeechRecognition = async () => {
    if (!speechRecognitionSupported) {
      alert('Speech recognition is not supported in your browser');
      return;
    }
    
    try {
      setIsListening(true);
      const transcript = await speechUtils.recognizeSpeech();
      setInput(prev => prev + ' ' + transcript);
    } catch (error) {
      console.error('Speech recognition error:', error);
    } finally {
      setIsListening(false);
    }
  };
  
  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const newFiles: File[] = [];
    const newFileContents: {[key: string]: string} = {};
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newFiles.push(file);
      
      try {
        if (fileReaderUtils.isTextFile(file)) {
          const content = await fileReaderUtils.readFileAsText(file);
          newFileContents[file.name] = content;
        } else {
          newFileContents[file.name] = `[Binary file: ${file.name}]`;
        }
      } catch (error) {
        console.error(`Error reading file ${file.name}:`, error);
        newFileContents[file.name] = `[Error reading file: ${file.name}]`;
      }
    }
    
    setSelectedFiles(prev => [...prev, ...newFiles]);
    setFileContents(prev => ({ ...prev, ...newFileContents }));
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Remove a file
  const removeFile = (fileName: string) => {
    setSelectedFiles(prev => prev.filter(file => file.name !== fileName));
    setFileContents(prev => {
      const newContents = { ...prev };
      delete newContents[fileName];
      return newContents;
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);
    
    // Add thinking message
    const thinkingMessage: Message = {
      id: `thinking-${Date.now()}`,
      type: 'thinking',
      content: 'Analyzing your request...',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, thinkingMessage]);
    
    try {
      // Call the API to process the message using the helper function
      const result = await api.processMessage(input, {
        // Include any additional context here
        previousMessages: messages.map(msg => ({
          type: msg.type,
          content: msg.content
        })),
        files: Object.entries(fileContents).map(([name, content]) => ({
          name,
          content
        }))
      });
      
      // Remove thinking message
      setMessages(prev => prev.filter(msg => msg.id !== thinkingMessage.id));
      
      // Process the responses from the agent system
      if (result && result.responses) {
        // Add each response to the messages
        for (const agentResponse of result.responses) {
          const newMessage: Message = {
            id: `${agentResponse.type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type: agentResponse.type as MessageType,
            content: typeof agentResponse.content === 'string' 
              ? agentResponse.content 
              : JSON.stringify(agentResponse.content, null, 2),
            metadata: agentResponse.metadata,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, newMessage]);
          
          // Small delay between messages for better UX
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } else {
        // Fallback if the API doesn't return the expected format
        // Add agent response
        const agentResponse: Message = {
          id: `agent-${Date.now()}`,
          type: 'agent',
          content: 'I understand your request. Let me help you with that.',
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, agentResponse]);
        
        // Add code example
        const codeResponse: Message = {
          id: `code-${Date.now()}`,
          type: 'code',
          content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Generated Project</title>\n  <style>\n    body { font-family: Arial, sans-serif; }\n  </style>\n</head>\n<body>\n  <h1>Hello World</h1>\n</body>\n</html>',
          metadata: {
            language: 'html',
            filePath: 'index.html'
          },
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, codeResponse]);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Remove thinking message
      setMessages(prev => prev.filter(msg => msg.id !== thinkingMessage.id));
      
      // Add error message
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        type: 'error',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  // Render message based on type
  const renderMessage = (message: Message) => {
    switch (message.type) {
      case 'user':
        return (
          <div className="bg-blue-100 dark:bg-blue-900 p-4 rounded-lg max-w-3xl ml-auto">
            <p className="text-gray-800 dark:text-gray-200">{message.content}</p>
          </div>
        );
      
      case 'agent':
        return (
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg max-w-3xl">
            <div 
              className="text-gray-800 dark:text-gray-200 markdown-content"
              dangerouslySetInnerHTML={{ __html: markdownUtils.parseMarkdown(message.content) }}
            />
          </div>
        );
      
      case 'thinking':
        return (
          <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg max-w-3xl border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center">
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-gray-500 rounded-full border-t-transparent"></div>
              <p className="text-gray-600 dark:text-gray-300 italic">{message.content}</p>
            </div>
          </div>
        );
      
      case 'code':
        return (
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg max-w-3xl">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {message.metadata?.filePath || 'code.txt'}
              </span>
              <button 
                className="text-blue-600 dark:text-blue-400 text-sm hover:underline"
                onClick={() => navigator.clipboard.writeText(message.content)}
              >
                Copy
              </button>
            </div>
            <pre className="bg-gray-800 text-gray-100 p-4 rounded overflow-x-auto">
              <code className={`language-${message.metadata?.language || 'plaintext'}`}>{message.content}</code>
            </pre>
          </div>
        );
      
      case 'error':
        return (
          <div className="bg-red-50 dark:bg-red-900/30 p-4 rounded-lg max-w-3xl border border-red-200 dark:border-red-800">
            <p className="text-red-600 dark:text-red-300">{message.content}</p>
          </div>
        );
      
      default:
        return (
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg max-w-3xl">
            <p className="text-gray-800 dark:text-gray-200">{message.content}</p>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="w-full py-4 px-4 sm:px-6 lg:px-8 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">NeuroNest-AI</h1>
            </Link>
          </div>
          <nav className="hidden md:flex space-x-8">
            <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
              Home
            </Link>
            <Link href="/chat" className="text-blue-600 dark:text-blue-400 font-medium">
              Chat
            </Link>
            <Link href="/projects" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
              Projects
            </Link>
            <Link href="/about" className="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
              About
            </Link>
          </nav>
        </div>
      </header>

      {/* Chat Container */}
      <main className="flex-grow flex flex-col">
        <div className="flex-grow overflow-y-auto p-4 sm:p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {messages.map(message => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                {renderMessage(message)}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* Input Form */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex space-x-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message here..."
                className="flex-grow px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                disabled={isProcessing}
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={isProcessing || !input.trim()}
              >
                {isProcessing ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing
                  </span>
                ) : (
                  'Send'
                )}
              </button>
            </form>
            <div className="mt-2 flex justify-between text-xs text-gray-500 dark:text-gray-400">
              <div className="flex space-x-2">
                <button 
                  type="button"
                  className={`hover:text-blue-600 dark:hover:text-blue-400 ${isListening ? 'text-red-500 dark:text-red-400' : ''}`}
                  onClick={handleSpeechRecognition}
                  disabled={isProcessing || !speechRecognitionSupported}
                  title={speechRecognitionSupported ? 'Voice input' : 'Voice input not supported in this browser'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
                <button 
                  type="button"
                  className="hover:text-blue-600 dark:hover:text-blue-400"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  title="Upload file"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileSelect} 
                  multiple 
                />
              </div>
              <div>
                <span>Powered by AI</span>
              </div>
            </div>
            
            {/* Display selected files */}
            {selectedFiles.length > 0 && (
              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Attached files:
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedFiles.map(file => (
                    <div 
                      key={file.name} 
                      className="flex items-center bg-gray-100 dark:bg-gray-600 px-2 py-1 rounded text-xs"
                    >
                      <span className="truncate max-w-[150px]">{file.name}</span>
                      <button 
                        type="button"
                        className="ml-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                        onClick={() => removeFile(file.name)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}