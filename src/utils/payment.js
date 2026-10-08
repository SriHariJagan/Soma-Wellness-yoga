// ============================================================
// utils/payment.js — Shared frontend helpers (auth, cart, user).
// Online payments go through Pesapal (see api/PesapalServices.js).
// Amounts are display-only here; the backend is authoritative.
// ============================================================
const API_URL = import.meta.env.VITE_API_URL || '';

/** Get auth headers for API calls */
export function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Check if user is logged in */
export function isLoggedIn() {
  return !!localStorage.getItem('token') && !!localStorage.getItem('user');
}

/** Check if user is properly authenticated with valid token */
export function isAuthenticated() {
  try {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!token && !!user;
  } catch {
    return false;
  }
}

/** Get current user from localStorage */
export function getCurrentUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Parse a price string like "KES 2,000 / month" into a number */
export function parsePrice(price) {
  if (!price) return 0;
  const digits = String(price).replace(/[^0-9.]/g, '');
  const value = parseFloat(digits);
  return Number.isFinite(value) ? value : 0;
}

/** Format a number as KES currency */
export function formatKES(amount) {
  return `KES ${Number(amount).toLocaleString()}`;
}

/**
 * Add item to cart with proper authentication and error handling.
 * @param {string} itemType - 'service' | 'plan' | 'workshop' | 'book' | 'course' | 'consultation' | 'yttc'
 * @param {string} itemId - MongoDB ObjectId
 * @returns {Object} Cart response
 * @throws {Error} If user is not authenticated or cart addition fails
 */
export async function addToCart(itemType, itemId) {
  // Validate parameters
  if (!itemType || !itemId) {
    throw new Error('Invalid item type or ID.');
  }

  // Check authentication
  if (!isAuthenticated()) {
    throw new Error('User not authenticated. Please log in first.');
  }

  const res = await fetch(`${API_URL}/api/student/cart/add`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ itemType, itemId }),
  });

  const data = await res.json();

  if (!res.ok) {
    // Provide meaningful error messages
    const errorMessage = data.message || 'Failed to add to cart.';
    throw new Error(errorMessage);
  }

  return data;
}

/**
 * Get the current user's cart.
 * @returns {Object} { items, subtotal, discount, coupon, total }
 */
export async function getCart() {
  const res = await fetch(`${API_URL}/api/student/cart`, {
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to fetch cart.');
  return data;
}

/**
 * Dispatch a toast notification event.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
export function showToast(message, type = 'info') {
  window.dispatchEvent(new CustomEvent('app-toast', {
    detail: { message, type },
  }));
}

/**
 * Dispatch a cart update event.
 */
export function notifyCartUpdate() {
  window.dispatchEvent(new CustomEvent('cart-update', { detail: { timestamp: Date.now() } }));
}
