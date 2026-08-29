import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import styles from "./SomaCTA.module.css";
import { EASE, spring, usePrefersReducedMotion } from "../../lib/motion";
import { useTranslation } from "react-i18next";

const SomaCTA = () => {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();

  // magnetic for primary
  const [mx, setMx] = React.useState(0);
  const [my, setMy] = React.useState(0);
  const onMove = (e) => {
    if (reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    setMx((e.clientX - (r.left + r.width / 2)) * 0.15);
    setMy((e.clientY - (r.top + r.height / 2)) * 0.18);
  };
  const onLeave = () => { setMx(0); setMy(0); };

  return (
    <section className={styles.section}>
      <div className={styles.bg} aria-hidden="true" />
      <motion.div className={styles.bgGlow} aria-hidden="true" animate={reduced ? {} : { scale: [1, 1.04, 1], opacity: [0.9, 1, 0.9] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} />
      <div className={styles.grain} aria-hidden="true" />

      <motion.div className={styles.rings} aria-hidden="true">
        <motion.span animate={reduced ? {} : { rotate: [0, 4, 0], scale: [1, 1.02, 1] }} transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }} />
        <motion.span animate={reduced ? {} : { rotate: [0, -3, 0] }} transition={{ duration: 14, repeat: Infinity, ease: "easeInOut", delay: 0.6 }} />
        <motion.span animate={reduced ? {} : { scale: [1, 1.08, 1] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }} />
      </motion.div>

      <div className={styles.inner}>
        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <div className={styles.cardSheen} aria-hidden="true" />
          <motion.span className={styles.cardAccent} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.85, delay: 0.35, ease: EASE }} style={{ transformOrigin: "center" }} aria-hidden="true" />

          <motion.span className={styles.eyebrow} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55, ease: EASE }}>
            <span className={styles.eyebrowDot} />
            {t("home.cta.eyebrow")}
          </motion.span>

          <motion.h2
            className={styles.title}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.08, ease: EASE }}
          >
            {t("home.cta.titleLine1")} <br />
            <em>{t("home.cta.titleEm")}</em>
            <motion.span className={styles.titleUnderline} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.85, delay: 0.45, ease: EASE }} style={{ transformOrigin: "center" }} aria-hidden="true" />
          </motion.h2>

          <motion.p className={styles.copy} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.16, ease: EASE }}>
            {t("home.cta.copy")}
          </motion.p>

          <motion.div className={styles.actions} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.24, ease: EASE }}>
            <motion.div onMouseMove={onMove} onMouseLeave={onLeave} style={{ x: mx, y: my }} transition={spring.snappy} whileTap={{ scale: 0.98 }}>
              <Link to="/newuser" className={styles.primary}>
                {t("home.cta.primary")} <span>—</span>
                <span className={styles.btnShine} aria-hidden="true" />
              </Link>
            </motion.div>
            <Link to="/classes" className={styles.secondary}>
              {t("home.cta.secondary")} <span>→</span>
            </Link>
          </motion.div>

          <motion.p className={styles.note} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.32, ease: EASE }}>
            {t("home.cta.note")}
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
};

export default SomaCTA;
