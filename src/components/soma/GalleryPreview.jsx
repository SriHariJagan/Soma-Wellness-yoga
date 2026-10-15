import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { EASE, usePrefersReducedMotion } from "../../lib/motion";

const API = import.meta.env.VITE_API_URL || "";

/**
 * GalleryPreview — landing strip fed by the live public gallery.
 * Shows up to 6 active images; links to /gallery. Hides when empty.
 */
export default function GalleryPreview() {
  const reduced = usePrefersReducedMotion();
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  // Ids of images that failed to load — dropped entirely so a broken file
  // never leaves behind an empty beige tile that ruins the strip.
  const [failed, setFailed] = useState(() => new Set());

  useEffect(() => {
    let alive = true;
    fetch(`${API}/api/public/gallery?limit=6`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.items || [];
        if (alive) setItems(list.slice(0, 6));
      })
      .catch(() => { if (alive) setItems([]); })
      .finally(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);

  if (!ready) return null;
  const visible = items.filter((it, i) => !failed.has(it._id || i));
  if (visible.length === 0) return null;

  const srcOf = (item) => {
    const rel = item.thumbnailUrl || item.imageUrl || "";
    if (!rel) return "";
    return /^https?:\/\//.test(rel) ? rel : `${API}${rel}`;
  };

  const markFailed = (key) => {
    setFailed((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  };

  // A lone image stretched full-width looks broken — center it as a feature
  // card instead; two images share a centered row.
  const lone = visible.length === 1;
  const pair = visible.length === 2;

  return (
    <section className="section section--ivory" aria-label="Gallery preview">
      <div className="container">
        <div className="section-header">
          <span className="eyebrow eyebrow--center">The Space</span>
          <h2 className="display-title">Moments at <em>Soma</em></h2>
        </div>
        <div style={
          lone
            ? { display: "flex", justifyContent: "center" }
            : pair
              ? { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 460px))", gap: 12, justifyContent: "center" }
              : { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }
        }>
          {visible.map((item, i) => {
            const key = item._id || i;
            return (
              <motion.div
                key={key}
                initial={reduced ? {} : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: Math.min(i * 0.06, 0.3), ease: EASE }}
                style={{
                  borderRadius: 14, overflow: "hidden",
                  height: lone ? 320 : 190,
                  width: lone ? "min(100%, 560px)" : undefined,
                  background: "#EFEAE0",
                }}
              >
                <img
                  src={srcOf(item)}
                  alt={item.altText || item.title}
                  loading="lazy"
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  onError={() => markFailed(key)}
                />
              </motion.div>
            );
          })}
        </div>
        <div style={{ textAlign: "center", marginTop: 22 }}>
          <Link to="/gallery" className="btn btn--secondary btn--sm">Explore the gallery</Link>
        </div>
      </div>
    </section>
  );
}
