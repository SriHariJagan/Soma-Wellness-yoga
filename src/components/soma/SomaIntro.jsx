import React from "react";
import { motion } from "framer-motion";
import { EASE } from "../../lib/motion";
import styles from "./SomaIntro.module.css";

const SomaIntro = () => {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.grid}>
          <motion.div
            className={styles.copy}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <span className={styles.eyebrow}>Our philosophy</span>
            <h2 className={styles.title}>
              Wellness is not a<br />
              <em>performance.</em><br />
              It is a <em>return.</em>
            </h2>
            <p className={styles.lead}>
              Soma is a space to come back — to breath, to body, to presence. We honor lineage without rigidity, modern science without noise, and luxury without distance.
            </p>
            <p className={styles.body}>
              Every detail — light, linen, wood, silence — is considered so your nervous system can exhale. No mirrors demanding perfection. No hustle disguised as healing. Just honest practice, held with care.
            </p>
            <div className={styles.stats}>
              <div><span>—</span><strong>Small groups</strong> <em>so you are seen</em></div>
              <div><span>—</span><strong>Conscious teachers</strong> <em>rooted in lineage</em></div>
              <div><span>—</span><strong>Premium, calm, human</strong> <em>always</em></div>
            </div>
          </motion.div>

          <motion.div
            className={styles.visual}
            initial={{ opacity: 0, clipPath: "inset(12% 0 0 0)", scale: 0.98 }}
            whileInView={{ opacity: 1, clipPath: "inset(0% 0 0 0)", scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: EASE }}
            whileHover={{ y: -4 }}
          >
            <div className={styles.imageWrap}>
              <motion.img
                src="https://images.unsplash.com/photo-1528715471578-2e5b6c0bb37a?q=80&w=900&auto=format&fit=crop"
                alt="Attractive woman in graceful yoga stretch — premium wellness at Soma, Nairobi"
                width="900"
                height="1100"
                loading="lazy"
                decoding="async"
                initial={{ scale: 1.06 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, ease: EASE }}
              />
              <div className={styles.caption}>
                <span>01 — The Soma way</span>
                <p>Soft strength. Warm light. A space that lets you arrive.</p>
              </div>
            </div>
            <div className={styles.accent} aria-hidden="true" />
          </motion.div>
        </div>

        <div className={styles.divider} aria-hidden="true">
          <span />
          <em>SOMA</em>
          <span />
        </div>
      </div>
    </section>
  );
};

export default SomaIntro;
