import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SOMA_TESTIMONIALS } from "../../config/siteContent";
import styles from "./SomaTestimonials.module.css";
import { EASE, spring, usePrefersReducedMotion } from "../../lib/motion";

const SomaTestimonials = () => {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();
  const t = SOMA_TESTIMONIALS[idx];

  const next = () => setIdx((p) => (p === SOMA_TESTIMONIALS.length - 1 ? 0 : p + 1));
  const prev = () => setIdx((p) => (p === 0 ? SOMA_TESTIMONIALS.length - 1 : p - 1));

  const onDragEnd = (_, info) => {
    if (reduced) return;
    if (info.offset.x < -60) next();
    else if (info.offset.x > 60) prev();
  };

  // auto-rotate every 4s, pause on hover/drag, respect reduced motion
  React.useEffect(() => {
    if (reduced || paused) return;
    const id = setInterval(next, 4000);
    return () => clearInterval(id);
  }, [idx, paused, reduced]);

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
            Community
            <motion.span className={styles.eyebrowLine} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }} style={{ transformOrigin: "left" }} aria-hidden="true" />
          </span>
          <h2 className={styles.title}>
            What it feels like to <em>practice here.</em>
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
              <p className={styles.quote}>{t.quote}</p>
              <div className={styles.author}>
                <span className={styles.avatar}>{t.avatar}</span>
                <div>
                  <strong>{t.name}</strong>
                  <span>{t.role}</span>
                </div>
                <span className={styles.dragHint} aria-hidden="true">drag ↔</span>
              </div>

              {/* controls now inside card */}
              <div className={styles.controlsInside}>
                <div className={styles.dots}>
                  {SOMA_TESTIMONIALS.map((_, i) => (
                    <button
                      key={i}
                      className={`${styles.dot} ${idx === i ? styles.dotActive : ""}`}
                      onClick={() => setIdx(i)}
                      aria-label={`Testimonial ${i + 1} of ${SOMA_TESTIMONIALS.length}`}
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
                  <motion.button className={styles.arrow} onClick={prev} aria-label="Previous testimonial" whileHover={reduced ? {} : { scale: 1.06 }} whileTap={{ scale: 0.96 }} transition={spring.snappy}>
                    ←
                  </motion.button>
                  <motion.button className={styles.arrow} onClick={next} aria-label="Next testimonial" whileHover={reduced ? {} : { scale: 1.06 }} whileTap={{ scale: 0.96 }} transition={spring.snappy}>
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
          <span>Trusted by 500+ members</span>
          <span aria-hidden="true">·</span>
          <span>4.9★ average rating</span>
          <span aria-hidden="true">·</span>
          <span>18 years of teaching</span>
        </motion.div>
      </div>
    </section>
  );
};

export default SomaTestimonials;
