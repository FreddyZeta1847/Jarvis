import React, { useState, useEffect } from 'react';
import './ExpenseModal.css';

const PAYMENT_METHODS = [
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'transfer', label: 'Transfer' },
];

function ExpenseModal({ expense, categories, onSave, onClose }) {
  const isEdit = !!expense;

  const [form, setForm] = useState({
    amount: '',
    description: '',
    category: 'food',
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'card',
    currency: 'EUR',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (expense) {
      setForm({
        amount: String(expense.amount),
        description: expense.description,
        category: expense.category,
        date: expense.date,
        paymentMethod: expense.paymentMethod,
        currency: expense.currency,
      });
    }
  }, [expense]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await onSave(
        { ...form, amount: parseFloat(form.amount) },
        expense?.id
      );
    } finally {
      setSaving(false);
    }
  };

  const isValid = form.amount && parseFloat(form.amount) > 0 && form.description.trim();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Expense' : 'Add Expense'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Amount */}
          <div className="form-group">
            <label className="form-label">Amount</label>
            <div className="amount-input-wrapper">
              <input
                type="number"
                className="form-input amount-input"
                placeholder="0.00"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                autoFocus
              />
              <span className="amount-currency">EUR</span>
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              type="text"
              className="form-input"
              placeholder="What was it for?"
              maxLength={200}
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="form-label">Category</label>
            <div className="category-selector">
              {Object.entries(categories).map(([key, cat]) => (
                <button
                  key={key}
                  type="button"
                  className={`category-pill ${form.category === key ? 'active' : ''}`}
                  style={{ '--pill-color': cat.color }}
                  onClick={() => handleChange('category', key)}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="form-group">
            <label className="form-label">Date</label>
            <input
              type="date"
              className="form-input"
              value={form.date}
              onChange={(e) => handleChange('date', e.target.value)}
            />
          </div>

          {/* Payment Method */}
          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <div className="payment-selector">
              {PAYMENT_METHODS.map((pm) => (
                <button
                  key={pm.value}
                  type="button"
                  className={`payment-option ${form.paymentMethod === pm.value ? 'active' : ''}`}
                  onClick={() => handleChange('paymentMethod', pm.value)}
                >
                  {pm.label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={`modal-submit ${saving ? 'saving' : ''}`}
            disabled={!isValid || saving}
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Expense'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ExpenseModal;
