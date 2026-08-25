import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { MEMBERSHIPS, SOMA_DAILY } from "../../config/siteContent";
import styles from "./SomaPricingPreview.module.css";

const SomaPricingPreview = () => {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <motion.div className={styles.header} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <div>
            <span className={styles.eyebrow}>Memberships — Spring Valley, Nairobi</span>
            <h2 className={styles.title}>Choose the rhythm <em>that holds you.</em></h2>
            <p className={styles.sub}>All prices in KES, VAT included. Discovery 3,000 · Single class 2,500 · Founding rates held 12 months.</p>
          </div>
          <Link to="/classes" className={styles.viewAll}>See full pricing →</Link>
        </motion.div>
        <div className={styles.grid}>
          {MEMBERSHIPS.map((m, i) => (
            <motion.div key={m.name} className={`${styles.card} ${m.accent ? styles.accent : ""}`} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07, duration: 0.5 }} whileHover={{ y: -4 }}>
              {m.badge && <span className={styles.badge}>{m.badge}</span>}
              <div className={styles.cardHead}>
                <div className={styles.cardName}>{m.name}</div>
                <div className={styles.cardSub}>{m.sub}</div>
                <div className={styles.price}><span>{m.price}</span><em>{m.per}</em></div>
              </div>
              <ul className={styles.features}>
                {m.features.map((f) => <li key={f}>— {f}</li>)}
              </ul>
              <Link to="/classes" className={styles.cardCta}>Explore {m.name.split(" ")[1]} →</Link>
            </motion.div>
          ))}
        </div>
        <motion.div className={styles.daily} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }}>
          <div className={styles.dailyText}>
            <span className={styles.eyebrow} style={{ marginBottom: 8, display: "inline-flex" }}>{SOMA_DAILY.title} — {SOMA_DAILY.sub}</span>
            <h3>Take Soma home with you</h3>
            <ul>{SOMA_DAILY.bullets.map((b) => <li key={b}>• {b}</li>)}</ul>
            <p className={styles.dailyNote}>{SOMA_DAILY.included}</p>
          </div>
          <div className={styles.dailyPrice}>
            <div><strong>{SOMA_DAILY.monthly}</strong> a month <span>· {SOMA_DAILY.yearly} a year ({SOMA_DAILY.note})</span></div>
            <div className={styles.dailyIncluded}>Included with AMANI / UZIMA / FAMILY — or subscribe from anywhere.</div>
            <Link to="/classes" className={styles.dailyCta}>Discover SOMA DAILY →</Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
export default SomaPricingPreview;
