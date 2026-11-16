import React, { useState } from 'react';
import { X, Upload, AlertCircle } from 'lucide-react';
import { reportLostItem, reportFoundItem } from '../api';

export default function ReportModal({ isOpen, onClose, user, token, categories, onItemAdded, onPromptLogin }) {
  const [itemType, setItemType] = useState('lost'); // 'lost' | 'found'
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Other');
  const [location, setLocation] = useState('');
  const [itemDate, setItemDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [identifyingMark, setIdentifyingMark] = useState('');
  const [whereKept, setWhereKept] = useState('');
  const [contact, setContact] = useState(user?.contact || '');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  if (!user) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card auth-prompt" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Authentication Required</h2>
            <button className="icon-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
          <p className="modal-desc">
            You must be logged in to report a lost or found item. This allows you to manage the item and mark it as resolved later.
          </p>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                onClose();
                onPromptLogin();
              }}
            >
              Log In / Sign Up
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file must be under 5 MB');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('category', category);
      formData.append('location', location);
      formData.append('item_date', itemDate);
      formData.append('description', description);

      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (itemType === 'lost') {
        if (identifyingMark) formData.append('identifying_mark', identifyingMark);
        if (contact) formData.append('owner_contact', contact);
        await reportLostItem(formData, token);
      } else {
        if (whereKept) formData.append('where_kept', whereKept);
        if (contact) formData.append('finder_contact', contact);
        await reportFoundItem(formData, token);
      }

      onItemAdded();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Report an Item</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="type-toggle-group">
          <button
            type="button"
            className={`type-toggle-btn lost ${itemType === 'lost' ? 'active' : ''}`}
            onClick={() => setItemType('lost')}
          >
            I Lost Something
          </button>
          <button
            type="button"
            className={`type-toggle-btn found ${itemType === 'found' ? 'active' : ''}`}
            onClick={() => setItemType('found')}
          >
            I Found Something
          </button>
        </div>

        {error && (
          <div className="alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="report-form">
          <div className="form-row">
            <div className="form-group flex-2">
              <label>Item Name *</label>
              <input
                type="text"
                placeholder={itemType === 'lost' ? 'e.g. Black Dell Laptop Charger' : 'e.g. Set of Keys with Red Tag'}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="form-group flex-1">
              <label>Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label>{itemType === 'lost' ? 'Where was it lost?' : 'Where did you find it?'} *</label>
              <input
                type="text"
                placeholder="e.g. Library 2nd Floor, Table 4"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            <div className="form-group flex-1">
              <label>Date *</label>
              <input
                type="date"
                required
                value={itemDate}
                onChange={(e) => setItemDate(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Detailed Description *</label>
            <textarea
              rows={3}
              placeholder="Describe color, brand, condition, or any specific details..."
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {itemType === 'lost' ? (
            <div className="form-group">
              <label>Identifying Mark (Secret or Unique detail)</label>
              <input
                type="text"
                placeholder="e.g. Scratch near bottom corner, Naruto sticker on back"
                value={identifyingMark}
                onChange={(e) => setIdentifyingMark(e.target.value)}
              />
              <small className="help-text">Helps verify ownership when claimed.</small>
            </div>
          ) : (
            <div className="form-group">
              <label>Where is the item kept now? *</label>
              <input
                type="text"
                placeholder="e.g. Handed to Security Guard at Main Gate / Hostel Office"
                required
                value={whereKept}
                onChange={(e) => setWhereKept(e.target.value)}
              />
              <small className="help-text">Where the rightful owner can go or ask to collect it.</small>
            </div>
          )}

          <div className="form-group">
            <label>Contact Number / Info</label>
            <input
              type="text"
              placeholder="Your contact number"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Photo / Image (Optional, max 5 MB)</label>
            {imagePreview ? (
              <div className="image-preview-container">
                <img src={imagePreview} alt="Preview" className="preview-img" />
                <button type="button" className="btn btn-sm btn-danger remove-img-btn" onClick={removeImage}>
                  Remove Photo
                </button>
              </div>
            ) : (
              <label className="file-drop-zone">
                <Upload size={24} />
                <span>Click to upload JPEG, PNG, or WEBP</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} hidden />
              </label>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : `Post ${itemType === 'lost' ? 'Lost' : 'Found'} Item`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

