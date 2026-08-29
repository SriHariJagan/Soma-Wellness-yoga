// ============================================================
// api/WhatsAppServices.js — Frontend helpers for WhatsApp admin
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

/** Get WhatsApp provider status */
export async function getWhatsAppStatus() {
  return request("/api/whatsapp/status");
}

/** Verify WhatsApp connection */
export async function verifyWhatsApp() {
  return request("/api/whatsapp/verify", { method: "POST" });
}

/** Send a direct WhatsApp message */
export async function sendWhatsAppMessage({ phone, message }) {
  return request("/api/whatsapp/send", {
    method: "POST",
    body: JSON.stringify({ phone, message }),
  });
}

/** Send a WhatsApp message to a user by userId */
export async function sendWhatsAppToUser({ userId, message }) {
  return request("/api/whatsapp/send-to-user", {
    method: "POST",
    body: JSON.stringify({ userId, message }),
  });
}

/** Broadcast a WhatsApp message to multiple users */
export async function broadcastWhatsApp({ userIds, message }) {
  return request("/api/whatsapp/broadcast", {
    method: "POST",
    body: JSON.stringify({ userIds, message }),
  });
}
