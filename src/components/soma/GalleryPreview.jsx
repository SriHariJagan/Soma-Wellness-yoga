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
  if (items.length === 0) return null;

  const srcOf = (item) => {
    const rel = item.thumbnailUrl || item.imageUrl || "";
    if (!rel) return "";
    return /^https?:\/\//.test(rel) ? rel : `${API}${rel}`;
  };

  return (
    <section className="section section--ivory" aria-label="Gallery preview">
      <div className="container">
        <div className="section-header">
          <span className="eyebrow eyebrow--center">The Space</span>
          <h2 className="display-title">Moments at <em>Soma</em></h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          {items.map((item, i) => (
            <motion.div
              key={item._id || i}
              initial={reduced ? {} : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: Math.min(i * 0.06, 0.3), ease: EASE }}
              style={{ borderRadius: 14, overflow: "hidden", height: 190, background: "#EFEAE0" }}
            >
              <img
                src={srcOf(item)}
                alt={item.altText || item.title}
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            </motion.div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 22 }}>
          <Link to="/gallery" className="btn btn--secondary btn--sm">Explore the gallery</Link>
        </div>
      </div>
    </section>
  );
}
