/**
 * Voice Chat Hook
 *
 * Simple voice conversation flow using Azure Speech SDK directly:
 *
 * 1. User taps robot → start session (wake up)
 * 2. User speaks → Azure STT recognizes text
 * 3. Text sent to backend → AI responds
 * 4. Azure TTS speaks response
 * 5. User can interrupt anytime
 * 6. User taps robot again → stop session (sleep)
 * 7. Mic button toggles mute/unmute during active session
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSpeechService } from './useSpeechService.js';
import { useApp } from '../context/AppContext.jsx';

export function useVoiceChat() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, listening, processing, speaking, muted
  const [lastTranscription, setLastTranscription] = useState('');

  const isSessionActiveRef = useRef(false);
  const isMutedRef = useRef(false);

  const {
    isListening,
    isSpeaking,
    isProcessing,
    error,
    startListening,
    stopListening,
    pauseListening,
    resumeListening,
    speak,
    stopSpeaking,
    checkIsSpeaking,
    wasInterrupted,
    clearInterrupted,
    getAIResponse,
    getFrequencyData
  } = useSpeechService();

  const { addMessage, setIsListening: setAppListening, setIsSpeaking: setAppSpeaking, setActiveAgent } = useApp();

  // Helpers to update state + ref together
  const setSessionActive = useCallback((val) => {
    isSessionActiveRef.current = val;
    setIsSessionActive(val);
  }, []);

  const setMutedState = useCallback((val) => {
    isMutedRef.current = val;
    setIsMuted(val);
  }, []);

  // Sync voice state with AppContext
  useEffect(() => {
    setAppListening(isListening);
  }, [isListening, setAppListening]);

  useEffect(() => {
    setAppSpeaking(isSpeaking);
  }, [isSpeaking, setAppSpeaking]);

  /**
   * Handle when speech is recognized
   */
  const handleTranscription = useCallback(async (text) => {
    console.log('Transcription:', text);
    setLastTranscription(text);
    setStatus('processing');

    // Reset interrupted flag - this is a new message
    clearInterrupted();

    // Add user message to chat
    addMessage({
      role: 'user',
      content: text
    });

    // Get AI response
    const response = await getAIResponse(text);

    // Check if interrupted during processing - don't speak if so
    if (wasInterrupted()) {
      // Still show the response in chat even if we skip speaking
      if (response) {
        addMessage({
          role: 'assistant',
          content: response.text,
          agent: response.agent
        });
      }
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

      // Mute mic during TTS to prevent echo self-interruption (especially on iPhone)
      await pauseListening();

      // Speak the response (can be interrupted)
      setStatus('speaking');
      await speak(response.text);

      // Resume mic after TTS finishes
      if (isSessionActiveRef.current && !wasInterrupted()) {
        await resumeListening();
        setStatus('listening');
      }
    }
  }, [addMessage, getAIResponse, speak, setActiveAgent, wasInterrupted, clearInterrupted, pauseListening, resumeListening]);

  /**
   * Handle partial transcription (while speaking)
   */
  const handlePartial = useCallback((text) => {
    // If user starts speaking while bot is talking, interrupt
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
    setSessionActive(true);
    setMutedState(false);
    setStatus('listening');

    try {
      await startListening(handleTranscription, handlePartial);
    } catch (err) {
      console.error('Failed to start session:', err);
      setSessionActive(false);
      setStatus('idle');
    }
  }, [startListening, handleTranscription, handlePartial, setSessionActive, setMutedState]);

  /**
   * Stop voice session
   */
  const stopSession = useCallback(async () => {
    if (!isSessionActiveRef.current) return;

    console.log('Stopping voice session...');
    setSessionActive(false);
    setMutedState(false);
    setStatus('idle');

    stopSpeaking();
    await stopListening();
  }, [stopListening, stopSpeaking, setSessionActive, setMutedState]);

  /**
   * Toggle session (start/stop)
   */
  const toggleSession = useCallback(() => {
    if (isSessionActive) {
      stopSession();
    } else {
      startSession();
    }
  }, [isSessionActive, startSession, stopSession]);

  /**
   * Toggle mute/unmute (only during active session)
   */
  const toggleMute = useCallback(async () => {
    if (!isSessionActiveRef.current) return;

    if (isMutedRef.current) {
      // Unmute - resume listening
      await resumeListening();
      setMutedState(false);
      setStatus('listening');
      console.log('Unmuted');
    } else {
      // Mute - pause listening
      await pauseListening();
      setMutedState(true);
      setStatus('muted');
      console.log('Muted');
    }
  }, [pauseListening, resumeListening, setMutedState]);

  return {
    // State
    isSessionActive,
    isListening,
    isSpeaking,
    isProcessing,
    isMuted,
    status,
    error,
    lastTranscription,

    // Actions
    startSession,
    stopSession,
    toggleSession,
    toggleMute,

    // Audio
    getFrequencyData
  };
}
