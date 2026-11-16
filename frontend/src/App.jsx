import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import FilterBar from './components/FilterBar';
import ItemCard from './components/ItemCard';
import AuthModal from './components/AuthModal';
import ReportModal from './components/ReportModal';
import { getCategories, fetchItems, searchItems, resolveItem, deleteItem } from './api';
import { AlertCircle, CheckCircle, PackageOpen, Sparkles } from 'lucide-react';
import './App.css';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');

  const [categories, setCategories] = useState([
    'Wallet',
    'Phone',
    'ID Card',
    'Bag',
    'Keys',
    'Other',
  ]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filters
  const [keyword, setKeyword] = useState('');
  const [itemType, setItemType] = useState('all');
  const [category, setCategory] = useState('all');
  const [resolvedFilter, setResolvedFilter] = useState('all');

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const [refreshIndex, setRefreshIndex] = useState(0);

  // Show temporary toast message
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load categories on start
  useEffect(() => {
    getCategories()
      .then((cats) => {
        if (cats && cats.length) setCategories(cats);
      })
      .catch(() => {});
  }, []);

  // Fetch items based on active filters
  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      setLoading(true);
      try {
        if (keyword.trim()) {
          const results = await searchItems(keyword.trim());
          let filtered = results;
          if (itemType !== 'all') {
            filtered = filtered.filter((i) => i.item_type === itemType);
          }
          if (category !== 'all') {
            filtered = filtered.filter((i) => i.category === category);
          }
          if (resolvedFilter !== 'all') {
            const isResolvedBool = resolvedFilter === 'true';
            filtered = filtered.filter((i) => i.is_resolved === isResolvedBool);
          }
          if (!isCancelled) setItems(filtered);
        } else {
          const isResolvedParam =
            resolvedFilter === 'all' ? null : resolvedFilter === 'true';
          const fetched = await fetchItems({
            item_type: itemType,
            category,
            is_resolved: isResolvedParam,
          });
          if (!isCancelled) setItems(fetched);
        }
      } catch (err) {
        if (!isCancelled) showToast(err.message || 'Error loading items', 'error');
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [keyword, itemType, category, resolvedFilter, refreshIndex]);

  const handleSearch = () => {
    setRefreshIndex((prev) => prev + 1);
  };

  const handleResetFilters = () => {
    setKeyword('');
    setItemType('all');
    setCategory('all');
    setResolvedFilter('all');
  };

  const handleAuthSuccess = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', userToken);
    showToast(`Welcome back, ${userData.username}!`);
  };

  const handleLogout = () => {
    setUser(null);
    setToken('');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    showToast('You have logged out.');
  };

  const handleResolve = async (itemId) => {
    try {
      await resolveItem(itemId, token);
      showToast('Item marked as resolved successfully!');
      setRefreshIndex((prev) => prev + 1);
    } catch (err) {
      showToast(err.message || 'Failed to resolve item.', 'error');
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this listing?')) return;
    try {
      await deleteItem(itemId, token);
      showToast('Item deleted.');
      setRefreshIndex((prev) => prev + 1);
    } catch (err) {
      showToast(err.message || 'Failed to delete item.', 'error');
    }
  };

  // Quick stats
  const lostCount = items.filter((i) => i.item_type === 'lost').length;
  const foundCount = items.filter((i) => i.item_type === 'found').length;
  const resolvedCount = items.filter((i) => i.is_resolved).length;

  return (
    <div className="app-container">
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
        onOpenReport={() => setIsReportOpen(true)}
      />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-tag">
            <Sparkles size={16} />
            <span>Smart Campus Community</span>
          </div>
          <h2 className="hero-title">Recover What You Lost. Return What You Found.</h2>
          <p className="hero-text">
            Search items reported across campus, report lost belongings with photos and distinguishing marks, or safely return found items.
          </p>

          <div className="hero-stats">
            <div className="stat-card">
              <span className="stat-number">{items.length}</span>
              <span className="stat-label">Displayed Items</span>
            </div>
            <div className="stat-card">
              <span className="stat-number stat-lost">{lostCount}</span>
              <span className="stat-label">Lost Reports</span>
            </div>
            <div className="stat-card">
              <span className="stat-number stat-found">{foundCount}</span>
              <span className="stat-label">Found Reports</span>
            </div>
            <div className="stat-card">
              <span className="stat-number stat-resolved">{resolvedCount}</span>
              <span className="stat-label">Resolved</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="main-content">
        <FilterBar
          keyword={keyword}
          setKeyword={setKeyword}
          onSearch={handleSearch}
          itemType={itemType}
          setItemType={setItemType}
          category={category}
          setCategory={setCategory}
          resolvedFilter={resolvedFilter}
          setResolvedFilter={setResolvedFilter}
          categories={categories}
          onReset={handleResetFilters}
        />

        {/* Items Grid */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading items from backend...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <PackageOpen size={64} strokeWidth={1.2} />
            <h3>No items found</h3>
            <p>Try clearing filters or search with a different keyword.</p>
            <button className="btn btn-secondary" onClick={handleResetFilters}>
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="items-grid">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                currentUser={user}
                onResolve={handleResolve}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      <ReportModal
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
        user={user}
        token={token}
        categories={categories}
        onItemAdded={() => {
          showToast('Item reported successfully!');
          setRefreshIndex((prev) => prev + 1);
        }}
        onPromptLogin={() => setIsAuthOpen(true)}
      />

      {/* Toast Notification */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
