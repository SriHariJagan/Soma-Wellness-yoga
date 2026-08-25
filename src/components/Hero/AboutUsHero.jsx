import React from "react";
import { motion } from "framer-motion";
import { EASE, usePrefersReducedMotion } from "../../lib/motion";
import "./AboutUsHero.css";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const AboutUsHero = () => {
  const reduced = usePrefersReducedMotion();
  return (
    <section className="hero">
      <div className="hero-image" />
      <div className="hero-scrim" />
      {!reduced && (
        <motion.div
          className="hero-mesh"
          animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <motion.div className="hero-orb hero-orb--a" animate={reduced ? undefined : { y: [0, -24, 0], opacity: [0.5, 0.8, 0.5] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="hero-orb hero-orb--b" animate={reduced ? undefined : { y: [0, 20, 0], opacity: [0.4, 0.7, 0.4] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }} />

      <div className="overlay">
        <motion.div className="content center-content" variants={container} initial="hidden" animate="visible">
          <motion.span className="hero-eyebrow" variants={item}>
            <span className="hero-eyebrow-dot" /> Pragya Yoga Alliance
          </motion.span>
          <motion.h1 variants={item}>
            <span className="hero-title">About Us</span>
          </motion.h1>
          <motion.p className="hero-lead" variants={item}>
            Discover balance, mindfulness, and holistic wellness with our yoga community.
          </motion.p>
        </motion.div>
      </div>
      {!reduced && (
        <motion.div className="hero-cue" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} aria-hidden="true">
          <motion.span animate={{ y: [0, 8, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }} />
        </motion.div>
      )}
    </section>
  );
};

export default AboutUsHero;
