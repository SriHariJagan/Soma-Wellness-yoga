import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useParams } from "react-router-dom";
import { EASE } from "../lib/motion";
import { JOURNAL_POSTS, themeFor } from "../data/journalPosts";
import styles from "./BlogDetail.module.css";

const API = import.meta.env.VITE_API_URL || "";

const toParas = (content) => {
  if (Array.isArray(content)) return content;
  if (typeof content !== "string" || !content.trim()) return [];
  const text = content.replace(/<[^>]+>/g, "\n");
  return text.split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);
};

/* Rich extras per curated post — gallery + takeaways */
const POST_EXTRAS = {
  "group-yoga-works": {
    gallery: [
      { src: "https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?q=80&w=1200&auto=format&fit=crop", caption: "Morning group class, Spring Valley studio" },
      { src: "https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=1200&auto=format&fit=crop", caption: "Small cohorts, personal attention" },
    ],
    takeaways: ["Shared breath steadies your nervous system", "A booked class keeps you consistent", "Belonging outperforms motivation"],
  },
  "morning-breath": {
    gallery: [
      { src: "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?q=80&w=1200&auto=format&fit=crop", caption: "Stillness before the day begins" },
      { src: "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=1200&auto=format&fit=crop", caption: "Four minutes, every sunrise" },
    ],
    takeaways: ["Exhale longer than you inhale", "Stack belly, ribs, then chest", "Practise before screens, daily"],
  },
  "massage-maintenance": {
    gallery: [
      { src: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1200&auto=format&fit=crop", caption: "Restorative therapy suite" },
      { src: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?q=80&w=800&auto=format&fit=crop", caption: "Steam before massage for deeper release" },
    ],
    takeaways: ["Monthly rhythm beats annual indulgence", "Touch improves sleep the same night", "Pair heat with bodywork"],
  },
  "community-belonging": {
    gallery: [
      { src: "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=1200&auto=format&fit=crop", caption: "Members in evening practice" },
      { src: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=1200&auto=format&fit=crop", caption: "Known names, steady practice" },
    ],
    takeaways: ["Consistency beats intensity", "Rest is the bottleneck", "Belonging is the infrastructure"],
  },
  "conscious-rest": {
    gallery: [
      { src: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=1200&auto=format&fit=crop", caption: "Yoga Nidra, guided deep rest" },
      { src: "https://images.unsplash.com/photo-1508672019048-805c876b67e2?q=80&w=1200&auto=format&fit=crop", caption: "Ten minutes that change the night" },
    ],
    takeaways: ["Rest is a skill with technique", "Scrolling is not recovery", "Start with legs up the wall"],
  },
  "intention-not-performance": {
    gallery: [
      { src: "https://images.unsplash.com/photo-1552196563-55cd4e45efb3?q=80&w=1200&auto=format&fit=crop", caption: "Attention over output" },
      { src: "https://images.unsplash.com/photo-1524863479829-916d8e77f114?q=80&w=1200&auto=format&fit=crop", caption: "One anchor, fifty returns" },
    ],
    takeaways: ["Exercise measures, practice notices", "One breath anchor per class", "Less proving, more practising"],
  },
};

const isObjectId = (s) => /^[a-fA-F0-9]{24}$/.test(String(s || ""));

const BlogDetail = () => {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [progress, setProgress] = useState(0);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      let found = null;
      // 1 — live API only for Mongo ids (slugs would 400 on findById)
      if (isObjectId(id)) {
        try {
          const res = await fetch(`${API}/api/blogs/${id}`);
          if (res.ok) {
            const data = await res.json();
            const b = data.blog;
            if (b) {
            found = {
              id: b._id,
              title: b.title,
              excerpt: b.excerpt || "",
              image: b.coverImage,
              cats: b.categories?.length ? b.categories : ["Journal"],
              tags: b.tags || [],
              date: b.publishedAt
                ? new Date(b.publishedAt).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })
                : "",
              readTime: b.readingTime ? `${b.readingTime} min read` : "",
              author: b.author?.name || b.author?.fullName || "",
              views: b.viewCount || 0,
              likes: b.likeCount || 0,
              comments: b.commentCount || 0,
              gallery: (b.mediaGallery || []).filter((m) => m.type === "image").slice(0, 2).map((m) => ({ src: m.url, caption: m.caption || "" })),
              paras: toParas(b.content),
              quote: b.excerpt || "",
              live: true,
            };
              if (alive) setPost(found);
            }
          }
        } catch { /* fall through to static */ }
      }
      // 2 — static fallback
      if (!found && alive) {
        const s = JOURNAL_POSTS.find((p) => p.id === id);
        if (s) {
          found = { ...s, cats: [s.category], paras: s.content, author: "SomaWellness" };
          setPost(found);
        } else {
          setNotFound(true);
        }
      }
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    // related: same category first, then others
    const pool = JOURNAL_POSTS.filter((p) => p.id !== id);
    if (!post) { setRelated(pool.slice(0, 3)); return; }
    const cat = post.cats[0];
    const same = pool.filter((p) => p.category === cat);
    const rest = pool.filter((p) => p.category !== cat);
    setRelated([...same, ...rest].slice(0, 3));
  }, [post, id]);

  useEffect(() => { window.scrollTo(0, 0); }, [id]);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? Math.min(1, el.scrollTop / total) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (loading) return <main className={styles.page}><div className={styles.loading}>Opening article…</div></main>;
  if (notFound || !post) {
    return (
      <main className={styles.page}>
        <div className={styles.missing}>
          <h1>Article not found</h1>
          <p>This story may have moved. Back to the journal:</p>
          <Link to="/blogs" className={styles.backBtn}>← All articles</Link>
        </div>
      </main>
    );
  }

  const theme = themeFor(post?.id);
  const paras = post?.paras || [];
  const [first, ...restParas] = paras;
  const mid = Math.ceil(restParas.length / 2);
  const pullQuote = post?.quote || post?.excerpt;

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: post.title, url });
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    } catch {
      try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* noop */ }
    }
  };

  const initials = (post.author || "S").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const extras = POST_EXTRAS[post.id] || {};
  const gallery = post.gallery?.length ? post.gallery : extras.gallery || [];
  const takeaways = extras.takeaways || [];
  const likeCount = (post.likes || 0) + (liked ? 1 : 0);

  return (
    <main className={styles.page}>
      <div className={styles.progress} aria-hidden="true">
        <span style={{ transform: `scaleX(${progress})`, background: theme.accent }} />
      </div>

      {/* Cinematic cover hero — image + theme veil */}
      <section className={styles.hero}>
        {post.image && (
          <div className={styles.heroBg} aria-hidden="true">
            <img src={post.image} alt="" />
            <div className={styles.heroTint} style={{ background: theme.bg }} />
            <div className={styles.heroVeil} style={{ background: `linear-gradient(180deg, rgba(8,16,13,0.66) 0%, rgba(8,16,13,0.58) 40%, rgba(8,16,13,0.82) 72%, #FBF7EF 100%)` }} />
          </div>
        )}
        {!post.image && <div className={styles.heroFlat} style={{ background: theme.bg }} aria-hidden="true" />}
        <motion.div
          className={styles.heroInner}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <Link to="/blogs" className={styles.back}>← Journal</Link>
          <p className={styles.heroMeta} style={{ color: theme.accent }}>
            {post.cats[0]}{post.date ? ` · ${post.date}` : ""}{post.readTime ? ` · ${post.readTime}` : ""}
          </p>
          <h1 className={styles.heroTitle}>{post.title}</h1>
          {post.excerpt && <p className={styles.heroEx}>{post.excerpt}</p>}
          <div className={styles.byline}>
            <span className={styles.avatar} style={{ borderColor: theme.accent }}>{initials}</span>
            <span className={styles.byName}>{post.author || "SomaWellness"}</span>
            <span className={styles.byDot}>·</span>
            <button type="button" onClick={share} className={styles.shareBtn}>
              {copied ? "Link copied ✓" : "Share ↗"}
            </button>
          </div>
        </motion.div>
      </section>

      {/* Article body */}
      <article className={styles.article}>
        {/* Stats + actions */}
        <div className={styles.statsBar}>
          <span className={styles.stat}>◷ {post.readTime || "5 min read"}</span>
          {post.views > 0 && <span className={styles.stat}>◯ {post.views.toLocaleString()} reads</span>}
          {post.comments > 0 && <span className={styles.stat}>✎ {post.comments} comments</span>}
          <span className={styles.statGrow} />
          <button
            type="button"
            onClick={() => setLiked(!liked)}
            className={styles.likeBtn + (liked ? " " + styles.likeActive : "")}
            aria-pressed={liked}
          >
            {liked ? "♥" : "♡"} {likeCount > 0 ? likeCount : "Like"}
          </button>
        </div>

        <div className={styles.rule} aria-hidden="true"><span>✦</span></div>
        {first && <p className={styles.lead}>{first}</p>}
        {restParas.slice(0, mid).map((p, i) => (
          <p key={i} className={styles.para}>{p}</p>
        ))}

        {takeaways.length > 0 && (
          <motion.aside
            className={styles.takeaways}
            style={{ background: theme.soft }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <p className={styles.takeTitle} style={{ color: theme.accent === "#9fc7b2" ? "var(--soma-primary)" : undefined }}>Key takeaways</p>
            <ul>
              {takeaways.map((t) => (
                <li key={t}><span className={styles.tick}>✓</span>{t}</li>
              ))}
            </ul>
          </motion.aside>
        )}

        {gallery.length > 0 && (
          <div className={styles.inGallery}>
            {gallery.map((g, i) => (
              <motion.figure
                key={i}
                className={styles.inFigure}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1, ease: EASE }}
              >
                <img src={g.src} alt={g.caption || post.title} loading="lazy" />
                {g.caption && <figcaption>{g.caption}</figcaption>}
              </motion.figure>
            ))}
          </div>
        )}
        {pullQuote && (
          <motion.blockquote
            className={styles.pullQuote}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <span className={styles.qmark} style={{ color: theme.accent }}>“</span>
            {pullQuote}
          </motion.blockquote>
        )}
        {restParas.slice(mid).map((p, i) => (
          <p key={`b-${i}`} className={styles.para}>{p}</p>
        ))}

        {(post.cats.length > 0 || (post.tags && post.tags.length > 0)) && (
          <div className={styles.tags}>
            {post.cats.map((c) => (
              <Link key={c} to="/blogs" className={styles.tag}>#{c}</Link>
            ))}
            {(post.tags || []).slice(0, 6).map((t) => (
              <span key={t} className={styles.tagPlain}>#{t}</span>
            ))}
          </div>
        )}

        <div className={styles.signoff} style={{ background: theme.soft }}>
          <p className={styles.signTitle}>Practise what you just read</p>
          <p>Small groups in Spring Valley, Nairobi — mornings and evenings, known names, unhurried pace.</p>
          <div className={styles.signRow}>
            <Link to="/services" className={styles.btnDark}>Explore services</Link>
            <Link to="/contact" className={styles.btnLight}>Book a session</Link>
          </div>
        </div>
      </article>

      {/* Related */}
      {related.length > 0 && (
        <section className={styles.related}>
          <h2 className={styles.relatedTitle}>Keep reading</h2>
          <div className={styles.relatedGrid}>
            {related.map((r) => (
              <Link key={r.id} to={`/blogs/${r.id}`} className={styles.relCard}>
                <div className={styles.relMedia}><img src={r.image} alt={r.title} loading="lazy" /></div>
                <div className={styles.relBody}>
                  <p className={styles.relMeta}>{r.category}</p>
                  <h3 className={styles.relTitle}>{r.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </main>
  );
};

export default BlogDetail;
