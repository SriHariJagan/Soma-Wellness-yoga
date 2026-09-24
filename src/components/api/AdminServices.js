// ─────────────────────────────────────────────────────────
// AdminServices.js
// Centralised API layer for the admin dashboard. Sends the JWT
// access token, transparently refreshes it on a 401, and returns
// parsed JSON (throwing a clean Error on failure).
// ─────────────────────────────────────────────────────────

const API_DOMAIN = import.meta.env.VITE_API_URL || "";
const ADMIN_URL = `${API_DOMAIN}/api/admin`;
const STAFF_URL = `${API_DOMAIN}/api/staff`;
const ROOT_URL = `${API_DOMAIN}/api`;

// Paths a center manager may call — routed to /api/staff automatically
// when the signed-in user has the manager role. Everything else stays
// admin-only (and is hidden from the manager dashboard).
const MANAGER_PREFIXES = ["/overview", "/students", "/attendance", "/class-invites", "/events"];

function storedRole() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}")?.role || "";
  } catch {
    return "";
  }
}

function resolveBase(path, base) {
  if (base !== ADMIN_URL) return base;
  if (storedRole() !== "manager") return base;
  if (MANAGER_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`))) return STAFF_URL;
  return base;
}

function authHeaders() {
  const token = localStorage.getItem("token");
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

async function tryRefresh() {
  try {
    const res = await fetch(`${ROOT_URL}/auth/refresh`, {
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
    /* ignore */
  }
  return false;
}

async function request(path, { method = "GET", body, base = ADMIN_URL } = {}) {
  const resolvedBase = resolveBase(path, base);
  const unreachable = () =>
    new Error(`Cannot reach the server (${resolvedBase}). Make sure the backend is running, then press Refresh.`);
  const opts = {
    method,
    headers: authHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };
  let res;
  try {
    res = await fetch(`${resolvedBase}${path}`, opts);
  } catch {
    throw unreachable();
  }
  if (res.status === 401 && (await tryRefresh())) {
    opts.headers = authHeaders();
    try {
      res = await fetch(`${resolvedBase}${path}`, opts);
    } catch {
      throw unreachable();
    }
  }

  // If still 401 after refresh attempt, auto-expire the token.
  if (res.status === 401 && localStorage.getItem("token") && !((await tryRefresh()))) {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event("storage"));
  }

  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text, error: text.slice(0, 200) }; }
  if (!res.ok) {
    const detailMsg = data.details ? `: ${data.details.map(d => `${d.field} ${d.message}`).join(', ')}` : '';
    const msg = (data.error || data.message || "Request failed") + detailMsg;
    const err = new Error(msg);
    err.status = res.status;
    err.details = data.details;
    throw err;
  }
  return data;
}

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
  syncOfferings: () => request("/services/sync-offerings", { method: "POST" }),
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

// ── SOMA catalog overrides (e.g. SOMA DAILY pricing) ─────────
export const somaCatalogAdminApi = {
  get: () => request("/soma/admin/catalog", { base: ROOT_URL }),
  update: (soma) => request("/soma/admin/catalog", { method: "PUT", body: { soma }, base: ROOT_URL }),
};

// ── Unified Offering Catalog ────────────────────────────────
const OFFERING_URL = `${API_DOMAIN}/api/offerings`;
async function offeringRequest(path, { method = "GET", body } = {}) {
  const opts = {
    method,
    headers: authHeaders(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };
  let res;
  try {
    res = await fetch(`${OFFERING_URL}${path}`, opts);
  } catch {
    throw new Error("Cannot reach the offering server. Make sure the backend is running.");
  }
  if (res.status === 401 && (await tryRefresh())) {
    opts.headers = authHeaders();
    try { res = await fetch(`${OFFERING_URL}${path}`, opts); } catch {
      throw new Error("Cannot reach the offering server.");
    }
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || data.message || "Request failed");
  return data;
}

export const offeringsApi = {
  list: (params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.visibility) q.set("visibility", params.visibility);
    if (params.category) q.set("category", params.category);
    if (params.search) q.set("search", params.search);
    if (params.page) q.set("page", params.page);
    if (params.limit) q.set("limit", params.limit);
    const qs = q.toString();
    return offeringRequest(`/admin${qs ? `?${qs}` : ""}`);
  },
  get: (id) => offeringRequest(`/admin/${id}`),
  create: (payload) => offeringRequest("/admin", { method: "POST", body: payload }),
  update: (id, payload) => offeringRequest(`/admin/${id}`, { method: "PUT", body: payload }),
  remove: (id) => offeringRequest(`/admin/${id}`, { method: "DELETE" }),
  toggle: (id, field) => offeringRequest(`/admin/${id}/toggle`, { method: "PATCH", body: { field } }),
  setStatus: (id, status, visibility) => offeringRequest(`/admin/${id}/status`, { method: "PATCH", body: { status, visibility } }),
  reorder: (orders) => offeringRequest("/admin/reorder", { method: "PATCH", body: { orders } }),
  stats: () => offeringRequest("/admin/stats"),
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

// ── Reception Staff Management ────────────────────────────────
export const receptionStaffApi = {
  list: () => request("/reception"),
  get: (id) => request(`/reception/${id}`),
  create: (payload) => request("/reception", { method: "POST", body: payload }),
  update: (id, payload) => request(`/reception/${id}`, { method: "PUT", body: payload }),
  updatePermissions: (id, permissions) => request(`/reception/${id}/permissions`, { method: "PUT", body: { permissions } }),
  resetPassword: (id) => request(`/reception/${id}/reset-password`, { method: "POST" }),
  setStatus: (id, status) => request(`/reception/${id}/status`, { method: "PATCH", body: { status } }),
  remove: (id) => request(`/reception/${id}`, { method: "DELETE" }),
};

// ── Reception API (for reception users) ───────────────────────
export const receptionApi = {
  profile: () => request("/profile", { base: `${API_DOMAIN}/api/reception` }),
  overview: () => request("/overview", { base: `${API_DOMAIN}/api/reception` }),
  students: {
    list: (params = {}) => {
      const q = new URLSearchParams();
      if (params.search) q.set("search", params.search);
      if (params.page) q.set("page", params.page);
      if (params.limit) q.set("limit", params.limit);
      return request(`/students?${q.toString()}`, { base: `${API_DOMAIN}/api/reception` });
    },
    get: (id) => request(`/students/${id}`, { base: `${API_DOMAIN}/api/reception` }),
    create: (payload) => request("/students", { method: "POST", body: payload, base: `${API_DOMAIN}/api/reception` }),
    update: (id, payload) => request(`/students/${id}`, { method: "PUT", body: payload, base: `${API_DOMAIN}/api/reception` }),
  },
  attendance: {
    overview: () => request("/attendance/overview", { base: `${API_DOMAIN}/api/reception` }),
    invites: (params = {}) => {
      const q = new URLSearchParams();
      if (params.date) q.set("date", params.date);
      const qs = q.toString();
      return request(`/attendance/invites${qs ? `?${qs}` : ""}`, { base: `${API_DOMAIN}/api/reception` });
    },
    students: (inviteId) => request(`/attendance/students/${inviteId}`, { base: `${API_DOMAIN}/api/reception` }),
    byDate: (params = {}) => {
      const q = new URLSearchParams();
      if (params.date) q.set("date", params.date);
      return request(`/attendance/by-date?${q.toString()}`, { base: `${API_DOMAIN}/api/reception` });
    },
    mark: (payload) => request("/attendance", { method: "POST", body: payload, base: `${API_DOMAIN}/api/reception` }),
    bulkMark: (payload) => request("/attendance/bulk", { method: "POST", body: payload, base: `${API_DOMAIN}/api/reception` }),
    markAll: (inviteId) => request("/attendance/mark-all", { method: "POST", body: { inviteId }, base: `${API_DOMAIN}/api/reception` }),
    reset: (inviteId) => request(`/attendance/reset/${inviteId}`, { method: "POST", base: `${API_DOMAIN}/api/reception` }),
  },
  classInvites: {
    list: async (params = {}) => {
      const q = new URLSearchParams();
      if (params.search) q.set("search", params.search);
      if (params.status) q.set("status", params.status);
      if (params.page) q.set("page", params.page);
      if (params.limit) q.set("limit", params.limit);
      const qs = q.toString();
      const data = await request(`/class-invites${qs ? `?${qs}` : ""}`, { base: `${API_DOMAIN}/api/reception` });
      // Backend returns { invites, total, page, pages } — unwrap to array
      // for backwards compatibility; attach pagination as properties.
      if (data && Array.isArray(data.invites)) {
        const arr = data.invites;
        arr.total = data.total;
        arr.page = data.page;
        arr.pages = data.pages;
        return arr;
      }
      return Array.isArray(data) ? data : [];
    },
    listDetailed: (params = {}) => {
      const q = new URLSearchParams();
      if (params.search) q.set("search", params.search);
      if (params.status) q.set("status", params.status);
      if (params.page) q.set("page", params.page);
      if (params.limit) q.set("limit", params.limit);
      const qs = q.toString();
      return request(`/class-invites${qs ? `?${qs}` : ""}`, { base: `${API_DOMAIN}/api/reception` });
    },
    stats: () => request("/class-invites/stats", { base: `${API_DOMAIN}/api/reception` }),
    create: (payload) => request("/class-invites", { method: "POST", body: payload, base: `${API_DOMAIN}/api/reception` }),
    get: (id) => request(`/class-invites/${id}`, { base: `${API_DOMAIN}/api/reception` }),
    cancel: (id, reason) => request(`/class-invites/${id}/cancel`, { method: "PATCH", body: reason ? { reason } : {}, base: `${API_DOMAIN}/api/reception` }),
    resend: (id) => request(`/class-invites/${id}/resend`, { method: "POST", base: `${API_DOMAIN}/api/reception` }),
    duplicate: (id) => request(`/class-invites/${id}/duplicate`, { method: "POST", base: `${API_DOMAIN}/api/reception` }),
  },
  courses: {
    list: () => request("/courses", { base: `${API_DOMAIN}/api/reception` }),
  },
  catalog: () => request("/catalog", { base: `${API_DOMAIN}/api/reception` }),
  purchases: {
    list: (studentId) => request(`/students/${studentId}/purchases`, { base: `${API_DOMAIN}/api/reception` }),
    create: (studentId, payload) => request(`/students/${studentId}/purchases`, { method: "POST", body: payload, base: `${API_DOMAIN}/api/reception` }),
  },
  events: {
    list: () => request("/events", { base: `${API_DOMAIN}/api/reception` }),
    registrations: (id) => request(`/events/${id}/registrations`, { base: `${API_DOMAIN}/api/reception` }),
  },
  classes: {
    list: () => request("/classes", { base: `${API_DOMAIN}/api/reception` }),
  },
  activityLog: () => request("/activity-log", { base: `${API_DOMAIN}/api/reception` }),
};

// ── System Health & Email Monitoring ──────────────────────────
export const getEmailHealth = () =>
  request('/email-health', { base: `${API_DOMAIN}/api/admin/system` });
export const testSmtp = () =>
  request('/email-health/test-smtp', { method: 'POST', base: `${API_DOMAIN}/api/admin/system` });
