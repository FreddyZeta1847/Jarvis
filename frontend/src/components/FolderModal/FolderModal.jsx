import React, { useState, useEffect, useRef } from 'react';
import { compressImage } from '../../utils/imageCompressor.js';
import './FolderModal.css';

function FolderModal({ folder, onSave, onClose }) {
  const isEdit = !!folder;
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (folder) {
      setForm({
        name: folder.name || '',
        description: folder.description || '',
      });
      if (folder.imageUrl) {
        setImagePreview(folder.imageUrl);
      }
    }
  }, [folder]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleImagePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setImageFile(compressed);
      const url = URL.createObjectURL(compressed);
      setImagePreview(url);
    } catch (err) {
      console.error('Image compression failed:', err);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('description', form.description.trim());
      if (imageFile) {
        formData.append('image', imageFile);
      }
      await onSave(formData, folder?.id);
    } finally {
      setSaving(false);
    }
  };

  const isValid = form.name.trim().length > 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Folder' : 'New Folder'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* Name */}
          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Trip to Paris"
              maxLength={100}
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              type="text"
              className="form-input"
              placeholder="Optional description"
              maxLength={300}
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
            />
          </div>

          {/* Image upload */}
          <div className="form-group">
            <label className="form-label">Cover Image</label>
            {imagePreview ? (
              <div className="folder-image-preview-wrapper">
                <img src={imagePreview} alt="Preview" className="folder-image-preview" />
                <button
                  type="button"
                  className="folder-image-remove"
                  onClick={handleRemoveImage}
                  aria-label="Remove image"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="folder-image-upload-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span>Upload photo</span>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="folder-image-input-hidden"
              onChange={handleImagePick}
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            className={`modal-submit ${saving ? 'saving' : ''}`}
            disabled={!isValid || saving}
          >
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Folder'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default FolderModal;
