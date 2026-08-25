import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SOMA_TESTIMONIALS } from "../../config/siteContent";
import styles from "./SomaTestimonials.module.css";

const SomaTestimonials = () => {
  const [idx, setIdx] = useState(0);
  const t = SOMA_TESTIMONIALS[idx];

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <span className={styles.eyebrow}>Community</span>
          <h2 className={styles.title}>What it feels like to <em>practice here.</em></h2>
        </div>

        <div className={styles.cardWrap}>
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              className={styles.card}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4 }}
            >
              <div className={styles.quoteMark} aria-hidden="true">“</div>
              <p className={styles.quote}>{t.quote}</p>
              <div className={styles.author}>
                <span className={styles.avatar}>{t.avatar}</span>
                <div>
                  <strong>{t.name}</strong>
                  <span>{t.role}</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className={styles.controls}>
            <div className={styles.dots}>
              {SOMA_TESTIMONIALS.map((_, i) => (
                <button key={i} className={`${styles.dot} ${idx === i ? styles.dotActive : ""}`} onClick={() => setIdx(i)} aria-label={`Testimonial ${i + 1}`} />
              ))}
            </div>
            <div className={styles.arrows}>
              <button className={styles.arrow} onClick={() => setIdx((p) => (p === 0 ? SOMA_TESTIMONIALS.length - 1 : p - 1))} aria-label="Previous">←</button>
              <button className={styles.arrow} onClick={() => setIdx((p) => (p === SOMA_TESTIMONIALS.length - 1 ? 0 : p + 1))} aria-label="Next">→</button>
            </div>
          </div>
        </div>

        <div className={styles.trust}>
          <span>Trusted by 500+ members</span>
          <span>·</span>
          <span>4.9★ average rating</span>
          <span>·</span>
          <span>18 years of teaching</span>
        </div>
      </div>
    </section>
  );
};

export default SomaTestimonials;
