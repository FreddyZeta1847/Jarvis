import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import './ChatHistory.css';

function ChatHistory() {
  const { messages } = useApp();
  const bottomRef = useRef(null);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="chat-history empty">
        <div className="empty-state">
          <p>Type a message or tap the microphone to start</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-history">
      <div className="messages-container">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message ${message.role}`}
          >
            <div className="message-content">
              {message.content}
            </div>
            {message.agent && (
              <div className="message-agent">
                via {message.agent}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

export default ChatHistory;
