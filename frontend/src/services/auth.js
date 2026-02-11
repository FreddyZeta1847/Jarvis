const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const TOKEN_KEY = 'jarvis_token';

export const authService = {
  async login(password) {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      localStorage.setItem(TOKEN_KEY, data.access_token);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  },

  logout() {
    localStorage.removeItem(TOKEN_KEY);
  },

  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  isTokenValid(token) {     // if the token is expired i dont pass it to the backend, i check it in the rontend and i gain a call
    if (!token) return false;

    try {
      // Decode JWT payload (base64)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      return Date.now() < expiry;
    } catch {
      return false;
    }
  }
};
