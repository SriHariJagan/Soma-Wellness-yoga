// ─────────────────────────────────────────────────────────
// BookServices.js
// API helpers for the Soma Wellness book store.
// Public catalogue endpoints live under /api/public; the
// student-facing cart/checkout endpoints under /api/student
// use the JWT + refresh-token pattern from StudentServices.
// ─────────────────────────────────────────────────────────

const API_DOMAIN = import.meta.env.VITE_API_URL || "";
const PUBLIC_URL = `${API_DOMAIN}/api/public`;
const AUTH_URL = `${API_DOMAIN}/api/auth`;
const STUDENT_URL = `${API_DOMAIN}/api/student`;

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function tryRefresh() {
  try {
    const res = await fetch(`${AUTH_URL}/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.token) {
      localStorage.setItem("token", data.token);
      return true;
    }
  } catch {
    /* fall through */
  }
  return false;
}

async function api(path, { method = "GET", body, base = STUDENT_URL } = {}) {
  const opts = {
    method,
    headers: authHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };

  let res = await fetch(`${base}${path}`, opts);

  if (res.status === 401 && (await tryRefresh())) {
    opts.headers = authHeaders();
    res = await fetch(`${base}${path}`, opts);
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || data.message || "Request failed");
  return data;
}

// ── Public catalogue ──────────────────────────────────────
export const getBooks = (params = {}) => {
  const q = new URLSearchParams();
  if (params.search) q.set("search", params.search);
  if (params.category) q.set("category", params.category);
  if (params.tag) q.set("tag", params.tag);
  if (params.sort) q.set("sort", params.sort);
  if (params.page) q.set("page", params.page);
  if (params.limit) q.set("limit", params.limit);
  const qs = q.toString();
  return api(`/books${qs ? `?${qs}` : ""}`, { base: PUBLIC_URL });
};

export const getBookBySlug = (slug) => api(`/books/${slug}`, { base: PUBLIC_URL });

export const checkShippingAvailability = (payload) =>
  api("/shipping/check-availability", { method: "POST", body: payload, base: PUBLIC_URL });

export const submitBulkEnquiry = (payload) =>
  api("/bulk-orders", { method: "POST", body: payload, base: PUBLIC_URL });

export const trackOrder = (orderNumber, email) =>
  api(`/order-tracking/${encodeURIComponent(orderNumber)}?email=${encodeURIComponent(email)}`, { base: PUBLIC_URL });

// ── Cart / checkout (authenticated) ───────────────────────
export const addBookToCart = (itemId, quantity = 1) =>
  api("/cart/add", { method: "POST", body: { itemType: "book", itemId, quantity } });

export const updateCartItemQty = (itemId, quantity) =>
  api("/cart/update", { method: "POST", body: { itemId, quantity } });

export const getCart = () => api("/cart");
export const getCartCount = () => api("/cart/count");
export const removeCartItem = (itemId) => api(`/cart/item/${itemId}`, { method: "DELETE" });
export const applyCouponToCart = (code) => api("/cart/apply-coupon", { method: "POST", body: { code } });
export const removeCouponFromCart = () => api("/cart/remove-coupon", { method: "POST" });

export const validateBookCart = () => api("/books/validate-cart", { method: "POST" });

export const checkoutBooks = (payload) => api("/books/checkout", { method: "POST", body: payload });

export const getMyBookOrders = () => api("/books/orders");