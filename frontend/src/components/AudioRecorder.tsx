'use client';

import { useState, useRef, useEffect } from 'react';
import { speechAPI, settingsAPI } from '@/utils/api';
import { useTranslation } from '@/i18n';
import LanguageSelector from './LanguageSelector';

interface AudioRecorderProps {
  onTranscription: (text: string) => void;
  language?: string;
  dialect?: string;
  enhanceAudio?: boolean;
  useAIEnhancement?: boolean;
  showLanguageSelector?: boolean;
}

interface SupportedLanguage {
  code: string;
  name: string;
  dialects?: { code: string; name: string }[];
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
  onTranscription,
  language = 'en-US',
  dialect,
  enhanceAudio = true,
  useAIEnhancement = true,
  showLanguageSelector = false
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [selectedDialect, setSelectedDialect] = useState(dialect);
  const [supportedLanguages, setSupportedLanguages] = useState<SupportedLanguage[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(false);
  const [enhanceAudioEnabled, setEnhanceAudioEnabled] = useState(enhanceAudio);
  const [aiEnhancementEnabled, setAIEnhancementEnabled] = useState(useAIEnhancement);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const { t } = useTranslation();

  // Load supported languages on component mount
  useEffect(() => {
    if (showLanguageSelector) {
      loadSupportedLanguages();
    }
  }, [showLanguageSelector]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording]);

  // Load supported languages from the API
  const loadSupportedLanguages = async () => {
    try {
      setIsLoadingLanguages(true);
      const response = await settingsAPI.getSpeechLanguages();
      if (response.data) {
        setSupportedLanguages(response.data);
        
        // Set default dialect if available
        if (selectedDialect === undefined && response.data.length > 0) {
          const defaultLang = response.data.find(lang => lang.code === selectedLanguage.split('-')[0]);
          if (defaultLang && defaultLang.dialects && defaultLang.dialects.length > 0) {
            setSelectedDialect(defaultLang.dialects[0].code);
          }
        }
      }
    } catch (error) {
      console.error('Error loading supported languages:', error);
    } finally {
      setIsLoadingLanguages(false);
    }
  };

  // Handle language change
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const langCode = e.target.value;
    setSelectedLanguage(langCode);
    
    // Reset dialect when language changes
    setSelectedDialect(undefined);
    
    // Set default dialect if available
    const selectedLang = supportedLanguages.find(lang => lang.code === langCode);
    if (selectedLang && selectedLang.dialects && selectedLang.dialects.length > 0) {
      setSelectedDialect(selectedLang.dialects[0].code);
    }
  };

  // Handle dialect change
  const handleDialectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDialect(e.target.value);
  };

  // Start audio visualization
  const startAudioVisualization = (stream: MediaStream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const audioContext = audioContextRef.current;
    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;
    
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const updateAudioLevel = () => {
      if (!analyserRef.current) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      
      // Calculate average volume level
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const normalizedLevel = Math.min(1, average / 128); // Normalize to 0-1
      
      setAudioLevel(normalizedLevel);
      
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    };
    
    updateAudioLevel();
  };

  // Stop audio visualization
  const stopAudioVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setAudioLevel(0);
  };

  const startRecording = async () => {
    try {
      setError(null);
      
      // Check if browser supports MediaRecorder
      if (!navigator.mediaDevices || !window.MediaRecorder) {
        throw new Error(t('audio.browserNotSupported') || 'Your browser does not support audio recording');
      }
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Start audio visualization
      startAudioVisualization(stream);
      
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
          stopAudioVisualization();
          
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
      // Recognize speech with all parameters
      const response = await speechAPI.recognizeSpeech(
        audioBlob,
        selectedLanguage,
        selectedDialect,
        enhanceAudioEnabled,
        aiEnhancementEnabled
      );
      
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

  // Get available dialects for the selected language
  const getAvailableDialects = () => {
    const selectedLang = supportedLanguages.find(lang => lang.code === selectedLanguage.split('-')[0]);
    return selectedLang?.dialects || [];
  };

  return (
    <div className="flex flex-col items-center">
      {showLanguageSelector && (
        <div className="mb-4 w-full max-w-xs">
          <LanguageSelector
            mode="speech"
            initialLanguage={selectedLanguage}
            initialDialect={selectedDialect}
            onLanguageChange={(lang) => setSelectedLanguage(lang)}
            onDialectChange={(dialect) => setSelectedDialect(dialect)}
            showDialects={true}
            className="mb-4"
            dropdownPosition="left"
          />
          
          <div className="flex items-center mb-2">
            <input
              id="enhance-audio"
              type="checkbox"
              checked={enhanceAudioEnabled}
              onChange={(e) => setEnhanceAudioEnabled(e.target.checked)}
              disabled={isRecording || isProcessing}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="enhance-audio" className="ml-2 block text-sm">
              {t('audio.enhanceAudio')}
            </label>
          </div>
          
          {enhanceAudioEnabled && (
            <div className="flex items-center mb-2">
              <input
                id="ai-enhancement"
                type="checkbox"
                checked={aiEnhancementEnabled}
                onChange={(e) => setAIEnhancementEnabled(e.target.checked)}
                disabled={isRecording || isProcessing || !enhanceAudioEnabled}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="ai-enhancement" className="ml-2 block text-sm">
                {t('audio.useAIEnhancement')}
              </label>
            </div>
          )}
        </div>
      )}
      
      <div className="relative">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${
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
        
        {isRecording && (
          <div className="absolute -top-1 -right-1 -bottom-1 -left-1 rounded-full border-2 border-transparent">
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="48"
                fill="none"
                stroke="rgba(239, 68, 68, 0.5)"
                strokeWidth="4"
                strokeDasharray={`${audioLevel * 300} 300`}
                transform="rotate(-90 50 50)"
              />
            </svg>
          </div>
        )}
      </div>
      
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