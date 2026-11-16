import React, { useState } from 'react';
import { X, Lock, User as UserIcon, Phone, AlertCircle } from 'lucide-react';
import { loginUser, registerUser } from '../api';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLoginMode) {
        const res = await loginUser({ username, password });
        onAuthSuccess(res.user, res.token);
        onClose();
      } else {
        if (!contact.trim()) {
          setError('Contact number is required');
          setLoading(false);
          return;
        }
        await registerUser({ username, password, contact });
        // Automatically login after successful registration
        const loginRes = await loginUser({ username, password });
        onAuthSuccess(loginRes.user, loginRes.token);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isLoginMode ? 'Welcome Back' : 'Create an Account'}</h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="auth-tabs">
          <button
            className={`tab-btn ${isLoginMode ? 'active' : ''}`}
            onClick={() => {
              setIsLoginMode(true);
              setError('');
            }}
          >
            Log In
          </button>
          <button
            className={`tab-btn ${!isLoginMode ? 'active' : ''}`}
            onClick={() => {
              setIsLoginMode(false);
              setError('');
            }}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="alert-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>Username</label>
            <div className="input-with-icon">
              <UserIcon size={18} />
              <input
                type="text"
                placeholder="Enter username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Password</label>
            <div className="input-with-icon">
              <Lock size={18} />
              <input
                type="password"
                placeholder="Enter password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {!isLoginMode && (
            <div className="form-group">
              <label>Contact Number / Info</label>
              <div className="input-with-icon">
                <Phone size={18} />
                <input
                  type="text"
                  placeholder="e.g. +1 555-0199 or room #302"
                  required
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </div>
              <small className="help-text">Used for owners or finders to reach you safely.</small>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Please wait...' : isLoginMode ? 'Log In' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

