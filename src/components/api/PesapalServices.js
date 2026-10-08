// ============================================================
// api/PesapalServices.js — Frontend helpers for Pesapal payments.
// The frontend NEVER calls Pesapal directly and NEVER decides the
// amount: it asks the backend for an intent (→ redirectUrl) and
// polls the backend for canonical status.
// ============================================================
const API_BASE = import.meta.env.VITE_API_URL || '';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(), ...options.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || `Request failed (${res.status})`);
  }
  return data;
}

/** Create a server-priced Pesapal intent. Returns { redirectUrl, merchantReference, orderTrackingId, ... }. */
export async function initiatePesapalPayment({ items, label, description, idempotencyKey, customer, paymentId, callbackUrl, cancellationUrl }) {
  return request('/api/payments/initiate', {
    method: 'POST',
    body: JSON.stringify({
      ...(items ? { items } : {}),
      ...(paymentId ? { paymentId } : {}),
      ...(label ? { label } : {}),
      ...(description ? { description } : {}),
      ...(idempotencyKey ? { idempotencyKey } : {}),
      ...(customer ? { customer } : {}),
      ...(callbackUrl ? { callbackUrl } : {}),
      ...(cancellationUrl ? { cancellationUrl } : {}),
    }),
  });
}

/** Continue an existing intent (cart/book checkout) → Pesapal redirect. */
export async function continuePesapalPayment(paymentId, customer) {
  return request('/api/payments/initiate', {
    method: 'POST',
    body: JSON.stringify({ paymentId, ...(customer ? { customer } : {}) }),
  });
}

/** Canonical status — backend verifies server-to-server before reporting captured. */
export async function getPesapalPaymentStatus(merchantReference, orderTrackingId) {
  const params = new URLSearchParams();
  if (merchantReference) params.set('merchantReference', merchantReference);
  if (orderTrackingId) params.set('orderTrackingId', orderTrackingId);
  // Prefer the canonical path; fall back to the Pesapal-namespaced route.
  try {
    if (merchantReference) {
      return await request(`/api/payments/${encodeURIComponent(merchantReference)}/status`);
    }
  } catch {
    /* fall through to query variant */
  }
  return request(`/api/pesapal/status?${params.toString()}`);
}

/** Non-secret provider configuration probe (for UI copy/degraded states). */
export async function getPesapalConfig() {
  return request('/api/pesapal/config');
}

export function newIdempotencyKey(prefix = 'pay') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
