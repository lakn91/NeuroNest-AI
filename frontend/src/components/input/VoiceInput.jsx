/**
 * Voice Input Component
 * Provides voice input functionality with dialect support
 */

import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../../contexts/SettingsContext';

const VoiceInput = ({ onTranscript, className = '', buttonClassName = '' }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);
  
  const { settings, getCurrentDialect } = useSettings();
  const currentDialect = getCurrentDialect();

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // Configure recognition
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = currentDialect.code; // Use selected dialect
      
      // Set up event handlers
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError('');
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = (event) => {
        setError(`Speech recognition error: ${event.error}`);
        setIsListening(false);
      };
      
      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update transcript
        const newTranscript = finalTranscript || interimTranscript;
        setTranscript(newTranscript);
        
        // Call callback with transcript
        if (finalTranscript && onTranscript) {
          onTranscript(finalTranscript);
        }
      };
    } else {
      setError('Speech recognition is not supported in this browser.');
    }
    
    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [currentDialect.code, onTranscript]);

  // Update language when dialect changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = currentDialect.code;
    }
  }, [currentDialect.code]);

  /**
   * Toggle listening state
   */
  const toggleListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition is not supported in this browser.');
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setTranscript('');
      recognitionRef.current.start();
    }
  };

  return (
    <div className={`flex flex-col ${className}`}>
      <button
        type="button"
        onClick={toggleListening}
        className={`flex items-center justify-center p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
          isListening 
            ? 'bg-red-500 text-white hover:bg-red-600' 
            : 'bg-indigo-500 text-white hover:bg-indigo-600'
        } ${buttonClassName}`}
        title={isListening ? 'Stop listening' : 'Start listening'}
        disabled={!!error && !isListening}
      >
        {isListening ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
      
      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
      
      {isListening && (
        <div className="mt-2 text-sm text-gray-500">
          Listening... ({currentDialect.name})
        </div>
      )}
      
      {transcript && (
        <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
          {transcript}
        </div>
      )}
    </div>
  );
};

export default VoiceInput;