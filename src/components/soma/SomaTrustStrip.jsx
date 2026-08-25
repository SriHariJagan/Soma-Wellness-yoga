import React from "react";
import { motion } from "framer-motion";
import styles from "./SomaTrustStrip.module.css";

const stats = [
  { n: "300", l: "members max", s: "never crowded, always seen" },
  { n: "18+", l: "years teaching", s: "lineage + modern science" },
  { n: "4.9★", l: "community love", s: "500+ lives transformed" },
  { n: "KES 0", l: "hidden fees", s: "VAT included, no surprises" },
];

const SomaTrustStrip = () => {
  return (
    <section className={styles.strip} aria-label="Trust indicators">
      <div className={styles.inner}>
        <div className={styles.top}>
          <span className={styles.eyebrow}>Trusted, transparent, premium</span>
          <div className={styles.press}>
            <span>Featured in</span>
            <em>Business Daily</em> <em>Cosmopolitan</em> <em>Parents Kenya</em> <em>Nairobi Wellness</em>
          </div>
        </div>
        <div className={styles.grid}>
          {stats.map((s, i) => (
            <motion.div key={s.n} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className={styles.card}>
              <div className={styles.num}>{s.n}</div>
              <div className={styles.label}>{s.l}</div>
              <div className={styles.sub}>{s.s}</div>
            </motion.div>
          ))}
        </div>
        <div className={styles.badges}>
          <span className={styles.badge}>✓ Yoga Alliance lineage</span>
          <span className={styles.badge}>✓ Medical clearance respected</span>
          <span className={styles.badge}>✓ 12 max per class</span>
          <span className={styles.badge}>✓ Pause anytime</span>
          <span className={styles.badge}>✓ 12h cancellation, no tricks</span>
        </div>
      </div>
    </section>
  );
};
export default SomaTrustStrip;
