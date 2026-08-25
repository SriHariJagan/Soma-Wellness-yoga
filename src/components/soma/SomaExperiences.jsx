import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { SOMA_EXPERIENCES } from "../../config/siteContent";
import styles from "./SomaExperiences.module.css";

const SomaExperiences = () => {
  const [active, setActive] = useState(0);
  const exp = SOMA_EXPERIENCES[active];

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.headerRow}>
          <div>
            <span className={styles.eyebrow}>Experiences</span>
            <h2 className={styles.title}>
              Move the way <em>you</em> need to.
            </h2>
          </div>
          <p className={styles.headerCopy}>
            Not a menu to perform — a set of doors. Step through the one that meets you today. Hover to explore; tap on mobile.
          </p>
        </div>

        <div className={styles.layout}>
          <div className={styles.list} role="tablist" aria-label="Soma experiences">
            {SOMA_EXPERIENCES.map((item, idx) => (
              <button
                key={item.id}
                role="tab"
                aria-selected={active === idx}
                className={`${styles.row} ${active === idx ? styles.active : ""}`}
                onMouseEnter={() => setActive(idx)}
                onFocus={() => setActive(idx)}
                onClick={() => setActive(idx)}
              >
                <span className={styles.id}>{item.id}</span>
                <span className={styles.name}>{item.title}</span>
                <span className={styles.meta}>{item.subtitle}</span>
                <span className={styles.rowArrow} aria-hidden="true">{active === idx ? "→" : "↗"}</span>
              </button>
            ))}
          </div>

          <div className={styles.visual}>
            <AnimatePresence mode="wait">
              <motion.div
                key={exp.id}
                className={styles.imageWrap}
                initial={{ opacity: 0, scale: 1.02 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <img src={exp.image} alt={`${exp.title} — ${exp.subtitle}`} loading="lazy" decoding="async" />
                <div className={styles.imageOverlay} />
                <div className={styles.imageContent}>
                  <span className={styles.imageEyebrow}>{exp.id} · {exp.subtitle}</span>
                  <h3 className={styles.imageTitle}>{exp.title}</h3>
                  <p className={styles.imageDesc}>{exp.desc}</p>
                  <Link to={exp.href} className={styles.imageCta}>
                    Explore {exp.title.toLowerCase()} <span>→</span>
                  </Link>
                </div>
                <span className={styles.imageRing} aria-hidden="true" />
              </motion.div>
            </AnimatePresence>

            <div className={styles.visualMeta}>
              <span>0{active + 1} / 04</span>
              <span>—</span>
              <span>Choose your practice</span>
              <div className={styles.dots}>
                {SOMA_EXPERIENCES.map((_, i) => (
                  <button key={i} className={`${styles.dot} ${active === i ? styles.dotActive : ""}`} onClick={() => setActive(i)} aria-label={`Show ${SOMA_EXPERIENCES[i].title}`} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SomaExperiences;
