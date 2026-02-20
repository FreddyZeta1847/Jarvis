import React, { useState } from 'react';
import Navbar from '../../components/Navbar/Navbar.jsx';
import BottomNav from '../../components/BottomNav/BottomNav.jsx';
import RobotAvatar from '../../components/RobotAvatar/RobotAvatar.jsx';
import VoiceButton from '../../components/VoiceButton/VoiceButton.jsx';
import ChatHistory from '../../components/ChatHistory/ChatHistory.jsx';
import ChatInput from '../../components/ChatInput/ChatInput.jsx';
import ExpensesPage from '../ExpensesPage/ExpensesPage.jsx';
import CalendarPage from '../CalendarPage/CalendarPage.jsx';
import { useVoiceChat } from '../../hooks/useVoiceChat.js';
import './HomePage.css';

function HomePage() {
  const [activeTab, setActiveTab] = useState('model');
  const [language, setLanguage] = useState('it');
  const [theme, setTheme] = useState('dark');
  const [interactionMode, setInteractionMode] = useState('voice');

  const voiceChat = useVoiceChat();

  const handleThemeToggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
  };

  return (
    <div className="home-layout">
      <Navbar
        language={language}
        onLanguageChange={setLanguage}
        theme={theme}
        onThemeToggle={handleThemeToggle}
      />

      <main className="home-main">
        {activeTab === 'model' && (
          <div className="model-page">
            {interactionMode === 'voice' ? (
              <>
                {/* Mute button - only visible during active session */}
                <div className="mute-area">
                  <VoiceButton
                    isSessionActive={voiceChat.isSessionActive}
                    isMuted={voiceChat.isMuted}
                    onToggleMute={voiceChat.toggleMute}
                  />
                </div>

                {/* Robot Avatar - tap to start/stop session */}
                <div className="robot-area">
                  <RobotAvatar
                    isSessionActive={voiceChat.isSessionActive}
                    status={voiceChat.status}
                    isListening={voiceChat.isListening}
                    isSpeaking={voiceChat.isSpeaking}
                    onClick={voiceChat.toggleSession}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Chat mode: full chat history + input */}
                <div className="chat-mode-content">
                  <ChatHistory />
                </div>
                <div className="bottom-section">
                  <div className="input-area">
                    <ChatInput />
                  </div>
                </div>
              </>
            )}

            {/* Mode switch: pinned above bottom nav */}
            <div className="mode-switch">
              <button
                className={`mode-option ${interactionMode === 'voice' ? 'active' : ''}`}
                onClick={() => setInteractionMode('voice')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
                Voice
              </button>
              <button
                className={`mode-option ${interactionMode === 'chat' ? 'active' : ''}`}
                onClick={() => setInteractionMode('chat')}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Chat
              </button>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && <CalendarPage />}

        {activeTab === 'expenses' && <ExpensesPage />}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}

export default HomePage;
