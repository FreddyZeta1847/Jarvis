/**
 * Voice Chat Hook
 *
 * Simple voice conversation flow using Azure Speech SDK directly:
 *
 * 1. User clicks mic → start listening
 * 2. User speaks → Azure STT recognizes text
 * 3. Text sent to backend → AI responds
 * 4. Azure TTS speaks response
 * 5. User can interrupt anytime
 * 6. User clicks mic again → stop
 */

import { useCallback, useRef, useState } from 'react';
import { useSpeechService } from './useSpeechService.js';
import { useApp } from '../context/AppContext.jsx';

export function useVoiceChat() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, listening, processing, speaking
  const [lastTranscription, setLastTranscription] = useState('');

  const isSessionActiveRef = useRef(false);

  const {
    isListening,
    isSpeaking,
    isProcessing,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    checkIsSpeaking,
    wasInterrupted,
    getAIResponse
  } = useSpeechService();

  const { addMessage, setIsListening: setAppListening, setIsSpeaking: setAppSpeaking, setActiveAgent } = useApp();

  /**
   * Handle when speech is recognized
   */
  const handleTranscription = useCallback(async (text) => {
    console.log('Transcription:', text);
    setLastTranscription(text);
    setStatus('processing');

    // Add user message to chat
    addMessage({
      role: 'user',
      content: text
    });

    // Get AI response
    const response = await getAIResponse(text);

    // Check if interrupted during processing - don't speak if so
    if (wasInterrupted()) {
      console.log('Interrupted during processing - skipping response');
      setStatus('listening');
      return;
    }

    if (response && isSessionActiveRef.current) {
      // Add assistant message to chat
      addMessage({
        role: 'assistant',
        content: response.text,
        agent: response.agent
      });
      setActiveAgent(response.agent);

      // Speak the response (can be interrupted)
      setStatus('speaking');
      await speak(response.text);

      // Back to listening if session still active and not interrupted
      if (isSessionActiveRef.current && !wasInterrupted()) {
        setStatus('listening');
      }
    }
  }, [addMessage, getAIResponse, speak, setActiveAgent, wasInterrupted]);

  /**
   * Handle partial transcription (while speaking)
   */
  const handlePartial = useCallback((text) => {
    // If user starts speaking while bot is talking, interrupt
    // Use checkIsSpeaking() to get current value (avoids stale closure)
    if (checkIsSpeaking()) {
      console.log('User interrupted - stopping TTS');
      stopSpeaking();
      setStatus('listening');
    }
    setLastTranscription(text);
  }, [checkIsSpeaking, stopSpeaking]);

  /**
   * Start voice session
   */
  const startSession = useCallback(async () => {
    if (isSessionActiveRef.current) return;

    console.log('Starting voice session...');
    isSessionActiveRef.current = true;
    setIsSessionActive(true);
    setStatus('listening');

    try {
      await startListening(handleTranscription, handlePartial);
    } catch (err) {
      console.error('Failed to start session:', err);
      isSessionActiveRef.current = false;
      setIsSessionActive(false);
      setStatus('idle');
    }
  }, [startListening, handleTranscription, handlePartial]);

  /**
   * Stop voice session
   */
  const stopSession = useCallback(async () => {
    if (!isSessionActiveRef.current) return;

    console.log('Stopping voice session...');
    isSessionActiveRef.current = false;
    setIsSessionActive(false);
    setStatus('idle');

    stopSpeaking();
    await stopListening();
  }, [stopListening, stopSpeaking]);

  /**
   * Toggle session
   */
  const toggleSession = useCallback(() => {
    if (isSessionActive) {
      stopSession();
    } else {
      startSession();
    }
  }, [isSessionActive, startSession, stopSession]);

  // Sync with AppContext
  useCallback(() => {
    setAppListening(isListening);
  }, [isListening, setAppListening]);

  useCallback(() => {
    setAppSpeaking(isSpeaking);
  }, [isSpeaking, setAppSpeaking]);

  return {
    // State
    isSessionActive,
    isListening,
    isSpeaking,
    isProcessing,
    status,
    error,
    lastTranscription,

    // Actions
    startSession,
    stopSession,
    toggleSession
  };
}
