import React from 'react';
import { PlusCircle, LogIn, LogOut, User as UserIcon, Compass } from 'lucide-react';

export default function Navbar({ user, onOpenAuth, onLogout, onOpenReport }) {
  return (
    <header className="navbar">
      <div className="navbar-container">
        <div className="brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="brand-icon">
            <Compass size={24} />
          </div>
          <div>
            <h1 className="brand-title">Smart Lost & Found</h1>
            <p className="brand-subtitle">Campus & Community Recovery</p>
          </div>
        </div>

        <div className="navbar-actions">
          <button className="btn btn-primary" onClick={onOpenReport}>
            <PlusCircle size={18} />
            <span>Report Item</span>
          </button>

          {user ? (
            <div className="user-menu">
              <div className="user-badge" title={`Contact: ${user.contact}`}>
                <UserIcon size={16} />
                <span className="user-name">{user.username}</span>
              </div>
              <button className="btn btn-ghost" onClick={onLogout} title="Log out">
                <LogOut size={16} />
                <span className="hide-mobile">Logout</span>
              </button>
            </div>
          ) : (
            <button className="btn btn-secondary" onClick={onOpenAuth}>
              <LogIn size={18} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

