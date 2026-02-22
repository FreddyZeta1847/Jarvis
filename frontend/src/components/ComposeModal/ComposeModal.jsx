import React, { useState, useEffect } from 'react';
import './ComposeModal.css';

function ComposeModal({ replyTo, onSend, onClose }) {
  const isReply = !!replyTo;

  const [form, setForm] = useState({
    to: '',
    subject: '',
    body: '',
  });
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (replyTo) {
      setForm({
        to: replyTo.from || '',
        subject: replyTo.subject ? `Re: ${replyTo.subject}` : '',
        body: '',
      });
    }
  }, [replyTo]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!form.to.trim()) newErrors.to = 'Recipient is required';
    if (!form.subject.trim()) newErrors.subject = 'Subject is required';
    if (!form.body.trim()) newErrors.body = 'Message body is required';
    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSending(true);
    try {
      if (isReply) {
        await onSend({ body: form.body, emailId: replyTo.id });
      } else {
        await onSend({ to: form.to, subject: form.subject, body: form.body });
      }
    } finally {
      setSending(false);
    }
  };

  const isValid = form.to.trim() && form.subject.trim() && form.body.trim();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content compose-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isReply ? 'Reply' : 'New Email'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label className="form-label">To</label>
            <input
              type="email"
              className={`form-input ${errors.to ? 'form-input--error' : ''}`}
              placeholder="recipient@example.com"
              value={form.to}
              onChange={(e) => handleChange('to', e.target.value)}
              readOnly={isReply}
            />
            {errors.to && <span className="form-error">{errors.to}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Subject</label>
            <input
              type="text"
              className={`form-input ${errors.subject ? 'form-input--error' : ''}`}
              placeholder="Subject"
              maxLength={200}
              value={form.subject}
              onChange={(e) => handleChange('subject', e.target.value)}
              readOnly={isReply}
            />
            {errors.subject && <span className="form-error">{errors.subject}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Message</label>
            <textarea
              className={`form-input compose-body ${errors.body ? 'form-input--error' : ''}`}
              placeholder="Write your message..."
              value={form.body}
              onChange={(e) => handleChange('body', e.target.value)}
              autoFocus
            />
            {errors.body && <span className="form-error">{errors.body}</span>}
          </div>

          <button
            type="submit"
            className={`modal-submit ${sending ? 'saving' : ''}`}
            disabled={!isValid || sending}
          >
            {sending ? 'Sending...' : isReply ? 'Send Reply' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ComposeModal;
