import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [activeAgent, setActiveAgent] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    // Check for existing token on mount
    const token = authService.getToken();
    if (token && authService.isTokenValid(token)) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = async (password) => {
    const success = await authService.login(password);
    if (success) {
      setIsAuthenticated(true);
    }
    return success;
  };

  const logout = () => {
    authService.logout();
    setIsAuthenticated(false);
    setMessages([]);
  };

  const addMessage = (message) => {
    setMessages(prev => [...prev, {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...message
    }]);
  };

  const value = {
    // Auth
    isAuthenticated,
    isLoading,
    login,
    logout,

    // Messages
    messages,
    addMessage,
    setMessages,

    // Agent state
    activeAgent,
    setActiveAgent,

    // Voice state
    isListening,
    setIsListening,
    isSpeaking,
    setIsSpeaking
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
