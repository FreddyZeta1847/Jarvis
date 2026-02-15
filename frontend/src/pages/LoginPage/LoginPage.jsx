import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import './LoginPage.css';

function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const { login } = useApp();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setShowError(false);
    setIsLoading(true);

    const success = await login(password);

    if (!success) {
      setError('Invalid password');
      setShowError(true);
      setPassword('');
      setIsLoading(false);
    } else {
      setIsSuccess(true);
      // Page will unmount/redirect after success
    }
  };

  return (
    <div className="login-container">
      {/* System Status Header */}
      <div className="system-status">
        <div className="status-indicator" aria-hidden="true"></div>
        <span>JARVIS AI SYSTEM</span>
      </div>

      {/* Welcome Text */}
      <div className="welcome-text">
        <h1>JARVIS</h1>
        <p>Personal AI Assistant</p>
      </div>

      {/* Authentication Panel */}
      <div className="auth-panel">
        <div className="shimmer-bar" aria-hidden="true"></div>
        <div className="panel-label">Authorization Required</div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-wrapper">
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter authorization code"
              disabled={isLoading || isSuccess}
              autoFocus
              className={showError ? 'shake' : ''}
            />
          </div>

          {error && (
            <div className="error-message" role="alert" aria-live="polite">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M8 1L1 15h14L8 1z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                <path d="M8 6v4M8 12v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || !password || isSuccess}
            className={`auth-button ${isSuccess ? 'success' : ''}`}
          >
            {isSuccess ? 'ACCESS GRANTED' : isLoading ? 'INITIALIZING' : 'INITIALIZE'}
            {isLoading && <span className="loading-dots" aria-hidden="true">
              <span>.</span><span>.</span><span>.</span>
            </span>}
          </button>
        </form>
      </div>

      {/* Footer */}
      <div className="login-footer">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <rect x="2" y="5" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M4 5V3.5C4 2.5 4.5 2 6 2s2 .5 2 1.5V5" stroke="currentColor" strokeWidth="1.5"/>
        </svg>
        <span>ENCRYPTED</span>
      </div>
    </div>
  );
}

export default LoginPage;
