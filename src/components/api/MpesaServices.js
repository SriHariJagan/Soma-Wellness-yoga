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
