import { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api.js';

const REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes
const COORDS_KEY = 'jarvis_weather_coords';

function WeatherWidget() {
  const [weather, setWeather] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchWeather(lat, lon) {
      try {
        console.log('[Weather] Fetching weather for', lat, lon);
        const data = await api.getWeather(lat, lon);
        console.log('[Weather] Got data:', data);
        if (!cancelled) setWeather(data);
      } catch (err) {
        console.error('[Weather] Failed to fetch:', err);
      }
    }

    function startWithCoords(lat, lon) {
      localStorage.setItem(COORDS_KEY, JSON.stringify({ lat, lon }));
      fetchWeather(lat, lon);
      intervalRef.current = setInterval(() => fetchWeather(lat, lon), REFRESH_INTERVAL);
    }

    // Try cached coordinates first, then geolocation
    const cached = localStorage.getItem(COORDS_KEY);
    if (cached) {
      try {
        const { lat, lon } = JSON.parse(cached);
        startWithCoords(lat, lon);
      } catch {
        localStorage.removeItem(COORDS_KEY);
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          // Update with fresh coordinates
          if (intervalRef.current) clearInterval(intervalRef.current);
          startWithCoords(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn('[Weather] Geolocation denied:', err.message);
        },
        { timeout: 10000, maximumAge: 600000 }
      );
    }

    return () => {
      cancelled = true;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!weather) return null;

  const isWarm = weather.temp > 17;
  const isNight = weather.icon?.endsWith('n');
  const color = isWarm ? '#f59e0b' : '#60a5fa';

  return (
    <div className="weather-widget" style={{ borderColor: `${color}33` }}>
      <svg className="weather-icon" viewBox="0 0 24 24" fill="none" style={{ color }}>
        {isNight ? (
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor" />
        ) : (
          <>
            <circle cx="12" cy="12" r="5" fill="currentColor" />
            <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </>
        )}
      </svg>
      <span className="weather-temp" style={{ color }}>{weather.temp}°</span>
    </div>
  );
}

export default WeatherWidget;
