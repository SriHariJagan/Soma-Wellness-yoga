import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import s from "./Dashboard.shared.module.css";
import ms from "./MyBlogsPage.module.css";
import { getUserBlogs, getMyBlogStats, deleteBlog, duplicateBlog, updateBlog } from "../api/StudentServices.js";

const TABS = [
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
  { value: "archived", label: "Archived" },
];

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MyBlogsPage({ student, onNavigate, reload }) {
  const [blogs, setBlogs] = useState([]);
  const [stats, setStats] = useState({ published: 0, drafts: 0, archived: 0, totalViews: 0, totalLikes: 0, totalComments: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("published");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);

  const fetchBlogs = useCallback(async (pageNum = 1, append = false) => {
    try {
      setLoading(pageNum === 1);
      const userId = student?._id || student?.id;
      if (!userId) return;
      const data = await getUserBlogs(userId, { page: pageNum, limit: 10, status: activeTab });
      const list = data.blogs || [];
      if (append) setBlogs(prev => [...prev, ...list]);
      else setBlogs(list);
      setHasMore(data.pagination?.page < data.pagination?.pages);
    } catch {
      if (!append) setBlogs([]);
    } finally {
      setLoading(false);
    }
  }, [student, activeTab]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await getMyBlogStats();
      setStats(data.stats || {});
    } catch {}
  }, []);

  useEffect(() => { fetchBlogs(1); fetchStats(); }, [fetchBlogs, fetchStats]);

  useEffect(() => { setPage(1); fetchBlogs(1); }, [activeTab]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this blog?")) return;
    setBusy(true);
    try {
      await deleteBlog(id);
      setBlogs(prev => prev.filter(b => b._id !== id));
      fetchStats();
    } catch (err) { alert(err.message); }
    setBusy(false);
  };

  const handleDuplicate = async (id) => {
    setBusy(true);
    try {
      await duplicateBlog(id);
      fetchBlogs(1);
      fetchStats();
    } catch (err) { alert(err.message); }
    setBusy(false);
  };

  const handlePublish = async (id) => {
    setBusy(true);
    try {
      await updateBlog(id, { status: "published" });
      fetchBlogs(1);
      fetchStats();
    } catch (err) { alert(err.message); }
    setBusy(false);
  };

  const handleUnpublish = async (id) => {
    setBusy(true);
    try {
      await updateBlog(id, { status: "draft" });
      fetchBlogs(1);
      fetchStats();
    } catch (err) { alert(err.message); }
    setBusy(false);
  };

  return (
    <div>
      <div className={s.pageTitle}>My Blogs</div>

      <div className={ms.statsGrid}>
        <div className={ms.statCard}>
          <span className={ms.statNum}>{stats.published}</span>
          <span className={ms.statLbl}>Published</span>
        </div>
        <div className={ms.statCard}>
          <span className={ms.statNum}>{stats.drafts}</span>
          <span className={ms.statLbl}>Drafts</span>
        </div>
        <div className={ms.statCard}>
          <span className={ms.statNum}>{stats.totalViews}</span>
          <span className={ms.statLbl}>Total Views</span>
        </div>
        <div className={ms.statCard}>
          <span className={ms.statNum}>{stats.totalLikes}</span>
          <span className={ms.statLbl}>Total Likes</span>
        </div>
        <div className={ms.statCard}>
          <span className={ms.statNum}>{stats.totalComments}</span>
          <span className={ms.statLbl}>Comments</span>
        </div>
      </div>

      <div className={ms.headerRow}>
        <div className={ms.tabGroup}>
          {TABS.map(t => (
            <button
              key={t.value}
              className={`${ms.tab} ${activeTab === t.value ? ms.tabActive : ""}`}
              onClick={() => setActiveTab(t.value)}
            >
              {t.label}
              {t.value === "published" && stats.published > 0 && <span className={ms.tabCount}>{stats.published}</span>}
              {t.value === "draft" && stats.drafts > 0 && <span className={ms.tabCount}>{stats.drafts}</span>}
            </button>
          ))}
        </div>
        <button className={ms.createBtn} onClick={() => onNavigate?.("blogEditor")}>
          <i className="ti ti-plus" /> New Blog
        </button>
      </div>

      {loading ? (
        <div className={s.card}>
          {[1,2,3].map(i => (
            <div key={i} className={ms.skelRow}>
              <div className={ms.skelLine} style={{ width: "70%" }} />
              <div className={ms.skelLine} style={{ width: "20%" }} />
            </div>
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <div className={s.emptyState}>
          <i className="ti ti-article-off" />
          <p>No {activeTab} blogs yet.</p>
          {activeTab === "draft" && <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>Create your first blog to get started!</p>}
        </div>
      ) : (
        <div className={ms.blogList}>
          <AnimatePresence>
            {blogs.map(blog => (
              <motion.div
                key={blog._id}
                className={ms.blogItem}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className={ms.itemMain}>
                  <h3 className={ms.itemTitle}>{blog.title}</h3>
                  <div className={ms.itemMeta}>
                    <span><i className="ti ti-eye" /> {blog.viewCount || 0}</span>
                    <span><i className="ti ti-heart" /> {blog.likeCount || 0}</span>
                    <span><i className="ti ti-message" /> {blog.commentCount || 0}</span>
                    <span>{blog.readingTime || 0} min read</span>
                    <span>{timeAgo(blog.createdAt)}</span>
                  </div>
                  {blog.excerpt && <p className={ms.itemExcerpt}>{blog.excerpt.slice(0, 120)}</p>}
                </div>
                <div className={ms.itemActions}>
                  <button className={ms.actionBtn} onClick={() => onNavigate?.("blogEditor", { blogId: blog._id })} title="Edit">
                    <i className="ti ti-edit" />
                  </button>
                  <button className={ms.actionBtn} onClick={() => onNavigate?.("blogDetail", { blogId: blog._id })} title="Preview">
                    <i className="ti ti-eye" />
                  </button>
                  <button className={ms.actionBtn} onClick={() => handleDuplicate(blog._id)} title="Duplicate">
                    <i className="ti ti-copy" />
                  </button>
                  {blog.status === "draft" && (
                    <button className={ms.actionBtn} onClick={() => handlePublish(blog._id)} title="Publish">
                      <i className="ti ti-send" />
                    </button>
                  )}
                  {blog.status === "published" && (
                    <button className={ms.actionBtn} onClick={() => handleUnpublish(blog._id)} title="Unpublish">
                      <i className="ti ti-archive" />
                    </button>
                  )}
                  <button className={`${ms.actionBtn} ${ms.actionDanger}`} onClick={() => handleDelete(blog._id)} title="Delete">
                    <i className="ti ti-trash" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {hasMore && (
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button className={ms.loadMore} onClick={() => { const np = page + 1; setPage(np); fetchBlogs(np, true); }}>
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
