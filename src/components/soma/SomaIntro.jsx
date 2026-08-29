import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { EASE, spring, usePrefersReducedMotion } from "../../lib/motion";
import { useTranslation } from "react-i18next";
import styles from "./SomaIntro.module.css";

const SomaIntro = () => {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);
  const visualRef = useRef(null);

  const stats = [
    { label: t("home.intro.stats.smallGroupsLabel"), sub: t("home.intro.stats.smallGroupsSub") },
    { label: t("home.intro.stats.consciousTeachersLabel"), sub: t("home.intro.stats.consciousTeachersSub") },
    { label: t("home.intro.stats.premiumLabel"), sub: t("home.intro.stats.premiumSub") },
  ];

  // Scroll-linked for image — subtle editorial parallax (distinct from Hero's 90px)
  const { scrollYProgress } = useScroll({
    target: visualRef,
    offset: ["start end", "end start"],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], [reduced ? 0 : 28, reduced ? 0 : -28]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.06, 1]);
  const springY = useSpring(imgY, { stiffness: 80, damping: 20 });
  const springScale = useSpring(imgScale, { stiffness: 80, damping: 20 });

  // accent slow rotation
  const accentRotate = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 18]);

  return (
    <section ref={ref} className={styles.section}>
      {/* soft editorial bg */}
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />
      <div className={styles.organicShape} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.grid}>
          {/* ── Visual — left now, clip reveal + parallax ── */}
          <motion.div
            ref={visualRef}
            className={styles.visual}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
          >
            {/* organic accent — slow breathe, not Hero's blobs */}
            <motion.div
              className={styles.accent}
              style={{ rotate: accentRotate }}
              animate={reduced ? {} : { scale: [1, 1.03, 1] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden="true"
            />
            <motion.div
              className={styles.accent2}
              animate={reduced ? {} : { scale: [1, 1.04, 1], y: [0, -6, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
              aria-hidden="true"
            />

            <motion.div
              className={styles.imageWrap}
              initial={reduced ? { opacity: 1 } : { clipPath: "inset(18% 0 0 0)", y: 18, opacity: 0 }}
              whileInView={reduced ? { opacity: 1 } : { clipPath: "inset(0% 0 0 0)", y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.05, ease: EASE }}
              whileHover={reduced ? {} : { y: -4 }}
            >
              <motion.div className={styles.imageInner} style={{ y: springY, scale: springScale }}>
                <motion.img
                  src="https://images.unsplash.com/photo-1528715471578-2e5b6c0bb37a?q=80&w=900&auto=format&fit=crop"
                  alt={t("home.intro.alt")}
                  width="900"
                  height="1100"
                  loading="lazy"
                  decoding="async"
                  initial={reduced ? { scale: 1 } : { scale: 1.08 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.3, ease: EASE }}
                />
              </motion.div>

              {/* subtle top highlight */}
              <div className={styles.imageHighlight} aria-hidden="true" />
              <div className={styles.imageRing} aria-hidden="true" />

              {/* caption — slide up reveal, delayed */}
              <motion.div
                className={styles.caption}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.65, delay: 0.55, ease: EASE }}
              >
                <span>{t("home.intro.captionLabel")}</span>
                <p>{t("home.intro.captionText")}</p>
                <motion.span
                  className={styles.captionLine}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.75, ease: EASE }}
                  style={{ transformOrigin: "left" }}
                  aria-hidden="true"
                />
              </motion.div>
            </motion.div>

            {/* floating micro-card — editorial, not Hero's glass floatCard */}
            <motion.div
              className={styles.microCard}
              initial={{ opacity: 0, y: 10, x: 8 }}
              whileInView={{ opacity: 1, y: 0, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.75, ease: EASE }}
              whileHover={reduced ? {} : { y: -2, scale: 1.015 }}
            >
              <span className={styles.microDot} />
              <div>
                <strong>{t("home.intro.microTitle")}</strong>
                <span>{t("home.intro.microSub")}</span>
              </div>
            </motion.div>
          </motion.div>

          {/* ── Copy — staggered editorial reveal (now right) ── */}
          <motion.div
            className={styles.copy}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: reduced ? 0 : 0.11, delayChildren: reduced ? 0 : 0.14 } },
            }}
          >
            {/* eyebrow — line draw + dot */}
            <motion.div
              className={styles.eyebrow}
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
              }}
            >
              <motion.span
                className={styles.eyebrowLine}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: EASE }}
                style={{ transformOrigin: "left" }}
              />
              <span className={styles.eyebrowDot} />
              {t("home.intro.eyebrow")}
              {/* subtle pulse — not in Hero's eyebrowPulse, this one is slower */}
              {!reduced && (
                <motion.span
                  className={styles.eyebrowHalo}
                  animate={{ scale: [1, 1.5, 1], opacity: [0.18, 0.06, 0.18] }}
                  transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                  aria-hidden="true"
                />
              )}
            </motion.div>

            {/* title — each line clip reveal, distinct from Hero's word blur */}
            <h2 className={styles.title}>
              <span className={styles.titleClip}>
                <motion.span
                  className={styles.titleLine}
                  variants={{
                    hidden: { y: "110%", skewY: 2 },
                    visible: { y: "0%", skewY: 0, transition: { duration: 0.78, ease: EASE } },
                  }}
                >
                  {t("home.intro.titleLine1")}
                </motion.span>
              </span>
              <span className={styles.titleClip}>
                <motion.span
                  className={styles.titleLine}
                  variants={{
                    hidden: { y: "110%", skewY: 2 },
                    visible: { y: "0%", skewY: 0, transition: { duration: 0.78, ease: EASE, delay: 0.08 } },
                  }}
                >
                  <em>{t("home.intro.titleLine2")}</em>
                </motion.span>
              </span>
              <span className={styles.titleClip}>
                <motion.span
                  className={styles.titleLine}
                  variants={{
                    hidden: { y: "110%", skewY: 2 },
                    visible: { y: "0%", skewY: 0, transition: { duration: 0.78, ease: EASE, delay: 0.16 } },
                  }}
                >
                  {t("home.intro.titleLine3")} <em>{t("home.intro.titleLine4")}</em>
                </motion.span>
              </span>
              {/* underline accent — draws after title, different timing vs Hero */}
              <motion.span
                className={styles.titleAccent}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: 0.65, ease: EASE }}
                aria-hidden="true"
              />
            </h2>

            <motion.p
              className={styles.lead}
              variants={{
                hidden: { opacity: 0, y: 16, filter: reduced ? "blur(0px)" : "blur(6px)" },
                visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.7, ease: EASE } },
              }}
            >
              {t("home.intro.lead")}
            </motion.p>

            <motion.p
              className={styles.body}
              variants={{
                hidden: { opacity: 0, y: 14 },
                visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
              }}
            >
              {t("home.intro.body")}
            </motion.p>

            {/* stats — sequential line draw, unique to this section */}
            <motion.div
              className={styles.stats}
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: reduced ? 0 : 0.1, delayChildren: reduced ? 0 : 0.18 } },
              }}
            >
              {stats.map((s, i) => (
                <motion.div
                  key={s.label}
                  className={styles.statRow}
                  variants={{
                    hidden: { opacity: 0, x: -14 },
                    visible: { opacity: 1, x: 0, transition: { duration: 0.55, ease: EASE } },
                  }}
                >
                  <span className={styles.statDash} aria-hidden="true">—</span>
                  <strong>{s.label}</strong>
                  <em>{s.sub}</em>
                  {/* line draw under each row — not in Hero */}
                  <motion.span
                    className={styles.statLine}
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.3 + i * 0.08, ease: EASE }}
                    style={{ transformOrigin: "left" }}
                    aria-hidden="true"
                  />
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* divider — line draw + SOMA letter spacing */}
        <motion.div
          className={styles.divider}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: reduced ? 0 : 0.18, delayChildren: reduced ? 0 : 0.2 } },
          }}
          aria-hidden="true"
        >
          <motion.span
            className={styles.dividerLine}
            variants={{
              hidden: { scaleX: 0 },
              visible: { scaleX: 1, transition: { duration: 0.9, ease: EASE } },
            }}
            style={{ transformOrigin: "right" }}
          />
          <motion.em
            className={styles.dividerText}
            variants={{
              hidden: { opacity: 0, letterSpacing: "0.18em" },
              visible: { opacity: 1, letterSpacing: "0.32em", transition: { duration: 0.8, ease: EASE } },
            }}
          >
            SOMA
          </motion.em>
          <motion.span
            className={styles.dividerLine}
            variants={{
              hidden: { scaleX: 0 },
              visible: { scaleX: 1, transition: { duration: 0.9, ease: EASE } },
            }}
            style={{ transformOrigin: "left" }}
          />
        </motion.div>
      </div>
    </section>
  );
};

export default SomaIntro;
