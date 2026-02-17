/**
 * Azure Speech Service Hook
 *
 * Uses Azure Speech SDK directly in the browser for STT and TTS.
 * No WebSocket needed - browser talks directly to Azure.
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';
import { api } from '../services/api.js';

export function useSpeechService() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  // Refs for SDK objects
  const recognizerRef = useRef(null);
  const synthesizerRef = useRef(null);
  const playerRef = useRef(null);  // SpeakerAudioDestination for TTS playback
  const tokenRef = useRef(null);
  const tokenExpiryRef = useRef(null);
  const isSpeakingRef = useRef(false);  // Ref for interruption check (avoids stale closure)
  const isInterruptedRef = useRef(false);  // Flag to cancel ongoing operations
  const speakResolveRef = useRef(null);  // Resolve function for speak() promise
  const audioContextRef = useRef(null);  // Pre-unlocked AudioContext for iOS

  // Callbacks
  const onTranscriptionRef = useRef(null);
  const onResponseRef = useRef(null);
  const onPartialRef = useRef(null);

  /**
   * Unlock audio playback on iOS Safari.
   * Must be called during a user gesture (tap/click).
   * Creates an AudioContext and plays a silent buffer to unblock Web Audio.
   */
  const unlockAudio = useCallback(async () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Play a silent buffer to fully unlock audio on iOS
      const buffer = audioContextRef.current.createBuffer(1, 1, 22050);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);
    } catch (e) {
      console.log('Audio unlock skipped:', e.message);
    }
  }, []);

  /**
   * Get speech token from backend (keeps API key secure)
   */
  const getToken = useCallback(async () => {
    // Return cached token if still valid (tokens last 10 minutes)
    if (tokenRef.current && tokenExpiryRef.current > Date.now()) {
      return tokenRef.current;
    }

    const data = await api.getSpeechToken();
    tokenRef.current = data;
    // Token expires in 10 minutes, refresh at 9 minutes
    tokenExpiryRef.current = Date.now() + 9 * 60 * 1000;

    return data;
  }, []);

  /**
   * Create speech config from token
   */
  const createSpeechConfig = useCallback(async () => {
    const { token, region } = await getToken();
    const speechConfig = SpeechSDK.SpeechConfig.fromAuthorizationToken(token, region);
    speechConfig.speechRecognitionLanguage = 'it-IT';
    speechConfig.speechSynthesisVoiceName = 'it-IT-DiegoNeural';
    return speechConfig;
  }, [getToken]);

  /**
   * Start continuous speech recognition
   */
  const startListening = useCallback(async (onTranscription, onPartial) => {
    if (recognizerRef.current) {
      console.log('Already listening');
      return;
    }

    try {
      setError(null);

      // Unlock audio on iOS (must happen during user gesture)
      await unlockAudio();

      onTranscriptionRef.current = onTranscription;
      onPartialRef.current = onPartial;

      const speechConfig = await createSpeechConfig();

      // Use microphone as audio source
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

      // Create recognizer
      const recognizer = new SpeechSDK.SpeechRecognizer(speechConfig, audioConfig);
      recognizerRef.current = recognizer;

      // Handle partial results (while speaking)
      recognizer.recognizing = (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizingSpeech) {
          const text = e.result.text.trim();
          if (text && onPartialRef.current) {
            onPartialRef.current(text);
          }
        }
      };

      // Handle final results (after silence)
      recognizer.recognized = (s, e) => {
        if (e.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
          const text = e.result.text.trim();
          if (text && onTranscriptionRef.current) {
            onTranscriptionRef.current(text);
          }
        }
      };

      // Handle errors
      recognizer.canceled = (s, e) => {
        if (e.reason === SpeechSDK.CancellationReason.Error) {
          console.error('STT Error:', e.errorDetails);
          setError(e.errorDetails);
        }
      };

      // Start continuous recognition
      await new Promise((resolve, reject) => {
        recognizer.startContinuousRecognitionAsync(resolve, reject);
      });

      setIsListening(true);
      console.log('Started listening');

    } catch (err) {
      console.error('Failed to start listening:', err);
      setError(err.message);
      recognizerRef.current = null;
    }
  }, [createSpeechConfig, unlockAudio]);

  /**
   * Stop speech recognition
   */
  const stopListening = useCallback(async () => {
    if (!recognizerRef.current) return;

    try {
      await new Promise((resolve, reject) => {
        recognizerRef.current.stopContinuousRecognitionAsync(resolve, reject);
      });
      recognizerRef.current.close();
    } catch (err) {
      console.error('Error stopping recognition:', err);
    }

    recognizerRef.current = null;
    setIsListening(false);
    console.log('Stopped listening');
  }, []);

  /**
   * Pause recognition (mute) - keeps recognizer alive
   */
  const pauseListening = useCallback(async () => {
    if (!recognizerRef.current) return;
    try {
      await new Promise((resolve, reject) => {
        recognizerRef.current.stopContinuousRecognitionAsync(resolve, reject);
      });
    } catch (err) {
      console.error('Error pausing recognition:', err);
    }
    setIsListening(false);
    console.log('Paused listening (muted)');
  }, []);

  /**
   * Resume recognition (unmute) - restarts on existing recognizer
   */
  const resumeListening = useCallback(async () => {
    if (!recognizerRef.current) return;
    try {
      await new Promise((resolve, reject) => {
        recognizerRef.current.startContinuousRecognitionAsync(resolve, reject);
      });
    } catch (err) {
      console.error('Error resuming recognition:', err);
    }
    setIsListening(true);
    console.log('Resumed listening (unmuted)');
  }, []);

  /**
   * Speak text using TTS with interruption support
   */
  const speak = useCallback(async (text) => {
    if (!text) return;

    // Clear interrupted flag for new speech
    isInterruptedRef.current = false;

    // Stop any current speech immediately
    if (synthesizerRef.current) {
      try { synthesizerRef.current.close(); } catch (e) {}
      synthesizerRef.current = null;
    }
    if (playerRef.current) {
      try { playerRef.current.pause(); } catch (e) {}
      playerRef.current = null;
    }

    try {
      setIsSpeaking(true);
      isSpeakingRef.current = true;

      const speechConfig = await createSpeechConfig();

      // Create player for interruption control
      const player = new SpeechSDK.SpeakerAudioDestination();
      playerRef.current = player;

      const audioConfig = SpeechSDK.AudioConfig.fromSpeakerOutput(player);
      const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
      synthesizerRef.current = synthesizer;

      await new Promise((resolve, reject) => {
        speakResolveRef.current = resolve;
        let resolved = false;
        const safeResolve = () => {
          if (resolved) return;
          resolved = true;
          speakResolveRef.current = null;
          setIsSpeaking(false);
          isSpeakingRef.current = false;
          resolve();
        };

        // Timeout fallback: if onAudioEnd never fires (iOS), resolve after
        // estimated duration based on text length (~80ms per character)
        const timeoutMs = Math.max(5000, text.length * 80);
        const timeout = setTimeout(() => {
          console.log('TTS timeout fallback triggered');
          safeResolve();
        }, timeoutMs);

        // Resolve when audio PLAYBACK ends, not when synthesis ends
        player.onAudioEnd = () => {
          clearTimeout(timeout);
          safeResolve();
        };

        synthesizer.speakTextAsync(
          text,
          (result) => {
            synthesizer.close();
            synthesizerRef.current = null;
            if (result.reason === SpeechSDK.ResultReason.Canceled) {
              clearTimeout(timeout);
              safeResolve();
            } else if (result.reason !== SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
              clearTimeout(timeout);
              if (!resolved) {
                resolved = true;
                speakResolveRef.current = null;
                reject(new Error('TTS failed: ' + result.errorDetails));
              }
            }
            // For SynthesizingAudioCompleted, wait for onAudioEnd or timeout
          },
          (error) => {
            clearTimeout(timeout);
            synthesizer.close();
            synthesizerRef.current = null;
            if (!resolved) {
              resolved = true;
              speakResolveRef.current = null;
              reject(error);
            }
          }
        );
      });

    } catch (err) {
      if (!err.message?.includes('closed') && !err.message?.includes('canceled')) {
        console.error('TTS error:', err);
        setError(err.message);
      }
    } finally {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }
  }, [createSpeechConfig]);

  /**
   * Stop current speech immediately (for interruption)
   */
  const stopSpeaking = useCallback(() => {
    console.log('Interrupting TTS...');
    isInterruptedRef.current = true;

    // Stop the audio player immediately
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        playerRef.current.close();
      } catch (e) {}
      playerRef.current = null;
    }

    // Close the synthesizer
    if (synthesizerRef.current) {
      try { synthesizerRef.current.close(); } catch (e) {}
      synthesizerRef.current = null;
    }

    // Unblock the speak() promise so the flow can continue
    if (speakResolveRef.current) {
      speakResolveRef.current();
      speakResolveRef.current = null;
    }

    setIsSpeaking(false);
    isSpeakingRef.current = false;
  }, []);

  /**
   * Check if interrupted (to cancel ongoing operations)
   */
  const wasInterrupted = useCallback(() => {
    return isInterruptedRef.current;
  }, []);

  /**
   * Clear interrupted flag (call when starting to process a new message)
   */
  const clearInterrupted = useCallback(() => {
    isInterruptedRef.current = false;
  }, []);

  /**
   * Check if currently speaking (for interruption detection)
   */
  const checkIsSpeaking = useCallback(() => {
    return isSpeakingRef.current;
  }, []);

  /**
   * Send text to backend for AI response
   */
  const getAIResponse = useCallback(async (text) => {
    setIsProcessing(true);

    try {
      const data = await api.sendMessage(text);
      return data;
    } catch (err) {
      console.error('AI response error:', err);
      setError(err.message);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        try { recognizerRef.current.close(); } catch (e) {}
      }
      if (synthesizerRef.current) {
        try { synthesizerRef.current.close(); } catch (e) {}
      }
      if (playerRef.current) {
        try { playerRef.current.close(); } catch (e) {}
      }
      if (audioContextRef.current) {
        try { audioContextRef.current.close(); } catch (e) {}
      }
    };
  }, []);

  return {
    // State
    isListening,
    isSpeaking,
    isProcessing,
    error,

    // Actions
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    speak,
    stopSpeaking,
    checkIsSpeaking,
    wasInterrupted,
    clearInterrupted,
    getAIResponse
  };
}
