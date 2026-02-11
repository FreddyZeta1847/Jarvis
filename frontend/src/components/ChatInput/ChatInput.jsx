import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import { api } from '../../services/api.js';
import './ChatInput.css';

function ChatInput() {
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { addMessage, setActiveAgent, isListening, isSpeaking } = useApp();

  const isVoiceActive = isListening || isSpeaking;
  const canSend = text.trim().length > 0 && !isSending && !isVoiceActive;

  const handleSend = async () => {
    const message = text.trim();
    if (!message || isSending) return;

    setText('');
    setIsSending(true);

    addMessage({ role: 'user', content: message });

    try {
      const response = await api.sendMessage(message);
      addMessage({ role: 'assistant', content: response.text, agent: response.agent });
      setActiveAgent(response.agent);
    } catch {
      addMessage({ role: 'assistant', content: 'Something went wrong. Please try again.' });
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && canSend) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-input">
      <input
        type="text"
        className="chat-input-field"
        placeholder={isVoiceActive ? 'Voice active...' : 'Type a message...'}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isVoiceActive || isSending}
      />
      <button
        className={`chat-send-button ${isSending ? 'sending' : ''}`}
        onClick={handleSend}
        disabled={!canSend}
        aria-label="Send message"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>
    </div>
  );
}

export default ChatInput;
