import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from "dompurify";
import s from "./Dashboard.shared.module.css";
import bs from "./BlogsPage.module.css";
import ds from "./BlogDetail.module.css";
import { getBlog, toggleLike, toggleBookmark, shareBlog, reportContent, getComments, getReplies, createComment, updateComment, deleteComment } from "../api/StudentServices.js";

const API_DOMAIN = import.meta.env.VITE_API_URL || "";

function resolveUrl(url) {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_DOMAIN}${url}`;
  return url;
}

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
      'allowfullscreen','frameborder','allow','controls','autoplay','loop','muted',
      'style','data-*'],
    ALLOW_DATA_ATTR: true,
    ADD_ATTR: ['target'],
  });
}

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

function CommentThread({ comment, blogId, userId, depth = 0, onRefresh, isAdmin: isModerator }) {
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.content === "[deleted]" ? "" : comment.content);
  const [liked, setLiked] = useState(comment.isLiked || false);
  const [likeCount, setLikeCount] = useState(comment.likeCount || 0);
  const [collapsed, setCollapsed] = useState(false);

  const isOwner = comment.author?._id === userId || comment.author?.id === userId;
  const isDeleted = comment.content === "[deleted]";
  const isAdmin = comment.author?.role === "admin";
  const initials = (comment.author?.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  const fetchReplies = async () => {
    setLoadingReplies(true);
    try {
      const data = await getReplies(comment._id);
      setReplies(data.replies || []);
    } catch {}
    setLoadingReplies(false);
  };

  const toggleReplies = () => {
    if (!showReplies && replies.length === 0) fetchReplies();
    setShowReplies(!showReplies);
  };

  const handleLike = async () => {
    try {
      const res = await toggleLike("comment", comment._id);
      setLiked(res.liked);
      setLikeCount(prev => res.liked ? prev + 1 : prev - 1);
    } catch {}
  };

  const handleReply = async () => {
    if (!replyText.trim()) return;
    try {
      await createComment(blogId, replyText.trim(), comment._id);
      setReplyText("");
      setReplying(false);
      fetchReplies();
      onRefresh?.();
    } catch {}
  };

  const handleEdit = async () => {
    if (!editText.trim()) return;
    try {
      await updateComment(comment._id, editText.trim());
      setEditing(false);
      onRefresh?.();
    } catch {}
  };

  const handleDelete = async () => {
    if (!confirm("Delete this comment?")) return;
    try {
      await deleteComment(comment._id);
      onRefresh?.();
    } catch {}
  };

  return (
    <div className={ds.comment} style={{ marginLeft: depth * 20 }}>
      <div className={ds.commentMain}>
        <div className={ds.commentAvatar}>
          {comment.author?.avatar ? <img src={comment.author.avatar} alt="" /> : initials}
          {isAdmin && <span className={ds.cVerified}><i className="ti ti-circle-check" /></span>}
        </div>
        <div className={ds.commentBody}>
          <div className={ds.commentHeader}>
            <span className={ds.commentAuthor}>{comment.author?.name || "Unknown"}</span>
            <span className={ds.commentTime}>{timeAgo(comment.createdAt)}</span>
            {comment.isEdited && <span className={ds.editedBadge}>edited</span>}
          </div>
          {editing ? (
            <div className={ds.editBox}>
              <textarea value={editText} onChange={e => setEditText(e.target.value)} className={ds.editInput} rows={2} />
              <div className={ds.editActions}>
                <button className={ds.btnSmall} onClick={handleEdit}>Save</button>
                <button className={ds.btnSmallGhost} onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className={ds.commentContent}>{comment.content}</div>
          )}
          {!isDeleted && (
            <div className={ds.commentActions}>
              <button className={`${ds.cAction} ${liked ? ds.cActionActive : ""}`} onClick={handleLike}>
                <i className={`ti ${liked ? "ti-heart-filled" : "ti-heart"}`} /> {likeCount}
              </button>
              <button className={ds.cAction} onClick={() => setReplying(!replying)}>
                <i className="ti ti-message-plus" /> Reply
              </button>
              {(isOwner || isModerator) && (
                <>
                  <button className={ds.cAction} onClick={() => { setEditText(comment.content); setEditing(true); }}>
                    <i className="ti ti-edit" /> Edit
                  </button>
                  <button className={ds.cActionDanger} onClick={handleDelete}>
                    <i className="ti ti-trash" /> Delete
                  </button>
                </>
              )}
            </div>
          )}
          {replying && (
            <div className={ds.replyBox}>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className={ds.replyInput}
                rows={2}
              />
              <div className={ds.replyActions}>
                <button className={ds.btnSmall} onClick={handleReply}>Reply</button>
                <button className={ds.btnSmallGhost} onClick={() => setReplying(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      </div>
      {comment.replyCount > 0 && (
        <button className={ds.toggleReplies} onClick={toggleReplies}>
          {showReplies ? "Hide replies" : `View ${comment.replyCount} ${comment.replyCount === 1 ? "reply" : "replies"}`}
        </button>
      )}
      {showReplies && (
        <div className={ds.repliesList}>
          {loadingReplies ? (
            <div className={ds.loadingSpin}><i className="ti ti-loader" /> Loading...</div>
          ) : (
            replies.map(r => (
              <CommentThread key={r._id} comment={r} blogId={blogId} userId={userId} depth={depth + 1} onRefresh={onRefresh} isAdmin={isModerator} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function BlogDetail({ blogId, student, onNavigate, reload, isAdmin = false }) {
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [comments, setComments] = useState([]);
  const [commentPage, setCommentPage] = useState(1);
  const [hasMoreComments, setHasMoreComments] = useState(false);
  const [posting, setPosting] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("spam");
  const [shareCopied, setShareCopied] = useState(false);

  const fetchBlog = useCallback(async () => {
    if (!blogId) return;
    setLoading(true);
    setError("");
    try {
      const data = await getBlog(blogId);
      setBlog(data.blog);
      setLiked(data.blog.isLiked || false);
      setBookmarked(data.blog.isBookmarked || false);
      setLikeCount(data.blog.likeCount || 0);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [blogId]);

  const fetchComments = useCallback(async (pageNum = 1) => {
    if (!blogId) return;
    try {
      const data = await getComments(blogId, { page: pageNum, limit: 10 });
      if (pageNum === 1) setComments(data.comments || []);
      else setComments(prev => [...prev, ...(data.comments || [])]);
      setHasMoreComments(data.pagination?.page < data.pagination?.pages);
    } catch {}
  }, [blogId]);

  useEffect(() => { fetchBlog(); fetchComments(1); }, [fetchBlog, fetchComments]);

  const handleLike = async () => {
    try {
      const res = await toggleLike("blog", blogId);
      setLiked(res.liked);
      setLikeCount(prev => res.liked ? prev + 1 : prev - 1);
    } catch {}
  };

  const handleBookmark = async () => {
    try {
      const res = await toggleBookmark(blogId);
      setBookmarked(res.bookmarked);
    } catch {}
  };

  const handleShare = async () => {
    try {
      await shareBlog(blogId);
      const url = `${window.location.origin}/studentdashboard?tab=blogs&id=${blogId}`;
      if (navigator.share) await navigator.share({ title: blog?.title, url });
      else await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {}
  };

  const handleReport = async () => {
    try {
      await reportContent({ targetType: "blog", targetId: blogId, reason: reportReason });
      setShowReport(false);
      alert("Report submitted. Thank you.");
    } catch (err) {
      alert(err.message);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      await createComment(blogId, commentText.trim());
      setCommentText("");
      fetchComments(1);
      fetchBlog();
    } catch (err) {
      alert(err.message);
    }
    setPosting(false);
  };

  if (loading) {
    return (
      <div>
        <div className={s.pageTitle}>Blog</div>
        <div className={ds.loading}>
          <div className={ds.skelBlock} />
          <div className={ds.skelBlock} style={{ width: "80%", height: 16 }} />
          <div className={ds.skelBlock} style={{ width: "60%", height: 16 }} />
          <div className={ds.skelBlock} style={{ height: 200 }} />
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div>
        <div className={s.pageTitle}>Blog</div>
        <div className={s.emptyState}>
          <i className="ti ti-alert-circle" />
          <p>{error || "Blog not found"}</p>
          <button className={ds.backBtn} onClick={() => onNavigate?.("blogs")}>Back to Blogs</button>
        </div>
      </div>
    );
  }

  const authorName = blog.author?.name || "Unknown";
  const initials = authorName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const authorIsAdmin = blog.author?.role === "admin";

  return (
    <div>
      {!isAdmin && (
        <div className={ds.topBar}>
          <button className={ds.backBtn} onClick={() => onNavigate?.("blogs")}>
            <i className="ti ti-arrow-left" /> Back
          </button>
        </div>
      )}

      <article className={ds.article}>
        <div className={ds.articleHeader}>
          <div className={ds.authorRow}>
            <div className={ds.avatar}>
              {blog.author?.avatar ? <img src={blog.author.avatar} alt="" /> : initials}
              {authorIsAdmin && <span className={ds.verified}><i className="ti ti-circle-check" /></span>}
            </div>
            <div>
              <div className={ds.authorName}>{authorName}</div>
              <div className={ds.meta}>
                {timeAgo(blog.publishedAt || blog.createdAt)}
                {blog.isEdited && <span className={ds.edited}>(edited)</span>}
                <span className={ds.dot}>·</span>
                {blog.readingTime} min read
              </div>
            </div>
          </div>
          <h1 className={ds.title}>{blog.title}</h1>
        </div>

        {blog.coverImage && (
          <div className={ds.coverWrap}>
            <img src={resolveUrl(blog.coverImage)} alt="" className={ds.cover} />
          </div>
        )}

        <div className={ds.content} dangerouslySetInnerHTML={{ __html: resolveContentHtml(blog.content) }} />

        {blog.mediaGallery?.length > 0 && (
          <div className={ds.gallery}>
            <h3 className={ds.galleryTitle}>Gallery</h3>
            <div className={ds.galleryGrid}>
              {blog.mediaGallery.map((m, i) => (
                <div key={i} className={ds.galleryItem}>
                  {m.type === "image" ? <img src={resolveUrl(m.url)} alt={m.caption || ""} /> : (
                    <div className={ds.mediaPlaceholder}>
                      <i className="ti ti-player-play" />
                      <span>{m.type}</span>
                    </div>
                  )}
                  {m.caption && <span className={ds.caption}>{m.caption}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {blog.embeds?.map((e, i) => (
          <div key={i} className={ds.embed}>
            {e.platform === "youtube" ? (
              <div className={ds.videoWrap}>
                <iframe src={resolveUrl(e.url).replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/")} title={e.caption || "YouTube video"} allowFullScreen />
              </div>
            ) : (
              <a href={resolveUrl(e.url)} target="_blank" rel="noopener noreferrer" className={ds.embedLink}>
                <i className="ti ti-link" /> {e.caption || e.url}
              </a>
            )}
          </div>
        ))}

        {blog.attachments?.length > 0 && (
          <div className={ds.attachments}>
            <h3 className={ds.galleryTitle}>Attachments</h3>
            {blog.attachments.map((a, i) => (
              <a key={i} href={resolveUrl(a.url)} target="_blank" rel="noopener noreferrer" className={ds.attachmentItem}>
                <i className={`ti ${a.type === "pdf" ? "ti-file-text" : a.type === "video" ? "ti-video" : a.type === "audio" ? "ti-music" : "ti-file"}`} />
                <span>{a.name || a.url.split("/").pop()}</span>
              </a>
            ))}
          </div>
        )}

        {blog.tags?.length > 0 && (
          <div className={bs.tags} style={{ marginTop: 20 }}>
            {blog.tags.map(t => <span key={t} className={bs.tag}>#{t}</span>)}
          </div>
        )}

        <div className={ds.statsRow}>
          <span><i className="ti ti-eye" /> {blog.viewCount || 0} views</span>
          <span><i className="ti ti-heart" /> {likeCount} likes</span>
          <span><i className="ti ti-message" /> {blog.commentCount || 0} comments</span>
          <span><i className="ti ti-share" /> {blog.shareCount || 0} shares</span>
        </div>

        <div className={ds.actionBar}>
          <button className={`${ds.actionBtn} ${liked ? ds.actionActive : ""}`} onClick={handleLike}>
            <i className={`ti ${liked ? "ti-heart-filled" : "ti-heart"}`} />
            <span>{likeCount}</span>
          </button>
          <button className={`${ds.actionBtn} ${bookmarked ? ds.actionActive : ""}`} onClick={handleBookmark}>
            <i className={`ti ${bookmarked ? "ti-bookmark-filled" : "ti-bookmark"}`} />
          </button>
          <button className={ds.actionBtn} onClick={handleShare}>
            <i className="ti ti-share" /> {shareCopied && <span className={ds.copied}>Copied!</span>}
          </button>
          <button className={ds.actionBtn} style={{ color: "var(--color-text-muted)" }} onClick={() => setShowReport(!showReport)}>
            <i className="ti ti-flag" /> Report
          </button>
        </div>

        {showReport && (
          <div className={ds.reportBox}>
            <select value={reportReason} onChange={e => setReportReason(e.target.value)} className={ds.reportSelect}>
              <option value="spam">Spam</option>
              <option value="abuse">Abuse</option>
              <option value="harassment">Harassment</option>
              <option value="copyright">Copyright violation</option>
              <option value="nsfw">NSFW content</option>
              <option value="misinformation">Misinformation</option>
              <option value="other">Other</option>
            </select>
            <button className={ds.reportSubmit} onClick={handleReport}>Submit Report</button>
          </div>
        )}
      </article>

      <div className={ds.commentsSection}>
        <h3 className={ds.commentsTitle}>
          Comments {blog.commentCount > 0 && <span>({blog.commentCount})</span>}
        </h3>

        <div className={ds.commentForm}>
          <textarea
            value={commentText}
            onChange={e => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className={ds.commentInput}
            rows={3}
          />
          <button className={ds.postBtn} onClick={handleComment} disabled={posting || !commentText.trim()}>
            {posting ? "Posting..." : "Post Comment"}
          </button>
        </div>

        <div className={ds.commentsList}>
          <AnimatePresence>
            {comments.map(c => (
              <motion.div key={c._id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <CommentThread comment={c} blogId={blogId} userId={student?._id || student?.id} onRefresh={() => fetchComments(1)} isAdmin={isAdmin} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {hasMoreComments && (
          <button className={ds.loadMore} onClick={() => { const np = commentPage + 1; setCommentPage(np); fetchComments(np); }}>
            Load more comments
          </button>
        )}
      </div>
    </div>
  );
}
