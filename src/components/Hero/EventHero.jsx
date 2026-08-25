import React from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { EASE, spring, usePrefersReducedMotion } from "../../lib/motion";
import { scrollToSection } from "../../hooks/useScrollToSection";
import styles from "./EventHero.module.css";

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const item = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

const EventHero = () => {
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();

  const handleRegister = (e) => {
    e.preventDefault();
    const isAuth = !!localStorage.getItem("token");
    const dest = "/studentdashboard?tab=events";
    if (isAuth) {
      navigate(dest);
    } else {
      navigate("/login?redirectTo=" + encodeURIComponent(dest));
    }
  };

  // "View All Events" scrolls down to the calendar on this same page.
  const handleViewAll = (e) => {
    e.preventDefault();
    scrollToSection("event-booking");
  };

  return (
    <section className={styles.hero} id="event-hero">
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
            <span className={styles.eyebrowDot} /> Workshops · Retreats · Gatherings
          </motion.span>
          <motion.h1 className={styles.title} variants={item}>Upcoming Yoga Events</motion.h1>
          <motion.p className={styles.desc} variants={item}>
            Join Pragya Yoga for immersive workshops, retreats, and community
            gatherings. Our events bring together practitioners from around the
            world to celebrate authentic Indian yoga, mindfulness, and holistic
            wellness.
          </motion.p>
          <motion.p className={styles.desc} variants={item}>
            Whether you’re seeking deeper practice, spiritual connection, or
            simply a rejuvenating experience, our events are designed to inspire
            and transform.
          </motion.p>
          <motion.div className={styles.actions} variants={item}>
            <motion.a href="#event-booking" className={styles.btnPrimary} onClick={handleViewAll} whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }} transition={spring.snappy}>View All Events →</motion.a>
            <motion.a href="#event-booking" className={styles.btnOutline} onClick={handleRegister} whileHover={{ y: -3 }} whileTap={{ scale: 0.96 }} transition={spring.snappy}>Register Now</motion.a>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default EventHero;
