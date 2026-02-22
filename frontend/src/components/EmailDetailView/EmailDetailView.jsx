import React from 'react';
import './EmailDetailView.css';

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  // Strip RFC 2822 trailing timezone comments like "(UTC)" before parsing
  const cleaned = String(dateStr).replace(/\s*\([^)]*\)\s*$/, '');
  const date = new Date(cleaned);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function EmailDetailView({ email, onBack, onReply }) {
  const subject = email.subject || '(no subject)';
  const from = email.from || '';
  const to = email.to || '';
  const body = email.body || email.snippet || '';
  const dateLabel = formatFullDate(email.date);

  return (
    <div className="email-detail">
      <div className="email-detail-header">
        <button className="email-back-btn" onClick={onBack} aria-label="Back">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <h1 className="email-detail-subject">{subject}</h1>
      </div>

      <div className="email-detail-content">
        <div className="email-meta">
          {from && (
            <div className="email-meta-row">
              <span className="email-meta-label">From</span>
              <span className="email-meta-value">{from}</span>
            </div>
          )}
          {to && (
            <div className="email-meta-row">
              <span className="email-meta-label">To</span>
              <span className="email-meta-value">{to}</span>
            </div>
          )}
          {dateLabel && (
            <div className="email-meta-row">
              <span className="email-meta-label">Date</span>
              <span className="email-meta-value">{dateLabel}</span>
            </div>
          )}
        </div>

        <div className="email-body">
          <p className="email-body-text">{body}</p>
        </div>
      </div>

      <div className="email-detail-footer">
        <button className="email-reply-btn" onClick={() => onReply(email)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 17 4 12 9 7" />
            <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
          </svg>
          Reply
        </button>
      </div>
    </div>
  );
}

export default EmailDetailView;
