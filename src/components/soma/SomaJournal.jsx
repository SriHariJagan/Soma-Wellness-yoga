import React from "react";
import { SOMA_JOURNAL } from "../../config/siteContent";
import styles from "./SomaJournal.module.css";

const SomaJournal = () => {
  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Soma Journal</span>
            <h2 className={styles.title}>Notes on <em>conscious living.</em></h2>
          </div>
        </div>

        <div className={styles.grid}>
          {SOMA_JOURNAL.map((post) => (
            <div key={post.title} className={styles.card}>
              <div className={styles.imageWrap}>
                <img src={post.image} alt={post.title} loading="lazy" decoding="async" />
                <span className={styles.category}>{post.category}</span>
              </div>
              <div className={styles.body}>
                <h3 className={styles.cardTitle}>{post.title}</h3>
                <p className={styles.excerpt}>{post.excerpt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SomaJournal;
