import React from 'react';
import './FolderCard.css';

function FolderCard({ folder, onOpen, onEdit, onDelete }) {
  return (
    <div className="folder-card">
      <div className="folder-card-body" onClick={() => onOpen(folder)}>
        <div className="folder-card-thumb">
          {folder.imageUrl ? (
            <img src={folder.imageUrl} alt="" className="folder-thumb-img" />
          ) : (
            <div className="folder-thumb-fallback">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
          )}
        </div>
        <div className="folder-card-info">
          <span className="folder-card-name">{folder.name}</span>
          <span className="folder-card-meta">
            {folder.expenseCount || 0} expense{folder.expenseCount !== 1 ? 's' : ''}
            {' \u00B7 '}
            {(folder.total || 0).toFixed(2)} EUR
          </span>
        </div>
      </div>
      <button
        className="folder-edit-btn"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(folder);
        }}
        aria-label="Edit folder"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
      <button
        className="folder-delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(folder.id);
        }}
        aria-label="Delete folder"
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

export default FolderCard;
