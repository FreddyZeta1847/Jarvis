import React from 'react';
import './EmailCard.css';

function formatRelativeDate(dateStr) {
  if (!dateStr) return '';

  const cleaned = String(dateStr).replace(/\s*\([^)]*\)\s*$/, '');
  const date = new Date(cleaned);

  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  ) {
    return 'Yesterday';
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getSenderName(from) {
  if (!from) return 'Unknown';
  const match = from.match(/^([^<]+)</);
  if (match) return match[1].trim();
  return from;
}

function EmailCard({ email, onClick }) {
  const isUnread = Array.isArray(email.labelIds) && email.labelIds.includes('UNREAD');

  const sender = getSenderName(email.from);
  const subject = email.subject || '(no subject)';
  const snippet = email.snippet || '';
  const dateStr = formatRelativeDate(email.date);

  return (
    <div
      className={`email-card ${isUnread ? 'email-card--unread' : ''}`}
      onClick={() => onClick(email)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(email)}
    >
      <div className="email-card-body">
        <div className="email-card-top">
          <span className="email-sender">{sender}</span>
          {dateStr && <span className="email-date">{dateStr}</span>}
        </div>
        <span className="email-subject">{subject}</span>
        {snippet ? <span className="email-snippet">{snippet}</span> : null}
      </div>
    </div>
  );
}

export default EmailCard;
