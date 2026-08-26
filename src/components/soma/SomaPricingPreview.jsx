import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MEMBERSHIPS, SOMA_DAILY } from "../../config/siteContent";
import styles from "./SomaPricingPreview.module.css";
import { EASE, spring, usePrefersReducedMotion } from "../../lib/motion";

const SomaPricingPreview = () => {
  const reduced = usePrefersReducedMotion();

  return (
    <section className={styles.section}>
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />
      <motion.div className={styles.orbital} aria-hidden="true" animate={reduced ? {} : { scale: [1, 1.03, 1] }} transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }} />

      <div className={styles.inner}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <div className={styles.headerLeft}>
            <div className={styles.eyebrow}>
              <motion.span className={styles.eyebrowLine} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }} style={{ transformOrigin: "left" }} />
              <span className={styles.eyebrowDot} />
              Memberships — Spring Valley, Nairobi
            </div>
            <h2 className={styles.title}>
              Choose the rhythm <em>that holds you.</em>
              <motion.span className={styles.titleUnderline} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.85, delay: 0.45, ease: EASE }} style={{ transformOrigin: "left" }} aria-hidden="true" />
            </h2>
            <p className={styles.sub}>All prices in KES, VAT included. Discovery 3,000 · Single class 2,500 · Founding rates held 12 months.</p>
          </div>
          <motion.div whileHover={reduced ? {} : { y: -2 }} whileTap={{ scale: 0.98 }}>
            <Link to="/classes" className={styles.viewAll}>
              See full pricing <span>→</span>
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          className={styles.grid}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.08, delayChildren: reduced ? 0 : 0.16 } } }}
        >
          {MEMBERSHIPS.map((m, i) => (
            <motion.div
              key={m.name}
              className={`${styles.card} ${m.accent ? styles.accent : ""}`}
              variants={{
                hidden: { opacity: 0, y: 24, scale: 0.97, filter: reduced ? "blur(0px)" : "blur(6px)" },
                visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.58, ease: EASE } },
              }}
              whileHover={reduced ? {} : m.accent ? { y: -10, scale: 1.025, transition: spring.snappy } : { y: -6, scale: 1.015, transition: spring.snappy }}
              whileTap={{ scale: 0.98 }}
            >
              {m.badge && (
                <motion.span
                  className={styles.badge}
                  initial={{ scale: 0.9, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.06, ease: EASE }}
                  animate={reduced ? {} : { boxShadow: ["0 0 0 0 rgba(244,180,0,0.0)", "0 0 0 8px rgba(244,180,0,0.10)", "0 0 0 0 rgba(244,180,0,0.0)"] }}
                  transitionShadow={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                >
                  {m.badge}
                </motion.span>
              )}
              <div className={styles.cardSheen} aria-hidden="true" />
              <div className={styles.cardHead}>
                <div className={styles.cardName}>{m.name}</div>
                <div className={styles.cardSub}>{m.sub}</div>
                <div className={styles.price}>
                  <span>{m.price}</span>
                  <em>{m.per}</em>
                  <motion.span className={styles.priceLine} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.35 + i * 0.06, ease: EASE }} style={{ transformOrigin: "left" }} aria-hidden="true" />
                </div>
              </div>
              <ul className={styles.features}>
                {m.features.map((f) => (
                  <li key={f}>
                    <span className={styles.featureDot} aria-hidden="true" /> {f.replace(/^—\s*/, "")}
                  </li>
                ))}
              </ul>
              <Link to="/classes" className={styles.cardCta}>
                Explore {m.name.split(" ")[1]} <span>→</span>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className={styles.daily}
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.65, delay: 0.22, ease: EASE }}
        >
          <div className={styles.dailyText}>
            <span className={styles.eyebrow} style={{ marginBottom: 8, display: "inline-flex" }}>
              <span className={styles.eyebrowDot} style={{ width: 6, height: 6 }} /> {SOMA_DAILY.title} — {SOMA_DAILY.sub}
            </span>
            <h3>Take Soma home with you</h3>
            <ul>
              {SOMA_DAILY.bullets.map((b) => (
                <li key={b}>
                  <span className={styles.bulletDot} /> {b}
                </li>
              ))}
            </ul>
            <p className={styles.dailyNote}>{SOMA_DAILY.included}</p>
          </div>
          <div className={styles.dailyPrice}>
            <div className={styles.dailyPriceRow}>
              <div>
                <strong>{SOMA_DAILY.monthly}</strong> <span>a month</span>
              </div>
              <span className={styles.dailySep}>·</span>
              <div>
                <strong>{SOMA_DAILY.yearly}</strong> <span>a year</span> <em>({SOMA_DAILY.note})</em>
              </div>
            </div>
            <div className={styles.dailyIncluded}>Included with AMANI / UZIMA / FAMILY — or subscribe from anywhere.</div>
            <Link to="/classes" className={styles.dailyCta}>
              Discover SOMA DAILY <span>→</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default SomaPricingPreview;
