import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { api } from '../../services/api.js';
import EventModal from '../../components/EventModal/EventModal.jsx';
import './CalendarPage.css';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const HOUR_HEIGHT = 60; // px per hour

// Google Calendar colorId → color mapping
const EVENT_COLORS = {
  '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
  '5': '#f6bf26', '6': '#f4511e', '7': '#039be5', '8': '#616161',
  '9': '#3f51b5', '10': '#0b8043', '11': '#d50000',
};
const DEFAULT_EVENT_COLOR = '#039be5';

const COLOR_NAMES = {
  '1': 'Lavender', '2': 'Sage', '3': 'Grape', '4': 'Flamingo',
  '5': 'Banana', '6': 'Tangerine', '7': 'Peacock', '8': 'Graphite',
  '9': 'Blueberry', '10': 'Basil', '11': 'Tomato',
};

function getMinutesFromDt(dtString) {
  if (!dtString || !dtString.includes('T')) return null;
  const [h, m] = dtString.slice(11, 16).split(':').map(Number);
  return h * 60 + m;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOffset(year, month) {
  // 0=Sun, we want Mon=0
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatTime(dtString) {
  if (!dtString || !dtString.includes('T')) return '';
  return dtString.slice(11, 16);
}

function CalendarPage() {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('month'); // 'month' | 'day'
  const [selectedDate, setSelectedDate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [detailEvent, setDetailEvent] = useState(null);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOffset = getFirstDayOffset(year, month);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = `${year}-${pad2(month + 1)}-01`;
      const endDate = `${year}-${pad2(month + 1)}-${pad2(daysInMonth)}`;
      const data = await api.getCalendarEvents({ startDate, endDate });
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to load calendar events:', err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [year, month, daysInMonth]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Map day number → event count
  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      const dt = ev.start?.dateTime || ev.start?.date || '';
      const dayStr = dt.slice(8, 10);
      const day = parseInt(dayStr, 10);
      if (day) {
        map[day] = (map[day] || 0) + 1;
      }
    });
    return map;
  }, [events]);

  const timelineRef = useRef(null);

  // Events for selected day with position info
  const dayEvents = useMemo(() => {
    if (!selectedDate) return [];
    const dayNum = selectedDate.getDate();
    return events
      .filter((ev) => {
        const dt = ev.start?.dateTime || ev.start?.date || '';
        return parseInt(dt.slice(8, 10), 10) === dayNum;
      })
      .map((ev) => {
        const startMin = getMinutesFromDt(ev.start?.dateTime) ?? 0;
        const endMin = getMinutesFromDt(ev.end?.dateTime) ?? startMin + 60;
        const duration = Math.max(endMin - startMin, 15); // min 15min visual
        const color = EVENT_COLORS[ev.colorId] || DEFAULT_EVENT_COLOR;
        return { ...ev, startMin, endMin, duration, color };
      })
      .sort((a, b) => a.startMin - b.startMin);
  }, [events, selectedDate]);

  // Current time indicator position (minutes from midnight)
  const [nowMinutes, setNowMinutes] = useState(() => {
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Check if selected day is today
  const isSelectedToday = selectedDate &&
    selectedDate.getDate() === today.getDate() &&
    selectedDate.getMonth() === today.getMonth() &&
    selectedDate.getFullYear() === today.getFullYear();

  // Scroll to current time or first event when day view opens
  useEffect(() => {
    if (view === 'day' && timelineRef.current) {
      const scrollTarget = isSelectedToday
        ? (nowMinutes / 60) * HOUR_HEIGHT - 100
        : dayEvents.length > 0
          ? (dayEvents[0].startMin / 60) * HOUR_HEIGHT - 40
          : 7 * HOUR_HEIGHT; // default scroll to 7:00
      timelineRef.current.scrollTop = Math.max(0, scrollTarget);
    }
  }, [view, selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day) => {
    const date = new Date(year, month, day);
    setSelectedDate(date);
    setView('day');
  };

  const handleBackToMonth = () => {
    setView('month');
    setSelectedDate(null);
  };

  const handleAdd = () => {
    setEditingEvent(null);
    setModalOpen(true);
  };

  const handleEventClick = (ev) => {
    setDetailEvent(ev);
  };

  const handleCloseDetail = () => {
    setDetailEvent(null);
  };

  const handleEditFromDetail = () => {
    setEditingEvent(detailEvent);
    setDetailEvent(null);
    setModalOpen(true);
  };

  const handleDeleteFromDetail = async () => {
    if (!detailEvent) return;
    try {
      await api.deleteCalendarEvent(detailEvent.id);
      setDetailEvent(null);
      fetchEvents();
    } catch (err) {
      console.error('Failed to delete event:', err);
    }
  };

  const handleSave = async (payload, eventId) => {
    if (eventId) {
      await api.updateCalendarEvent(eventId, payload);
    } else {
      await api.createCalendarEvent(payload);
    }
    setModalOpen(false);
    setEditingEvent(null);
    fetchEvents();
  };

  const isToday = (day) => {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  // Build grid cells
  const gridCells = [];

  // Previous month trailing days
  const prevMonthDays = getDaysInMonth(year, month - 1);
  for (let i = 0; i < firstDayOffset; i++) {
    const day = prevMonthDays - firstDayOffset + 1 + i;
    gridCells.push(
      <div key={`prev-${i}`} className="calendar-day other-month">
        <span className="day-number">{day}</span>
      </div>
    );
  }

  // Current month day cells
  for (let day = 1; day <= daysInMonth; day++) {
    const count = eventsByDay[day] || 0;
    gridCells.push(
      <button
        key={day}
        className={`calendar-day${isToday(day) ? ' today' : ''}`}
        onClick={() => handleDayClick(day)}
      >
        <span className="day-number">{day}</span>
        {count > 0 && <span className="event-badge">+{count}</span>}
      </button>
    );
  }

  // Next month leading days to fill last row
  const totalCells = gridCells.length;
  const remainder = totalCells % 7;
  if (remainder > 0) {
    const needed = 7 - remainder;
    for (let i = 1; i <= needed; i++) {
      gridCells.push(
        <div key={`next-${i}`} className="calendar-day other-month">
          <span className="day-number">{i}</span>
        </div>
      );
    }
  }

  // Format selected date for day view header
  const formatDayHeader = (date) => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  // Detail event color
  const detailColor = detailEvent
    ? EVENT_COLORS[detailEvent.colorId] || DEFAULT_EVENT_COLOR
    : DEFAULT_EVENT_COLOR;

  return (
    <div className="calendar-page">
      {view === 'month' && (
        <>
          {/* Month header */}
          <div className="calendar-header">
            <button className="month-nav" onClick={goToPrevMonth} aria-label="Previous month">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="month-title">{MONTH_NAMES[month]} {year}</span>
            <button className="month-nav" onClick={goToNextMonth} aria-label="Next month">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 6 15 12 9 18" />
              </svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="calendar-weekdays">
            {WEEKDAYS.map((d, i) => (
              <span key={i} className="weekday-label">{d}</span>
            ))}
          </div>

          {/* Day grid */}
          <div className="calendar-grid">
            {gridCells}
          </div>

          {loading && (
            <div className="calendar-loading">
              <p>Loading events...</p>
            </div>
          )}
        </>
      )}

      {view === 'day' && selectedDate && (
        <div className="day-view">
          {/* Day view header */}
          <div className="day-view-header">
            <button className="day-back" onClick={handleBackToMonth} aria-label="Back to month">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="day-title">{formatDayHeader(selectedDate)}</span>
          </div>

          {/* Hour grid */}
          <div className="day-timeline" ref={timelineRef}>
            <div className="hour-grid" style={{ height: 24 * HOUR_HEIGHT }}>
              {/* Hour lines & labels */}
              {Array.from({ length: 24 }, (_, h) => (
                <div
                  key={h}
                  className="hour-row"
                  style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                >
                  <span className="hour-label">{pad2(h)}:00</span>
                  <div className="hour-line" />
                </div>
              ))}

              {/* Event blocks */}
              {dayEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="event-block"
                  style={{
                    top: (ev.startMin / 60) * HOUR_HEIGHT,
                    height: (ev.duration / 60) * HOUR_HEIGHT,
                    backgroundColor: ev.color,
                  }}
                  onClick={() => handleEventClick(ev)}
                >
                  <span className="event-block-name">{ev.summary || 'Untitled'}</span>
                </div>
              ))}

              {/* Current time indicator */}
              {isSelectedToday && (
                <div
                  className="now-indicator"
                  style={{ top: (nowMinutes / 60) * HOUR_HEIGHT }}
                >
                  <div className="now-dot" />
                  <div className="now-line" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FAB */}
      <button className="fab-add" onClick={handleAdd} aria-label="Add event">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Event Detail Overlay */}
      {detailEvent && (
        <div className="modal-overlay" onClick={handleCloseDetail}>
          <div className="event-detail" onClick={(e) => e.stopPropagation()}>
            {/* Color bar */}
            <div className="event-detail-bar" style={{ backgroundColor: detailColor }} />

            <div className="event-detail-body">
              {/* Close button */}
              <button className="event-detail-close" onClick={handleCloseDetail} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              <h2 className="event-detail-title">{detailEvent.summary || 'Untitled'}</h2>

              {/* Time */}
              <div className="event-detail-row">
                <svg className="event-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span>
                  {formatTime(detailEvent.start?.dateTime)}
                  {detailEvent.end?.dateTime && ` - ${formatTime(detailEvent.end.dateTime)}`}
                </span>
              </div>

              {/* Location */}
              {detailEvent.location && (
                <div className="event-detail-row">
                  <svg className="event-detail-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <span>{detailEvent.location}</span>
                </div>
              )}

              {/* Color */}
              {detailEvent.colorId && (
                <div className="event-detail-row">
                  <div className="event-detail-color-dot" style={{ backgroundColor: detailColor }} />
                  <span>{COLOR_NAMES[detailEvent.colorId] || 'Custom'}</span>
                </div>
              )}

              {/* Description */}
              {detailEvent.description && (
                <div className="event-detail-desc">{detailEvent.description}</div>
              )}

              {/* Actions */}
              <div className="event-detail-actions">
                <button className="event-detail-btn edit" onClick={handleEditFromDetail}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </button>
                <button className="event-detail-btn delete" onClick={handleDeleteFromDetail}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Modal (create/edit) */}
      {modalOpen && (
        <EventModal
          event={editingEvent}
          defaultDate={
            selectedDate
              ? `${selectedDate.getFullYear()}-${pad2(selectedDate.getMonth() + 1)}-${pad2(selectedDate.getDate())}`
              : undefined
          }
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingEvent(null); }}
        />
      )}
    </div>
  );
}

export default CalendarPage;
