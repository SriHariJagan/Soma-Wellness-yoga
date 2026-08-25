import React from "react";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "../../lib/motion";
import styles from "./SomaLoader.module.css";

const SomaLoader = ({ compact = false }) => {
  const reduced = usePrefersReducedMotion();

  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ""}`} role="status" aria-label="Loading Soma Wellness" aria-live="polite">
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.ringBg} aria-hidden="true" />
      <div className={styles.ringBg2} aria-hidden="true" />

      <motion.div
        className={styles.center}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo mark */}
        <div className={styles.logoBox}>
          {/* outer rotating ring */}
          {!reduced && (
            <motion.svg className={styles.outerRing} width="160" height="160" viewBox="0 0 160 160" aria-hidden="true">
              <motion.circle
                cx="80" cy="80" r="72"
                fill="none"
                stroke="rgba(46,125,91,0.13)"
                strokeWidth="1"
                strokeDasharray="6 10"
                strokeLinecap="round"
                animate={{ rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                style={{ originX: "50%", originY: "50%" }}
              />
              <motion.circle
                cx="80" cy="80" r="58"
                fill="none"
                stroke="rgba(244,180,0,0.16)"
                strokeWidth="1"
                strokeDasharray="3 8"
                animate={{ rotate: -360 }}
                transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                style={{ originX: "50%", originY: "50%" }}
              />
            </motion.svg>
          )}

          {/* Logo mark */}
          <motion.div
            className={styles.mark}
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <img src="/images/soma/logo.png" alt="Soma Wellness" width="110" height="110" style={{ objectFit: "contain" }} />
          </motion.div>

          {/* orbiting dots */}
          {!reduced && (
            <>
              <motion.span
                className={`${styles.orbitDot} ${styles.dotGold}`}
                animate={{ rotate: 360 }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "linear" }}
                aria-hidden="true"
              />
              <motion.span
                className={`${styles.orbitDot} ${styles.dotSage}`}
                animate={{ rotate: -360 }}
                transition={{ duration: 4.6, repeat: Infinity, ease: "linear" }}
                aria-hidden="true"
              />
            </>
          )}
        </div>

        {/* Wordmark */}
        <motion.div
          className={styles.wordmark}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.07, delayChildren: 0.25 } },
          }}
        >
          <motion.div className={styles.somaRow} variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
            {["S", "O", "M", "A"].map((l, i) => (
              <motion.span
                key={l + i}
                className={styles.somaLetter}
                variants={{
                  hidden: { opacity: 0, y: 14, filter: "blur(6px)" },
                  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
                }}
              >
                {l}
              </motion.span>
            ))}
          </motion.div>

          <motion.div
            className={styles.wellness}
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}
          >
            WELLNESS<span>·</span>NAIROBI
          </motion.div>

          <motion.div
            className={styles.tagline}
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.6, delay: 0.2 } } }}
          >
            Return to your <em>center</em>
          </motion.div>
        </motion.div>

        {/* Progress shimmer */}
        <div className={styles.progressWrap} aria-hidden="true">
          <div className={styles.progressTrack}>
            {!reduced ? (
              <motion.div
                className={styles.progressBar}
                initial={{ x: "-100%" }}
                animate={{ x: "200%" }}
                transition={{ duration: 1.2, repeat: Infinity, ease: [0.22, 1, 0.36, 1], repeatDelay: 0.2 }}
              />
            ) : (
              <div className={styles.progressBarStatic} />
            )}
          </div>
          <div className={styles.dots} aria-hidden="true">
            <motion.span animate={reduced ? undefined : { scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 0.9, repeat: Infinity, delay: 0 }} className={styles.dot} />
            <motion.span animate={reduced ? undefined : { scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 0.9, repeat: Infinity, delay: 0.15 }} className={styles.dot} />
            <motion.span animate={reduced ? undefined : { scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 0.9, repeat: Infinity, delay: 0.3 }} className={styles.dot} />
          </div>
        </div>

        {!compact && (
          <motion.p
            className={styles.hint}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            Spring Valley · Yoga · Therapy · Meditation
          </motion.p>
        )}
      </motion.div>

      <motion.div
        className={styles.footer}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        aria-hidden="true"
      >
        <span>Rebalance</span><span>·</span><span>Renew</span><span>·</span><span>Restore</span><span>·</span><span>Reconnect</span>
      </motion.div>
    </div>
  );
};

export default SomaLoader;
