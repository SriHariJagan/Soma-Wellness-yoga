import React from "react";
import { Link } from "react-router-dom";
import styles from "./SomaCTA.module.css";

const SomaCTA = () => {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.card}>
          <div className={styles.rings} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className={styles.eyebrow}>Begin your journey</span>
          <h2 className={styles.title}>
            Come as you are. <br />
            <em>Leave more yourself.</em>
          </h2>
          <p className={styles.copy}>
            Whether it’s your first class or your five hundredth — there’s a place for you at Soma. Small groups, warm light, honest practice.
          </p>
          <div className={styles.actions}>
            <Link to="/newuser" className={styles.primary}>Begin your journey —</Link>
            <Link to="/contact" className={styles.secondary}>Talk to us</Link>
          </div>
          <p className={styles.note}>No contracts · Pause anytime · Members love the flexibility</p>
        </div>
      </div>
    </section>
  );
};

export default SomaCTA;
