import React from "react";
import { motion } from "framer-motion";
import styles from "./SomaPageHeader.module.css";
import { EASE, usePrefersReducedMotion } from "../../lib/motion";

const SomaPageHeader = ({ eyebrow, title, subtitle, image, align = "left" }) => {
  const reduced = usePrefersReducedMotion();
  return (
    <header className={styles.header}>
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />
      <motion.div className={styles.orbital} aria-hidden="true" animate={reduced ? {} : { rotate: [0, 2, 0] }} transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }} />

      <div className={styles.inner}>
        <motion.div
          className={styles.copy}
          style={{ textAlign: align }}
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.10, delayChildren: reduced ? 0 : 0.12 } } }}
        >
          <motion.span
            className={styles.eyebrow}
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } }}
          >
            <motion.span className={styles.eyebrowLine} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.8, ease: EASE }} style={{ transformOrigin: "left" }} aria-hidden="true" />
            <span className={styles.eyebrowDot} />
            {eyebrow}
          </motion.span>

          <motion.h1
            className={styles.title}
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}
            dangerouslySetInnerHTML={{ __html: title }}
          />

          {subtitle && (
            <motion.p
              className={styles.sub}
              variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
            >
              {subtitle}
            </motion.p>
          )}
        </motion.div>

        {image && (
          <motion.div
            className={styles.visual}
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.85, delay: 0.22, ease: EASE }}
          >
            <motion.div
              className={styles.imageWrap}
              initial={reduced ? { clipPath: "inset(0% 0 0 0)" } : { clipPath: "inset(14% 0 0 0)" }}
              animate={{ clipPath: "inset(0% 0 0 0)" }}
              transition={{ duration: 1.0, ease: EASE }}
              whileHover={reduced ? {} : { y: -4 }}
            >
              <motion.img
                src={image}
                alt=""
                loading="eager"
                decoding="async"
                initial={reduced ? { scale: 1 } : { scale: 1.08 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.3, ease: EASE }}
              />
              <div className={styles.imageOverlay} aria-hidden="true" />
              <div className={styles.ring} aria-hidden="true" />
              <div className={styles.imageHighlight} aria-hidden="true" />
            </motion.div>
          </motion.div>
        )}
      </div>

      <motion.div
        className={styles.divider}
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6, ease: EASE }}
      >
        <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.9, delay: 0.7, ease: EASE }} style={{ transformOrigin: "right" }} />
        <em>SOMA</em>
        <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.9, delay: 0.7, ease: EASE }} style={{ transformOrigin: "left" }} />
      </motion.div>
    </header>
  );
};

export default SomaPageHeader;
