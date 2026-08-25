import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "react-router-dom";
import styles from "./SomaImmersive.module.css";

const SomaImmersive = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const scale = useTransform(scrollYProgress, [0, 1], [1.06, 1]);
  return (
    <section ref={ref} className={styles.section}>
      <motion.div className={styles.bg} aria-hidden="true" style={{ y, scale }}>
        <img
          src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?q=80&w=1920&auto=format&fit=crop"
          alt=""
          width="1920"
          height="1080"
          loading="lazy"
          decoding="async"
        />
        <div className={styles.bgOverlay} />
      </motion.div>

      <div className={styles.inner}>
        <motion.div
          className={styles.card}
          initial={{ opacity: 0, y: 28, clipPath: "inset(0 100% 0 0)" }}
          whileInView={{ opacity: 1, y: 0, clipPath: "inset(0 0% 0 0)" }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22,1,0.36,1] }}
        >
          <span className={styles.eyebrow}>A space that breathes with you</span>
          <h2 className={styles.title}>
            Light. Wood.<br />
            <em>Silence.</em>
          </h2>
          <p className={styles.copy}>
            We built Soma like a home, not a gym. Natural materials, warm shadows, space between mats. Come as you are — leave more yourself.
          </p>
          <div className={styles.actions}>
            <Link to="/about" className={styles.primaryBtn}>Visit the studio →</Link>
            <Link to="/restore" className={styles.ghostBtn}>See experiences</Link>
          </div>
          <div className={styles.details}>
            <div><strong>Spring Valley, Nairobi</strong><span>Kenya · 6am — 8pm · Mon–Sat</span></div>
            <div className={styles.dot} />
            <div><strong>Small groups</strong><span>12 max · Hands-on adjustments</span></div>
          </div>
        </motion.div>
      </div>

      <div className={styles.ring} aria-hidden="true" />
    </section>
  );
};

export default SomaImmersive;
