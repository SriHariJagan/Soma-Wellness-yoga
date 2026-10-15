import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from "dompurify";
import { LuTrash2 } from "react-icons/lu";
import s from "./YogaAdmin.module.css";
import { blogsAdminApi, getBlog } from "../api/AdminServices.js";
import { createBlog, updateBlog, getUserBlogs } from "../api/StudentServices.js";
import { PageHeader, Counter, KpiCard, trendSeed } from "./ui/Primitives.jsx";
import { ConfirmSheet } from "./ui/Sheets.jsx";
import BlogDetail from "../Profile/BlogDetail";

const API_DOMAIN = import.meta.env.VITE_API_URL || "";

function resolveContentHtml(html) {
  if (!html) return "";
  const resolved = html.replace(/(src|href)="\//g, (m, attr) => `${attr}="${API_DOMAIN}/`);
  return DOMPurify.sanitize(resolved, {
    ALLOWED_TAGS: [
      'p','br','b','i','u','em','strong','a','ul','ol','li','h1','h2','h3','h4','h5','h6',
      'blockquote','pre','code','span','div','img','figure','figcaption','hr',
      'table','thead','tbody','tr','th','td',
      'iframe','video','audio','source',
    ],
    ALLOWED_ATTR: ['src','href','alt','title','class','id','target','rel','width','height',
      'allowfullscreen','frameborder','allow','controls','autoplay','loop','muted','style','data-*'],
    ALLOW_DATA_ATTR: true,
    ADD_ATTR: ['target'],
  });
}

export default function BlogManagement({ onChanged }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [blogs, setBlogs] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [blogPage, setBlogPage] = useState(1);
  const [blogHasMore, setBlogHasMore] = useState(false);
  const [blogSearch, setBlogSearch] = useState("");
  const [blogStatus, setBlogStatus] = useState("");
  const [blogModeration, setBlogModeration] = useState("");
  const [blogAuthor, setBlogAuthor] = useState("");
  const [reportPage, setReportPage] = useState(1);
  const [reportStatus, setReportStatus] = useState("pending");
  const [expandedBlog, setExpandedBlog] = useState(null);
  const [feedback, setFeedback] = useState({ message: "", type: "" });
  // Approvals queue: user posts awaiting review before they reach everyone.
  const [pendingBlogs, setPendingBlogs] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [editingBlogId, setEditingBlogId] = useState(null);
  const [viewingBlogId, setViewingBlogId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const flash = (message, type = "success") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: "", type: "" }), 3000);
  };

  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await blogsAdminApi.analytics();
      setAnalytics(data.analytics);
    } catch {}
  }, []);

  const fetchBlogs = useCallback(async (pageNum = 1, append = false) => {
    setLoading(pageNum === 1);
    try {
      const data = await blogsAdminApi.list({ page: pageNum, limit: 10, status: blogStatus || undefined, search: blogSearch || undefined, moderation: blogModeration || undefined, author: blogAuthor || undefined });
      const list = data.blogs || [];
      if (append) setBlogs(prev => [...prev, ...list]);
      else setBlogs(list);
      setBlogHasMore(data.pagination?.page < data.pagination?.pages);
    } catch {
      if (!append) setBlogs([]);
    }
    setLoading(false);
  }, [blogStatus, blogSearch, blogModeration, blogAuthor]);

  const fetchReports = useCallback(async (pageNum = 1) => {
    try {
      const data = await blogsAdminApi.getReports({ status: reportStatus, page: pageNum, limit: 10 });
      setReports(data.reports || []);
    } catch {}
  }, [reportStatus]);

  const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const data = await blogsAdminApi.list({ moderation: "pending", limit: 20 });
      setPendingBlogs(data.blogs || []);
      setPendingCount(data.pagination?.total ?? (data.blogs || []).length);
    } catch {
      setPendingBlogs([]);
    }
    setPendingLoading(false);
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);
  useEffect(() => { fetchBlogs(1); }, [fetchBlogs]);
  useEffect(() => { fetchReports(1); }, [fetchReports]);
  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleApprove = async (id) => {
    try {
      await blogsAdminApi.moderate(id, "approve");
      flash("Blog approved — now visible to all users");
      fetchPending();
      fetchBlogs(1);
      fetchAnalytics();
    } catch (err) { flash(err.message, "error"); }
  };

  const handleReject = async (id) => {
    try {
      await blogsAdminApi.moderate(id, "reject");
      flash("Blog rejected — stays hidden");
      fetchPending();
      fetchBlogs(1);
    } catch (err) { flash(err.message, "error"); }
  };

  const handleModerate = async (id, action) => {
    try {
      await blogsAdminApi.moderate(id, action);
      const past = { approved: "approved", rejected: "rejected", featured: "featured", pinned: "pinned", hide: "archived", restore: "restored" };
      flash(`Blog ${past[action] || action + "ed"} successfully`);
      fetchBlogs(1);
      fetchPending();
      fetchAnalytics();
    } catch (err) { flash(err.message, "error"); }
  };

  const handleModerateComment = async (id, action) => {
    try {
      await blogsAdminApi.moderateComment(id, action);
      flash(`Comment ${action}ed`);
    } catch (err) { flash(err.message, "error"); }
  };

  const handleResolveReport = async (id, status, action = "") => {
    try {
      await blogsAdminApi.resolveReport(id, status, action);
      flash("Report resolved");
      fetchReports(1);
    } catch (err) { flash(err.message, "error"); }
  };

  const handleHardDelete = async (id) => {
    try {
      await blogsAdminApi.hardDelete(id);
      flash("Blog permanently deleted");
      fetchBlogs(1);
      fetchAnalytics();
      if (viewingBlogId === id) setViewingBlogId(null);
    } catch (err) { flash(err.message, "error"); }
  };

  const TABS = [
    { id: "overview", label: "Overview", icon: "ti ti-dashboard" },
    { id: "approvals", label: "Approvals", icon: "ti ti-clock" },
    { id: "write", label: "Write", icon: "ti ti-pencil" },
    { id: "myBlogs", label: "My Blogs", icon: "ti ti-article" },
    { id: "blogs", label: "All Blogs", icon: "ti ti-layout-list" },
    { id: "reports", label: "Reports", icon: "ti ti-flag" },
  ];

  return (
    <div>
      <PageHeader title="Blog Management" subtitle="Moderate, analyze, and manage all blogs and articles">
        <div className={s.tabGroup}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={`${s.tabBtn} ${activeTab === t.id ? s.tabActive : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              <i className={t.icon} /> {t.label}
              {t.id === "reports" && analytics?.pendingReports > 0 && (
                <span className={s.badgeDanger}>{analytics.pendingReports}</span>
              )}
              {t.id === "approvals" && pendingCount > 0 && (
                <span className={s.badgeDanger}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
      </PageHeader>

      {feedback.message && (
        <div className={`${s.feedbackBar} ${feedback.type === "error" ? s.feedbackError : ""}`}>
          {feedback.message}
        </div>
      )}

      {viewingBlogId ? (
        <AdminBlogDetail
          blogId={viewingBlogId}
          onBack={() => { setViewingBlogId(null); fetchBlogs(1); }}
          onModerate={handleModerate}
          onEdit={(id) => { setViewingBlogId(null); setEditingBlogId(id); setActiveTab("write"); }}
          onDelete={(id) => setDeleteConfirm(id)}
        />
      ) : (
        <>
      {activeTab === "overview" && (
        <div>
          <div className={s.statsGrid}>
            <KpiCard icon={<i className="ti ti-article" />} label="Total Blogs" value={analytics?.totalBlogs || 0} accent="orange" spark={trendSeed("total")} />
            <KpiCard icon={<i className="ti ti-send" />} label="Published" value={analytics?.publishedBlogs || 0} accent="green" spark={trendSeed("pub")} />
            <KpiCard icon={<i className="ti ti-pencil" />} label="Drafts" value={analytics?.draftBlogs || 0} accent="amber" spark={trendSeed("draft")} />
            <KpiCard icon={<i className="ti ti-eye" />} label="Total Views" value={analytics?.totalViews || 0} accent="blue" spark={trendSeed("views")} />
            <KpiCard icon={<i className="ti ti-heart" />} label="Total Likes" value={analytics?.totalLikes || 0} accent="orange" spark={trendSeed("likes")} />
            <KpiCard icon={<i className="ti ti-message" />} label="Total Comments" value={analytics?.totalComments || 0} accent="green" spark={trendSeed("comments")} />
          </div>

          {/* ── Attention spotlight ── */}
          <div style={{
            borderRadius: 18, padding: "22px 24px", marginTop: 20, color: "#fff",
            background: "linear-gradient(135deg, #1A0F0A 0%, #2D1B10 55%, #5A3A22 100%)",
            position: "relative", overflow: "hidden",
            boxShadow: "0 12px 32px rgba(45,20,6,0.25)",
          }}>
            <div style={{ position: "absolute", right: -60, top: -60, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(200,149,108,0.35) 0%, transparent 70%)" }} />
            <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 3, background: "linear-gradient(90deg, #C8956C, #F97316, transparent)" }} />
            <div style={{ fontSize: 10.5, letterSpacing: 3, textTransform: "uppercase", color: "#C8956C", fontWeight: 800 }}>Needs your review</div>
            {(pendingCount > 0 || (analytics?.pendingReports || 0) > 0) ? (
              <div style={{ display: "flex", gap: 26, flexWrap: "wrap", marginTop: 14, alignItems: "center" }}>
                {pendingCount > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", fontSize: 40, fontWeight: 700, lineHeight: 1 }}>{pendingCount}</div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#F5EDE4" }}>member post{pendingCount !== 1 ? "s" : ""} awaiting approval</div>
                      <div style={{ fontSize: 11.5, color: "rgba(232,220,207,0.75)", marginTop: 2 }}>Approve to publish to all users</div>
                    </div>
                    <button type="button" onClick={() => setActiveTab("approvals")}
                      style={{ padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #C8956C, #F97316)", color: "#fff", fontSize: 12.5, fontWeight: 700 }}>
                      Review now
                    </button>
                  </div>
                )}
                {(analytics?.pendingReports || 0) > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{ fontFamily: "'Inter',system-ui,sans-serif", fontSize: 40, fontWeight: 700, lineHeight: 1 }}>{analytics.pendingReports}</div>
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#F5EDE4" }}>reported item{(analytics.pendingReports !== 1) ? "s" : ""}</div>
                      <div style={{ fontSize: 11.5, color: "rgba(232,220,207,0.75)", marginTop: 2 }}>Flagged by the community</div>
                    </div>
                    <button type="button" onClick={() => setActiveTab("reports")}
                      style={{ padding: "8px 18px", borderRadius: 9, border: "1.5px solid rgba(200,149,108,0.6)", cursor: "pointer", background: "transparent", color: "#F5EDE4", fontSize: 12.5, fontWeight: 700 }}>
                      View reports
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                <span style={{ width: 38, height: 38, borderRadius: "50%", background: "rgba(74,222,128,0.15)", color: "#4ADE80", display: "grid", placeItems: "center", fontSize: 18 }}>
                  <i className="ti ti-check" />
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#F5EDE4" }}>All caught up</div>
                  <div style={{ fontSize: 12, color: "rgba(232,220,207,0.75)" }}>No pending approvals or reports. New member posts will appear here.</div>
                </div>
              </div>
            )}
          </div>

          <div className={s.chartCard} style={{ marginTop: 20 }}>
            <div className={s.chartHead}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{
                  width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                  background: "linear-gradient(135deg, rgba(220,38,38,0.14), rgba(249,115,22,0.14))",
                  color: "#DC2626", display: "grid", placeItems: "center", fontSize: 19,
                }}>
                  <i className="ti ti-shield-exclamation" />
                </span>
                <div>
                  <div className={s.chartTitle}>Moderation Queue</div>
                  <div className={s.chartSub}>Pending reports requiring attention</div>
                </div>
              </div>
              <button type="button" onClick={() => setActiveTab("reports")}
                style={{ padding: "8px 18px", borderRadius: 9, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #2E7D5B, #F97316)", color: "#fff", fontSize: 12, fontWeight: 700 }}>
                Open reports
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
              {[
                { n: analytics?.pendingReports || 0, l: "Total Pending", icon: "ti-clock", fg: "#DC2626", bg: "rgba(220,38,38,0.10)", bd: "rgba(220,38,38,0.22)" },
                { n: analytics?.reportedBlogs || 0, l: "Reported Blogs", icon: "ti-article", fg: "#2E7D5B", bg: "rgba(46,125,91,0.10)", bd: "rgba(46,125,91,0.22)" },
                { n: analytics?.reportedComments || 0, l: "Reported Comments", icon: "ti-message", fg: "#D97706", bg: "rgba(217,119,6,0.12)", bd: "rgba(217,119,6,0.25)" },
              ].map((m) => (
                <div key={m.l} style={{ borderRadius: 14, padding: "16px 16px 14px", background: m.bg, border: `1px solid ${m.bd}`, display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 38, height: 38, borderRadius: 11, background: "#fff", color: m.fg, display: "grid", placeItems: "center", fontSize: 17, flexShrink: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                    <i className={`ti ${m.icon}`} />
                  </span>
                  <span>
                    <span style={{ display: "block", fontSize: 24, fontWeight: 800, color: "#2D1406", lineHeight: 1 }}>{m.n}</span>
                    <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#7C6A58", marginTop: 3 }}>{m.l}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {analytics?.topAuthors?.length > 0 && (
            <div className={s.chartCard} style={{ marginTop: 16 }}>
              <div className={s.chartHead}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{
                    width: 42, height: 42, borderRadius: 13, flexShrink: 0,
                    background: "linear-gradient(135deg, rgba(201,162,39,0.16), rgba(249,115,22,0.16))",
                    color: "#B45309", display: "grid", placeItems: "center", fontSize: 19,
                  }}>
                    <i className="ti ti-trophy" />
                  </span>
                  <div>
                    <div className={s.chartTitle}>Top Writers</div>
                    <div className={s.chartSub}>Most active blog authors</div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(() => {
                  const maxBlogs = Math.max(1, ...analytics.topAuthors.map((a) => a.blogCount || 0));
                  const medal = ["#C9A227", "#9CA3AF", "#B45309"];
                  return analytics.topAuthors.map((a, i) => {
                    const nm = a.author?.name || "Unknown";
                    const initials = nm.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 12, background: i === 0 ? "rgba(201,162,39,0.07)" : "transparent", border: i === 0 ? "1px solid rgba(201,162,39,0.25)" : "1px solid transparent" }}>
                        <span style={{
                          width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                          display: "grid", placeItems: "center", fontSize: 12, fontWeight: 800, color: "#fff",
                          background: i < 3 ? `linear-gradient(135deg, ${medal[i]}, ${medal[i]}88)` : "#9C8E7C",
                        }}>
                          {i + 1}
                        </span>
                        <span style={{
                          width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                          background: "linear-gradient(135deg, #2E7D5B, #81B29A)", color: "#fff",
                          display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800,
                        }}>
                          {initials}
                        </span>
                        <span style={{ minWidth: 110 }}>
                          <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "#2D1406" }}>{nm}</span>
                          <span style={{ display: "block", fontSize: 10.5, color: "var(--text-3)" }}>
                            {a.totalViews} views · {a.totalLikes} likes
                          </span>
                        </span>
                        <span style={{ flex: 1, minWidth: 60 }}>
                          <span style={{ display: "block", height: 7, borderRadius: 99, background: "rgba(34,34,34,0.07)", overflow: "hidden" }}>
                            <span style={{ display: "block", height: "100%", width: `${Math.round(((a.blogCount || 0) / maxBlogs) * 100)}%`, borderRadius: 99, background: "linear-gradient(90deg, #2E7D5B, #F97316)" }} />
                          </span>
                          <span style={{ display: "block", fontSize: 10.5, color: "var(--text-3)", marginTop: 3 }}>{a.blogCount} blog{a.blogCount !== 1 ? "s" : ""}</span>
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "approvals" && (
        <div>
          <div style={{ marginBottom: 12, fontSize: 13, color: "var(--text-3)" }}>
            Member posts waiting for review — approving makes them visible to all users in their blogs page.
          </div>
          {pendingLoading ? (
            <div className={s.loadingState}>Loading approvals...</div>
          ) : pendingBlogs.length === 0 ? (
            <div className={s.emptyState}>
              <i className="ti ti-circle-check" />
              <p>Nothing awaiting review</p>
            </div>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Submitted</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingBlogs.map((blog) => (
                    <tr key={blog._id}>
                      <td className={s.titleCell}>
                        <div className={s.blogTitle}>{blog.title?.slice(0, 60)}</div>
                      </td>
                      <td>{blog.author?.name || "Unknown"}</td>
                      <td>{blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : "-"}</td>
                      <td>
                        <div className={s.actionGroup}>
                          <button className={s.iconBtn} onClick={() => setViewingBlogId(blog._id)} title="Review content">
                            <i className="ti ti-eye" />
                          </button>
                          <button className={s.iconBtn} onClick={() => handleApprove(blog._id)} title="Approve — visible to all users">
                            <i className="ti ti-check" />
                          </button>
                          <button className={s.iconBtnDanger} onClick={() => handleReject(blog._id)} title="Reject — stays hidden">
                            <i className="ti ti-x" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "blogs" && (
        <div>
          <div className={s.filterBar}>
            <input
              type="text"
              placeholder="Search blogs..."
              value={blogSearch}
              onChange={e => setBlogSearch(e.target.value)}
              className={s.filterInput}
            />
            <select value={blogStatus} onChange={e => { setBlogStatus(e.target.value); setBlogPage(1); }} className={s.filterSelect}>
              <option value="">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
            <select value={blogModeration} onChange={e => { setBlogModeration(e.target.value); setBlogPage(1); }} className={s.filterSelect} title="Review queue">
              <option value="">All Reviews</option>
              <option value="pending">Pending review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={blogAuthor} onChange={e => { setBlogAuthor(e.target.value); setBlogPage(1); }} className={s.filterSelect} title="Author type">
              <option value="">All Authors</option>
              <option value="admin">Admin posts</option>
              <option value="users">User posts</option>
            </select>
          </div>

          {loading ? (
            <div className={s.loadingState}>Loading blogs...</div>
          ) : blogs.length === 0 ? (
            <div className={s.emptyState}>
              <i className="ti ti-article-off" />
              <p>No blogs found</p>
            </div>
          ) : (
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Author</th>
                    <th>Status</th>
                    <th>Views</th>
                    <th>Likes</th>
                    <th>Comments</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {blogs.map(blog => (
                      <motion.tr
                        key={blog._id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={s.tableRow}
                      >
                        <td className={s.titleCell}>
                          <div className={s.blogTitle}>{blog.title?.slice(0, 60)}</div>
                          {blog.featured && <span className={s.badgeOrange}>Featured</span>}
                          {blog.pinned && <span className={s.badgeBlue}>Pinned</span>}
                          {blog.isAdminPost && <span className={s.badgeGreen}>Admin</span>}
                          {blog.moderationStatus === "pending" && <span className={s.badgeAmber}>Pending review</span>}
                          {blog.moderationStatus === "rejected" && <span className={s.badgeRed}>Rejected</span>}
                        </td>
                        <td>{blog.author?.name || "Unknown"}</td>
                        <td>
                          <span className={`${s.statusBadge} ${s[`status${blog.status}`]}`}>
                            {blog.status}
                          </span>
                        </td>
                        <td>{blog.viewCount || 0}</td>
                        <td>{blog.likeCount || 0}</td>
                        <td>{blog.commentCount || 0}</td>
                        <td>{blog.createdAt ? new Date(blog.createdAt).toLocaleDateString() : "-"}</td>
                        <td>
                          <div className={s.actionGroup}>
                            {blog.moderationStatus === "pending" && (
                              <>
                                <button className={s.iconBtn} onClick={() => handleModerate(blog._id, "approve")} title="Approve — visible to all users">
                                  <i className="ti ti-check" />
                                </button>
                                <button className={s.iconBtnDanger} onClick={() => handleModerate(blog._id, "reject")} title="Reject — stays hidden">
                                  <i className="ti ti-x" />
                                </button>
                              </>
                            )}
                            <button className={s.iconBtn} onClick={() => handleModerate(blog._id, "feature")} title={blog.featured ? "Unfeature" : "Feature"}>
                              <i className={`ti ${blog.featured ? "ti-star-filled" : "ti-star"}`} />
                            </button>
                            <button className={s.iconBtn} onClick={() => handleModerate(blog._id, "pin")} title={blog.pinned ? "Unpin" : "Pin"}>
                              <i className={`ti ${blog.pinned ? "ti-pin-filled" : "ti-pin"}`} />
                            </button>
                            {blog.status !== "archived" ? (
                              <button className={s.iconBtn} onClick={() => handleModerate(blog._id, "hide")} title="Archive">
                                <i className="ti ti-archive" />
                              </button>
                            ) : (
                              <button className={s.iconBtn} onClick={() => handleModerate(blog._id, "restore")} title="Restore">
                                <i className="ti ti-refresh" />
                              </button>
                            )}
                            <button className={s.iconBtn} onClick={() => setViewingBlogId(blog._id)} title="View">
                              <i className="ti ti-eye" />
                            </button>
                            <button className={s.iconBtnDanger} onClick={() => setDeleteConfirm(blog._id)} title="Permanently Delete">
                              <i className="ti ti-trash" />
                            </button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}

          {blogHasMore && (
            <div className={s.loadMoreWrap}>
              <button className={s.loadMoreBtn} onClick={() => { const np = blogPage + 1; setBlogPage(np); fetchBlogs(np, true); }}>
                Load More
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === "reports" && (
        <div>
          <div className={s.filterBar}>
            <select value={reportStatus} onChange={e => { setReportStatus(e.target.value); setReportPage(1); }} className={s.filterSelect}>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="dismissed">Dismissed</option>
              <option value="action_taken">Action Taken</option>
            </select>
          </div>

          {reports.length === 0 ? (
            <div className={s.emptyState}>
              <i className="ti ti-flag-off" />
              <p>No reports found</p>
            </div>
          ) : (
            <div className={s.reportList}>
              {reports.map(r => (
                <div key={r._id} className={s.reportCard}>
                  <div className={s.reportHeader}>
                    <span className={s.reportType}>{r.targetType}</span>
                    <span className={`${s.reportStatus} ${s[`rStatus${r.status}`]}`}>{r.status}</span>
                    <span className={s.reportReason}>{r.reason}</span>
                  </div>
                  <div className={s.reportBody}>
                    <p>Reported by: {r.reporter?.name || "Unknown"}</p>
                    {r.targetData && (
                      <p>Target: {r.targetData.title || r.targetData.content?.slice(0, 60) || r.target}</p>
                    )}
                    {r.description && <p className={s.reportDesc}>{r.description}</p>}
                  </div>
                  {r.status === "pending" && (
                    <div className={s.reportActions}>
                      <button className={s.actionBtnSmall} onClick={() => handleResolveReport(r._id, "dismissed")}>
                        Dismiss
                      </button>
                      <button className={s.actionBtnSmallOrange} onClick={() => handleResolveReport(r._id, "action_taken", "Content removed")}>
                        Action Taken
                      </button>
                      {r.targetType === "blog" && r.targetData && (
                        <button className={s.actionBtnSmallDanger} onClick={() => handleModerate(r.target, "hide")}>
                          Hide Blog
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "write" && <AdminBlogEditor flash={flash} editingId={editingBlogId} onSaved={() => { setEditingBlogId(null); fetchBlogs(1); fetchAnalytics(); }} />}

      {activeTab === "myBlogs" && <AdminMyBlogs flash={flash} onNavigate={(tab, params) => { setActiveTab(tab); if (params?.editingId) setEditingBlogId(params.editingId); }} />}
        </>
      )}

      {deleteConfirm && (
        <ConfirmSheet
          icon={<LuTrash2 size={20} />}
          tone="danger"
          title="Delete Blog"
          message="Permanently delete this blog? This action cannot be undone. All comments, reactions, and associated data will be removed."
          confirmLabel="Delete"
          onConfirm={async () => {
            await handleHardDelete(deleteConfirm);
            setDeleteConfirm(null);
          }}
          onClose={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
}

function AdminBlogEditor({ flash, onSaved, editingId: externalEditingId }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [tags, setTags] = useState("");
  const [categories, setCategories] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const editorRef = useRef(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // Sync external editingId when provided (e.g. from AdminMyBlogs edit button)
  useEffect(() => {
    if (externalEditingId) setEditingId(externalEditingId);
  }, [externalEditingId]);

  useEffect(() => {
    if (editingId) {
      (async () => {
        try {
          const data = await getBlog(editingId);
          const b = data.blog;
          setTitle(b.title || "");
          setContent(b.content || "");
          setExcerpt(b.excerpt || "");
          setCoverImage(b.coverImage || "");
          setTags((b.tags || []).join(", "));
          setCategories((b.categories || []).join(", "));
          setVisibility(b.visibility || "public");
          if (editorRef.current) editorRef.current.innerHTML = resolveContentHtml(b.content) || "";
        } catch (err) { setError(err.message); }
      })();
    } else {
      setTitle(""); setContent(""); setExcerpt(""); setCoverImage(""); setTags(""); setCategories(""); setVisibility("public");
      if (editorRef.current) editorRef.current.innerHTML = "";
    }
  }, [editingId]);

  const readContent = () => editorRef.current?.innerHTML || content;
  const execCmd = (cmd, val) => { document.execCommand(cmd, false, val); editorRef.current?.focus(); };

  const handleImageUpload = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      for (const f of files) formData.append("files", f);
      const token = localStorage.getItem("token");
      const API_DOMAIN = import.meta.env.VITE_API_URL || "";
      const res = await fetch(`${API_DOMAIN}/api/blogs/upload/media`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        for (const file of data.files) {
          execCmd("insertImage", file.url);
        }
      }
    } catch (err) { setError("Upload failed"); }
    setUploading(false);
  };

  const handleSave = async (publish) => {
    if (!title.trim()) { setError("Title required"); return; }
    setSaving(true);
    setError("");
    const payload = { title: title.trim(), content: readContent(), excerpt, coverImage, tags: tags.split(",").map(t => t.trim()).filter(Boolean), categories: categories.split(",").map(c => c.trim()).filter(Boolean), visibility, status: publish ? "published" : "draft" };
    try {
      if (editingId) {
        await updateBlog(editingId, payload);
      } else {
        const data = await createBlog(payload);
        if (data.blog?._id) setEditingId(data.blog._id);
      }
      flash(publish ? "Blog published!" : "Draft saved");
      onSaved?.();
    } catch (err) { setError(err.message); }
    setSaving(false);
  };

  const FONTS = [{ t: "h1", l: "H1" }, { t: "h2", l: "H2" }, { t: "h3", l: "H3" }, { t: "p", l: "P" }];

  return (
    <div className={s.chartCard} style={{ padding: 24 }}>
      <h3 className={s.chartTitle} style={{ marginBottom: 16 }}>{editingId ? "Edit Blog" : "Create Blog"}</h3>
      {error && <div style={{ color: "#DC2626", background: "rgba(220,38,38,0.08)", padding: "8px 14px", borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{error}</div>}
      <input type="text" placeholder="Blog title..." value={title} onChange={e => setTitle(e.target.value)} style={{ width: "100%", padding: "10px 14px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 18, fontWeight: 700, marginBottom: 12, fontFamily: "var(--font-display)" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 12 }}>
        <input type="url" placeholder="Cover URL" value={coverImage} onChange={e => setCoverImage(e.target.value)} style={inp} />
        <input type="text" placeholder="Tags (comma)" value={tags} onChange={e => setTags(e.target.value)} style={inp} />
        <input type="text" placeholder="Categories" value={categories} onChange={e => setCategories(e.target.value)} style={inp} />
        <select value={visibility} onChange={e => setVisibility(e.target.value)} style={inp}>
          <option value="public">Public</option>
          <option value="members">Members</option>
          <option value="private">Private</option>
        </select>
      </div>
      <textarea placeholder="Excerpt..." value={excerpt} onChange={e => setExcerpt(e.target.value)} style={{ ...inp, marginBottom: 12, resize: "vertical" }} rows={2} />
      <div style={{ display: "flex", gap: 3, padding: "4px 6px", background: "var(--surface-3)", borderRadius: 8, marginBottom: 10, flexWrap: "wrap" }}>
        {FONTS.map(f => <button key={f.t} type="button" style={tb} onMouseDown={e => { e.preventDefault(); execCmd("formatBlock", f.t === "p" ? "p" : `<${f.t}>`); }}>{f.l}</button>)}
        <span style={{ width: 1, height: 20, background: "var(--line)", margin: "0 4px" }} />
        {[["bold","B"],["italic","I"],["underline","U"],["strikeThrough","S"]].map(([c,l]) => <button key={c} type="button" style={tb} onMouseDown={e => { e.preventDefault(); execCmd(c); }}><b>{l}</b></button>)}
        <span style={{ width: 1, height: 20, background: "var(--line)", margin: "0 4px" }} />
        <button type="button" style={tb} onMouseDown={e => { e.preventDefault(); execCmd("insertUnorderedList"); }}><i className="ti ti-list" /></button>
        <button type="button" style={tb} onMouseDown={e => { e.preventDefault(); execCmd("formatBlock", "<blockquote>"); }}><i className="ti ti-quote" /></button>
        <button type="button" style={tb} onMouseDown={e => { e.preventDefault(); execCmd("formatBlock", "<pre>"); }}><i className="ti ti-code" /></button>
        <button type="button" style={tb} onClick={() => { const u = prompt("URL:"); if (u) execCmd("createLink", u); }}><i className="ti ti-link" /></button>
        <span style={{ width: 1, height: 20, background: "var(--line)", margin: "0 4px" }} />
        <button type="button" style={tb} onClick={() => fileInputRef.current?.click()} disabled={uploading} title="Upload Image">
          <i className="ti ti-photo" />
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={e => { handleImageUpload(e.target.files); e.target.value = ""; }} />
      </div>
      <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={() => {}} onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length > 0) handleImageUpload(e.dataTransfer.files); }} onDragOver={e => e.preventDefault()} style={{ minHeight: 320, padding: 14, border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 15, lineHeight: 1.8, direction: "ltr", unicodeBidi: "normal", textAlign: "left", outline: "none", marginBottom: 12, color: "var(--text-1)" }} data-placeholder="Start writing..." />
      {showPreview && <div style={{ padding: 16, background: "var(--surface-3)", borderRadius: 8, marginBottom: 12 }}><div style={{ fontSize: 16, lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: readContent() }} /></div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" onClick={() => setShowPreview(v => !v)} style={{ padding: "8px 16px", borderRadius: 8, border: "1.5px solid var(--line)", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>Preview</button>
        <button type="button" onClick={() => handleSave(false)} disabled={saving} style={{ padding: "8px 20px", borderRadius: 8, border: "1.5px solid var(--line)", background: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{saving ? "..." : "Save Draft"}</button>
        <button type="button" onClick={() => handleSave(true)} disabled={saving} style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "var(--c-grad)", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{saving ? "..." : "Publish"}</button>
      </div>
    </div>
  );
}

const inp = { width: "100%", padding: "8px 12px", border: "1.5px solid var(--line)", borderRadius: 8, fontSize: 13, background: "#fff", fontFamily: "var(--font-body)" };
const tb = { width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 5, border: "none", background: "transparent", color: "var(--text-2)", cursor: "pointer", fontSize: 12 };

function AdminMyBlogs({ flash, onNavigate }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const userId = user?.id || user?._id;
        if (userId) {
          const data = await getUserBlogs(userId, { limit: 50, status: filter || undefined });
          setBlogs(data.blogs || []);
        }
      } catch {}
      setLoading(false);
    })();
  }, [filter]);

  const handleDelete = async (id) => {
    if (!confirm("Permanently delete this blog? This cannot be undone.")) return;
    try {
      await blogsAdminApi.hardDelete(id);
      setBlogs(prev => prev.filter(b => b._id !== id));
      flash("Blog permanently deleted");
    } catch (err) { flash(err.message, "error"); }
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["", "published", "draft", "archived"].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`${s.tabBtn} ${filter === f ? s.tabActive : ""}`}>
            {f || "All"}
          </button>
        ))}
        <div style={{ marginLeft: "auto" }}>
          <button className={s.actionBtnSmallOrange} onClick={() => onNavigate("write")}>+ New Blog</button>
        </div>
      </div>
      {loading ? <div className={s.loadingState}>Loading...</div> : blogs.length === 0 ? (
        <div className={s.emptyState}><i className="ti ti-article-off" /><p>No blogs</p></div>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table} style={{ fontSize: 12 }}>
            <thead><tr><th>Title</th><th>Status</th><th>Views</th><th>Likes</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {blogs.map(b => (
                <tr key={b._id} className={s.tableRow}>
                  <td className={s.titleCell}>{b.title?.slice(0, 50)}</td>
                  <td><span className={`${s.statusBadge} ${s[`status${b.status}`]}`}>{b.status}</span></td>
                  <td>{b.viewCount || 0}</td>
                  <td>{b.likeCount || 0}</td>
                  <td>{b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "-"}</td>
                  <td><div className={s.actionGroup}>
                    <button className={s.iconBtn} onClick={() => onNavigate("write", { editingId: b._id })} title="Edit"><i className="ti ti-edit" /></button>
                    <button className={s.iconBtnDanger} onClick={() => handleDelete(b._id)} title="Delete"><i className="ti ti-trash" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AdminBlogDetail({ blogId, onBack, onModerate, onEdit, onDelete }) {
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [localFeatured, setLocalFeatured] = useState(false);
  const [localPinned, setLocalPinned] = useState(false);
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getBlog(blogId);
        setBlog(data.blog);
        setLocalFeatured(data.blog.featured || false);
        setLocalPinned(data.blog.pinned || false);
      } catch (err) { setError(err.message); }
      setLoading(false);
    })();
  }, [blogId]);

  if (loading) return <div className={s.loadingState}>Loading blog...</div>;
  if (error) return <div className={s.emptyState}><i className="ti ti-alert-circle" /><p>{error}</p></div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button className={s.iconBtn} onClick={onBack} title="Back">
          <i className="ti ti-arrow-left" />
        </button>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, fontFamily: "var(--font-display)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{blog?.title}</h3>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        <button className={s.actionBtnSmallOrange} onClick={() => { onModerate(blogId, "feature"); setLocalFeatured(v => !v); }}>
          <i className={`ti ${localFeatured ? "ti-star-filled" : "ti-star"}`} style={{ marginRight: 4 }} />{localFeatured ? "Unfeature" : "Feature"}
        </button>
        <button className={s.actionBtnSmallOrange} onClick={() => { onModerate(blogId, "pin"); setLocalPinned(v => !v); }}>
          <i className={`ti ${localPinned ? "ti-pin-filled" : "ti-pin"}`} style={{ marginRight: 4 }} />{localPinned ? "Unpin" : "Pin"}
        </button>
        {blog?.status !== "archived" ? (
          <button className={s.actionBtnSmall} onClick={() => { onModerate(blogId, "hide"); setBlog(prev => ({ ...prev, status: "archived" })); }}>
            <i className="ti ti-archive" style={{ marginRight: 4 }} />Archive
          </button>
        ) : (
          <button className={s.actionBtnSmall} onClick={() => { onModerate(blogId, "restore"); setBlog(prev => ({ ...prev, status: "published" })); }}>
            <i className="ti ti-refresh" style={{ marginRight: 4 }} />Restore
          </button>
        )}
        <button className={s.actionBtnSmall} onClick={() => onEdit(blogId)}>
          <i className="ti ti-edit" style={{ marginRight: 4 }} />Edit
        </button>
        <button className={s.actionBtnSmallDanger} onClick={() => onDelete(blogId)}>
          <i className="ti ti-trash" style={{ marginRight: 4 }} />Delete
        </button>
      </div>

      <BlogDetail blogId={blogId} student={user} isAdmin={true} onNavigate={onBack} />
    </div>
  );
}
