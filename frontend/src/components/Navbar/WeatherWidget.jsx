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

  return (
    <div className="weather-widget">
      <img
        className="weather-icon"
        src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
        alt={weather.description}
      />
      <span className="weather-temp">{weather.temp}°</span>
    </div>
  );
}

export default WeatherWidget;
