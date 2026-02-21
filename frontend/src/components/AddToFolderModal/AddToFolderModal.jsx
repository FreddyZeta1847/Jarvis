import React, { useState } from 'react';
import './AddToFolderModal.css';

function AddToFolderModal({ expenses, onAssign, onClose }) {
  const [selectedIds, setSelectedIds] = useState(new Set());

  const toggleExpense = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    onAssign(Array.from(selectedIds));
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Expenses</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="atf-list">
          {expenses.length === 0 ? (
            <div className="atf-empty">No unassigned expenses</div>
          ) : (
            expenses.map((exp) => (
              <label key={exp.id} className="atf-row" htmlFor={`atf-${exp.id}`}>
                <input
                  id={`atf-${exp.id}`}
                  type="checkbox"
                  className="atf-checkbox"
                  checked={selectedIds.has(exp.id)}
                  onChange={() => toggleExpense(exp.id)}
                />
                <span
                  className="atf-cat-dot"
                  style={{ background: exp._catColor || '#64748b' }}
                />
                <div className="atf-info">
                  <span className="atf-desc">{exp.description}</span>
                  <span className="atf-meta">
                    {formatDate(exp.date)}
                  </span>
                </div>
                <span className="atf-amount">
                  {exp.amount.toFixed(2)} {exp.currency}
                </span>
              </label>
            ))
          )}
        </div>

        <button
          className="modal-submit"
          disabled={selectedIds.size === 0}
          onClick={handleConfirm}
        >
          Add Selected ({selectedIds.size})
        </button>
      </div>
    </div>
  );
}

export default AddToFolderModal;
