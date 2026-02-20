import React, { useState, useEffect } from 'react';
import './EventModal.css';

const COLOR_OPTIONS = [
  { name: 'lavender', color: '#7986cb' },
  { name: 'sage', color: '#33b679' },
  { name: 'grape', color: '#8e24aa' },
  { name: 'flamingo', color: '#e67c73' },
  { name: 'banana', color: '#f6bf26' },
  { name: 'tangerine', color: '#f4511e' },
  { name: 'peacock', color: '#039be5' },
  { name: 'graphite', color: '#616161' },
  { name: 'blueberry', color: '#3f51b5' },
  { name: 'basil', color: '#0b8043' },
  { name: 'tomato', color: '#d50000' },
];

function EventModal({ event, defaultDate, onSave, onClose }) {
  const isEdit = !!event;

  const [form, setForm] = useState({
    name: '',
    date: defaultDate || new Date().toISOString().split('T')[0],
    startTime: '09:00',
    endTime: '10:00',
    description: '',
    location: '',
    color: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (event) {
      const startDt = event.start?.dateTime || event.start?.date || '';
      const endDt = event.end?.dateTime || event.end?.date || '';
      const date = startDt.slice(0, 10);
      const startTime = startDt.includes('T') ? startDt.slice(11, 16) : '09:00';
      const endTime = endDt.includes('T') ? endDt.slice(11, 16) : '10:00';

      // Map colorId back to color name
      const colorIdToName = {
        '1': 'lavender', '2': 'sage', '3': 'grape', '4': 'flamingo',
        '5': 'banana', '6': 'tangerine', '7': 'peacock', '8': 'graphite',
        '9': 'blueberry', '10': 'basil', '11': 'tomato',
      };

      setForm({
        name: event.summary || '',
        date,
        startTime,
        endTime,
        description: event.description || '',
        location: event.location || '',
        color: colorIdToName[event.colorId] || '',
      });
    }
  }, [event]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        start: `${form.date}T${form.startTime}:00`,
        end: `${form.date}T${form.endTime}:00`,
        description: form.description || undefined,
        location: form.location || undefined,
        color: form.color || undefined,
      };
      await onSave(payload, event?.id);
    } finally {
      setSaving(false);
    }
  };

  const isValid = form.name.trim() && form.date && form.startTime;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Event' : 'New Event'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">Event Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="What's happening?"
              maxLength={200}
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-input"
              value={form.date}
              onChange={(e) => handleChange('date', e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group form-group-half">
              <label className="form-label">Start</label>
              <input
                type="time"
                className="form-input"
                value={form.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
              />
            </div>
            <div className="form-group form-group-half">
              <label className="form-label">End</label>
              <input
                type="time"
                className="form-input"
                value={form.endTime}
                onChange={(e) => handleChange('endTime', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Color</label>
            <div className="color-picker">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.name}
                  type="button"
                  className={`color-dot${form.color === opt.name ? ' selected' : ''}`}
                  style={{ backgroundColor: opt.color }}
                  onClick={() => handleChange('color', form.color === opt.name ? '' : opt.name)}
                  aria-label={opt.name}
                  title={opt.name}
                />
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              type="text"
              className="form-input"
              placeholder="Where?"
              value={form.location}
              onChange={(e) => handleChange('location', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input form-textarea"
              placeholder="Notes..."
              rows={3}
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </div>

          <button
            type="submit"
            className={`modal-submit ${saving ? 'saving' : ''}`}
            disabled={!isValid || saving}
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Event'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EventModal;
