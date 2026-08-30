// ============================================================
// utils/payment.js — Unified payment helpers for the frontend
// M-Pesa only payment utilities
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
 * Initiate an MPESA STK Push.
 * @param {Object} opts
 * @param {string} opts.phone — Phone number
 * @param {number} opts.amount — Amount in KES
 * @param {string} opts.accountRef — Account reference
 * @param {string} opts.description — Description
 * @returns {Object} { success, paymentId, checkoutRequestId, message }
 */
export async function initiateMpesaPayment({ phone, amount, accountRef, description }) {
  const res = await fetch(`${API_URL}/api/mpesa/stkpush`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ phone, amount, accountRef, description }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'M-PESA payment failed.');
  }
  return data;
}

/**
 * Query MPESA transaction status.
 * @param {string} checkoutRequestId
 * @returns {Object} Daraja response
 */
export async function queryMpesaStatus(checkoutRequestId) {
  const res = await fetch(`${API_URL}/api/mpesa/query`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ checkoutRequestId }),
  });
  return res.json();
}

/**
 * Add item to cart.
 * @param {string} itemType — 'service' | 'plan' | 'workshop' | 'book' | 'course' | 'consultation' | 'yttc'
 * @param {string} itemId — MongoDB ObjectId
 * @returns {Object} Cart response
 */
export async function addToCart(itemType, itemId) {
  const res = await fetch(`${API_URL}/api/student/cart/add`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ itemType, itemId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to add to cart.');
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
