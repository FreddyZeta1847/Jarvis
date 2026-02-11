import React from 'react';
import { useApp } from '../../context/AppContext.jsx';
import './AgentStatus.css';

function AgentStatus() {
  const { activeAgent, isListening, isSpeaking } = useApp();

  const getStatusText = () => {
    if (isListening) return 'Listening...';
    if (isSpeaking) return 'Speaking...';
    if (activeAgent) return activeAgent;
    return 'Ready';
  };

  const getStatusClass = () => {
    if (isListening) return 'listening';
    if (isSpeaking) return 'speaking';
    if (activeAgent) return 'active';
    return 'idle';
  };

  return (
    <div className={`agent-status ${getStatusClass()}`}>
      <span className="status-dot"></span>
      <span className="status-text">{getStatusText()}</span>
    </div>
  );
}

export default AgentStatus;
