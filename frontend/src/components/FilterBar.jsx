import React from 'react';
import { Search, X } from 'lucide-react';

export default function FilterBar({
  keyword,
  setKeyword,
  onSearch,
  itemType,
  setItemType,
  category,
  setCategory,
  resolvedFilter,
  setResolvedFilter,
  categories,
  onReset,
}) {
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearch();
    }
  };

  return (
    <div className="filter-bar">
      <div className="search-section">
        <div className="search-input-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by keyword, item name, location, or description..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {keyword && (
            <button
              className="clear-search-btn"
              onClick={() => {
                setKeyword('');
                onReset();
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button className="btn btn-primary search-btn" onClick={onSearch}>
          Search
        </button>
      </div>

      <div className="filters-row">
        {/* Type Tabs */}
        <div className="type-pills">
          <button
            className={`pill-btn ${itemType === 'all' ? 'active' : ''}`}
            onClick={() => setItemType('all')}
          >
            All Items
          </button>
          <button
            className={`pill-btn pill-lost ${itemType === 'lost' ? 'active' : ''}`}
            onClick={() => setItemType('lost')}
          >
            Lost Items
          </button>
          <button
            className={`pill-btn pill-found ${itemType === 'found' ? 'active' : ''}`}
            onClick={() => setItemType('found')}
          >
            Found Items
          </button>
        </div>

        {/* Dropdowns */}
        <div className="dropdowns-group">
          <div className="select-wrapper">
            <select value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="select-wrapper">
            <select value={resolvedFilter} onChange={(e) => setResolvedFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="false">Active Only</option>
              <option value="true">Resolved Only</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

