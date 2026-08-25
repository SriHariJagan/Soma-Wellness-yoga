import React from "react";
import { motion, useScroll, useSpring } from "framer-motion";
import styles from "./ScrollProgress.module.css";

/**
 * ScrollProgress — a premium gradient bar pinned to the top of the viewport
 * that fills as the user scrolls the page. Scroll-linked (no re-renders),
 * smoothed with a spring for a buttery feel.
 */
const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className={styles.bar}
      style={{ scaleX }}
      aria-hidden="true"
    />
  );
};

export default ScrollProgress;
