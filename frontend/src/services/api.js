import { authService } from './auth.js';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function fetchWithAuth(url, options = {}) {
  const token = authService.getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    authService.logout();
    window.location.reload();
  }

  return response;
}

export const api = {
  async getSpeechToken() {
    const response = await fetchWithAuth('/api/speech-token');
    if (!response.ok) throw new Error('Failed to get speech token');
    return response.json();
  },

  async sendMessage(text) {
    const response = await fetchWithAuth('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: text }),
    });
    if (!response.ok) throw new Error('Failed to send message');
    return response.json();
  },

  async getConversationHistory() {
    const response = await fetchWithAuth('/api/conversations');
    if (!response.ok) throw new Error('Failed to fetch conversations');
    return response.json();
  },

  async getAgentStatus() {
    const response = await fetchWithAuth('/api/agents/status');
    if (!response.ok) throw new Error('Failed to get agent status');
    return response.json();
  },

  async getExpenses({ category, startDate, endDate } = {}) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    const qs = params.toString();
    const response = await fetchWithAuth(`/api/expenses${qs ? `?${qs}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch expenses');
    return response.json();
  },

  async createExpense(expense) {
    const response = await fetchWithAuth('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
    if (!response.ok) throw new Error('Failed to create expense');
    return response.json();
  },

  async updateExpense(id, updates) {
    const response = await fetchWithAuth(`/api/expenses/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update expense');
    return response.json();
  },

  async deleteExpense(id) {
    const response = await fetchWithAuth(`/api/expenses/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete expense');
  },

  async getCalendarEvents({ startDate, endDate, limit = 100 } = {}) {
    const params = new URLSearchParams();
    if (startDate) params.set('start_date', startDate);
    if (endDate) params.set('end_date', endDate);
    params.set('limit', String(limit));
    const qs = params.toString();
    const response = await fetchWithAuth(`/api/calendar/events${qs ? `?${qs}` : ''}`);
    if (!response.ok) throw new Error('Failed to fetch calendar events');
    return response.json();
  },

  async createCalendarEvent(event) {
    const response = await fetchWithAuth('/api/calendar/events', {
      method: 'POST',
      body: JSON.stringify(event),
    });
    if (!response.ok) throw new Error('Failed to create calendar event');
    return response.json();
  },

  async updateCalendarEvent(id, updates) {
    const response = await fetchWithAuth(`/api/calendar/events/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update calendar event');
    return response.json();
  },

  async deleteCalendarEvent(id) {
    const response = await fetchWithAuth(`/api/calendar/events/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete calendar event');
  },
};
