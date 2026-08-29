import React from "react";
import styles from "./SomaGuarantee.module.css";
import { motion } from "framer-motion";
import { EASE, usePrefersReducedMotion } from "../../lib/motion";
import { useTranslation } from "react-i18next";

const SomaGuarantee = () => {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();

  const list = [
    { strong: t("home.guarantee.list.pauseStrong"), text: t("home.guarantee.list.pauseText") },
    { strong: t("home.guarantee.list.transparentStrong"), text: t("home.guarantee.list.transparentText") },
    { strong: t("home.guarantee.list.respectfulStrong"), text: t("home.guarantee.list.respectfulText") },
    { strong: t("home.guarantee.list.realStrong"), text: t("home.guarantee.list.realText") },
  ];

  const metrics = [
    { n: t("home.guarantee.metrics.discoveryNum"), em: t("home.guarantee.metrics.discoveryEm"), p: t("home.guarantee.metrics.discoveryP") },
    { n: t("home.guarantee.metrics.maxNum"), em: t("home.guarantee.metrics.maxEm"), p: t("home.guarantee.metrics.maxP") },
    { n: t("home.guarantee.metrics.foundingNum"), em: t("home.guarantee.metrics.foundingEm"), p: t("home.guarantee.metrics.foundingP") },
  ];

  return (
    <section className={styles.section}>
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />
      <motion.div className={styles.orbital} aria-hidden="true" animate={reduced ? {} : { rotate: [0, 3, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />

      <div className={styles.inner}>
        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <div className={styles.cardSheen} aria-hidden="true" />
          <motion.span className={styles.cardAccent} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.35, ease: EASE }} style={{ transformOrigin: "left" }} aria-hidden="true" />

          <div className={styles.left}>
            <span className={styles.eyebrow}>
              <span className={styles.eyebrowDot} />
              {t("home.guarantee.eyebrow")}
            </span>
            <h3 className={styles.title}>
              {t("home.guarantee.titleLine1")}<br />
              <em>{t("home.guarantee.titleLine2")}</em>
              <motion.span className={styles.titleUnderline} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.5, ease: EASE }} style={{ transformOrigin: "left" }} aria-hidden="true" />
            </h3>
            <motion.ul
              className={styles.list}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.08, delayChildren: reduced ? 0 : 0.2 } } }}
            >
              {list.map((item) => (
                <motion.li
                  key={item.strong}
                  variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } } }}
                >
                  <span className={styles.check}>✓</span>
                  <span>
                    <strong>{item.strong}</strong> — {item.text}
                  </span>
                </motion.li>
              ))}
            </motion.ul>
          </div>

          <motion.div
            className={styles.right}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.09, delayChildren: reduced ? 0 : 0.3 } } }}
          >
            {metrics.map((m) => (
              <motion.div
                key={m.em}
                className={styles.metric}
                variants={{ hidden: { opacity: 0, y: 16, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE } } }}
                whileHover={reduced ? {} : { y: -3, scale: 1.015 }}
                transition={{ type: "spring", stiffness: 300, damping: 24 }}
              >
                <span className={styles.metricNum}>{m.n}</span>
                <em>{m.em}</em>
                <p>{m.p}</p>
                <span className={styles.metricSheen} aria-hidden="true" />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default SomaGuarantee;
