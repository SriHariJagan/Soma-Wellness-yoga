import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { EASE } from "../lib/motion";
import { JOURNAL_POSTS } from "../data/journalPosts";
import styles from "./Blogs.module.css";

const API = import.meta.env.VITE_API_URL || "";

const norm = (b) => ({
  id: b._id || b.id,
  title: b.title,
  excerpt: b.excerpt || "",
  image: b.coverImage || b.image,
  cats: b.categories?.length ? b.categories : [b.category || "Journal"],
  date: b.publishedAt
    ? new Date(b.publishedAt).toLocaleDateString("en-KE", { month: "short", year: "numeric" })
    : b.date || "",
  readTime: b.readingTime ? `${b.readingTime} min read` : b.readTime || "",
  live: !!b._id,
});

const Blogs = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState("All");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/api/blogs?limit=50`);
        if (!res.ok) throw new Error("blogs unavailable");
        const data = await res.json();
        const list = (data.blogs || []).map(norm);
        if (alive) setPosts(list.length ? list : JOURNAL_POSTS.map(norm));
      } catch {
        if (alive) setPosts(JOURNAL_POSTS.map(norm));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const categories = useMemo(() => {
    const set = new Set(["All"]);
    posts.forEach((p) => p.cats.forEach((c) => set.add(c)));
    return [...set];
  }, [posts]);

  const filtered = activeCat === "All" ? posts : posts.filter((p) => p.cats.includes(activeCat));
  const [featured, ...rest] = filtered;

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <motion.div
          className={styles.heroInner}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <p className={styles.eyebrow}>The Soma Journal</p>
          <h1 className={styles.title}>Insights & <em>Reflections</em></h1>
          <p className={styles.sub}>Thoughts on practice, breath, rest, and the art of living well — from our teachers and community.</p>
        </motion.div>
      </section>

      <nav className={styles.catNav} aria-label="Journal categories">
        <div className={styles.catInner}>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActiveCat(c)}
              className={styles.catBtn + (activeCat === c ? " " + styles.catActive : "")}
            >
              {c}
            </button>
          ))}
        </div>
      </nav>

      <section className={styles.section}>
        <div className={styles.container}>
          {loading ? (
            <div className={styles.loading}>Opening the journal…</div>
          ) : filtered.length === 0 ? (
            <div className={styles.empty}>No stories in this category yet.</div>
          ) : (
            <>
              {featured && (
                <motion.div
                  key={featured.id + activeCat}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: EASE }}
                >
                  <Link to={`/blogs/${featured.id}`} className={styles.featured}>
                    <div className={styles.featuredMedia}>
                      <img src={featured.image} alt={featured.title} />
                    </div>
                    <div className={styles.featuredBody}>
                      <p className={styles.meta}>{featured.cats[0]} · {featured.date}</p>
                      <h2 className={styles.featuredTitle}>{featured.title}</h2>
                      <p className={styles.featuredEx}>{featured.excerpt}</p>
                      <span className={styles.readLink}>Read article →</span>
                    </div>
                  </Link>
                </motion.div>
              )}

              <motion.div layout className={styles.grid}>
                <AnimatePresence mode="popLayout">
                  {rest.map((p, i) => (
                    <motion.div
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 24 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.45, delay: Math.min(i * 0.05, 0.2), ease: EASE }}
                    >
                      <Link to={`/blogs/${p.id}`} className={styles.card}>
                        <div className={styles.cardMedia}>
                          <img src={p.image} alt={p.title} loading="lazy" />
                        </div>
                        <div className={styles.cardBody}>
                          <p className={styles.meta}>{p.cats[0]} · {p.readTime || p.date}</p>
                          <h3 className={styles.cardTitle}>{p.title}</h3>
                          <p className={styles.cardEx}>{p.excerpt}</p>
                          <span className={styles.readLinkSm}>Read →</span>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </>
          )}
        </div>
      </section>
    </main>
  );
};

export default Blogs;
