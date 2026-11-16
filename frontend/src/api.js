const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

export function getImageUrl(path) {
  if (!path) return null;
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

export async function registerUser({ username, password, contact }) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, contact }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Registration failed');
  return data;
}

export async function loginUser({ username, password }) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Login failed');
  return data;
}

export async function getCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  const data = await res.json();
  return data.categories || [];
}

export async function fetchItems({ item_type, category, is_resolved } = {}) {
  const params = new URLSearchParams();
  if (item_type && item_type !== 'all') params.append('item_type', item_type);
  if (category && category !== 'all') params.append('category', category);
  if (is_resolved !== undefined && is_resolved !== null && is_resolved !== 'all') {
    params.append('is_resolved', is_resolved);
  }

  const url = `${API_BASE}/items${params.toString() ? '?' + params.toString() : ''}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch items');
  return data.items || [];
}

export async function searchItems(keyword) {
  if (!keyword || !keyword.trim()) return [];
  const res = await fetch(`${API_BASE}/items/search?keyword=${encodeURIComponent(keyword.trim())}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Search failed');
  return data.items || [];
}

export async function reportLostItem(formData, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/items/lost`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to report lost item');
  return data;
}

export async function reportFoundItem(formData, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/items/found`, {
    method: 'POST',
    headers,
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to report found item');
  return data;
}

export async function resolveItem(itemId, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/items/${itemId}/resolve`, {
    method: 'PATCH',
    headers,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to resolve item');
  return data;
}

export async function deleteItem(itemId, token) {
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/items/${itemId}`, {
    method: 'DELETE',
    headers,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to delete item');
  return data;
}

