import React from "react";
import { motion } from "framer-motion";
import { EASE, usePrefersReducedMotion } from "../../lib/motion";
import styles from "./TeacherHero.module.css";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const TeacherHero = () => {
  const reduced = usePrefersReducedMotion();
  return (
    <section className={styles.hero} id="teacher-hero">
      <div className={styles.image} />
      <div className={styles.scrim} />
      {!reduced && (
        <motion.div className={styles.mesh} animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }} transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }} />
      )}
      <motion.div className={`${styles.orb} ${styles.orbA}`} animate={reduced ? undefined : { y: [0, -22, 0], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className={`${styles.orb} ${styles.orbB}`} animate={reduced ? undefined : { y: [0, 18, 0], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }} />

      <div className={styles.overlay}>
        <motion.div className={styles.content} variants={container} initial="hidden" animate="visible">
          <motion.span className={styles.eyebrow} variants={item}>
            <span className={styles.eyebrowDot} /> Yoga Alliance Certified · 200 Hours
          </motion.span>
          <motion.h1 className={styles.title} variants={item}>200 Hours Yoga Teacher Training Course</motion.h1>
          <motion.p className={styles.desc} variants={item}>
            Our <strong>200‑Hour Yoga Teacher Training Course (YTTC)</strong> at Pragya Yoga
            is designed for those who wish to deepen their practice, gain a thorough understanding
            of yoga philosophy, and embark on the journey of becoming a certified yoga teacher.
          </motion.p>
          <motion.p className={styles.desc} variants={item}>
            This comprehensive course is <strong>certified by Yoga Alliance</strong>, ensuring
            that our graduates are recognized globally and equipped with the knowledge and skills
            to teach yoga safely and effectively.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
};

export default TeacherHero;
