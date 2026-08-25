import React from "react";
import styles from "./SomaPageHeader.module.css";

const SomaPageHeader = ({ eyebrow, title, subtitle, image, align = "left" }) => {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.copy} style={{ textAlign: align }}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1 className={styles.title} dangerouslySetInnerHTML={{ __html: title }} />
          {subtitle && <p className={styles.sub}>{subtitle}</p>}
        </div>
        {image && (
          <div className={styles.visual}>
            <div className={styles.imageWrap}>
              <img src={image} alt="" loading="eager" decoding="async" />
              <div className={styles.ring} aria-hidden="true" />
            </div>
          </div>
        )}
      </div>
      <div className={styles.divider} aria-hidden="true"><span /><em>SOMA</em><span /></div>
    </header>
  );
};

export default SomaPageHeader;
