// ============================================================
// utils/payment.js — Unified payment helpers for the frontend
// Shared Razorpay loader, payment verification, and utilities
// ============================================================
const API_URL = import.meta.env.VITE_API_URL || '';
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

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

/** Inject the Razorpay script once, on demand */
export function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/**
 * Create a Razorpay order on the backend.
 * @param {Object} opts
 * @param {Array} opts.items — Cart items
 * @param {string} opts.label — Order label
 * @param {string} opts.description — Order description
 * @returns {Object} { order_id, amount, currency }
 */
export async function createRazorpayOrder({ items, label, description }) {
  const res = await fetch(`${API_URL}/api/create-order`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ items, label, description }),
  });
  const data = await res.json();
  if (!res.ok || !data.order_id) {
    throw new Error(data.message || 'Could not create payment order.');
  }
  return data;
}

/**
 * Verify a Razorpay payment on the backend.
 * @param {Object} response — Razorpay response with order_id, payment_id, signature
 * @returns {Object} { success }
 */
export async function verifyRazorpayPayment(response) {
  const res = await fetch(`${API_URL}/api/verify-payment`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Payment verification failed.');
  }
  return data;
}

/**
 * Open the Razorpay checkout modal.
 * @param {Object} opts
 * @param {number} opts.amount — Amount in paise/cents
 * @param {string} opts.currency — Currency code
 * @param {string} opts.orderId — Razorpay order ID
 * @param {string} opts.name — Business name
 * @param {string} opts.description — Payment description
 * @param {Object} opts.prefill — { name, email, contact }
 * @param {Function} opts.onSuccess — Called with Razorpay response on success
 * @param {Function} opts.onDismiss — Called when user closes modal
 * @param {Function} opts.onError — Called with error on failure
 */
export async function openRazorpayCheckout({
  amount, currency, orderId, name, description, prefill, onSuccess, onDismiss, onError,
}) {
  const ok = await loadRazorpay();
  if (!ok) throw new Error('Could not load payment gateway. Check your connection.');
  if (!RAZORPAY_KEY_ID) throw new Error('Payment is not configured. Please contact support.');

  const rzp = new window.Razorpay({
    key: RAZORPAY_KEY_ID,
    amount,
    currency,
    name: name || 'Soma Wellness',
    description,
    order_id: orderId,
    prefill: prefill || {},
    theme: { color: '#2E7D5B' },
    handler: async (response) => {
      try {
        await verifyRazorpayPayment(response);
        onSuccess?.(response);
      } catch (err) {
        onError?.(err);
      }
    },
    modal: {
      ondismiss: () => onDismiss?.(),
    },
  });

  rzp.on('payment.failed', (resp) => {
    onError?.(resp?.error || new Error('Payment failed.'));
  });

  rzp.open();
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
