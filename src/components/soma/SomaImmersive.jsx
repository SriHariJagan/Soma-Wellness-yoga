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
  const bgY = useTransform(scrollYProgress, [0, 1], [reduced ? 0 : 0, reduced ? 0 : -28]);
  const bgScale = useTransform(scrollYProgress, [0, 1], [reduced ? 1 : 1.03, reduced ? 1 : 1]);
  const bgYSpring = useSpring(bgY, { stiffness: 90, damping: 22 });
  const bgScaleSpring = useSpring(bgScale, { stiffness: 90, damping: 22 });
  const cardY = useTransform(scrollYProgress, [0, 1], [reduced ? 0 : 8, reduced ? 0 : -6]);

  return (
    <section ref={ref} className={styles.section}>
      <motion.div className={styles.bg} aria-hidden="true" style={{ y: bgYSpring, scale: bgScaleSpring }}>
        <motion.img
          src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1920&auto=format&fit=crop&fm=webp"
          alt={t("home.immersive.alt")}
          width="1920"
          height="1080"
          loading="eager"
          decoding="async"
          fetchPriority="high"
          initial={reduced ? { scale: 1 } : { scale: 1.03 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE }}
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
          initial={reduced ? { opacity: 1 } : { opacity: 0, y: 16 }}
          whileInView={reduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2, margin: "0px" }}
          transition={{ duration: 0.48, ease: EASE }}
        >
          <div className={styles.cardSheen} aria-hidden="true" />
          <motion.span className={styles.cardAccent} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.55, delay: 0.12, ease: EASE }} style={{ transformOrigin: "left" }} aria-hidden="true" />

          {/* watermark SOMA faint behind title */}
          <span className={styles.cardWatermark} aria-hidden="true">SOMA</span>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.15 }} variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.06, delayChildren: reduced ? 0 : 0.08 } } }}>
            {/* eyebrow + small number */}
            <motion.div className={styles.cardTop} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } } }}>
              <span className={styles.eyebrow}>
                <span className={styles.eyebrowDot} />{t("home.immersive.eyebrow")}
              </span>
              <span className={styles.cardNumber}>{t("home.immersive.cardNumber")}</span>
            </motion.div>

            <motion.h2 className={styles.title} variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: EASE } } }}>
              <span className={styles.titleInline}>
                <span>{t("home.immersive.titleLight")}</span> <span>{t("home.immersive.titleWood")}</span> <em>{t("home.immersive.titleSilence")}</em>
              </span>
              <motion.span className={styles.titleUnderline} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.18, ease: EASE }} style={{ transformOrigin: "left" }} aria-hidden="true" />
            </motion.h2>

            <motion.div className={styles.copyWrap} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE } } }}>
              <span className={styles.copyLine} aria-hidden="true" />
              <p className={styles.copy}>{t("home.immersive.copy")}</p>
            </motion.div>

            <motion.div className={styles.actions} variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } } }}>
              <motion.div whileHover={reduced ? {} : { y: -2 }} whileTap={{ scale: 0.98 }} transition={spring.snappy}>
                <Link to="/about" className={styles.primaryBtn} aria-label={t("home.immersive.primaryBtn")}>
                  {t("home.immersive.primaryBtn")} <span className={styles.btnArrow}>→</span>
                </Link>
              </motion.div>
              <Link to="/restore" className={styles.ghostBtn} aria-label={t("home.immersive.ghostBtn")}>
                {t("home.immersive.ghostBtn")} <span>↗</span>
              </Link>
            </motion.div>

            {/* details — premium mini cards with attractive icons & premium typography */}
            <motion.div className={styles.detailsGrid} variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } } }}>
              <div className={styles.detailCard}>
                <span className={`${styles.detailIcon} ${styles.detailIconLeaf}`} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M5.8 16.6h12.4c.55 0 1 .35 1.05.9l.35 1.55c.06.3-.16.6-.47.6H5.05c-.3 0-.53-.3-.47-.6l.35-1.55c.05-.55.5-.9 1.05-.9Z" fill="white" fillOpacity="0.96" stroke="white" strokeWidth="0.7" strokeLinejoin="round"/>
                    <path d="M7.2 17.8h9.6M7 18.9h9.9" stroke="#8B6A3A" strokeWidth="0.55" strokeLinecap="round" opacity="0.22"/>
                    <ellipse cx="9.2" cy="13.2" rx="2.1" ry="1.45" fill="white" fillOpacity="0.92" stroke="white" strokeWidth="0.7"/>
                    <path d="M12.1 13.5c0-3.2 1.55-5.45 3.65-7.05 1.55 1.55 1.8 4.15-.35 6.05-.7.62-1.55 1.07-2.45 1.32-.28-.08-.57-.19-.85-.32Z" fill="white" fillOpacity="0.98" stroke="white" strokeWidth="0.85" strokeLinejoin="round"/>
                    <path d="M12.1 13.5V7.2" stroke="white" strokeWidth="1.15" strokeLinecap="round"/>
                    <path d="M12.1 10.2c-.75-.55-1.55-.95-2.35-1.2" stroke="white" strokeWidth="0.85" strokeLinecap="round" opacity="0.95"/>
                  </svg>
                </span>
                <div className={styles.detailText}>
                  <strong className={styles.detailTitle}>{t("home.immersive.detail1Title")}</strong>
                  <span className={styles.detailSub}>{t("home.immersive.detail1Sub")}</span>
                </div>
              </div>
              <div className={styles.detailCard}>
                <span className={`${styles.detailIcon} ${styles.detailIconSound}`} aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 5L6.8 9H3.2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h3.6L11 19V5Z" fill="white" fillOpacity="0.94" stroke="white" strokeWidth="1.2" strokeLinejoin="round"/><path d="M14.6 9.1a3.8 3.8 0 0 1 0 5.8M17.1 7a6.6 6.6 0 0 1 0 10" stroke="white" strokeWidth="1.45" strokeLinecap="round" opacity="0.95"/><path d="M19.2 5.2a9.2 9.2 0 0 1 0 13.6" stroke="white" strokeWidth="1.3" strokeLinecap="round" opacity="0.42"/></svg>
                </span>
                <div className={styles.detailText}>
                  <strong className={styles.detailTitle}>{t("home.immersive.detail2Title")}</strong>
                  <span className={styles.detailSub}>{t("home.immersive.detail2Sub")}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          <motion.div className={styles.badge} initial={{ opacity: 0, y: 6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.38, delay: 0.22, ease: EASE }} whileHover={reduced ? {} : { y: -2, scale: 1.02 }}>
            <span className={styles.badgeDot} />{t("home.immersive.badge")}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default SomaImmersive;
