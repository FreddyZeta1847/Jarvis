import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import './LoginPage.css';

function LoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useApp();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(password);

    if (!success) {
      setError('Invalid password');
      setPassword('');
    }
    setIsLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>JARVIS</h1>
          <p>Personal AI Assistant</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" disabled={isLoading || !password}>
            {isLoading ? 'Authenticating...' : 'Access'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
