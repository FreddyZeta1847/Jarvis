import React, { useState, useMemo } from 'react';
import ExpenseCard from '../ExpenseCard/ExpenseCard.jsx';
import ExpensesDashboard from '../ExpensesDashboard/ExpensesDashboard.jsx';
import ExpenseModal from '../ExpenseModal/ExpenseModal.jsx';
import AddToFolderModal from '../AddToFolderModal/AddToFolderModal.jsx';
import './FolderDetailView.css';

function FolderDetailView({
  folder,
  expenses,
  allExpenses,
  categories,
  onBack,
  onEditFolder,
  onDeleteFolder,
  onAddExpense,
  onEditExpense,
  onDeleteExpense,
  onAssignExpenses,
  onRemoveExpense,
  onSaveExpense,
}) {
  const [view, setView] = useState('list');
  const [filter, setFilter] = useState(null);
  const [fabOpen, setFabOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);

  const getCatKey = (e) => (e.category || 'other').toLowerCase();

  const filteredExpenses = useMemo(() => {
    if (!filter) return expenses;
    return expenses.filter(e => getCatKey(e) === filter);
  }, [expenses, filter]);

  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + e.amount, 0),
    [expenses]
  );

  const unassignedExpenses = useMemo(() => {
    return allExpenses
      .filter(e => !e.folderId)
      .map(e => ({
        ...e,
        _catColor: categories[getCatKey(e)]?.color || '#64748b',
      }));
  }, [allExpenses, categories]);

  const handleNewExpense = () => {
    setFabOpen(false);
    setEditingExpense(null);
    setExpenseModalOpen(true);
  };

  const handleAddExisting = () => {
    setFabOpen(false);
    setAddModalOpen(true);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
    setExpenseModalOpen(true);
  };

  const handleSaveExpense = async (formData, expenseId) => {
    await onSaveExpense({ ...formData, folderId: folder.id }, expenseId);
    setExpenseModalOpen(false);
    setEditingExpense(null);
  };

  const handleAssign = async (ids) => {
    await onAssignExpenses(ids);
    setAddModalOpen(false);
  };

  return (
    <div className="folder-detail">
      {/* Background */}
      {folder.imageUrl ? (
        <div
          className="folder-detail-bg"
          style={{ backgroundImage: `url(${folder.imageUrl})` }}
        />
      ) : (
        <div className="folder-detail-bg folder-detail-bg-solid" />
      )}

      {/* Header over background — same layout as expenses page */}
      <div className="folder-detail-header">
        <div className="folder-detail-header-left">
          <button className="folder-back-btn" onClick={onBack} aria-label="Back">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="folder-detail-title-area">
            <h1 className="folder-detail-name">{folder.name}</h1>
            <span className="folder-detail-total">{total.toFixed(2)} EUR</span>
          </div>
        </div>
        <div className="folder-detail-header-right">
          <span className="folder-detail-count">
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''}
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

      {/* Content area */}
      <div className="folder-detail-content">

        {view === 'list' && (
          <>
            <div className="category-filter-bar">
              <button
                className={`filter-pill ${!filter ? 'active' : ''}`}
                onClick={() => setFilter(null)}
              >
                All
              </button>
              {Object.entries(categories).map(([key, cat]) => (
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

            <div className="folder-expense-list">
              {filteredExpenses.length === 0 ? (
                <div className="expenses-empty">
                  <p>{filter ? 'No matching expenses' : 'No expenses in this folder'}</p>
                </div>
              ) : (
                filteredExpenses.map((expense) => (
                  <div key={expense.id} className="folder-expense-row">
                    <ExpenseCard
                      expense={expense}
                      categoryInfo={categories[getCatKey(expense)] || { label: expense.category, color: '#64748b' }}
                      onEdit={handleEditExpense}
                      onDelete={onDeleteExpense}
                    />
                    <button
                      className="folder-remove-btn"
                      onClick={() => onRemoveExpense(expense.id)}
                      aria-label="Remove from folder"
                      title="Remove from folder"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        {view === 'dashboard' && (
          <ExpensesDashboard expenses={expenses} categories={categories} hidePeriodFilter />
        )}
      </div>

      {/* FAB with mini-menu */}
      <div className="folder-fab-wrapper">
        {fabOpen && (
          <div className="folder-fab-menu">
            <button className="folder-fab-option" onClick={handleNewExpense}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span>New Expense</span>
            </button>
            <button className="folder-fab-option" onClick={handleAddExisting}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="8.5" cy="7" r="4" />
                <line x1="20" y1="8" x2="20" y2="14" />
                <line x1="23" y1="11" x2="17" y2="11" />
              </svg>
              <span>Add Existing</span>
            </button>
          </div>
        )}
        {fabOpen && (
          <div className="folder-fab-backdrop" onClick={() => setFabOpen(false)} />
        )}
        <button
          className={`fab-add folder-fab-main ${fabOpen ? 'fab-active' : ''}`}
          onClick={() => setFabOpen(!fabOpen)}
          aria-label={fabOpen ? 'Close menu' : 'Add'}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Expense modal */}
      {expenseModalOpen && (
        <ExpenseModal
          expense={editingExpense}
          categories={categories}
          onSave={handleSaveExpense}
          onClose={() => {
            setExpenseModalOpen(false);
            setEditingExpense(null);
          }}
        />
      )}

      {/* Add existing expenses modal */}
      {addModalOpen && (
        <AddToFolderModal
          expenses={unassignedExpenses}
          onAssign={handleAssign}
          onClose={() => setAddModalOpen(false)}
        />
      )}
    </div>
  );
}

export default FolderDetailView;
