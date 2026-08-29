import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { Link } from "react-router-dom";
import styles from "./SomaImmersive.module.css";
import { EASE, spring, usePrefersReducedMotion } from "../../lib/motion";
import { useTranslation } from "react-i18next";

const SomaImmersive = () => {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], [reduced ? 0 : 0, reduced ? 0 : -56]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [reduced ? 1 : 1.06, reduced ? 1 : 1]);
  const bgYSpring = useSpring(bgY, { stiffness: 60, damping: 20 });
  const bgScaleSpring = useSpring(bgScale, { stiffness: 60, damping: 20 });
  const cardY = useTransform(scrollYProgress, [0, 1], [reduced ? 0 : 14, reduced ? 0 : -8]);

  return (
    <section ref={ref} className={styles.section}>
      <motion.div className={styles.bg} aria-hidden="true" style={{ y: bgYSpring, scale: bgScaleSpring }}>
        <motion.img
          src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1920&auto=format&fit=crop"
          alt={t("home.immersive.alt")}
          width="1920"
          height="1080"
          loading="lazy"
          decoding="async"
          initial={reduced ? { scale: 1 } : { scale: 1.05 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: EASE }}
        />
        <div className={styles.bgOverlay} />
        <div className={styles.bgVignette} aria-hidden="true" />
        <div className={styles.grain} aria-hidden="true" />
      </motion.div>

      <motion.div className={styles.ring} aria-hidden="true" animate={reduced ? {} : { rotate: [0, 2, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className={styles.ring2} aria-hidden="true" animate={reduced ? {} : { rotate: [0, -2, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 1 }} />

      <div className={styles.inner}>
        <motion.div
          className={styles.card}
          style={{ y: cardY }}
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 28, clipPath: "inset(0 100% 0 0)" }}
          whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0, clipPath: "inset(0 0% 0 0)" }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <div className={styles.cardSheen} aria-hidden="true" />
          <motion.span className={styles.cardAccent} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.85, delay: 0.4, ease: EASE }} style={{ transformOrigin: "left" }} aria-hidden="true" />

          {/* watermark SOMA faint behind title */}
          <span className={styles.cardWatermark} aria-hidden="true">SOMA</span>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.085, delayChildren: reduced ? 0 : 0.18 } } }}>
            {/* eyebrow + small number */}
            <motion.div className={styles.cardTop} variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}>
              <span className={styles.eyebrow}>
                <span className={styles.eyebrowDot} />{t("home.immersive.eyebrow")}
              </span>
              <span className={styles.cardNumber}>{t("home.immersive.cardNumber")}</span>
            </motion.div>

            <motion.h2 className={styles.title} variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } } }}>
              <span className={styles.titleInline}>
                <span>{t("home.immersive.titleLight")}</span> <span>{t("home.immersive.titleWood")}</span> <em>{t("home.immersive.titleSilence")}</em>
              </span>
              <motion.span className={styles.titleUnderline} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.55, ease: EASE }} style={{ transformOrigin: "left" }} aria-hidden="true" />
            </motion.h2>

            <motion.div className={styles.copyWrap} variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}>
              <span className={styles.copyLine} aria-hidden="true" />
              <p className={styles.copy}>{t("home.immersive.copy")}</p>
            </motion.div>

            <motion.div className={styles.actions} variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } }}>
              <motion.div whileHover={reduced ? {} : { y: -2 }} whileTap={{ scale: 0.98 }} transition={spring.snappy}>
                <Link to="/about" className={styles.primaryBtn} aria-label={t("home.immersive.primaryBtn")}>
                  {t("home.immersive.primaryBtn")} <span className={styles.btnArrow}>→</span>
                </Link>
              </motion.div>
              <Link to="/restore" className={styles.ghostBtn} aria-label={t("home.immersive.ghostBtn")}>
                {t("home.immersive.ghostBtn")} <span>↗</span>
              </Link>
            </motion.div>

            {/* details — premium mini cards with icons */}
            <motion.div className={styles.detailsGrid} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } }}>
              <div className={styles.detailCard}>
                <span className={styles.detailIcon} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                </span>
                <div>
                  <strong>{t("home.immersive.detail1Title")}</strong>
                  <span>{t("home.immersive.detail1Sub")}</span>
                </div>
              </div>
              <div className={styles.detailCard}>
                <span className={styles.detailIcon} aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </span>
                <div>
                  <strong>{t("home.immersive.detail2Title")}</strong>
                  <span>{t("home.immersive.detail2Sub")}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div className={styles.badge} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.65, ease: EASE }} whileHover={reduced ? {} : { y: -2, scale: 1.02 }}>
            <span className={styles.badgeDot} />{t("home.immersive.badge")}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default SomaImmersive;
