import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../services/api.js';
import EmailCard from '../../components/EmailCard/EmailCard.jsx';
import EmailDetailView from '../../components/EmailDetailView/EmailDetailView.jsx';
import ComposeModal from '../../components/ComposeModal/ComposeModal.jsx';
import './EmailsPage.css';

function SkeletonCard() {
  return (
    <div className="email-skeleton">
      <div className="email-skeleton-body">
        <div className="email-skeleton-top">
          <div className="skeleton-line skeleton-sender" />
          <div className="skeleton-line skeleton-date" />
        </div>
        <div className="skeleton-line skeleton-subject" />
        <div className="skeleton-line skeleton-snippet" />
      </div>
    </div>
  );
}

function EmailsPage() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const fetchEmails = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const data = await api.getEmails({ q, maxResults: 20 });
      setEmails(data.emails || []);
    } catch (err) {
      console.error('Failed to load emails:', err);
      setEmails([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails(searchQuery);
  }, [fetchEmails, searchQuery]);

  const handleEmailClick = async (email) => {
    try {
      const data = await api.getEmail(email.id);
      setSelectedEmail(data.email || data);
    } catch (err) {
      console.error('Failed to load email:', err);
      setSelectedEmail(email);
    }
  };

  const handleBack = () => {
    setSelectedEmail(null);
  };

  const handleCompose = () => {
    setReplyTo(null);
    setComposeOpen(true);
  };

  const handleReply = (email) => {
    setReplyTo(email);
    setComposeOpen(true);
  };

  const handleSend = async (data) => {
    try {
      if (replyTo) {
        await api.replyToEmail(replyTo.id, { body: data.body });
      } else {
        await api.sendEmail({ to: data.to, subject: data.subject, body: data.body });
      }
    } catch (err) {
      console.error('Failed to send email:', err);
    } finally {
      setComposeOpen(false);
      setReplyTo(null);
      fetchEmails(searchQuery);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchOpen(false);
  };

  const toggleSearch = () => {
    if (searchOpen) {
      handleClearSearch();
    } else {
      setSearchOpen(true);
    }
  };

  // Detail view
  if (selectedEmail !== null) {
    return (
      <div className="emails-page emails-page-no-pad">
        <EmailDetailView
          email={selectedEmail}
          onBack={handleBack}
          onReply={handleReply}
        />
        {composeOpen && (
          <ComposeModal
            replyTo={replyTo}
            onSend={handleSend}
            onClose={() => { setComposeOpen(false); setReplyTo(null); }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="emails-page">
      {/* Header */}
      <div className="emails-header">
        <div className="emails-header-left">
          <span className="emails-title">Inbox</span>
          <span className="emails-count">
            {emails.length} email{emails.length !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          className={`search-toggle-btn ${searchOpen ? 'active' : ''}`}
          onClick={toggleSearch}
          aria-label="Toggle search"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="emails-search-bar">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search emails..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button className="search-clear-btn" onClick={handleClearSearch} aria-label="Clear search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Email list */}
      <div className="emails-list">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : emails.length === 0 ? (
          <div className="emails-empty">
            <svg className="emails-empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            <p className="emails-empty-title">{searchQuery ? 'No emails found' : 'Your inbox is empty'}</p>
            <p className="emails-empty-subtitle">{searchQuery ? 'Try a different search query' : 'New emails will appear here'}</p>
          </div>
        ) : (
          emails.map((email) => (
            <EmailCard
              key={email.id}
              email={email}
              onClick={handleEmailClick}
            />
          ))
        )}
      </div>

      {/* FAB compose — pencil icon */}
      <button className="fab-add emails-fab" onClick={handleCompose} aria-label="Compose email">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
        </svg>
      </button>

      {/* Compose Modal */}
      {composeOpen && (
        <ComposeModal
          replyTo={replyTo}
          onSend={handleSend}
          onClose={() => { setComposeOpen(false); setReplyTo(null); }}
        />
      )}
    </div>
  );
}

export default EmailsPage;
