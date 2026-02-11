import React from 'react';
import ChatHistory from '../../components/ChatHistory/ChatHistory.jsx';
import AgentStatus from '../../components/AgentStatus/AgentStatus.jsx';
import VoiceButton from '../../components/VoiceButton/VoiceButton.jsx';
import ChatInput from '../../components/ChatInput/ChatInput.jsx';
import './HomePage.css';

function HomePage() {
  return (
    <div className="home-layout">
      <header className="home-header">
        <h1>JARVIS</h1>
        <AgentStatus />
      </header>

      <main className="home-main">
        <ChatHistory />
      </main>

      <footer className="home-footer">
        <ChatInput />
        <VoiceButton />
      </footer>
    </div>
  );
}

export default HomePage;
