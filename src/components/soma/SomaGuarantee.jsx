import React from "react";
import styles from "./SomaGuarantee.module.css";
import { motion } from "framer-motion";

const SomaGuarantee = () => {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <motion.div className={styles.card} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className={styles.left}>
            <span className={styles.eyebrow}>Our promise — no tricks</span>
            <h3 className={styles.title}>Come as you are.<br /><em>Leave more yourself.</em></h3>
            <ul className={styles.list}>
              <li><strong>Pause anytime</strong> — membership holds, history kept</li>
              <li><strong>Transparent</strong> — VAT included, no hidden fees</li>
              <li><strong>Respectful</strong> — medical clearance, 12 max, hands-on only with consent</li>
              <li><strong>Real</strong> — no performative wellness, just honest practice</li>
            </ul>
          </div>
          <div className={styles.right}>
            <div className={styles.metric}><span>7</span><em>days Discovery</em><p>Try before you commit — 3,000 KES</p></div>
            <div className={styles.metric}><span>12</span><em>max per class</em><p>So you are seen, adjusted, held</p></div>
            <div className={styles.metric}><span>19%</span><em>founding saving</em><p>Held 12 months for first 100</p></div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
export default SomaGuarantee;
