// ─────────────────────────────────────────────────────────
// AdminServices.js
// Centralised API layer for the admin dashboard. Sends the JWT
// access token, transparently refreshes it on a 401, and returns
// parsed JSON (throwing a clean Error on failure).
// ─────────────────────────────────────────────────────────

const API_DOMAIN = import.meta.env.VITE_API_URL || "";
const ADMIN_URL = `${API_DOMAIN}/api/admin`;
const ROOT_URL = `${API_DOMAIN}/api`;

function authHeaders() {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function tryRefresh() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${ROOT_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.token) {
      localStorage.setItem("token", data.token);
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

async function request(path, { method = "GET", body, base = ADMIN_URL } = {}) {
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

// ── Overview & analytics ───────────────────────────────────
export const getOverview = () => request("/overview");
export const getRevenueAnalytics = () => request("/analytics/revenue");
export const getLogs = () => request("/logs");
export const getSettings = () => request("/settings");
export const updateSettings = (payload) => request("/settings", { method: "PUT", body: payload });

// ── Students ───────────────────────────────────────────────
export const getStudents = (search = "") => request(`/students${search ? `?search=${encodeURIComponent(search)}` : ""}`);
export const getStudentDetail = (id) => request(`/students/${id}`);
export const createStudent = (payload) => request("/students", { method: "POST", body: payload });
export const updateStudent = (id, payload) => request(`/students/${id}`, { method: "PUT", body: payload });
export const deleteStudent = (id) => request(`/students/${id}`, { method: "DELETE" });
export const setStudentStatus = (id, status) => request(`/students/${id}/status`, { method: "PATCH", body: { status } });

// ── Plans assignment ───────────────────────────────────────
export const assignPlan = (payload) => request("/plans/assign", { method: "POST", body: payload });
export const revokePlan = (id) => request(`/plans/revoke/${id}`, { method: "PUT" });

// ── Membership renew & upgrade (admin) ─────────────────────
export const getAllPlans = () => request("/membership-plans");
export const renewMembershipAdmin = (payload) => request("/memberships/renew", { method: "POST", body: payload });
export const upgradeMembershipAdmin = (payload) => request("/memberships/upgrade", { method: "POST", body: payload });

// ── Payments ───────────────────────────────────────────────
export const getPayments = () => request("/payments");
export const createPayment = (payload) => request("/payments", { method: "POST", body: payload });
export const updatePaymentStatus = (id, status) => request(`/payments/${id}/status`, { method: "PATCH", body: { status } });

// ── Attendance ─────────────────────────────────────────────
export const markAttendance = (payload) => request("/attendance", { method: "POST", body: payload });
export const getStudentAttendance = (id) => request(`/attendance/${id}`);

// ── Attendance Management System ────────────────────────────
export const getAttendanceOverview = () => request("/attendance/overview");
export const getAttendanceEnrollmentTypes = () => request("/attendance/enrollment-types");
export const getAttendanceEnrollmentItems = (entityType) =>
  request(`/attendance/enrollment-items/${entityType}`);
export const getAttendanceClassInvites = (entityType, entityId) =>
  request(`/attendance/class-invites/${entityType}/${entityId}`);
export const getAttendanceStudents = (inviteId) =>
  request(`/attendance/students/${inviteId}`);
export const getMembershipAttendanceStudents = (planId, inviteId) =>
  request(`/attendance/membership-students/${planId}/${inviteId}`);
export const getAllMembershipInvites = () =>
  request('/attendance/membership-invites');
export const getActiveMembersForInvite = (inviteId) =>
  request(`/attendance/membership-members/${inviteId}`);
export const bulkMarkAttendance = (payload) =>
  request("/attendance/bulk", { method: "POST", body: payload });
export const markAllPresent = (inviteId) =>
  request("/attendance/mark-all", { method: "POST", body: { inviteId } });
export const resetAttendance = (inviteId) =>
  request(`/attendance/reset/${inviteId}`, { method: "POST" });
export const lockAttendance = (inviteId) =>
  request(`/attendance/lock/${inviteId}`, { method: "POST" });
export const getAttendanceByDate = (date) =>
  request(`/attendance/by-date?date=${encodeURIComponent(date)}`);

// ── Enrollment Progress ────────────────────────────────────
export const getEnrollmentProgress = (studentId) => request(`/enrollment-progress/${studentId}`);

// ── Generic resource helpers (classes, workshops, downloads, courses, plans, coupons) ──
const resource = (name) => ({
  list: () => request(`/${name}`),
  create: (payload) => request(`/${name}`, { method: "POST", body: payload }),
  update: (id, payload) => request(`/${name}/${id}`, { method: "PUT", body: payload }),
  remove: (id) => request(`/${name}/${id}`, { method: "DELETE" }),
});

export const classesApi = resource("classes");

// ── Workshops (custom admin endpoints) ─────────────────────────
export const workshopsApi = {
  list: () => request("/workshops"),
  create: (payload) => request("/workshops", { method: "POST", body: payload }),
  update: (id, payload) => request(`/workshops/${id}`, { method: "PUT", body: payload }),
  remove: (id) => request(`/workshops/${id}`, { method: "DELETE" }),
  togglePublish: (id) => request(`/workshops/${id}/publish`, { method: "PATCH" }),
  toggleArchive: (id) => request(`/workshops/${id}/archive`, { method: "PATCH" }),
  getStats: (id) => request(`/workshops/${id}/stats`),
  getRegistrations: (id) => request(`/workshops/${id}/registrations`),
  markAttendance: (id, registrationId, attended) =>
    request(`/workshops/${id}/attendance`, { method: "PATCH", body: { registrationId, attended } }),
};

// ── Events (community events — CRUD + registrations) ───────────
export const eventsApi = {
  list: () => request("/events"),
  create: (payload) => request("/events", { method: "POST", body: payload }),
  update: (id, payload) => request(`/events/${id}`, { method: "PUT", body: payload }),
  remove: (id) => request(`/events/${id}`, { method: "DELETE" }),
  getRegistrations: (id) => request(`/events/${id}/registrations`),
};

export const coursesApi = resource("courses");
export const membershipPlansApi = {
  ...resource("membership-plans"),
  syncOfficial: () => request("/membership-plans/sync-official", { method: "POST" }),
};
export const couponsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', params.page);
    if (params.limit) q.set('limit', params.limit);
    if (params.status) q.set('status', params.status);
    if (params.search) q.set('search', params.search);
    return request(`/coupons?${q.toString()}`);
  },
  getDetail: (id) => request(`/coupons/${id}`),
  create: (payload) => request('/coupons', { method: 'POST', body: payload }),
  update: (id, payload) => request(`/coupons/${id}`, { method: 'PUT', body: payload }),
  remove: (id) => request(`/coupons/${id}`, { method: 'DELETE' }),
  duplicate: (id) => request(`/coupons/${id}/duplicate`, { method: 'POST' }),
  toggle: (id) => request(`/coupons/${id}/toggle`, { method: 'POST' }),
  getStats: () => request('/coupons/stats'),
  searchProducts: (type, q = '') => {
    const params = new URLSearchParams({ type });
    if (q) params.set('q', q);
    return request(`/coupons/products/search?${params.toString()}`);
  },
};

// ── Assets / Content Management ────────────────────────────
function authHeadersMultiPart() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

async function requestMultiPart(path, { method = "POST", body } = {}) {
  const opts = { method, headers: authHeadersMultiPart() };
  if (body) opts.body = body;
  let res = await fetch(`${ADMIN_URL}${path}`, opts);
  if (res.status === 401 && (await tryRefresh())) {
    opts.headers = authHeadersMultiPart();
    res = await fetch(`${ADMIN_URL}${path}`, opts);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || data.message || "Request failed");
  return data;
}

export const assetsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.type) q.set("type", params.type);
    if (params.visibility) q.set("visibility", params.visibility);
    if (params.active !== undefined) q.set("active", params.active);
    if (params.page) q.set("page", params.page);
    if (params.limit) q.set("limit", params.limit);
    const qs = q.toString();
    return request(`/downloads${qs ? `?${qs}` : ""}`);
  },
  get: (id) => request(`/downloads/${id}`),
  upload: (formData) => requestMultiPart("/downloads/upload", { method: "POST", body: formData }),
  update: (id, payload) => request(`/downloads/${id}`, { method: "PUT", body: payload }),
  replaceFile: (id, formData) => requestMultiPart(`/downloads/${id}/replace`, { method: "POST", body: formData }),
  archive: (id, active) => request(`/downloads/${id}/archive`, { method: "PATCH", body: { active } }),
  remove: (id) => request(`/downloads/${id}`, { method: "DELETE" }),
  stats: () => request("/downloads/stats"),
  downloadUrl: (id) => `${ADMIN_URL}/downloads/${id}/download`,
};

// ── Services catalog ─────────────────────────────────────────
export const servicesApi = {
  ...resource("services"),
  syncOfficial: () => request("/services/sync-official", { method: "POST" }),
};

// ── Instructors ───────────────────────────────────────────────
export const instructorsApi = resource("instructors");

// ── Service assignments (purchases / enrollments) ─────────────
export const serviceAssignmentsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.status) q.set("status", params.status);
    if (params.serviceId) q.set("serviceId", params.serviceId);
    const qs = q.toString();
    return request(`/service-assignments${qs ? `?${qs}` : ""}`);
  },
  analytics: () => request("/services/analytics"),
  assign: (payload) => request("/services/assign", { method: "POST", body: payload }),
  update: (id, payload) => request(`/service-assignments/${id}`, { method: "PUT", body: payload }),
  renew: (id) => request(`/service-assignments/${id}/renew`, { method: "POST" }),
  remove: (id) => request(`/service-assignments/${id}`, { method: "DELETE" }),
};

// ── Consultations ──────────────────────────────────────────
export const getConsultations = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return request(`/consultations${q ? `?${q}` : ""}`);
};
export const getConsultationAnalytics = () => request("/consultations/analytics");
export const updateConsultation = (id, payload) => request(`/consultations/${id}`, { method: "PUT", body: payload });

// ── Time Slots ─────────────────────────────────────────────
export const timeSlotsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/time-slots${q ? `?${q}` : ""}`);
  },
  create: (payload) => request("/time-slots", { method: "POST", body: payload }),
  createBatch: (payload) => request("/time-slots/batch", { method: "POST", body: payload }),
  update: (id, payload) => request(`/time-slots/${id}`, { method: "PUT", body: payload }),
  remove: (id) => request(`/time-slots/${id}`, { method: "DELETE" }),
};

// ── Notifications ──────────────────────────────────────────
export const listNotifications = (page = 1, limit = 50) => request(`/notifications?page=${page}&limit=${limit}`);
export const getNotificationDetail = (id) => request(`/notifications/${id}`);
export const getNotificationStats = () => request("/notifications/stats");
export const sendNotification = (payload) => request("/notifications/send", { method: "POST", body: payload });
export const getRecipientsByCategory = (params = {}) => {
  const q = new URLSearchParams();
  if (params.category) q.set("category", params.category);
  if (params.entityId) q.set("entityId", params.entityId);
  if (params.search) q.set("search", params.search);
  return request(`/notifications/recipients?${q.toString()}`);
};

// ── Cross-cutting collections served from non-admin routers ──
// Batches
export const getBatches = () => request("/batches", { base: ROOT_URL });
export const createBatch = (payload) => request("/batches", { method: "POST", body: payload, base: ROOT_URL });
export const updateBatch = (id, payload) => request(`/batches/${id}`, { method: "PUT", body: payload, base: ROOT_URL });
export const deleteBatch = (id) => request(`/batches/${id}`, { method: "DELETE", base: ROOT_URL });

// Bookings
export const getBookings = () => request("/bookings", { base: ROOT_URL });
export const updateBookingStatus = (id, status) => request(`/bookings/${id}/status`, { method: "PATCH", body: { status }, base: ROOT_URL });
export const deleteBooking = (id) => request(`/bookings/${id}`, { method: "DELETE", base: ROOT_URL });

// Leads
export const getLeads = () => request("/leads", { base: ROOT_URL });
export const createLead = (payload) => request("/leads", { method: "POST", body: payload, base: ROOT_URL });
export const updateLeadStage = (id, stage) => request(`/leads/${id}/stage`, { method: "PATCH", body: { stage }, base: ROOT_URL });
export const deleteLead = (id) => request(`/leads/${id}`, { method: "DELETE", base: ROOT_URL });

// ── Free Trial Management ──────────────────────────────────
export const getFreeTrials = ({ page = 1, limit = 20, search = "", status = "" } = {}) => {
  const params = new URLSearchParams({ page, limit });
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  return request(`/free-trials?${params}`);
};
export const getTrialStats = () => request("/free-trials/stats");
export const getTrialDetail = (id) => request(`/free-trials/${id}`);
export const createTrialSession = (payload) => request("/free-trials/sessions", { method: "POST", body: payload });
export const updateTrialSession = (id, payload) => request(`/free-trials/sessions/${id}`, { method: "PUT", body: payload });
export const cancelTrialSession = (id) => request(`/free-trials/sessions/${id}/cancel`, { method: "PATCH" });
export const markSessionAttendance = (id, payload) => request(`/free-trials/sessions/${id}/attendance`, { method: "PATCH", body: payload });
export const sendTrialNotification = (payload) => request("/free-trials/notify", { method: "POST", body: payload });
export const broadcastToActiveTrials = (payload) => request("/free-trials/broadcast", { method: "POST", body: payload });
export const cancelTrial = (id) => request(`/free-trials/${id}/cancel`, { method: "PATCH" });
export const expireTrials = () => request("/free-trials/expire", { method: "POST" });
export const createBulkSessions = (payload) => request("/free-trials/bulk-sessions", { method: "POST", body: payload });

// ── Blog Management (Admin) ────────────────────────────────
const BLOG_URL = `${ROOT_URL}/blogs`;

export const blogsAdminApi = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", params.page);
    if (params.limit) q.set("limit", params.limit);
    if (params.status) q.set("status", params.status);
    if (params.search) q.set("search", params.search);
    const qs = q.toString();
    return request(`/blogs/admin/all${qs ? `?${qs}` : ""}`, { base: ROOT_URL });
  },
  analytics: () => request("/blogs/admin/analytics", { base: ROOT_URL }),
  moderate: (id, action) =>
    request(`/blogs/admin/${id}/moderate`, { method: "PATCH", body: { action }, base: ROOT_URL }),
  moderateComment: (id, action) =>
    request(`/blogs/admin/comments/${id}/moderate`, { method: "PATCH", body: { action }, base: ROOT_URL }),
  getReports: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.page) q.set("page", params.page);
    const qs = q.toString();
    return request(`/blogs/admin/reports${qs ? `?${qs}` : ""}`, { base: ROOT_URL });
  },
  resolveReport: (id, status, action) =>
    request(`/blogs/admin/reports/${id}/resolve`, { method: "PATCH", body: { status, action }, base: ROOT_URL }),
  hardDelete: (id) =>
    request(`/blogs/admin/${id}/hard`, { method: "DELETE", base: ROOT_URL }),
};

export const getBlog = (id) => request(`/blogs/${id}`, { base: ROOT_URL });
export const getBlogs = (params = {}) => {
  const q = new URLSearchParams();
  if (params.page) q.set("page", params.page);
  if (params.limit) q.set("limit", params.limit);
  if (params.search) q.set("search", params.search);
  if (params.sort) q.set("sort", params.sort);
  const qs = q.toString();
  return request(`/blogs${qs ? `?${qs}` : ""}`, { base: ROOT_URL });
};
export const getTrendingBlogs = (limit = 10) => request(`/blogs/trending?limit=${limit}`, { base: ROOT_URL });
export const getUserBlogs = (userId, params = {}) => {
  const q = new URLSearchParams();
  if (params.page) q.set("page", params.page);
  if (params.limit) q.set("limit", params.limit);
  if (params.status) q.set("status", params.status);
  const qs = q.toString();
  return request(`/blogs/user/${userId}${qs ? `?${qs}` : ""}`, { base: ROOT_URL });
};

// ── Class Invites ─────────────────────────────────────────
export const classInvitesApi = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", params.page);
    if (params.limit) q.set("limit", params.limit);
    if (params.search) q.set("search", params.search);
    if (params.status) q.set("status", params.status);
    const qs = q.toString();
    return request(`/class-invites${qs ? `?${qs}` : ""}`);
  },
  stats: () => request("/class-invites/stats"),
  recipients: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/class-invites/recipients${q ? `?${q}` : ""}`);
  },
  getServiceEligibleStudents: (serviceId, search) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    return request(`/class-invites/service-eligible-students/${serviceId}${q}`);
  },
  get: (id) => request(`/class-invites/${id}`),
  create: (payload) => request("/class-invites", { method: "POST", body: payload }),
  cancel: (id, reason) => request(`/class-invites/${id}/cancel`, { method: "PATCH", body: { reason } }),
  resend: (id) => request(`/class-invites/${id}/resend`, { method: "POST" }),
  duplicate: (id) => request(`/class-invites/${id}/duplicate`, { method: "POST" }),
};

// ── YTTC Invites ─────────────────────────────────────────
export const yttcInvitesApi = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", params.page);
    if (params.limit) q.set("limit", params.limit);
    if (params.search) q.set("search", params.search);
    if (params.status) q.set("status", params.status);
    q.set("inviteCategory", "yttc");

    const qs = q.toString();
    return request(`/class-invites?${qs}`);
  },

  stats: () => request("/class-invites/stats?inviteCategory=yttc"),

  recipients: (params = {}) => {
    const q = new URLSearchParams(params);
    q.set("inviteCategory", "yttc");
    return request(`/class-invites/recipients?${q.toString()}`);
  },

  get: (id) => request(`/class-invites/${id}`),

  create: (payload) =>
    request("/class-invites", {
      method: "POST",
      body: {
        ...payload,
        inviteCategory: "yttc",
      },
    }),

  cancel: (id, reason) =>
    request(`/class-invites/${id}/cancel`, {
      method: "PATCH",
      body: { reason },
    }),

  resend: (id) => request(`/class-invites/${id}/resend`, { method: "POST" }),

  duplicate: (id) =>
    request(`/class-invites/${id}/duplicate`, { method: "POST" }),
};

// ── Orders ─────────────────────────────────────────────────
export const getAdminOrders = (params = {}) => {
  const q = new URLSearchParams();
  if (params.page) q.set('page', params.page);
  if (params.limit) q.set('limit', params.limit);
  if (params.status) q.set('status', params.status);
  if (params.search) q.set('search', params.search);
  if (params.type) q.set('type', params.type);
  if (params.paymentMethod) q.set('paymentMethod', params.paymentMethod);
  if (params.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params.dateTo) q.set('dateTo', params.dateTo);
  return request(`/orders?${q.toString()}`);
};
export const getAdminOrderDetail = (id) => request(`/orders/${id}`);

// ── Book store ─────────────────────────────────────────────
export const adminBooksApi = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.status) q.set("status", params.status);
    if (params.category) q.set("category", params.category);
    if (params.page) q.set("page", params.page);
    if (params.limit) q.set("limit", params.limit);
    return request(`/books?${q.toString()}`);
  },
  stats: () => request("/books/stats"),
  create: (payload) => request("/books", { method: "POST", body: payload }),
  update: (id, payload) => request(`/books/${id}`, { method: "PUT", body: payload }),
  setStatus: (id, status) => request(`/books/${id}/status`, { method: "PATCH", body: { status } }),
  adjustStock: (id, stock) => request(`/books/${id}/stock`, { method: "PATCH", body: { stock } }),
  remove: (id) => request(`/books/${id}`, { method: "DELETE" }),
  uploadCover: async (file) => {
    const form = new FormData();
    form.append("cover", file);
    const token = localStorage.getItem("token");
    let res = await fetch(`${ADMIN_URL}/books/upload-cover`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (res.status === 401 && (await tryRefresh())) {
      res = await fetch(`${ADMIN_URL}/books/upload-cover`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: form,
      });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || data.message || "Upload failed");
    return data;
  },
};

export const adminStoreOrdersApi = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", params.page);
    if (params.limit) q.set("limit", params.limit);
    return request(`/orders/books?${q.toString()}`);
  },
  detail: (id) => request(`/orders/books/${id}`),
  setStatus: (id, status, reason) => request(`/orders/books/${id}/status`, { method: "PATCH", body: { status, reason } }),
  dispatch: (id, courier, trackingNumber) => request(`/orders/books/${id}/dispatch`, { method: "PATCH", body: { courier, trackingNumber } }),
  addNote: (id, note) => request(`/orders/books/${id}/notes`, { method: "POST", body: { note } }),
};

export const adminShippingApi = {
  list: () => request("/shipping/rules"),
  create: (payload) => request("/shipping/rules", { method: "POST", body: payload }),
  update: (id, payload) => request(`/shipping/rules/${id}`, { method: "PUT", body: payload }),
  toggle: (id, status) => request(`/shipping/rules/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => request(`/shipping/rules/${id}`, { method: "DELETE" }),
  saveSettings: (payload) => request("/shipping/settings", { method: "PUT", body: payload }),
};

export const adminBulkEnquiriesApi = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", params.page);
    if (params.limit) q.set("limit", params.limit);
    return request(`/bulk-enquiries?${q.toString()}`);
  },
  detail: (id) => request(`/bulk-enquiries/${id}`),
  setStatus: (id, status, notes) => request(`/bulk-enquiries/${id}/status`, { method: "PATCH", body: { status, notes } }),
};

// ── System Health & Email Monitoring ──────────────────────────
export const getEmailHealth = () =>
  request('/email-health', { base: `${API_DOMAIN}/api/admin/system` });
export const testSmtp = () =>
  request('/email-health/test-smtp', { method: 'POST', base: `${API_DOMAIN}/api/admin/system` });
