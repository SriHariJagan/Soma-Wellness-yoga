import React from "react";
import styles from "./SomaGuarantee.module.css";
import { motion } from "framer-motion";
import { EASE, usePrefersReducedMotion } from "../../lib/motion";

const list = [
  { strong: "Pause anytime", text: "membership holds, history kept" },
  { strong: "Transparent", text: "VAT included, no hidden fees" },
  { strong: "Respectful", text: "medical clearance, 12 max, hands-on only with consent" },
  { strong: "Real", text: "no performative wellness, just honest practice" },
];

const metrics = [
  { n: "7", em: "days Discovery", p: "Try before you commit — 3,000 KES" },
  { n: "12", em: "max per class", p: "So you are seen, adjusted, held" },
  { n: "19%", em: "founding saving", p: "Held 12 months for first 100" },
];

const SomaGuarantee = () => {
  const reduced = usePrefersReducedMotion();
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
              Our promise — no tricks
            </span>
            <h3 className={styles.title}>
              Come as you are.<br />
              <em>Leave more yourself.</em>
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
                key={m.n}
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
