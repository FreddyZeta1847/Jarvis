import React, { useEffect } from 'react';
import { useVoiceChat } from '../../hooks/useVoiceChat.js';
import { useApp } from '../../context/AppContext.jsx';
import './VoiceButton.css';

function VoiceButton() {
  const {
    isSessionActive,
    isListening,
    isSpeaking,
    isProcessing,
    status,
    toggleSession
  } = useVoiceChat();

  const { setIsListening, setIsSpeaking } = useApp();

  // Sync state with AppContext
  useEffect(() => {
    setIsListening(isListening);
  }, [isListening, setIsListening]);

  useEffect(() => {
    setIsSpeaking(isSpeaking);
  }, [isSpeaking, setIsSpeaking]);

  const handleClick = () => {
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    toggleSession();
  };

  const getButtonState = () => {
    if (!isSessionActive) return 'idle';
    if (status === 'speaking' || isSpeaking) return 'speaking';
    if (status === 'processing' || isProcessing) return 'processing';
    if (status === 'listening' || isListening) return 'listening';
    return 'listening';
  };

  return (
    <button
      className={`voice-button ${getButtonState()}`}
      onClick={handleClick}
      aria-label={isSessionActive ? 'Stop conversation' : 'Start conversation'}
    >
      <div className="voice-button-inner">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
      </div>
      {isSessionActive && <div className="pulse-ring"></div>}
      {isSessionActive && <div className="pulse-ring delay"></div>}
    </button>
  );
}

export default VoiceButton;
