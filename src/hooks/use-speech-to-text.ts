
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';

// This is needed because the SpeechRecognition API is still vendor-prefixed in some browsers
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((this: SpeechRecognition, ev: any) => any) | null;
  onerror: ((this: SpeechRecognition, ev: any) => any) | null;
  onstart: (() => void) | null;
  onend: (() => void) | null;
}


type UseSpeechToTextOptions = {
  onTranscript: (transcript: string) => void;
};

export type SpeechRecognitionStatus = 'idle' | 'activating' | 'listening';

export function useSpeechToText({ onTranscript }: UseSpeechToTextOptions) {
  const [status, setStatus] = useState<SpeechRecognitionStatus>('idle');
  const [isSupported, setIsSupported] = useState<boolean | undefined>(undefined);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playStartSound = useCallback(() => {
    if (!isSupported) return;
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error("Web Audio API is not supported in this browser.", e);
        return;
      }
    }
    const audioContext = audioContextRef.current;
    
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  }, [isSupported]);


  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
      console.warn("Speech recognition not supported by this browser.");
    }
  }, []);

  const startListening = useCallback(() => {
    if (status !== 'idle' || !isSupported) return;

    setStatus('activating');
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognitionRef.current = recognition;

    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      playStartSound();
      setStatus('listening');
    };

    recognition.onend = () => {
      setStatus('idle');
      recognitionRef.current = null;
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'no-speech') {
        // This is a common event, no need to log it as a critical error.
      } else {
         console.error('Speech recognition error:', event.error);
      }
      setStatus('idle');
    };

    recognition.onresult = (event: any) => {
      let transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result) => result.transcript)
        .join('');
      
      transcript = transcript
        .replace(/ comma/gi, ',')
        .replace(/ period/gi, '.');

      // Capitalize the first letter of the transcript.
      if (transcript.length > 0) {
        transcript = transcript.charAt(0).toUpperCase() + transcript.slice(1);
      }
      
      onTranscript(transcript);
    };

    recognition.start();
  }, [status, isSupported, onTranscript, playStartSound]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && (status === 'listening' || status === 'activating')) {
      recognitionRef.current.stop();
    }
  }, [status]);
  
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isListening: status === 'listening',
    status,
    startListening,
    stopListening,
    isSupported,
  };
}
