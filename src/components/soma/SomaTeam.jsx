import React from "react";
import { motion } from "framer-motion";
import styles from "./SomaTeam.module.css";
import { EASE, spring, usePrefersReducedMotion } from "../../lib/motion";

const team = [
  { name: "Amina J.", role: "Lead — Yoga Therapy & Breath", cred: "Yoga Alliance E-RYT 500 · 12 yrs", img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=600&auto=format&fit=crop", accent: "Therapy, prenatal, seniors" },
  { name: "Daniel K.", role: "Movement & Strength", cred: "Sports Science · Vinyasa", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=600&auto=format&fit=crop", accent: "Power, mobility, corporate" },
  { name: "Zawadi M.", role: "Meditation & Nidra", cred: "Mindfulness · Sound", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=600&auto=format&fit=crop", accent: "Rest, restore, Acacia" },
  { name: "Leah W.", role: "Children & Family", cred: "Pediatric Yoga · 8 yrs", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=600&auto=format&fit=crop", accent: "Young 5-17, Family" },
];

const SomaTeam = () => {
  const reduced = usePrefersReducedMotion();
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
            Conscious teachers, real credentials
            <motion.span className={styles.eyebrowLine} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }} style={{ transformOrigin: "left" }} aria-hidden="true" />
          </span>
          <h2 className={styles.title}>
            You are <em>held</em> by lineage, not performance.
            <motion.span className={styles.titleUnderline} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.85, delay: 0.4, ease: EASE }} style={{ transformOrigin: "left" }} aria-hidden="true" />
          </h2>
          <p className={styles.sub}>Small groups (12 max), hands-on adjustments, medical clearance respected. Every teacher teaches from lived practice.</p>
        </motion.div>

        <motion.div
          className={styles.grid}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.09, delayChildren: reduced ? 0 : 0.16 } } }}
        >
          {team.map((t) => (
            <motion.div
              key={t.name}
              className={styles.card}
              variants={{
                hidden: { opacity: 0, y: 22, scale: 0.97, filter: reduced ? "blur(0px)" : "blur(6px)" },
                visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.6, ease: EASE } },
              }}
              whileHover={reduced ? {} : { y: -7, scale: 1.015, transition: spring.snappy }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={styles.imgWrap}>
                <motion.img
                  src={t.img}
                  alt={`${t.name} — ${t.role}`}
                  loading="lazy"
                  width="600"
                  height="720"
                  whileHover={reduced ? {} : { scale: 1.06 }}
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
                  {t.accent}
                </motion.span>
                <span className={styles.cardSheen} aria-hidden="true" />
              </div>
              <div className={styles.body}>
                <div className={styles.name}>{t.name}</div>
                <div className={styles.role}>{t.role}</div>
                <div className={styles.cred}>{t.cred}</div>
                <motion.span className={styles.bodyLine} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3, ease: EASE }} style={{ transformOrigin: "left" }} aria-hidden="true" />
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className={styles.footer}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
        >
          <span>✓ Yoga Alliance lineage</span><span className={styles.footerDot} aria-hidden="true">·</span><span>✓ 18+ years combined</span><span className={styles.footerDot} aria-hidden="true">·</span><span>✓ Medical-aware, Nairobi-rooted</span>
        </motion.div>
      </div>
    </section>
  );
};
export default SomaTeam;
