import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring, useMotionValue } from "framer-motion";
import { Link } from "react-router-dom";
import styles from "./Hero.module.css";
import { EASE, spring, usePrefersReducedMotion } from "../../lib/motion";

const Hero = () => {
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 60]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, reduced ? 0 : 30]);
  const opacity = useTransform(scrollYProgress, [0, 0.85], [1, reduced ? 1 : 0]);

  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const tiltX = useSpring(useTransform(py, [-0.5, 0.5], [5, -5]), spring.gentle);
  const tiltY = useSpring(useTransform(px, [-0.5, 0.5], [-6, 6]), spring.gentle);

  const handlePointer = (e) => {
    if (reduced) return;
    const rect = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width - 0.5);
    py.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const resetPointer = () => { px.set(0); py.set(0); };

  return (
    <motion.section ref={ref} className={styles.hero} style={{ opacity }}>
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.ring + " " + styles.ring1} aria-hidden="true" />
      <div className={styles.ring + " " + styles.ring2} aria-hidden="true" />
      <div className={styles.ring + " " + styles.ring3} aria-hidden="true" />

      <div className={styles.content}>
        <motion.div className={styles.text} style={{ y: textY }} initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } } }}>
          <motion.span className={styles.eyebrow} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}>
            <span className={styles.eyebrowDot} /> Spring Valley, Nairobi · Yoga · Therapy · Meditation
          </motion.span>

          <motion.h1 className={styles.headline} variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}>
            <motion.span variants={{ hidden: { opacity: 0, y: 32 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}>RETURN</motion.span>
            <motion.span variants={{ hidden: { opacity: 0, y: 32 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}>
              TO YOUR <em>CENTER</em>
            </motion.span>
          </motion.h1>

          <motion.p className={styles.sub} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } }}>
            A modern approach to <strong>conscious living</strong>. Yoga, breath and stillness — held in a warm, calm, premium space for every body, every season.
          </motion.p>

          <motion.div className={styles.ctaRow} variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}>
            <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} transition={spring.snappy}>
              <Link to="/classes" className={styles.primaryBtn}>
                Explore Soma
                <svg className={styles.btnArrow} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </Link>
            </motion.div>
            <Link to="/about" className={styles.secondaryBtn}>Our philosophy →</Link>
          </motion.div>

          <motion.div className={styles.secondaryNote} variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { delay: 0.6 } } }}>
            Small groups · Conscious teachers · No performative wellness
          </motion.div>

          <motion.div className={styles.meta} variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.5 } } }}>
            <div className={styles.metaItem}><span className={styles.metaNum}>500+</span><span className={styles.metaLabel}>Lives transformed</span></div>
            <span className={styles.metaSep} />
            <div className={styles.metaItem}><span className={styles.metaNum}>18 yrs</span><span className={styles.metaLabel}>In practice</span></div>
            <span className={styles.metaSep} />
            <div className={styles.metaItem}><span className={styles.metaNum}>4.9★</span><span className={styles.metaLabel}>Community rating</span></div>
          </motion.div>
        </motion.div>

        <motion.div className={styles.visual} style={{ y: imageY }} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, delay: 0.3, ease: EASE }} onPointerMove={handlePointer} onPointerLeave={resetPointer}>
          <motion.div className={styles.circleWrap} style={{ rotateX: tiltX, rotateY: tiltY, transformPerspective: 1000 }}>
            <div className={styles.circleBg} aria-hidden="true" />
            <div className={styles.imageCard}>
              <img
                src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop"
                alt="Attractive wellness practitioner in serene yoga flow — Soma Wellness Nairobi"
                width="1200"
                height="1400"
                fetchPriority="high"
                decoding="async"
                loading="eager"
              />
              <div className={styles.imageOverlay} aria-hidden="true" />
              <div className={styles.imageInnerRing} aria-hidden="true" />
            </div>
            <span className={styles.accentDot + " " + styles.accentDotTR} aria-hidden="true" />
            <span className={styles.accentDot + " " + styles.accentDotBL} aria-hidden="true" />

            <motion.div className={`${styles.floatCard} ${styles.floatCardTop}`} initial={{ opacity: 0, x: 12, y: 8 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ delay: 0.9, ...spring.soft }}>
              <span className={styles.floatIcon}>✦</span>
              <div>
                <div className={styles.floatTitle}>Morning Flow · 7:30 AM</div>
                <div className={styles.floatSub}>Spring Valley · Limited to 12 · 300 members</div>
              </div>
            </motion.div>

            <motion.div className={`${styles.floatCard} ${styles.floatCardBottom}`} initial={{ opacity: 0, x: -12, y: 8 }} animate={{ opacity: 1, x: 0, y: 0 }} transition={{ delay: 1.05, ...spring.soft }}>
              <span className={styles.floatIcon} style={{ background: "#FFF7E6", color: "#F4B400" }}>◯</span>
              <div>
                <div className={styles.floatTitle}>Breathe, move, rest</div>
                <div className={styles.floatSub}>Your center, remembered.</div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {!reduced && (
        <motion.div className={styles.scrollCue} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} aria-hidden="true">
          <span className={styles.scrollLabel}>Scroll</span>
          <span className={styles.scrollLine} />
        </motion.div>
      )}
    </motion.section>
  );
};

export default Hero;
