import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SomaLogo from "../soma/SomaLogo";
import { EASE } from "../../lib/motion";
import styles from "./AuthShowcase.module.css";

const QUOTES = [
  { key: "q1", authorKey: "a1" },
  { key: "q2", authorKey: "a2" },
  { key: "q3", authorKey: "a3" },
];

export default function AuthShell({ children }) {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIdx((p) => (p + 1) % QUOTES.length), 5200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className={styles.shell}>
      {/* ── Left: photographic showcase ── */}
      <aside className={styles.showcase}>
        <img
          className={styles.photo}
          src="https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=1200&auto=format&fit=crop"
          alt=""
          aria-hidden="true"
        />
        <div className={styles.veil} aria-hidden="true" />
        <motion.div
          className={styles.orb}
          aria-hidden="true"
          animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className={styles.frame} aria-hidden="true" />

        <div className={styles.inner}>
          {/* top row */}
          <div className={styles.topRow}>
            <Link to="/" className={styles.logoLink} aria-label="Soma Wellness — home">
              <SomaLogo size={46} variant="light" />
            </Link>
            <span className={styles.topMeta}>Spring Valley · Nairobi</span>
          </div>

          {/* middle */}
          <div className={styles.mid}>
            <span className={styles.kicker}>{t("hero.rebalance")}</span>
            <h2
              className={styles.headline}
              dangerouslySetInnerHTML={{ __html: t("auth.showcase.headline") }}
            />

            {/* slim stat strip */}
            <div className={styles.stats}>
              {[
                { v: "300", l: t("home.trust.stats.membersMaxLabel") },
                { v: "4.9★", l: t("auth.showcase.ratingLabel") },
                { v: "18+", l: t("home.trust.stats.yearsLabel") },
              ].map((s) => (
                <div key={s.v} className={styles.stat}>
                  <strong>{s.v}</strong>
                  <span>{s.l}</span>
                </div>
              ))}
            </div>

            {/* rotating quote */}
            <div className={styles.quotes}>
              <AnimatePresence mode="wait">
                <motion.blockquote
                  key={idx}
                  initial={{ opacity: 0, y: 18, filter: "blur(5px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -14, filter: "blur(5px)" }}
                  transition={{ duration: 0.55, ease: EASE }}
                  className={styles.quote}
                >
                  <span className={styles.quoteMark} aria-hidden="true">“</span>
                  {t(`auth.showcase.${QUOTES[idx].key}`)}
                  <footer className={styles.quoteAuthor}>
                    <span className={styles.authorLine} aria-hidden="true" />
                    {t(`auth.showcase.${QUOTES[idx].authorKey}`)}
                  </footer>
                </motion.blockquote>
              </AnimatePresence>
            </div>
          </div>

          {/* bottom */}
          <ul className={styles.points}>
            {[1, 2, 3].map((n) => (
              <li key={n}>
                <span className={styles.pointDot} aria-hidden="true">✓</span>
                {t(`auth.showcase.point${n}`)}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ── Right: form (fits viewport, no scroll) ── */}
      <main className={styles.formSide}>
        <div className={styles.mobileLogo}>
          <SomaLogo size={46} />
        </div>
        {children}
      </main>
    </div>
  );
}
