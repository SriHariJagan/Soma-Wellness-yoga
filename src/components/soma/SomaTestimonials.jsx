import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./SomaTestimonials.module.css";
import { EASE, spring, usePrefersReducedMotion } from "../../lib/motion";
import { useTranslation } from "react-i18next";
import { TESTIMONIAL_MEDIA, getYouTubeId } from "../../config/siteContent";

const TestimonialMedia = ({ media }) => {
  const [play, setPlay] = useState(false);
  if (!media) return null;
  const vid = getYouTubeId(media.youtubeUrl || "");
  if (vid) {
    if (!play) {
      return (
        <button
          type="button"
          onClick={() => setPlay(true)}
          aria-label="Play video testimonial"
          style={{ position: "relative", display: "block", width: "100%", borderRadius: 16, overflow: "hidden", border: "1px solid var(--soma-line-light)", cursor: "pointer", padding: 0, background: "#000", marginBottom: 16 }}
        >
          <img src={`https://i.ytimg.com/vi/${vid}/hqdefault.jpg`} alt="Video testimonial" style={{ width: "100%", display: "block", aspectRatio: "16/9", objectFit: "cover" }} loading="lazy" />
          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(180deg, transparent 40%, rgba(24,61,45,0.45) 100%)" }}>
            <span style={{ width: 56, height: 56, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "var(--soma-forest)", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>▶</span>
          </span>
        </button>
      );
    }
    return (
      <div style={{ borderRadius: 16, overflow: "hidden", marginBottom: 16, aspectRatio: "16/9", background: "#000" }}>
        <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${vid}?autoplay=1&rel=0`} title="Video testimonial" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ width: "100%", height: "100%", minHeight: 280 }} />
      </div>
    );
  }
  if (media.image) {
    return <img src={media.image} alt="Member testimonial" loading="lazy" style={{ width: "100%", borderRadius: 16, objectFit: "cover", maxHeight: 320, marginBottom: 16, border: "1px solid var(--soma-line-light)" }} />;
  }
  return null;
};

const SomaTestimonials = () => {
  const { t } = useTranslation();
  const items = t("home.testimonials.items", { returnObjects: true });
  const list = Array.isArray(items) ? items : [];
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();
  const cur = list[idx] || {};
  const curMedia = TESTIMONIAL_MEDIA[idx] || null;

  const next = () => setIdx((p) => (p === list.length - 1 ? 0 : p + 1));
  const prev = () => setIdx((p) => (p === 0 ? list.length - 1 : p - 1));

  const onDragEnd = (_, info) => {
    if (reduced) return;
    if (info.offset.x < -60) next();
    else if (info.offset.x > 60) prev();
  };

  // auto-rotate every 4s, pause on hover/drag, respect reduced motion
  React.useEffect(() => {
    if (reduced || paused || !list.length) return;
    const id = setInterval(next, 4000);
    return () => clearInterval(id);
  }, [idx, paused, reduced, list.length]);

  return (
    <section className={styles.section}>
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />
      <motion.div className={styles.orbital} aria-hidden="true" animate={reduced ? {} : { rotate: [0, 4, 0] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} />

      <div className={styles.inner}>
        <motion.div
          className={styles.top}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            {t("home.testimonials.eyebrow")}
            <motion.span className={styles.eyebrowLine} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }} style={{ transformOrigin: "left" }} aria-hidden="true" />
          </span>
          <h2 className={styles.title}>
            {t("home.testimonials.titleBefore")} <em>{t("home.testimonials.titleEm")}</em>
            <motion.span className={styles.titleUnderline} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.85, delay: 0.4, ease: EASE }} style={{ transformOrigin: "center" }} aria-hidden="true" />
          </h2>
        </motion.div>

        <div className={styles.cardWrap}>
          {/* stacked behind cards for depth — premium */}
          <div className={styles.stack} aria-hidden="true">
            <div className={styles.stackCard + " " + styles.stackCard2} />
            <div className={styles.stackCard + " " + styles.stackCard1} />
          </div>

          <AnimatePresence mode="wait" custom={idx}>
            <motion.div
              key={idx}
              className={styles.card}
              drag={reduced ? false : "x"}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.22}
              onDragStart={() => setPaused(true)}
              onDragEnd={(e, info) => { setPaused(false); onDragEnd(e, info); }}
              onHoverStart={() => setPaused(true)}
              onHoverEnd={() => setPaused(false)}
              initial={{ opacity: 0, x: 36, y: 10, scale: 0.96, rotate: 1, filter: reduced ? "blur(0px)" : "blur(8px)" }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -36, y: -10, scale: 0.97, rotate: -1, filter: reduced ? "blur(0px)" : "blur(6px)" }}
              transition={{ duration: 0.55, ease: EASE }}
              whileHover={reduced ? {} : { y: -4, scale: 1.01 }}
              whileTap={{ cursor: "grabbing", scale: 0.99 }}
              style={{ cursor: reduced ? "default" : "grab" }}
            >
              <div className={styles.cardSheen} aria-hidden="true" />
              <div className={styles.quoteMark} aria-hidden="true">“</div>
              <TestimonialMedia media={curMedia} />
              <p className={styles.quote}>{cur.quote}</p>
              <div className={styles.author}>
                <span className={styles.avatar}>{cur.avatar}</span>
                <div>
                  <strong>{cur.name}</strong>
                  <span>{cur.role}</span>
                </div>
                <span className={styles.dragHint} aria-hidden="true">{t("home.testimonials.dragHint")}</span>
              </div>

              {/* controls now inside card */}
              <div className={styles.controlsInside}>
                <div className={styles.dots}>
                  {list.map((_, i) => (
                    <button
                      key={i}
                      className={`${styles.dot} ${idx === i ? styles.dotActive : ""}`}
                      onClick={() => setIdx(i)}
                      aria-label={t("home.testimonials.testimonialLabel", { current: i + 1, total: list.length })}
                      aria-selected={idx === i}
                    >
                      <motion.span
                        className={styles.dotFill}
                        initial={false}
                        animate={{ scaleX: idx === i ? 1 : 0 }}
                        transition={{ duration: 0.4, ease: EASE }}
                        style={{ transformOrigin: "left" }}
                      />
                    </button>
                  ))}
                </div>
                <div className={styles.arrows}>
                  <motion.button className={styles.arrow} onClick={prev} aria-label={t("home.testimonials.previous")} whileHover={reduced ? {} : { scale: 1.06 }} whileTap={{ scale: 0.96 }} transition={spring.snappy}>
                    ←
                  </motion.button>
                  <motion.button className={styles.arrow} onClick={next} aria-label={t("home.testimonials.next")} whileHover={reduced ? {} : { scale: 1.06 }} whileTap={{ scale: 0.96 }} transition={spring.snappy}>
                    →
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.div
          className={styles.trust}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
        >
          <span>{t("home.testimonials.trust1")}</span>
          <span aria-hidden="true">·</span>
          <span>{t("home.testimonials.trust2")}</span>
          <span aria-hidden="true">·</span>
          <span>{t("home.testimonials.trust3")}</span>
        </motion.div>
      </div>
    </section>
  );
};

export default SomaTestimonials;
