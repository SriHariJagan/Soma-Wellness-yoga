// ─────────────────────────────────────────────────────────
// StudentServices.js
// All API calls for the student dashboard. JWT access token is
// read from localStorage and sent as a Bearer header. On a 401
// the refresh token is used transparently to obtain a new access
// token before retrying once.
// ─────────────────────────────────────────────────────────

const API_DOMAIN = import.meta.env.VITE_API_URL || "";
const AUTH_URL = `${API_DOMAIN}/api/auth`;
const STUDENT_URL = `${API_DOMAIN}/api/student`;

function authHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// Attempt to refresh the access token using the stored refresh token.
async function tryRefresh() {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${AUTH_URL}/refresh`, {
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
    /* fall through */
  }
  return false;
}

// Core fetch wrapper: injects auth, retries once after refresh, and
// surfaces a clean Error with the server message.
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

// ── Profile ────────────────────────────────────────────────
export const getStudentProfile = () => api("/profile", { base: AUTH_URL });

export const updateStudentProfile = (formData) =>
  api("/profile", { method: "PUT", body: formData, base: AUTH_URL });

export const changePassword = (currentPassword, newPassword) =>
  api("/change-password", { method: "POST", body: { currentPassword, newPassword }, base: AUTH_URL });

// ── Dashboard ──────────────────────────────────────────────
export const getDashboard = () => api("/dashboard");

// ── Membership ─────────────────────────────────────────────
export const renewMembership = (planMonths) => api("/membership/purchase", { method: "POST", body: { planMonths } });
export const upgradeMembership = (planMonths) => api("/membership/purchase", { method: "POST", body: { planMonths } });
export const pauseMembership = (days) => api("/membership/pause", { method: "POST", body: { days } });
export const resumeMembership = () => api("/membership/resume", { method: "POST" });

// ── Classes / Workshops ────────────────────────────────────
export const enrollClass = (id) => api(`/classes/${id}/enroll`, { method: "POST" });
export const getWorkshopDetail = (id) => api(`/workshops/${id}`);
export const registerWorkshop = (id) => api(`/workshops/${id}/register`, { method: "POST" });

// ── Events ─────────────────────────────────────────────────
export const getEvents = () => api("/events");
export const registerEvent = (id) => api(`/events/${id}/register`, { method: "POST" });

// ── Consultations ──────────────────────────────────────────
export const getConsultationSlots = (date) => api(`/consultations/slots?date=${encodeURIComponent(date)}`);
export const bookConsultation = (payload) => api("/consultations", { method: "POST", body: payload });
export const rescheduleConsultation = (id, date, timeSlot) => api(`/consultations/${id}/reschedule`, { method: "PATCH", body: { date, timeSlot } });
export const cancelConsultation = (id) => api(`/consultations/${id}/cancel`, { method: "PATCH" });

// ── Downloads / Assets ─────────────────────────────────────
export const getStudentDownloads = () => api("/downloads");
export const trackDownload = (id) => api(`/downloads/${id}/track`, { method: "POST" });
export const downloadAssetUrl = (id) => `${STUDENT_URL}/downloads/${id}/download`;

// ── Notifications ──────────────────────────────────────────
export const getNotifications = (params = {}) => {
  const q = new URLSearchParams();
  if (params.page) q.set("page", params.page);
  if (params.limit) q.set("limit", params.limit);
  if (params.type) q.set("type", params.type);
  if (params.status) q.set("status", params.status);
  const qs = q.toString();
  return api(`/notifications${qs ? `?${qs}` : ""}`);
};
export const getUnreadNotificationCount = () => api("/notifications/unread-count");
export const markNotificationRead = (id) => api(`/notifications/${id}/read`, { method: "PATCH" });
export const markAllNotificationsRead = () => api("/notifications/read-all", { method: "PATCH" });
export const archiveNotification = (id) => api(`/notifications/${id}/archive`, { method: "PATCH" });
export const deleteNotification = (id) => api(`/notifications/${id}`, { method: "DELETE" });

// ── Payment Verification ────────────────────────────────────
export const verifyPayment = (payload) => {
  const API_DOMAIN = import.meta.env.VITE_API_URL || "";
  const token = localStorage.getItem("token");
  return fetch(`${API_DOMAIN}/api/verify-payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  }).then(async (res) => {
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || data.error || "Payment verification failed");
    if (!data.success) throw new Error(data.message || data.error || "Payment verification failed");
    return data;
  });
};

// ── Cart ────────────────────────────────────────────────────
export const getCart = () => api("/cart");
export const getCartCount = () => api("/cart/count");
export const addToCart = (itemType, itemId) => api("/cart/add", { method: "POST", body: { itemType, itemId } });
export const removeFromCart = (itemId) => api(`/cart/item/${itemId}`, { method: "DELETE" });
export const applyCouponToCart = (code) => api("/cart/apply-coupon", { method: "POST", body: { code } });
export const removeCouponFromCart = () => api("/cart/remove-coupon", { method: "POST" });
export const checkoutCart = (idempotencyKey) => api("/cart/checkout", { method: "POST", body: { idempotencyKey } });

// ── Orders ──────────────────────────────────────────────────
export const getMyOrders = (params = {}) => {
  const q = new URLSearchParams();
  if (params.page) q.set('page', params.page);
  if (params.limit) q.set('limit', params.limit);
  return api(`/orders?${q.toString()}`);
};
export const getMyOrderDetail = (id) => api(`/orders/${id}`);

// ── Referral ───────────────────────────────────────────────
export const getReferral = () => api("/referral");
export const inviteReferral = (name, email) => api("/referral/invite", { method: "POST", body: { name, email } });

export const startFreeTrial = () => api("/trial/start", { method: "POST" });
export const checkTrialEligibility = () => api("/trial/check-eligibility");
export const getMyTrial = () => api("/trial");
export const getMyTrialSessions = () => api("/trial/sessions");
export const getTrialSessionDetail = (id) => api(`/trial/sessions/${id}`);
export const getMyTrialNotifications = () => api("/trial/notifications");
export const markTrialNotificationRead = (id) => api(`/trial/notifications/${id}/read`, { method: "PATCH" });
export const markAllTrialNotificationsRead = () => api("/trial/notifications/read-all", { method: "PATCH" });

// ── Membership Plans (Browse) ───────────────────────────────
export const getMembershipPlans = () => api("/membership-plans");
export const purchaseMembership = (planId) => api("/membership/purchase", { method: "POST", body: { planId } });
export const getActiveMembership = () => api("/membership/active");
export const getMembershipStatus = () => api("/membership/status");
export const cancelMembership = () => api("/membership/cancel", { method: "POST" });

// ── Enrollment Progress ─────────────────────────────────────
export const getEnrollmentProgress = () => api("/enrollment-progress");

// ── Attendance Management (student) ─────────────────────────
export const getMyEnrollments = () => api("/enrollments");
export const getEnrollmentAttendance = (entityType, entityId) =>
  api(`/attendance/enrollment?entityType=${encodeURIComponent(entityType)}&entityId=${encodeURIComponent(entityId)}`);

// ── Class Invites ─────────────────────────────────────────
export const getMyInvites = () => api("/invites");
export const getMyInviteDetail = (id) => api(`/invites/${id}`);
export const markInviteRead = (id) => api(`/invites/${id}/read`, { method: "PATCH" });
export const joinInvite = (id) => api(`/invites/${id}/join`, { method: "POST" });

// ── YTTC ──────────────────────────────────────────────────
export const getYTTCStatus = () => api("/yttc/status");

export const enrollYTTC = (mode = "online") =>
  api("/yttc/enroll", {
    method: "POST",
    body: { mode },
  });

export const getMyYTTCInvites = () => api("/invites?inviteCategory=yttc");

export const getMyYTTCInviteDetail = (id) =>
  api(`/invites/${id}?inviteCategory=yttc`);

export const markYTTCInviteRead = (id) =>
  api(`/invites/${id}/read`, { method: "PATCH" });

export const joinYTTCInvite = (id) =>
  api(`/invites/${id}/join?inviteCategory=yttc`, { method: "POST" });

// ── Active Services ──────────────────────────────────────────
export const getActiveServices = () => api("/services");
export const getAvailableServices = () => api("/services/catalog");
export const enrollService = (serviceId) => api("/services/enroll", { method: "POST", body: { serviceId } });
export const renewService = (id) => api(`/services/${id}/renew`, { method: "POST" });
export const cancelService = (id) => api(`/services/${id}/cancel`, { method: "PATCH" });

// ── All Enrollments (all types, active + archived) ──────────
export const getAllEnrollments = () => api("/all-enrollments");

// ── Blogs ──────────────────────────────────────────────────
const BLOG_URL = `${API_DOMAIN}/api/blogs`;

async function blogApi(path, opts = {}) {
  const base = opts.base || BLOG_URL;
  const authHeadersVal = () => {
    const token = localStorage.getItem("token");
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  };
  const fetchOpts = {
    method: opts.method || "GET",
    headers: authHeadersVal(),
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  };
  let res = await fetch(`${base}${path}`, fetchOpts);
  if (res.status === 401 && (await tryRefresh())) {
    fetchOpts.headers = authHeadersVal();
    res = await fetch(`${base}${path}`, fetchOpts);
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || data.message || "Request failed");
  return data;
}

export const getBlogs = (params = {}) => {
  const q = new URLSearchParams();
  if (params.page) q.set("page", params.page);
  if (params.limit) q.set("limit", params.limit);
  if (params.search) q.set("search", params.search);
  if (params.tag) q.set("tag", params.tag);
  if (params.category) q.set("category", params.category);
  if (params.author) q.set("author", params.author);
  if (params.sort) q.set("sort", params.sort);
  const qs = q.toString();
  return blogApi(`/${qs ? `?${qs}` : ""}`);
};

export const getTrendingBlogs = (limit = 10) => blogApi(`/trending?limit=${limit}`);
export const getBlog = (id) => blogApi(`/${id}`);
export const createBlog = (data) => blogApi("/", { method: "POST", body: data });
export const updateBlog = (id, data) => blogApi(`/${id}`, { method: "PUT", body: data });
export const deleteBlog = (id) => blogApi(`/${id}`, { method: "DELETE" });
export const duplicateBlog = (id) => blogApi(`/${id}/duplicate`, { method: "POST" });

export const getUserBlogs = (userId, params = {}) => {
  const q = new URLSearchParams();
  if (params.page) q.set("page", params.page);
  if (params.limit) q.set("limit", params.limit);
  if (params.status) q.set("status", params.status);
  const qs = q.toString();
  return blogApi(`/user/${userId}${qs ? `?${qs}` : ""}`);
};

export const getMyBlogStats = () => blogApi("/my/stats");

export const toggleLike = (targetType, targetId) =>
  blogApi("/like", { method: "POST", body: { targetType, targetId } });
export const toggleBookmark = (blogId) =>
  blogApi("/bookmark", { method: "POST", body: { blogId } });
export const getBookmarks = (params = {}) => {
  const q = new URLSearchParams();
  if (params.page) q.set("page", params.page);
  if (params.limit) q.set("limit", params.limit);
  const qs = q.toString();
  return blogApi(`/bookmarks/mine${qs ? `?${qs}` : ""}`);
};
export const shareBlog = (id) => blogApi(`/${id}/share`, { method: "POST" });

export const reportContent = (data) => blogApi("/report", { method: "POST", body: data });

export const getComments = (blogId, params = {}) => {
  const q = new URLSearchParams();
  if (params.page) q.set("page", params.page);
  if (params.limit) q.set("limit", params.limit);
  if (params.sort) q.set("sort", params.sort);
  const qs = q.toString();
  return blogApi(`/${blogId}/comments${qs ? `?${qs}` : ""}`);
};
export const getReplies = (commentId) => blogApi(`/comments/${commentId}/replies`);
export const createComment = (blogId, content, parentId) =>
  blogApi(`/${blogId}/comments`, { method: "POST", body: { blogId, content, parentId } });
export const updateComment = (id, content) =>
  blogApi(`/comments/${id}`, { method: "PUT", body: { content } });
export const deleteComment = (id) =>
  blogApi(`/comments/${id}`, { method: "DELETE" });

export const uploadMedia = async (files) => {
  const token = localStorage.getItem("token");
  const formData = new FormData();
  for (const f of files) formData.append("files", f);
  const res = await fetch(`${BLOG_URL}/upload/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (res.status === 401) {
    if (await tryRefresh()) {
      const newToken = localStorage.getItem("token");
      const retryRes = await fetch(`${BLOG_URL}/upload/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${newToken}` },
        body: formData,
      });
      const retryText = await retryRes.text();
      const retryData = retryText ? JSON.parse(retryText) : {};
      if (!retryRes.ok) throw new Error(retryData.error || "Upload failed");
      return retryData;
    }
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data;
};
