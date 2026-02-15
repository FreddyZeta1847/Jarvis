import React from 'react';
import './ExpenseCard.css';

function ExpenseCard({ expense, categoryInfo, onEdit, onDelete }) {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="expense-card" style={{ '--cat-color': categoryInfo.color }}>
      <div className="expense-card-color-bar" />
      <div className="expense-card-body" onClick={() => onEdit(expense)}>
        <div className="expense-card-left">
          <span className="expense-description">{expense.description}</span>
          <span className="expense-date">{formatDate(expense.date)}</span>
        </div>
        <div className="expense-card-right">
          <span className="expense-amount">
            {expense.amount.toFixed(2)} {expense.currency}
          </span>
          <span
            className="expense-category-badge"
            style={{
              background: `${categoryInfo.color}22`,
              color: categoryInfo.color,
            }}
          >
            {categoryInfo.label}
          </span>
        </div>
      </div>
      <button
        className="expense-delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(expense.id);
        }}
        aria-label="Delete expense"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
        </svg>
      </button>
    </div>
  );
}

export default ExpenseCard;
