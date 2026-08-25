import React from "react";
import { motion } from "framer-motion";
import { SOMA_METHOD } from "../../config/siteContent";
import styles from "./SomaMethod.module.css";
import { EASE } from "../../lib/motion";

const SomaMethod = () => {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <span className={styles.eyebrow}>The Soma Method</span>
          <h2 className={styles.title}>
            Breathe <span>·</span> Move <span>·</span> Rest <span>·</span> <em>Reconnect</em>
          </h2>
          <p className={styles.sub}>Four movements, one return. A calm, structured path that respects both tradition and your modern life.</p>
        </motion.div>

        <div className={styles.grid}>
          {SOMA_METHOD.map((m, i) => (
            <article
              key={m.num}
              className={styles.card}
              style={{ marginTop: i % 2 === 1 ? 16 : 0 }}
            >
              <span className={styles.num}>{m.num}</span>
              <h3 className={styles.word}>{m.word}</h3>
              <p className={styles.desc}>{m.desc}</p>
              <span className={styles.arrow} aria-hidden="true">→</span>
            </article>
          ))}
        </div>

        <div className={styles.journey} aria-hidden="true">
          <span className={styles.journeyLine} />
          <span className={styles.journeyDot} />
          <span className={styles.journeyLine} />
          <span className={styles.journeyDot} />
          <span className={styles.journeyLine} />
          <span className={styles.journeyDot} />
          <span className={styles.journeyLine} />
        </div>
      </div>
    </section>
  );
};

export default SomaMethod;
