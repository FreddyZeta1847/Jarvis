import React from 'react';
import { THEMES } from '../../constants/themes';
import { useApp } from '../../context/AppContext.jsx';
import './ThemePicker.css';

function ThemePicker({ onClose }) {
  const { theme, setTheme } = useApp();

  const handleSelect = (themeName) => {
    setTheme(themeName);
  };

  return (
    <div className="theme-overlay" onClick={onClose}>
      <div className="theme-picker" onClick={(e) => e.stopPropagation()}>
        <div className="theme-picker-header">
          <h2>Theme</h2>
          <button className="theme-picker-close" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="theme-grid">
          {THEMES.map((t) => (
            <button
              key={t.name}
              className={`theme-card ${theme === t.name ? 'active' : ''}`}
              onClick={() => handleSelect(t.name)}
            >
              <div className="theme-colors">
                <div
                  className="theme-color-bar"
                  style={{ background: t.colors.bgPrimary }}
                />
                <div
                  className="theme-color-bar"
                  style={{ background: t.colors.accent }}
                />
                <div
                  className="theme-color-bar"
                  style={{ background: t.colors.textPrimary }}
                />
                <div
                  className="theme-color-bar"
                  style={{ background: t.colors.textSecondary }}
                />
              </div>
              <span className="theme-card-name">{t.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ThemePicker;
