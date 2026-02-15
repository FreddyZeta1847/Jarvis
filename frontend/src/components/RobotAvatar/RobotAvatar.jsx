import React from 'react';
import './RobotAvatar.css';

function RobotAvatar({ isSessionActive, status, isListening, isSpeaking, onClick }) {
  const getState = () => {
    if (!isSessionActive) return 'idle';
    if (isSpeaking || status === 'speaking') return 'speaking';
    if (status === 'processing') return 'processing';
    if (isListening || status === 'listening') return 'listening';
    return 'active';
  };

  const state = getState();

  return (
    <button
      className={`robot-container ${state} ${isSessionActive ? 'active' : ''}`}
      onClick={onClick}
      aria-label={isSessionActive ? 'Stop conversation' : 'Start conversation'}
    >
      {/* LED Ring */}
      <div className="led-ring" />

      {/* Robot Face */}
      <div className="robot-face">
        <div className="robot-eyes">
          <div className={`robot-eye left ${state}`}>
            <div className="eye-lid" />
          </div>
          <div className={`robot-eye right ${state}`}>
            <div className="eye-lid" />
          </div>
        </div>
      </div>
    </button>
  );
}

export default RobotAvatar;
