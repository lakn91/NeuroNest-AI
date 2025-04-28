// Type definitions for the Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  interpretation: any;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// Define the SpeechRecognition type
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: (event: Event) => void;
  onerror: (event: Event) => void;
  onstart: (event: Event) => void;
  onspeechend: (event: Event) => void;
  onnomatch: (event: Event) => void;
  onaudiostart: (event: Event) => void;
  onaudioend: (event: Event) => void;
  onsoundstart: (event: Event) => void;
  onsoundend: (event: Event) => void;
  onspeechstart: (event: Event) => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// Get the SpeechRecognition constructor
const getSpeechRecognition = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') return null;
  
  // @ts-ignore - These properties exist in modern browsers but TypeScript doesn't know about them
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
};

// Check if speech recognition is supported
export const isSpeechRecognitionSupported = (): boolean => {
  return getSpeechRecognition() !== null;
};

// Create a speech recognition instance
export const createSpeechRecognition = (): SpeechRecognition | null => {
  const SpeechRecognition = getSpeechRecognition();
  if (!SpeechRecognition) return null;
  
  const recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US'; // Default language
  
  return recognition;
};

// Start speech recognition and return a promise with the result
export const recognizeSpeech = (language: string = 'en-US'): Promise<string> => {
  return new Promise((resolve, reject) => {
    const recognition = createSpeechRecognition();
    
    if (!recognition) {
      reject(new Error('Speech recognition is not supported in this browser'));
      return;
    }
    
    recognition.lang = language;
    
    let finalTranscript = '';
    
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      
      // You can emit an event or callback with the interim transcript if needed
      console.log('Interim transcript:', interimTranscript);
    };
    
    recognition.onerror = (event) => {
      recognition.stop();
      reject(new Error(`Speech recognition error: ${event.type}`));
    };
    
    recognition.onend = () => {
      recognition.stop();
      resolve(finalTranscript);
    };
    
    recognition.start();
  });
};

export default {
  isSpeechRecognitionSupported,
  createSpeechRecognition,
  recognizeSpeech,
};