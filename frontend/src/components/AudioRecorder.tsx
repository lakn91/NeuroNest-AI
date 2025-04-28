'use client';

import { useState, useRef, useEffect } from 'react';
import { speechAPI } from '@/utils/api';
import { useTranslation } from '@/i18n';

interface AudioRecorderProps {
  onTranscription: (text: string) => void;
  language?: string;
  dialect?: string;
  enhanceAudio?: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onTranscription,
  language = 'en-US',
  dialect,
  enhanceAudio = true
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    // Clean up on unmount
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      setError(null);
      
      // Check if browser supports MediaRecorder
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        throw new Error(t('audio.browserNotSupported') || 'Your browser does not support audio recording');
      }
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create MediaRecorder instance
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        try {
          setIsProcessing(true);
          
          // Create audio blob from chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          
          // Process the audio
          await processAudio(audioBlob);
          
          // Stop all tracks in the stream
          stream.getTracks().forEach(track => track.stop());
        } catch (error) {
          console.error('Error processing audio:', error);
          setError(t('audio.processingError') || 'Error processing audio');
        } finally {
          setIsProcessing(false);
        }
      };
      
      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      setError(t('audio.microphoneAccessError') || 'Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      let processedBlob = audioBlob;
      
      // Enhance audio if enabled
      if (enhanceAudio) {
        try {
          const enhanceResponse = await speechAPI.enhanceAudio(audioBlob);
          if (enhanceResponse.data && enhanceResponse.data.enhanced_audio) {
            processedBlob = enhanceResponse.data.enhanced_audio;
          }
        } catch (error) {
          console.warn('Audio enhancement failed, using original audio:', error);
        }
      }
      
      // Recognize speech
      const response = await speechAPI.recognizeSpeech(processedBlob, language, dialect);
      
      if (response.data && response.data.text) {
        onTranscription(response.data.text);
      } else {
        throw new Error('No transcription returned');
      }
    } catch (error) {
      console.error('Error in speech recognition:', error);
      setError(t('audio.recognitionError') || 'Speech recognition failed');
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          isRecording
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-blue-500 hover:bg-blue-600'
        } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={isRecording ? t('audio.stopRecording') : t('audio.startRecording')}
        title={isRecording ? t('audio.stopRecording') : t('audio.startRecording')}
      >
        {isRecording ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="6" y="6" width="12" height="12" fill="white" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        )}
      </button>
      
      <div className="mt-2 text-sm">
        {isRecording && (
          <div className="text-red-500 flex items-center">
            <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
            {t('audio.recording')}
          </div>
        )}
        {isProcessing && (
          <div className="text-blue-500">
            {t('audio.processing')}...
          </div>
        )}
        {error && (
          <div className="text-red-500">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioRecorder;