import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SomaPageHeader from "../components/soma/SomaPageHeader";
import SomaCTA from "../components/soma/SomaCTA";
import { EASE } from "../lib/motion";
import { GALLERY_CATEGORIES } from "../config/galleryCategories.js";

const API = import.meta.env.VITE_API_URL || "";
const PAGE_SIZE = 24;

function srcOf(item, thumb = true) {
  const rel = (thumb && item.thumbnailUrl) || item.imageUrl || "";
  if (!rel) return "";
  if (/^https?:\/\//.test(rel)) return rel;
  return `${API}${rel}`;
}

export default function Gallery() {
  const [category, setCategory] = useState("All");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lightbox, setLightbox] = useState(-1);
  const touchX = useRef(null);

  const fetchPage = useCallback(async (cat, pg, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const q = new URLSearchParams({ limit: String(PAGE_SIZE), page: String(pg) });
      if (cat && cat !== "All") q.set("category", cat);
      const res = await fetch(`${API}/api/public/gallery?${q.toString()}`);
      if (!res.ok) throw new Error("gallery unavailable");
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.items || [];
      setItems((prev) => (append ? [...prev, ...list] : list));
      setPages(data.pages || 1);
      setTotal(data.total ?? list.length);
      setPage(pg);
    } catch {
      if (!append) setItems([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(category, 1, false);
  }, [category, fetchPage]);

  const openAt = (i) => setLightbox(i);
  const close = () => setLightbox(-1);
  const step = useCallback((dir) => {
    setLightbox((cur) => {
      if (cur < 0 || items.length === 0) return cur;
      return (cur + dir + items.length) % items.length;
    });
  }, [items.length]);

  useEffect(() => {
    if (lightbox < 0) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, step]);

  const current = lightbox >= 0 ? items[lightbox] : null;

  return (
    <div style={{ background: "var(--soma-cream)" }}>
      <SomaPageHeader
        eyebrow="Gallery"
        title="Moments at Soma"
        subtitle="Studio spaces, classes, workshops and community — Spring Valley, Nairobi."
        image="/images/headers/classes-memberships.webp"
      />

      <section className="container" style={{ paddingTop: 28, paddingBottom: 64 }}>
        <div role="tablist" aria-label="Gallery categories" style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginBottom: 22 }}>
          {["All", ...GALLERY_CATEGORIES].map((c) => (
            <button
              key={c}
              role="tab"
              aria-selected={category === c}
              onClick={() => setCategory(c)}
              style={{
                fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", padding: "8px 16px",
                borderRadius: 9999, border: "1px solid var(--soma-line-strong)",
                background: category === c ? "var(--soma-forest)" : "#fff",
                color: category === c ? "#fff" : "var(--soma-forest)",
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {loading && (
          <div role="status" aria-label="Loading gallery" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ height: 220, borderRadius: 14, background: "linear-gradient(110deg, #F1EDE2 30%, #FAF6EC 50%, #F1EDE2 70%)", backgroundSize: "200% 100%", animation: "shimmer 1.6s infinite" }} />
            ))}
          </div>
        )}

        {!loading && items.length === 0 && (
          <p role="status" style={{ textAlign: "center", color: "var(--soma-warm-gray)", padding: "48px 0" }}>
            No images in this collection yet — please check back soon.
          </p>
        )}

        {!loading && items.length > 0 && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
              {items.map((item, i) => (
                <motion.figure
                  key={item._id || i}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.45, ease: EASE }}
                  style={{
                    margin: 0, borderRadius: 14, overflow: "hidden", background: "#fff",
                    border: "1px solid var(--soma-line-light)", cursor: "zoom-in",
                    boxShadow: "0 6px 22px rgba(24,61,45,0.07)",
                  }}
                  onClick={() => openAt(i)}
                >
                  <div style={{ position: "relative", paddingTop: "72%", overflow: "hidden", background: "#EFEAE0" }}>
                    <img
                      src={srcOf(item)}
                      alt={item.altText || item.title}
                      loading="lazy"
                      decoding="async"
                      width={item.width || undefined}
                      height={item.height || undefined}
                      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                      onError={(e) => {
                        const img = e.currentTarget;
                        const full = srcOf(item, false);
                        if (!img.dataset.fbk && img.src !== full && full) {
                          img.dataset.fbk = "1";
                          img.src = full;
                        } else {
                          img.style.display = "none";
                        }
                      }}
                    />
                    <span style={{
                      position: "absolute", left: 10, bottom: 10, fontSize: 10, fontWeight: 800,
                      letterSpacing: "0.08em", textTransform: "uppercase", color: "#fff",
                      background: "rgba(24,61,45,0.72)", padding: "4px 10px", borderRadius: 9999,
                    }}>
                      {item.category}
                    </span>
                  </div>
                  <figcaption style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--soma-forest)" }}>{item.title}</div>
                    {item.description && (
                      <div style={{ fontSize: 12, color: "#5a6b63", marginTop: 2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {item.description}
                      </div>
                    )}
                  </figcaption>
                </motion.figure>
              ))}
            </div>
            <p style={{ textAlign: "center", fontSize: 12, color: "var(--soma-warm-gray)", marginTop: 14 }}>
              Showing {items.length} of {total}
            </p>
            {page < pages && (
              <div style={{ textAlign: "center", marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => fetchPage(category, page + 1, true)}
                  disabled={loadingMore}
                  className="btn btn--secondary"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <AnimatePresence>
        {current && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Image viewer: ${current.title}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (touchX.current == null) return;
              const dx = e.changedTouches[0].clientX - touchX.current;
              if (dx < -40) step(1);
              else if (dx > 40) step(-1);
              touchX.current = null;
            }}
            style={{
              position: "fixed", inset: 0, zIndex: 500, background: "rgba(12,26,20,0.92)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
            }}
          >
            <button type="button" onClick={close} aria-label="Close viewer" style={{ position: "absolute", top: 16, right: 18, color: "#fff", fontSize: 22, background: "none" }}>✕</button>
            {items.length > 1 && (
              <>
                <button type="button" onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="Previous image" style={{ position: "absolute", left: 12, color: "#fff", fontSize: 30, background: "none" }}>‹</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="Next image" style={{ position: "absolute", right: 12, color: "#fff", fontSize: 30, background: "none" }}>›</button>
              </>
            )}
            <motion.figure
              key={current._id}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              style={{ margin: 0, maxWidth: 960, width: "100%", textAlign: "center" }}
            >
              <img
                src={srcOf(current, false)}
                alt={current.altText || current.title}
                style={{ maxWidth: "100%", maxHeight: "76vh", borderRadius: 12, objectFit: "contain", background: "#000" }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
              <figcaption style={{ color: "#FFF7E6", marginTop: 10 }}>
                <div style={{ fontWeight: 700 }}>{current.title} {items.length > 1 && <span style={{ opacity: 0.6, fontWeight: 400 }}>· {lightbox + 1} / {items.length}</span>}</div>
                {current.description && <div style={{ fontSize: 13, opacity: 0.8 }}>{current.description}</div>}
              </figcaption>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>

      <SomaCTA />
    </div>
  );
}
