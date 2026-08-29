import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import styles from "./SomaPricingPreview.module.css";
import { EASE, spring, usePrefersReducedMotion } from "../../lib/motion";
import { useTranslation } from "react-i18next";

const SomaPricingPreview = () => {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();

  const memberships = [
    {
      key: "jua",
      price: "12,000",
      per: t("home.pricing.perMonth"),
      accent: false,
      badge: null,
    },
    {
      key: "amani",
      price: "18,500",
      per: t("home.pricing.perMonth"),
      accent: false,
      badge: null,
    },
    {
      key: "uzima",
      price: "28,500",
      per: t("home.pricing.perMonth"),
      accent: true,
      badge: t("home.pricing.badgeBest"),
    },
    {
      key: "family",
      price: "35,000",
      per: t("home.pricing.perMonth"),
      accent: false,
      badge: null,
    },
  ];

  return (
    <section className={styles.section}>
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />
      <motion.div className={styles.orbital} aria-hidden="true" animate={reduced ? {} : { scale: [1, 1.03, 1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />

      <div className={styles.inner}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <div className={styles.headerLeft}>
            <div className={styles.eyebrow}>
              <motion.span className={styles.eyebrowLine} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }} style={{ transformOrigin: "left" }} />
              <span className={styles.eyebrowDot} />
              {t("home.pricing.eyebrow")}
            </div>
            <h2 className={styles.title}>
              {t("home.pricing.titleBefore")} <em>{t("home.pricing.titleEm")}</em>
              <motion.span className={styles.titleUnderline} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.85, delay: 0.45, ease: EASE }} style={{ transformOrigin: "left" }} aria-hidden="true" />
            </h2>
            <p className={styles.sub}>{t("home.pricing.sub")}</p>
          </div>
          <motion.div whileHover={reduced ? {} : { y: -2 }} whileTap={{ scale: 0.98 }}>
            <Link to="/classes" className={styles.viewAll} aria-label={t("home.pricing.viewAll")}>
              {t("home.pricing.viewAll")} <span>→</span>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          className={styles.grid}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.08, delayChildren: reduced ? 0 : 0.16 } } }}
        >
          {memberships.map((m, i) => {
            const name = t(`home.pricing.members.${m.key}.name`);
            const sub = t(`home.pricing.members.${m.key}.sub`);
            const features = t(`home.pricing.members.${m.key}.features`, { returnObjects: true });
            const featureList = Array.isArray(features) ? features : [];
            const tierShort = name.split(" ")[1] || name;
            return (
              <motion.div
                key={m.key}
                className={`${styles.card} ${m.accent ? styles.accent : ""}`}
                variants={{
                  hidden: { opacity: 0, y: 24, scale: 0.97, filter: reduced ? "blur(0px)" : "blur(6px)" },
                  visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.58, ease: EASE } },
                }}
                whileHover={reduced ? {} : m.accent ? { y: -10, scale: 1.025, transition: spring.snappy } : { y: -6, scale: 1.015, transition: spring.snappy }}
                whileTap={{ scale: 0.98 }}
              >
                {m.badge && (
                  <motion.span
                    className={styles.badge}
                    initial={{ scale: 0.9, opacity: 0 }}
                    whileInView={{ scale: 1, opacity: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.06, ease: EASE }}
                    animate={reduced ? {} : { boxShadow: ["0 0 0 0 rgba(244,180,0,0.0)", "0 0 0 8px rgba(244,180,0,0.10)", "0 0 0 0 rgba(244,180,0,0.0)"] }}
                    transitionShadow={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                  >
                    {m.badge}
                  </motion.span>
                )}
                <div className={styles.cardSheen} aria-hidden="true" />
                <div className={styles.cardHead}>
                  <div className={styles.cardName}>{name}</div>
                  <div className={styles.cardSub}>{sub}</div>
                  <div className={styles.price}>
                    <span>{m.price}</span>
                    <em>{m.per}</em>
                    <motion.span className={styles.priceLine} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.35 + i * 0.06, ease: EASE }} style={{ transformOrigin: "left" }} aria-hidden="true" />
                  </div>
                </div>
                <ul className={styles.features}>
                  {featureList.map((f) => (
                    <li key={f}>
                      <span className={styles.featureDot} aria-hidden="true" /> {f}
                    </li>
                  ))}
                </ul>
                <Link to="/classes" className={styles.cardCta} aria-label={t("home.pricing.explore", { tier: tierShort })}>
                  {t("home.pricing.explore", { tier: tierShort })} <span>→</span>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          className={styles.daily}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.65, delay: 0.22, ease: EASE }}
        >
          <div className={styles.dailyText}>
            <span className={styles.eyebrow} style={{ marginBottom: 8, display: "inline-flex" }}>
              <span className={styles.eyebrowDot} style={{ width: 6, height: 6 }} /> {t("home.pricing.daily.title")} — {t("home.pricing.daily.sub")}
            </span>
            <h3>{t("home.pricing.daily.heading")}</h3>
            <ul>
              {((() => { const b = t("home.pricing.daily.bullets", { returnObjects: true }); return Array.isArray(b) ? b : []; })()).map((b) => (
                <li key={b}>
                  <span className={styles.bulletDot} /> {b}
                </li>
              ))}
            </ul>
            <p className={styles.dailyNote}>{t("home.pricing.daily.included")}</p>
          </div>
          <div className={styles.dailyPrice}>
            <div className={styles.dailyPriceRow}>
              <div>
                <strong>{t("home.pricing.daily.monthly")}</strong> <span>{t("home.pricing.daily.perMonth")}</span>
              </div>
              <span className={styles.dailySep}>·</span>
              <div>
                <strong>{t("home.pricing.daily.yearly")}</strong> <span>{t("home.pricing.daily.perYear")}</span> <em>({t("home.pricing.daily.note")})</em>
              </div>
            </div>
            <div className={styles.dailyIncluded}>{t("home.pricing.daily.includedNote")}</div>
            <Link to="/classes" className={styles.dailyCta} aria-label={t("home.pricing.daily.cta")}>
              {t("home.pricing.daily.cta")} <span>→</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SomaPricingPreview;
