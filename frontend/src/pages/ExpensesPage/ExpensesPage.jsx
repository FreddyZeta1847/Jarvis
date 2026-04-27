import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../services/api.js';
import ExpenseCard from '../../components/ExpenseCard/ExpenseCard.jsx';
import ExpenseModal from '../../components/ExpenseModal/ExpenseModal.jsx';
import ExpensesDashboard from '../../components/ExpensesDashboard/ExpensesDashboard.jsx';
import FolderCard from '../../components/FolderCard/FolderCard.jsx';
import FolderModal from '../../components/FolderModal/FolderModal.jsx';
import FolderDetailView from '../../components/FolderDetailView/FolderDetailView.jsx';
import AddToFolderModal from '../../components/AddToFolderModal/AddToFolderModal.jsx';
import { useSwipe } from '../../hooks/useSwipe.js';
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

  // Multi-select state (list view only)
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Folder state
  const [folders, setFolders] = useState([]);
  const [activeFolderId, setActiveFolderId] = useState(null);
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [addToFolderModalOpen, setAddToFolderModalOpen] = useState(false);

  const VIEWS = ['list', 'dashboard', 'folders'];

  const expensesSwipe = useSwipe({
    onSwipeLeft: () => setView((v) => {
      const i = VIEWS.indexOf(v);
      return i < VIEWS.length - 1 ? VIEWS[i + 1] : v;
    }),
    onSwipeRight: () => setView((v) => {
      const i = VIEWS.indexOf(v);
      return i > 0 ? VIEWS[i - 1] : v;
    }),
  });

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

  const fetchFolders = useCallback(async () => {
    try {
      const data = await api.getFolders();
      setFolders(data.folders || data);
    } catch (err) {
      console.error('Failed to load folders:', err);
    }
  }, []);

  useEffect(() => {
    fetchExpenses();
    fetchFolders();
  }, [fetchExpenses, fetchFolders]);

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

  // Active folder object
  const activeFolder = useMemo(
    () => folders.find(f => f.id === activeFolderId) || null,
    [folders, activeFolderId]
  );

  // Expenses belonging to the active folder
  const folderExpenses = useMemo(
    () => activeFolderId ? expenses.filter(e => e.folderId === activeFolderId) : [],
    [expenses, activeFolderId]
  );

  // Unassigned expenses (no folderId)
  const unassignedExpenses = useMemo(
    () => expenses.filter(e => !e.folderId),
    [expenses]
  );

  // --- Expense handlers ---
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
    fetchFolders();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      fetchFolders();
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  // --- Select mode handlers ---
  const enterSelectMode = () => {
    setSelectMode(true);
    setSelectedIds(new Set());
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds(new Set(filteredExpenses.map((e) => e.id)));
  };

  // Long-press on a card enters select mode and pre-selects that card
  const handleLongPress = (id) => {
    if (!selectMode) {
      setSelectMode(true);
      setSelectedIds(new Set([id]));
    } else {
      toggleSelected(id);
    }
  };

  // Tap anywhere on the page that isn't a card or the select bar exits select mode
  const handlePageClick = (e) => {
    if (!selectMode) return;
    if (e.target.closest('.expense-card, .select-actions')) return;
    exitSelectMode();
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!window.confirm(`Delete ${count} expense${count !== 1 ? 's' : ''}?`)) return;
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => api.deleteExpense(id)));
      setExpenses((prev) => prev.filter((e) => !selectedIds.has(e.id)));
      fetchFolders();
      exitSelectMode();
    } catch (err) {
      console.error('Failed to delete expenses:', err);
    }
  };

  // Exit select mode automatically when leaving list view
  useEffect(() => {
    if (view !== 'list' && selectMode) exitSelectMode();
  }, [view, selectMode]);

  // --- Folder handlers ---
  const handleCreateFolder = async (formData) => {
    try {
      await api.createFolder(formData);
      setFolderModalOpen(false);
      setEditingFolder(null);
      fetchFolders();
    } catch (err) {
      console.error('Failed to create folder:', err);
    }
  };

  const handleUpdateFolder = async (formData) => {
    if (!editingFolder) return;
    try {
      await api.updateFolder(editingFolder.id, formData);
      setFolderModalOpen(false);
      setEditingFolder(null);
      fetchFolders();
    } catch (err) {
      console.error('Failed to update folder:', err);
    }
  };

  const handleDeleteFolder = async (id) => {
    if (!window.confirm('Delete this folder?')) return;
    try {
      await api.deleteFolder(id);
      if (activeFolderId === id) setActiveFolderId(null);
      setFolders((prev) => prev.filter((f) => f.id !== id));
      fetchExpenses();
    } catch (err) {
      console.error('Failed to delete folder:', err);
    }
  };

  const handleAssignExpenses = async (expenseIds) => {
    if (!activeFolderId) return;
    try {
      await api.assignExpensesToFolder(activeFolderId, expenseIds);
      setAddToFolderModalOpen(false);
      fetchExpenses();
      fetchFolders();
    } catch (err) {
      console.error('Failed to assign expenses:', err);
    }
  };

  const handleRemoveExpenseFromFolder = async (expenseId) => {
    if (!activeFolderId) return;
    try {
      await api.removeExpenseFromFolder(activeFolderId, expenseId);
      fetchExpenses();
      fetchFolders();
    } catch (err) {
      console.error('Failed to remove expense from folder:', err);
    }
  };

  const handleAddExpenseInFolder = () => {
    setEditingExpense(null);
    setModalOpen(true);
  };

  const handleSaveExpenseInFolder = async (formData, expenseId) => {
    // Auto-assign to active folder for new expenses
    if (!expenseId && activeFolderId) {
      formData.folderId = activeFolderId;
    }
    await handleSave(formData, expenseId);
  };

  // --- FAB behavior ---
  const handleFabClick = () => {
    if (view === 'folders' && !activeFolderId) {
      setEditingFolder(null);
      setFolderModalOpen(true);
    } else {
      handleAdd();
    }
  };

  // --- Render folder detail view ---
  if (activeFolderId !== null && activeFolder) {
    return (
      <div className="expenses-page expenses-page-no-pad">
        <FolderDetailView
          folder={activeFolder}
          expenses={folderExpenses}
          allExpenses={expenses}
          categories={CATEGORIES}
          onBack={() => setActiveFolderId(null)}
          onEditFolder={() => {
            setEditingFolder(activeFolder);
            setFolderModalOpen(true);
          }}
          onDeleteFolder={() => handleDeleteFolder(activeFolderId)}
          onAddExpense={handleAddExpenseInFolder}
          onEditExpense={handleEdit}
          onDeleteExpense={handleDelete}
          onAssignExpenses={handleAssignExpenses}
          onRemoveExpense={handleRemoveExpenseFromFolder}
          onSaveExpense={handleSaveExpenseInFolder}
          CATEGORIES={CATEGORIES}
        />

        {modalOpen && (
          <ExpenseModal
            expense={editingExpense}
            categories={CATEGORIES}
            folders={folders}
            defaultFolderId={activeFolderId}
            onSave={handleSaveExpenseInFolder}
            onClose={() => {
              setModalOpen(false);
              setEditingExpense(null);
            }}
          />
        )}

        {folderModalOpen && (
          <FolderModal
            folder={editingFolder}
            onSave={editingFolder ? handleUpdateFolder : handleCreateFolder}
            onClose={() => {
              setFolderModalOpen(false);
              setEditingFolder(null);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`expenses-page${selectMode ? ' select-mode' : ''}`}
      onTouchStart={expensesSwipe.onTouchStart}
      onTouchEnd={expensesSwipe.onTouchEnd}
      onClick={handlePageClick}
    >
      {/* Header with inline view toggle (or select-mode action bar) */}
      <div className="expenses-header">
        <div className="expenses-header-left">
          <span className="total-amount">{total.toFixed(2)}</span>
          <span className="total-currency">EUR</span>
        </div>
        <div className="expenses-header-right">
          {selectMode ? (
            <div className="select-actions">
              <span className="select-count">
                {selectedIds.size} selected
              </span>
              <button
                className="select-all-btn"
                onClick={selectAllVisible}
                aria-label="Select all"
                title="Select all"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
              </button>
              <button
                className="select-delete-btn"
                onClick={handleDeleteSelected}
                disabled={selectedIds.size === 0}
                aria-label="Delete selected"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </button>
            </div>
          ) : (
            <>
              <span className="total-count">
                {view === 'folders'
                  ? `${folders.length} folder${folders.length !== 1 ? 's' : ''}`
                  : `${filteredExpenses.length} expense${filteredExpenses.length !== 1 ? 's' : ''}`
                }
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
                <button
                  className={`view-toggle-btn ${view === 'folders' ? 'active' : ''}`}
                  onClick={() => setView('folders')}
                  aria-label="Folders view"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                </button>
              </div>
            </>
          )}
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
                  selectMode={selectMode}
                  selected={selectedIds.has(expense.id)}
                  onToggleSelect={toggleSelected}
                  onLongPress={handleLongPress}
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

      {/* Folders view */}
      {view === 'folders' && (
        <div className="folders-list">
          {loading ? (
            <div className="expenses-empty">
              <p>Loading...</p>
            </div>
          ) : folders.length === 0 ? (
            <div className="expenses-empty">
              <p>No folders yet</p>
            </div>
          ) : (
            folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                onOpen={() => setActiveFolderId(folder.id)}
                onEdit={() => {
                  setEditingFolder(folder);
                  setFolderModalOpen(true);
                }}
                onDelete={() => handleDeleteFolder(folder.id)}
              />
            ))
          )}
        </div>
      )}

      {/* FAB */}
      <button className="fab-add" onClick={handleFabClick} aria-label={view === 'folders' ? 'Add folder' : 'Add expense'}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* Expense Modal */}
      {modalOpen && (
        <ExpenseModal
          expense={editingExpense}
          categories={CATEGORIES}
          folders={folders}
          onSave={handleSave}
          onClose={() => {
            setModalOpen(false);
            setEditingExpense(null);
          }}
        />
      )}

      {/* Folder Modal */}
      {folderModalOpen && (
        <FolderModal
          folder={editingFolder}
          onSave={editingFolder ? handleUpdateFolder : handleCreateFolder}
          onClose={() => {
            setFolderModalOpen(false);
            setEditingFolder(null);
          }}
        />
      )}
    </div>
  );
}

export default ExpensesPage;
