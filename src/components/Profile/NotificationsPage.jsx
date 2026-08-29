import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import s from "./Dashboard.shared.module.css";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  archiveNotification,
  deleteNotification,
} from "../api/StudentServices.js";

const FILTERS = [
  { id: "all",          label: "All" },
  { id: "unread",       label: "Unread" },
  { id: "read",         label: "Read" },
  { id: "payment",      label: "Payment" },
  { id: "membership",   label: "Membership" },
  { id: "courses",      label: "Courses" },
  { id: "services",     label: "Services" },
  { id: "workshops",    label: "Workshops" },
  { id: "announcements",label: "Announcements" },
];

const TYPE_ICON = {
  general:           { icon: "ti ti-bell",           color: "#6B7280", bg: "rgba(107,114,128,0.1)" },
  information:       { icon: "ti ti-info-circle",    color: "#3B82F6", bg: "rgba(59,130,246,0.1)" },
  reminder:          { icon: "ti ti-clock",          color: "#F97316", bg: "rgba(249,115,22,0.1)" },
  payment_reminder:  { icon: "ti ti-coin",           color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  membership_expiry: { icon: "ti ti-shield-off",     color: "#DC2626", bg: "rgba(220,38,38,0.1)" },
  membership_activated:{icon: "ti ti-shield-check",  color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  course_update:     { icon: "ti ti-book",           color: "#8B5CF6", bg: "rgba(139,92,246,0.1)" },
  service_update:    { icon: "ti ti-package",        color: "#F97316", bg: "rgba(249,115,22,0.1)" },
  workshop_update:   { icon: "ti ti-award",          color: "#EC4899", bg: "rgba(236,72,153,0.1)" },
  attendance:        { icon: "ti ti-calendar-check", color: "#10B981", bg: "rgba(16,185,129,0.1)" },
  promotional:       { icon: "ti ti-sparkles",       color: "#F59E0B", bg: "rgba(245,158,11,0.1)" },
  emergency:         { icon: "ti ti-alert-triangle", color: "#DC2626", bg: "rgba(220,38,38,0.1)" },
};

const PRIORITY_COLORS = {
  low:    { border: "#E5E7EB", badge: "#6B7280", bg: "rgba(107,114,128,0.08)" },
  normal: { border: "#F97316", badge: "#F97316", bg: "rgba(249,115,22,0.08)" },
  high:   { border: "#DC2626", badge: "#DC2626", bg: "rgba(220,38,38,0.08)" },
  urgent: { border: "#991B1B", badge: "#991B1B", bg: "rgba(153,27,27,0.1)" },
};

function relativeTime(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function typeMap(type) {
  return TYPE_ICON[type] || TYPE_ICON.general;
}

export default function NotificationsPage({ student, reload }) {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [expanded, setExpanded] = useState(null);

  const LIMIT = 20;

  const filterTypeMap = {
    payment: "payment_reminder",
    membership: "membership_expiry,membership_activated",
    courses: "course_update",
    services: "service_update",
    workshops: "workshop_update",
    announcements: "general,information,reminder,promotional",
  };

  const fetchNotifs = useCallback(async (filter = activeFilter, pg = 1) => {
    try {
      setLoading(true);
      const params = { page: pg, limit: LIMIT };

      if (filter === "unread") params.status = "unread";
      else if (filter === "read") params.status = "read";
      else if (filter !== "all") params.type = filterTypeMap[filter] || filter;

      const data = await getNotifications(params);
      setNotifs(Array.isArray(data.notifications) ? data.notifications : []);
      setTotal(data.total || 0);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      setNotifs([]);
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => { fetchNotifs(activeFilter, 1); setPage(1); setExpanded(null); }, [activeFilter]);

  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
  };

  async function handleMarkAll() {
    setBusy(true);
    try {
      await markAllNotificationsRead();
      setNotifs((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      await reload?.();
    } catch { /* non-fatal */ }
    finally { setBusy(false); }
  }

  async function handleMarkRead(n) {
    if (n.isRead) return;
    try {
      await markNotificationRead(n._id);
      setNotifs((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true, readAt: new Date().toISOString() } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
      await reload?.();
    } catch { /* non-fatal */ }
  }

  async function handleArchive(n) {
    try {
      await archiveNotification(n._id);
      setNotifs((prev) => prev.filter((x) => x._id !== n._id));
      if (!n.isRead) setUnreadCount((c) => Math.max(0, c - 1));
      await reload?.();
    } catch { /* non-fatal */ }
  }

  async function handleDelete(id) {
    try {
      await deleteNotification(id);
      setNotifs((prev) => prev.filter((x) => x._id !== id));
      setTotal((t) => t - 1);
      await reload?.();
    } catch { /* non-fatal */ }
  }

  const handleToggleExpand = async (n) => {
    if (expanded === n._id) {
      setExpanded(null);
      return;
    }
    setExpanded(n._id);
    if (!n.isRead) await handleMarkRead(n);
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p className={s.pageTitle}>Notifications</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {unreadCount > 0 && (
            <button className={s.btnSm} onClick={handleMarkAll} disabled={busy}>
              <i className="ti ti-checks" aria-hidden="true" />
              {busy ? "Marking..." : `Mark all read (${unreadCount})`}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => handleFilterChange(f.id)}
            style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 500,
              border: activeFilter === f.id ? "1.5px solid #F97316" : "1px solid #E7D7BE",
              background: activeFilter === f.id ? "rgba(249,115,22,0.08)" : "#fff",
              color: activeFilter === f.id ? "#F97316" : "#6B5E4E",
              cursor: "pointer", fontFamily: "'Inter', sans-serif",
              transition: "all 0.15s",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={s.card}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: i < 3 ? "1px solid var(--color-border-light)" : "none" }}>
              <div className={s.skel} style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className={s.skel} style={{ height: 14, width: "60%", marginBottom: 8, borderRadius: 6 }} />
                <div className={s.skel} style={{ height: 12, width: "80%", marginBottom: 6, borderRadius: 6 }} />
                <div className={s.skel} style={{ height: 12, width: "30%", borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      ) : notifs.length === 0 ? (
        <div className={s.emptyState}>
          <i className="ti ti-bell-off" aria-hidden="true" />
          <p>No notifications yet.</p>
          <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            We'll notify you here when something important comes up.
          </p>
        </div>
      ) : (
        <div>
          <div className={s.card} style={{ padding: 0, overflow: "hidden" }}>
            <AnimatePresence initial={false}>
              {notifs.map((n, i) => {
                const meta = typeMap(n.type);
                const pc = PRIORITY_COLORS[n.priority] || PRIORITY_COLORS.normal;
                const isExpanded = expanded === n._id;

                return (
                  <motion.div
                    key={n._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div
                      onClick={() => handleToggleExpand(n)}
                      style={{
                        borderLeft: `3px solid ${!n.isRead ? pc.border : "transparent"}`,
                        background: n.isRead ? "#fff" : "rgba(249,115,22,0.03)",
                        padding: "14px 18px",
                        cursor: "pointer",
                        borderBottom: i < notifs.length - 1 ? "1px solid var(--color-border-light)" : "none",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = n.isRead ? "var(--color-bg-tertiary)" : "rgba(249,115,22,0.06)"}
                      onMouseLeave={(e) => e.currentTarget.style.background = n.isRead ? "#fff" : "rgba(249,115,22,0.03)"}
                    >
                      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        <div style={{
                          width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                          display: "grid", placeItems: "center", fontSize: 16,
                          background: meta.bg, color: meta.color,
                        }}>
                          <i className={meta.icon} aria-hidden="true" />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                            <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--color-dark)", flex: 1 }}>
                              {n.title}
                            </span>
                            {!n.isRead && (
                              <span style={{
                                width: 8, height: 8, borderRadius: "50%",
                                background: pc.badge, flexShrink: 0,
                              }} />
                            )}
                          </div>

                          <p style={{
                            fontSize: 12.5, color: "var(--color-text-secondary)", lineHeight: 1.5, margin: 0,
                            display: "-webkit-box", WebkitLineClamp: isExpanded ? "unset" : 2,
                            WebkitBoxOrient: "vertical", overflow: isExpanded ? "visible" : "hidden",
                          }}>
                            {n.message}
                          </p>

                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, color: "var(--color-text-muted)", display: "inline-flex", alignItems: "center", gap: 3 }}>
                              <i className="ti ti-clock" style={{ fontSize: 10 }} />
                              {relativeTime(n.createdAt)}
                            </span>
                            <span style={{
                              fontSize: 9.5, fontWeight: 600, padding: "2px 7px", borderRadius: 12,
                              background: pc.bg, color: pc.badge,
                            }}>
                              {n.priority?.charAt(0).toUpperCase() + n.priority?.slice(1) || "Normal"}
                            </span>
                            <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
                              {n.sender || "Soma Wellness"}
                            </span>
                          </div>

                          {/* Expanded actions */}
                          {isExpanded && (
                            <div style={{ display: "flex", gap: 8, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--color-border-light)" }}>
                              {!n.isRead && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleMarkRead(n); }}
                                  style={{
                                    display: "inline-flex", alignItems: "center", gap: 4,
                                    padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600,
                                    border: "1px solid #E7D7BE", background: "#fff", color: "#F97316",
                                    cursor: "pointer", fontFamily: "'Inter', sans-serif",
                                  }}
                                >
                                  <i className="ti ti-check" /> Mark Read
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); handleArchive(n); }}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 4,
                                  padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 500,
                                  border: "1px solid #E7D7BE", background: "#fff", color: "#6B5E4E",
                                  cursor: "pointer", fontFamily: "'Inter', sans-serif",
                                }}
                              >
                                <i className="ti ti-archive" /> Archive
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(n._id); }}
                                style={{
                                  display: "inline-flex", alignItems: "center", gap: 4,
                                  padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 500,
                                  border: "none", background: "rgba(220,38,38,0.08)", color: "#DC2626",
                                  cursor: "pointer", fontFamily: "'Inter', sans-serif",
                                }}
                              >
                                <i className="ti ti-trash" /> Delete
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Expand indicator */}
                        <div style={{ color: "var(--color-text-muted)", flexShrink: 0, marginTop: 2 }}>
                          <i className={`ti ${isExpanded ? "ti-chevron-up" : "ti-chevron-down"}`} style={{ fontSize: 14 }} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 16 }}>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => { setPage(p); fetchNotifs(activeFilter, p); }}
                  style={{
                    width: 34, height: 34, borderRadius: 8, fontSize: 13, fontWeight: 600,
                    border: page === p ? "1.5px solid #F97316" : "1px solid #E7D7BE",
                    background: page === p ? "rgba(249,115,22,0.08)" : "#fff",
                    color: page === p ? "#F97316" : "#6B5E4E",
                    cursor: "pointer", fontFamily: "'Inter', sans-serif",
                  }}
                >
                  {p}
                </button>
              ))}
              {totalPages > 5 && <span style={{ display: "flex", alignItems: "center", color: "#9C8E7C", fontSize: 13 }}>...</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
