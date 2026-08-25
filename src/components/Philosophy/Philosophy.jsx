import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import styles from "./Philosophy.module.css";

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.15, ease: [0.25, 0.46, 0.45, 0.94] } }),
};

const listContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
};

const cardItem = {
  hidden: { opacity: 0, x: 36 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

const Philosophy = () => (
  <section className={styles.section} id="philosophy">
    <div className={styles.container}>
      <motion.header className={styles.header} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
        <p className={styles.headerLabel}>Our Philosophy</p>
        <h2 className={styles.headerTitle}>Rooted in Tradition, Guided by Science</h2>
        <p className={styles.headerSub}>
          At Pragya Yoga Alliance, our philosophy blends{" "}
          <strong>Bharat's timeless yogic wisdom</strong>{" "}
          with <strong>modern scientific wellness practices</strong>. We believe
          yoga is not just exercise, but a <em>holistic path</em> to balance mind,
          body, and spirit. Through <strong>authentic Indian yoga</strong>,{" "}
          <strong>meditation</strong>, and <strong>community connection</strong>,
          we share India's wellness heritage with seekers across the globe.
        </p>
      </motion.header>

      <div className={styles.layout}>
        <motion.div className={styles.imageWrap} initial={{ opacity: 0, x: -40, scale: 0.96 }} whileInView={{ opacity: 1, x: 0, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
          <img src="/images/services/Home_about.webp" alt="Philosophy of Pragya Yoga — authentic Indian wellness" loading="lazy" decoding="async" width="1400" height="993" />
          <div className={styles.imageGlow} />
          <div className={styles.imageAccent} />
        </motion.div>

        <motion.div className={styles.content} variants={listContainer} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
          {[
            { title: "Authenticity", desc: "Practices rooted in Bharat's yogic tradition — Asanas, Pranayama, and Dhyana — passed down with integrity and respect." },
            { title: "Science", desc: "Supported by modern research on stress reduction, flexibility, and holistic health, making yoga relevant for today's lifestyle." },
            { title: "Global Wellness", desc: "Connecting communities worldwide, sharing India's wellness heritage, and promoting balance of mind, body, and spirit." },
          ].map((item, i) => (
            <motion.article key={item.title} className={styles.card} variants={cardItem} whileHover={{ x: 6 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}>
              <div className={styles.cardNumber}>0{i + 1}</div>
              <h3 className={styles.cardTitle}>{item.title}</h3>
              <p className={styles.cardDesc}>{item.desc}</p>
            </motion.article>
          ))}
        </motion.div>
      </div>

      <motion.div className={styles.cta} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.4 }}>
        <Link to="/about" className={styles.btnPrimary}>Learn More →</Link>
        <Link to="/classes" className={styles.btnOutline}>Join a Class</Link>
      </motion.div>
    </div>
  </section>
);

export default Philosophy;
