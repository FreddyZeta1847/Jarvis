import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../services/api.js';
import ExpenseCard from '../../components/ExpenseCard/ExpenseCard.jsx';
import ExpenseModal from '../../components/ExpenseModal/ExpenseModal.jsx';
import ExpensesDashboard from '../../components/ExpensesDashboard/ExpensesDashboard.jsx';
import './ExpensesPage.css';

const CATEGORIES = {
  shopping:     { label: 'Shopping',     color: '#a78bfa' },
  transport:    { label: 'Transport',    color: '#3b82f6' },
  food:         { label: 'Food',         color: '#18d42b' },
  presents:     { label: 'Presents',     color: '#f472b6' },
  car:          { label: 'Car',          color: '#64748b' },
  medical:      { label: 'Medical',      color: '#ef4444' },
  subscription: { label: 'Subscription', color: '#fbbf24' },
};

function ExpensesPage() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [view, setView] = useState('list');

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getExpenses({});
      setExpenses(data.expenses);
    } catch (err) {
      console.error('Failed to load expenses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  // Normalize category for consistent lookups
  const getCatKey = (e) => (e.category || 'other').toLowerCase();

  // Client-side category filter for list view
  const filteredExpenses = useMemo(() => {
    if (!filter) return expenses;
    return expenses.filter(e => getCatKey(e) === filter);
  }, [expenses, filter]);

  const total = useMemo(
    () => filteredExpenses.reduce((sum, e) => sum + e.amount, 0),
    [filteredExpenses]
  );

  const handleAdd = () => {
    setEditingExpense(null);
    setModalOpen(true);
  };

  const handleEdit = (expense) => {
    setEditingExpense(expense);
    setModalOpen(true);
  };

  const handleSave = async (formData, expenseId) => {
    if (expenseId) {
      await api.updateExpense(expenseId, formData);
    } else {
      await api.createExpense(formData);
    }
    setModalOpen(false);
    setEditingExpense(null);
    fetchExpenses();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  return (
    <div className="expenses-page">
      {/* Header with inline view toggle */}
      <div className="expenses-header">
        <div className="expenses-header-left">
          <span className="total-amount">{total.toFixed(2)}</span>
          <span className="total-currency">EUR</span>
        </div>
        <div className="expenses-header-right">
          <span className="total-count">
            {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
          </span>
          <div className="view-toggle">
            <button
              className={`view-toggle-btn ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
              aria-label="List view"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button
              className={`view-toggle-btn ${view === 'dashboard' ? 'active' : ''}`}
              onClick={() => setView('dashboard')}
              aria-label="Dashboard view"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* List view */}
      {view === 'list' && (
        <>
          {/* Category filter bar */}
          <div className="category-filter-bar">
            <button
              className={`filter-pill ${!filter ? 'active' : ''}`}
              onClick={() => setFilter(null)}
            >
              All
            </button>
            {Object.entries(CATEGORIES).map(([key, cat]) => (
              <button
                key={key}
                className={`filter-pill ${filter === key ? 'active' : ''}`}
                style={{ '--pill-color': cat.color }}
                onClick={() => setFilter(filter === key ? null : key)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Expense list */}
          <div className="expenses-list">
            {loading ? (
              <div className="expenses-empty">
                <p>Loading...</p>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="expenses-empty">
                <p>{filter ? `No ${CATEGORIES[filter]?.label || filter} expenses` : 'No expenses yet'}</p>
              </div>
            ) : (
              filteredExpenses.map((expense) => (
                <ExpenseCard
                  key={expense.id}
                  expense={expense}
                  categoryInfo={CATEGORIES[getCatKey(expense)] || { label: expense.category, color: '#64748b' }}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Dashboard view */}
      {view === 'dashboard' && (
        loading ? (
          <div className="expenses-empty">
            <p>Loading...</p>
          </div>
        ) : (
          <ExpensesDashboard expenses={expenses} categories={CATEGORIES} />
        )
      )}

      {/* FAB: Add expense */}
      <button className="fab-add" onClick={handleAdd} aria-label="Add expense">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Modal */}
      {modalOpen && (
        <ExpenseModal
          expense={editingExpense}
          categories={CATEGORIES}
          onSave={handleSave}
          onClose={() => {
            setModalOpen(false);
            setEditingExpense(null);
          }}
        />
      )}
    </div>
  );
}

export default ExpensesPage;
