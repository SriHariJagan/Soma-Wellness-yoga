import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { SOMA_EXPERIENCES } from "../../config/siteContent";
import styles from "./SomaExperiences.module.css";
import { EASE, spring, usePrefersReducedMotion } from "../../lib/motion";

const SomaExperiences = () => {
  const [active, setActive] = useState(0);
  const exp = SOMA_EXPERIENCES[active];
  const reduced = usePrefersReducedMotion();
  const listRef = useRef(null);

  return (
    <section className={styles.section}>
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />
      {/* orbital — different position/size vs Method */}
      <motion.div
        className={styles.orbital}
        aria-hidden="true"
        animate={reduced ? {} : { rotate: [0, -4, 0], scale: [1, 1.02, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className={styles.inner}>
        {/* ── Header — editorial row ── */}
        <motion.div
          className={styles.headerRow}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: reduced ? 0 : 0.12, delayChildren: reduced ? 0 : 0.1 } },
          }}
        >
          <motion.div
            className={styles.titleBlock}
            variants={{
              hidden: { opacity: 0, y: 18 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
            }}
          >
            <div className={styles.eyebrow}>
              <motion.span
                className={styles.eyebrowLine}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: EASE }}
                style={{ transformOrigin: "left" }}
              />
              <span className={styles.eyebrowDot} />
              Experiences — 04 doors
            </div>
            <h2 className={styles.title}>
              <span className={styles.watermarkTitle} aria-hidden="true">04</span>
              <span className={styles.titleLineWrap}>
                <motion.span
                  className={styles.titleLine}
                  initial={{ y: "110%" }}
                  whileInView={{ y: "0%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.72, ease: EASE }}
                >
                  Move the way
                </motion.span>
              </span>
              <span className={styles.titleLineWrap}>
                <motion.span
                  className={styles.titleLine}
                  initial={{ y: "110%" }}
                  whileInView={{ y: "0%" }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.72, delay: 0.1, ease: EASE }}
                >
                  <em>you</em> need to.
                </motion.span>
              </span>
              <motion.span
                className={styles.titleUnderline}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: 0.55, ease: EASE }}
                style={{ transformOrigin: "left" }}
                aria-hidden="true"
              />
              <motion.span
                className={styles.titleAccentDot}
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.75, ease: EASE }}
                aria-hidden="true"
              />
            </h2>
          </motion.div>
          <motion.div
            className={styles.headerCopyWrap}
            variants={{
              hidden: { opacity: 0, y: 14 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
            }}
          >
            <p className={styles.headerCopy}>
              Not a menu to perform — <strong>a set of doors.</strong> Step through the one that meets you today.
            </p>
            <span className={styles.headerHint}>
              <span className={styles.hintDot} /> Hover to explore · Tap on mobile → 04 practices
            </span>
          </motion.div>
        </motion.div>

        <div className={styles.layout}>
          {/* ── List — staggered rows, active morph ── */}
          <motion.div
            ref={listRef}
            className={styles.list}
            role="tablist"
            aria-label="Soma experiences"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: reduced ? 0 : 0.07, delayChildren: reduced ? 0 : 0.18 } },
            }}
          >
            {SOMA_EXPERIENCES.map((item, idx) => {
              const isActive = active === idx;
              return (
                <motion.button
                  key={item.id}
                  role="tab"
                  aria-selected={isActive}
                  className={`${styles.row} ${isActive ? styles.active : ""}`}
                  onMouseEnter={() => setActive(idx)}
                  onFocus={() => setActive(idx)}
                  onClick={() => setActive(idx)}
                  variants={{
                    hidden: { opacity: 0, y: 16, filter: reduced ? "blur(0px)" : "blur(6px)" },
                    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.55, ease: EASE } },
                  }}
                  whileHover={reduced ? {} : { x: isActive ? 0 : 3 }}
                  whileTap={{ scale: 0.99 }}
                  transition={spring.snappy}
                >
                  {/* active left indicator — scaleY draw */}
                  <motion.span
                    className={styles.activeIndicator}
                    initial={false}
                    animate={{ scaleY: isActive ? 1 : 0, opacity: isActive ? 1 : 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    aria-hidden="true"
                  />
                  <span className={styles.id}>{item.id}</span>
                  <span className={styles.name}>{item.title}</span>
                  <span className={styles.meta}>{item.subtitle}</span>
                  <motion.span
                    className={styles.rowArrow}
                    animate={isActive ? { rotate: 0 } : { rotate: 0 }}
                    whileHover={reduced ? {} : { scale: 1.06 }}
                    transition={spring.snappy}
                    aria-hidden="true"
                  >
                    {isActive ? "→" : "↗"}
                  </motion.span>
                </motion.button>
              );
            })}
          </motion.div>

          {/* ── Visual — immersive morph (unique) ── */}
          <div className={styles.visual}>
            <AnimatePresence mode="wait">
              <motion.div
                key={exp.id}
                className={styles.imageWrap}
                initial={
                  reduced
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 1.04, y: 10, filter: "blur(6px)" }
                }
                animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                exit={
                  reduced
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.98, y: -8, filter: "blur(4px)" }
                }
                transition={{ duration: reduced ? 0.28 : 0.58, ease: EASE }}
              >
                <motion.img
                  src={exp.image}
                  alt={`${exp.title} — ${exp.subtitle}`}
                  loading="lazy"
                  decoding="async"
                  initial={reduced ? { scale: 1 } : { scale: 1.08 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 1.25, ease: EASE }}
                />
                <div className={styles.imageOverlay} />
                <div className={styles.imageRing} aria-hidden="true" />
                {/* subtle top sheen */}
                <div className={styles.imageSheen} aria-hidden="true" />

                <motion.div
                  className={styles.imageContent}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.16, ease: EASE }}
                >
                  <span className={styles.imageEyebrow}>
                    {exp.id} · {exp.subtitle}
                  </span>
                  <h3 className={styles.imageTitle}>{exp.title}</h3>
                  <p className={styles.imageDesc}>{exp.desc}</p>
                  <motion.div whileHover={reduced ? {} : { y: -2 }} whileTap={{ scale: 0.98 }}>
                    <Link to={exp.href} className={styles.imageCta}>
                      Explore {exp.title.toLowerCase()} <span>→</span>
                    </Link>
                  </motion.div>
                </motion.div>

                {/* id watermark — large faint */}
                <span className={styles.watermark} aria-hidden="true">
                  {exp.id}
                </span>
              </motion.div>
            </AnimatePresence>

            {/* meta — counter + dots */}
            <div className={styles.visualMeta}>
              <motion.span
                key={active}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                className={styles.counter}
              >
                0{active + 1} / 04
              </motion.span>
              <span aria-hidden="true">—</span>
              <span>Choose your practice</span>
              <div className={styles.dots} role="tablist" aria-label="Experience pagination">
                {SOMA_EXPERIENCES.map((_, i) => (
                  <button
                    key={i}
                    className={`${styles.dot} ${active === i ? styles.dotActive : ""}`}
                    onClick={() => setActive(i)}
                    aria-label={`Show ${SOMA_EXPERIENCES[i].title}`}
                    aria-selected={active === i}
                    role="tab"
                  >
                    <motion.span
                      className={styles.dotFill}
                      initial={false}
                      animate={{ scaleX: active === i ? 1 : 0 }}
                      transition={{ duration: 0.45, ease: EASE }}
                      style={{ transformOrigin: "left" }}
                    />
                  </button>
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
