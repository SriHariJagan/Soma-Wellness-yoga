import React from "react";
import { motion } from "framer-motion";
import styles from "./SomaTeam.module.css";

const team = [
  { name: "Amina J.", role: "Lead — Yoga Therapy & Breath", cred: "Yoga Alliance E-RYT 500 · 12 yrs", img: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=400&auto=format&fit=crop", accent: "Therapy, prenatal, seniors" },
  { name: "Daniel K.", role: "Movement & Strength", cred: "Sports Science · Vinyasa", img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop", accent: "Power, mobility, corporate" },
  { name: "Zawadi M.", role: "Meditation & Nidra", cred: "Mindfulness · Sound", img: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop", accent: "Rest, restore, Acacia" },
  { name: "Leah W.", role: "Children & Family", cred: "Pediatric Yoga · 8 yrs", img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop", accent: "Young 5-17, Family" },
];

const SomaTeam = () => {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <span className={styles.eyebrow}>Conscious teachers, real credentials</span>
          <h2 className={styles.title}>You are <em>held</em> by lineage, not performance.</h2>
          <p className={styles.sub}>Small groups (12 max), hands-on adjustments, medical clearance respected. Every teacher teaches from lived practice.</p>
        </div>
        <div className={styles.grid}>
          {team.map((t, i) => (
            <motion.div key={t.name} className={styles.card} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }} whileHover={{ y: -4 }}>
              <div className={styles.imgWrap}>
                <img src={t.img} alt={`${t.name} — ${t.role}`} loading="lazy" width="400" height="480" />
                <span className={styles.badge}>{t.accent}</span>
              </div>
              <div className={styles.body}>
                <div className={styles.name}>{t.name}</div>
                <div className={styles.role}>{t.role}</div>
                <div className={styles.cred}>{t.cred}</div>
              </div>
            </motion.div>
          ))}
        </div>
        <div className={styles.footer}>
          <span>✓ Yoga Alliance lineage</span><span>·</span><span>✓ 18+ years combined</span><span>·</span><span>✓ Medical-aware, Nairobi-rooted</span>
        </div>
      </div>
    </section>
  );
};
export default SomaTeam;
