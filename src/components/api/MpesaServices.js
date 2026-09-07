// ============================================================
// api/MpesaServices.js — Frontend helpers for MPESA payments
// ============================================================
const API_BASE = import.meta.env.VITE_API_URL || "";

async function request(path, options = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || `Request failed (${res.status})`);
  }
  return data;
}

/** Initiate an MPESA STK Push */
export async function initiateStkPush({ phone, amount, accountRef, description, itemType, itemId, paymentId, orderId }) {
  return request("/api/mpesa/stkpush", {
    method: "POST",
    body: JSON.stringify({ phone, amount, accountRef, description, itemType, itemId, paymentId, orderId }),
  });
}

/** Query status of an STK Push transaction */
export async function queryMpesaTransaction(checkoutRequestId) {
  return request("/api/mpesa/query", {
    method: "POST",
    body: JSON.stringify({ checkoutRequestId }),
  });
}

/** Backend-reported payment mode (backend is the source of truth). */
export async function getPaymentMode() {
  return request("/api/mpesa/mode", { method: "GET" });
}

/**
 * Who the current token belongs to (server truth).
 * Returns { email } or null when guest / unrecognised. Never throws.
 * localStorage user objects can go stale (e.g. test DB resets), so the
 * test panel must not trust them for identity.
 */
export async function getTestIdentity() {
  if (!localStorage.getItem("token")) return null;
  try {
    const data = await request("/api/auth/profile", { method: "GET" });
    const email = data?.user?.email || data?.email || null;
    return email ? { email } : null;
  } catch {
    return null;
  }
}

/**
 * Simulate a test payment result (TEST MODE ONLY — backend returns 403
 * "Test payment mode is disabled" when PAYMENT_MODE=live).
 */
export async function simulateTestPayment({ paymentId, checkoutRequestId, orderId, status }) {
  return request("/api/mpesa/test", {
    method: "POST",
    body: JSON.stringify({ paymentId, checkoutRequestId, orderId, status }),
  });
}

/**
 * Instantly provision a test student account (TEST MODE ONLY, no auth —
 * new users have no token yet). Returns { token, user } like OTP verify.
 * 409 if the email already has an account (log in instead).
 */
export async function provisionTestAccount({ name, email, phone }) {
  return request("/api/mpesa/test/provision", {
    method: "POST",
    body: JSON.stringify({ name, email, phone }),
  });
}
