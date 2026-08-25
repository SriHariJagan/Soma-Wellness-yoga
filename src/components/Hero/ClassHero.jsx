// ClassesHero.jsx
import React from 'react';
import { motion } from 'framer-motion';
import { EASE, spring, usePrefersReducedMotion } from '../../lib/motion';
import { scrollToSection } from '../../hooks/useScrollToSection';
import './ClassHero.css';

const scrollToSchedule = (e) => {
  e.preventDefault();
  scrollToSection('offline-schedule');
};

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.13, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const ClassHero = () => {
  const reduced = usePrefersReducedMotion();
  return (
    <section className="classes-hero">
      <div className="ch-image" />
      <div className="ch-scrim" />
      {!reduced && (
        <motion.div className="ch-mesh" animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }} transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }} />
      )}
      <motion.div className="ch-orb ch-orb--a" animate={reduced ? undefined : { y: [0, -22, 0], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="ch-orb ch-orb--b" animate={reduced ? undefined : { y: [0, 18, 0], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }} />

      <div className="hero-overlay">
        <motion.div className="hero-content" variants={container} initial="hidden" animate="visible">
          <motion.span className="ch-eyebrow" variants={item}>
            <span className="ch-eyebrow-dot" /> All Levels Welcome
          </motion.span>
          <motion.h1 className="hero-title" variants={item}>Our Yoga Classes</motion.h1>
          <motion.p className="hero-subtitle" variants={item}>
            Explore pathways to balance, strength, and inner peace with guided sessions for all levels.
          </motion.p>
          <motion.div variants={item}>
            <motion.a href="#offline-schedule" className="hero-cta" onClick={scrollToSchedule} whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }} transition={spring.snappy}>
              View Schedule
              <span className="ch-cta-arrow">→</span>
            </motion.a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default ClassHero;
