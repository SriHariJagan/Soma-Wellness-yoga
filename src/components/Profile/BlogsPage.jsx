import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import s from "./Dashboard.shared.module.css";
import bs from "./BlogsPage.module.css";
import { getBlogs, getTrendingBlogs, toggleLike, toggleBookmark, shareBlog, reportContent } from "../api/StudentServices.js";

const API_DOMAIN = import.meta.env.VITE_API_URL || "";

function resolveUrl(url) {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_DOMAIN}${url}`;
  return url;
}

const FEED_SORTS = [
  { value: "newest", label: "Newest" },
  { value: "trending", label: "Trending" },
  { value: "popular", label: "Most Popular" },
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
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function SkeletonCard() {
  return (
    <div className={bs.card}>
      <div className={bs.cardBody}>
        <div className={bs.skelRow}>
          <div className={bs.skelAvatar} />
          <div style={{ flex: 1 }}>
            <div className={bs.skelLine} style={{ width: "40%" }} />
            <div className={bs.skelLine} style={{ width: "25%", height: 10 }} />
          </div>
        </div>
        <div className={bs.skelLine} style={{ width: "90%", height: 20, marginTop: 14 }} />
        <div className={bs.skelLine} style={{ width: "70%", height: 16, marginTop: 8 }} />
        <div className={bs.skelLine} style={{ width: "95%", height: 16, marginTop: 6 }} />
        <div className={bs.coverSkel} />
        <div className={bs.skelRow} style={{ marginTop: 14 }}>
          <div className={bs.skelLine} style={{ width: 60, height: 14 }} />
          <div className={bs.skelLine} style={{ width: 60, height: 14 }} />
          <div className={bs.skelLine} style={{ width: 60, height: 14 }} />
        </div>
      </div>
    </div>
  );
}

function BlogCard({ blog, onRead, onRefresh }) {
  const [liked, setLiked] = useState(blog.isLiked || false);
  const [bookmarked, setBookmarked] = useState(blog.isBookmarked || false);
  const [likeCount, setLikeCount] = useState(blog.likeCount || 0);
  const [showShare, setShowShare] = useState(false);

  const handleLike = async (e) => {
    e.stopPropagation();
    try {
      const res = await toggleLike("blog", blog._id);
      setLiked(res.liked);
      setLikeCount(prev => res.liked ? prev + 1 : prev - 1);
    } catch {}
  };

  const handleBookmark = async (e) => {
    e.stopPropagation();
    try {
      const res = await toggleBookmark(blog._id);
      setBookmarked(res.bookmarked);
    } catch {}
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    try {
      await shareBlog(blog._id);
      const url = `${window.location.origin}/studentdashboard?tab=blogs&id=${blog._id}`;
      if (navigator.share) {
        await navigator.share({ title: blog.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShowShare(true);
        setTimeout(() => setShowShare(false), 2000);
      }
    } catch {}
  };

  const authorName = blog.author?.name || "Unknown";
  const authorAvatar = blog.author?.avatar || "";
  const initials = authorName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const isAdmin = blog.author?.role === "admin";

  return (
    <motion.div
      className={bs.card}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      onClick={() => onRead?.(blog._id)}
    >
      <div className={bs.cardBody}>
        <div className={bs.authorRow}>
          <div className={bs.avatar}>
            {authorAvatar ? <img src={authorAvatar} alt="" className={bs.avatarImg} /> : initials}
            {isAdmin && <span className={bs.verified}><i className="ti ti-circle-check" /></span>}
          </div>
          <div className={bs.authorMeta}>
            <span className={bs.authorName}>{authorName}</span>
            <span className={bs.publishDate}>
              {timeAgo(blog.publishedAt || blog.createdAt)}
              {blog.isEdited && <span className={bs.edited}>(edited)</span>}
            </span>
          </div>
        </div>

        <h3 className={bs.title}>{blog.title}</h3>

        {blog.excerpt && <p className={bs.excerpt}>{blog.excerpt.slice(0, 200)}</p>}

        {blog.coverImage && (
          <div className={bs.coverWrap}>
            <img src={resolveUrl(blog.coverImage)} alt="" className={bs.cover} />
          </div>
        )}

        {blog.mediaGallery?.length > 0 && (
          <div className={bs.gallery}>
            {blog.mediaGallery.slice(0, 3).map((m, i) => (
              <div key={i} className={bs.galleryItem}>
                {m.type === "image" ? (
                  <img src={resolveUrl(m.url)} alt="" className={bs.galleryImg} />
                ) : (
                  <div className={bs.galleryPlay}><i className="ti ti-player-play" /></div>
                )}
              </div>
            ))}
          </div>
        )}

        {blog.embeds?.length > 0 && (
          <div className={bs.embedBadge}>
            <i className="ti ti-brand-youtube" /> Contains {blog.embeds.length} video{blog.embeds.length > 1 ? "s" : ""}
          </div>
        )}

        {blog.tags?.length > 0 && (
          <div className={bs.tags}>
            {blog.tags.slice(0, 4).map(t => <span key={t} className={bs.tag}>#{t}</span>)}
          </div>
        )}

        <div className={bs.footer}>
          <span className={bs.readingTime}><i className="ti ti-clock" /> {blog.readingTime} min read</span>
          <div className={bs.stats}>
            <span className={bs.stat}><i className="ti ti-eye" /> {blog.viewCount || 0}</span>
          </div>
        </div>

        <div className={bs.actions}>
          <button className={`${bs.actionBtn} ${liked ? bs.actionActive : ""}`} onClick={handleLike}>
            <i className={`ti ${liked ? "ti-heart-filled" : "ti-heart"}`} />
            <span>{likeCount}</span>
          </button>
          <button className={bs.actionBtn} onClick={(e) => { e.stopPropagation(); onRead?.(blog._id); }}>
            <i className="ti ti-message" />
            <span>{blog.commentCount || 0}</span>
          </button>
          <button className={`${bs.actionBtn} ${bookmarked ? bs.actionActive : ""}`} onClick={handleBookmark}>
            <i className={`ti ${bookmarked ? "ti-bookmark-filled" : "ti-bookmark"}`} />
          </button>
          <div className={bs.shareWrap}>
            <button className={bs.actionBtn} onClick={handleShare}>
              <i className="ti ti-share" />
              <span>{blog.shareCount || 0}</span>
            </button>
            {showShare && <span className={bs.copyTip}>Link copied!</span>}
          </div>
          <button className={bs.readMore} onClick={() => onRead?.(blog._id)}>
            Read more <i className="ti ti-arrow-right" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function BlogsPage({ student, reload, onNavigate }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [activeTab, setActiveTab] = useState("feed");
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [error, setError] = useState("");
  const [trending, setTrending] = useState([]);
  const sentinelRef = useRef(null);

  const fetchBlogs = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      setError("");
      const data = await getBlogs({ page: pageNum, limit: 10, search, sort });
      const list = data.blogs || [];
      if (append) setBlogs(prev => [...prev, ...list]);
      else setBlogs(list);
      setHasMore(data.pagination?.page < data.pagination?.pages);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [search, sort]);

  const fetchTrending = useCallback(async () => {
    try {
      const data = await getTrendingBlogs(5);
      setTrending(data.blogs || []);
    } catch {}
  }, []);

  useEffect(() => { fetchBlogs(1); fetchTrending(); }, [fetchBlogs, fetchTrending]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchBlogs(nextPage, true);
      }
    }, { rootMargin: "200px" });
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loading, page, fetchBlogs]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchBlogs(1);
  };

  const handleRead = (id) => {
    onNavigate?.("blogDetail", { blogId: id });
  };

  if (loading) {
    return (
      <div>
        <div className={s.pageTitle}>Blogs & Articles</div>
        <div className={bs.feed}>
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={s.pageTitle}>Blogs & Articles</div>

      <div className={bs.toolbar}>
        <form className={bs.searchBox} onSubmit={handleSearch}>
          <i className="ti ti-search" />
          <input
            type="text"
            placeholder="Search blogs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={bs.searchInput}
          />
        </form>
        <div className={bs.sortGroup}>
          {FEED_SORTS.map(s => (
            <button
              key={s.value}
              className={`${bs.sortBtn} ${sort === s.value ? bs.sortActive : ""}`}
              onClick={() => { setSort(s.value); setPage(1); }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {trending.length > 0 && (
        <div className={bs.trendingBar}>
          <span className={bs.trendingLabel}><i className="ti ti-flame" /> Trending</span>
          <div className={bs.trendingScroll}>
            {trending.map(b => (
              <button key={b._id} className={bs.trendingChip} onClick={() => handleRead(b._id)}>
                {b.title.slice(0, 60)}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div className={bs.error}>{error}</div>}

      {blogs.length === 0 && !loading ? (
        <div className={s.emptyState}>
          <i className="ti ti-article-off" />
          <p>No blogs found.</p>
        </div>
      ) : (
        <div className={bs.feed}>
          <AnimatePresence>
            {blogs.map(blog => (
              <BlogCard key={blog._id} blog={blog} onRead={handleRead} />
            ))}
          </AnimatePresence>
          <div ref={sentinelRef} className={bs.sentinel}>
            {loadingMore && <div className={bs.loadingMore}><i className="ti ti-loader" /> Loading more...</div>}
            {!hasMore && blogs.length > 0 && <div className={bs.endFeed}>You've reached the end</div>}
          </div>
        </div>
      )}
    </div>
  );
}
