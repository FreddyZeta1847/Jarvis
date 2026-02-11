import React from 'react';
import { useApp } from './context/AppContext.jsx';
import LoginPage from './pages/LoginPage/LoginPage.jsx';
import HomePage from './pages/HomePage/HomePage.jsx';
import './styles/App.css';

function App() {
  const { isAuthenticated, isLoading } = useApp();

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading Jarvis...</p>
      </div>
    );
  }

  return (
    <div className="app">
      {isAuthenticated ? <HomePage /> : <LoginPage />}
    </div>
  );
}

export default App;
