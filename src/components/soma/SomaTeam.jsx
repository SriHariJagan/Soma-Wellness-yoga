import React from "react";
import { motion } from "framer-motion";
import styles from "./SomaTeam.module.css";
import { EASE, usePrefersReducedMotion } from "../../lib/motion";
import { useTranslation } from "react-i18next";

const LEADERS = [
  { id: "kapil", img: "/images/team/Kapil.png" },
  { id: "rebecca", img: "/images/team/Rebecca.png" },
];

const SomaTeam = () => {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();

  const getArray = (key) => {
    const v = t(key, { returnObjects: true });
    return Array.isArray(v) ? v : [];
  };

  return (
    <section className={styles.section}>
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />
      <motion.div className={styles.orbital} aria-hidden="true" animate={reduced ? {} : { rotate: [0, 3, 0]}} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} />

      <div className={styles.inner}>
        <motion.div
          className={styles.head}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            {t("home.team.eyebrow")}
            <motion.span className={styles.eyebrowLine} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }} style={{ transformOrigin: "left" }} aria-hidden="true" />
          </span>
          <h2 className={styles.title}>
            {t("home.team.titleBefore")} <em>{t("home.team.titleEm")}</em> {t("home.team.titleAfter")}
            <motion.span className={styles.titleUnderline} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.85, delay: 0.4, ease: EASE }} style={{ transformOrigin: "left" }} aria-hidden="true" />
          </h2>
          <p className={styles.sub}>{t("home.team.sub")}</p>
        </motion.div>

        <motion.div
          className={styles.leadersGrid}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.12, delayChildren: reduced ? 0 : 0.1 } } }}
        >
          {LEADERS.map((leader) => {
            const base = `home.team.leaders.${leader.id}`;
            const name = t(`${base}.name`);
            const role = t(`${base}.role`);
            const cred = t(`${base}.cred`);
            const accent = t(`${base}.accent`);
            const bio = getArray(`${base}.bio`);
            const highlights = getArray(`${base}.highlights`);
            return (
              <motion.article
                key={leader.id}
                className={`${styles.card} ${styles.leaderCard}`}
                variants={{
                  hidden: { opacity: 0, y: 24, scale: 0.98, filter: reduced ? "blur(0px)" : "blur(6px)" },
                  visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.65, ease: EASE } },
                }}
                whileHover={reduced ? {} : { y: -6, transition: { duration: 0.3, ease: EASE } }}
              >
                <div className={`${styles.imgWrap} ${styles.leaderImg}`}>
                  <motion.img
                    src={leader.img}
                    alt={t("home.team.alt", { name, role })}
                    loading="lazy"
                    width="600"
                    height="720"
                    whileHover={reduced ? {} : { scale: 1.04 }}
                    transition={{ duration: 0.7, ease: EASE }}
                  />
                  <div className={styles.imgOverlay} aria-hidden="true" />
                  <div className={styles.imgRing} aria-hidden="true" />
                  <motion.span
                    className={styles.badge}
                    initial={{ opacity: 0, y: 8 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
                  >
                    {accent}
                  </motion.span>
                  <span className={styles.cardSheen} aria-hidden="true" />
                </div>
                <div className={`${styles.body} ${styles.leaderBody}`}>
                  <div className={styles.name}>{name}</div>
                  <div className={styles.role}>{role}</div>
                  <div className={styles.cred}>{cred}</div>
                  <span className={styles.bodyLine} aria-hidden="true" />
                  <div className={styles.bio}>
                    {bio.map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                  {highlights.length > 0 && (
                    <div className={styles.highlights}>
                      {highlights.map((h) => (
                        <span key={h} className={styles.pill}>✓ {h}</span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.article>
            );
          })}
        </motion.div>

        <motion.div
          className={styles.footer}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
        >
          <span>✓ {t("home.team.footer.yogaAlliance")}</span><span className={styles.footerDot} aria-hidden="true">·</span><span>✓ {t("home.team.footer.years")}</span><span className={styles.footerDot} aria-hidden="true">·</span><span>✓ {t("home.team.footer.medical")}</span>
        </motion.div>
      </div>
    </section>
  );
};
export default SomaTeam;
