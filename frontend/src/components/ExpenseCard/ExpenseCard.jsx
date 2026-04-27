import React, { useRef } from 'react';
import './ExpenseCard.css';

const LONG_PRESS_MS = 450;

function ExpenseCard({
  expense,
  categoryInfo,
  onEdit,
  onDelete,
  selectMode = false,
  selected = false,
  onToggleSelect,
  onLongPress,
}) {
  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const pressTimer = useRef(null);
  const longPressFired = useRef(false);

  const startPress = () => {
    longPressFired.current = false;
    pressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(35);
      }
      onLongPress?.(expense.id);
    }, LONG_PRESS_MS);
  };

  const cancelPress = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const handleBodyClick = () => {
    // If long-press already fired, swallow the trailing click
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (selectMode) {
      onToggleSelect?.(expense.id);
    } else {
      onEdit(expense);
    }
  };

  return (
    <div
      className={`expense-card${selectMode ? ' select-mode' : ''}${selected ? ' selected' : ''}`}
      style={{ '--cat-color': categoryInfo.color }}
    >
      <div className="expense-card-color-bar" />
      <div
        className="expense-card-body"
        onClick={handleBodyClick}
        onTouchStart={startPress}
        onTouchEnd={cancelPress}
        onTouchMove={cancelPress}
        onTouchCancel={cancelPress}
        onMouseDown={startPress}
        onMouseUp={cancelPress}
        onMouseLeave={cancelPress}
        onContextMenu={(e) => e.preventDefault()}
      >
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
      {selectMode ? (
        <div className="expense-select-indicator" aria-hidden="true">
          <div className={`expense-select-circle${selected ? ' checked' : ''}`}>
            {selected && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>
      ) : (
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
      )}
    </div>
  );
}

export default ExpenseCard;
