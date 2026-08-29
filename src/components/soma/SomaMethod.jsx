import React from "react";
import { motion } from "framer-motion";
import styles from "./SomaMethod.module.css";
import { EASE, spring, usePrefersReducedMotion } from "../../lib/motion";
import { useTranslation } from "react-i18next";

const SomaMethod = () => {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();

  const titleWords = [
    { text: t("home.method.word1"), italic: false },
    { text: t("home.method.word2"), italic: false },
    { text: t("home.method.word3"), italic: false },
    { text: t("home.method.word4"), italic: true },
  ];

  const steps = [
    { num: "01", word: t("home.method.steps.breathe.word"), desc: t("home.method.steps.breathe.desc") },
    { num: "02", word: t("home.method.steps.move.word"), desc: t("home.method.steps.move.desc") },
    { num: "03", word: t("home.method.steps.rest.word"), desc: t("home.method.steps.rest.desc") },
    { num: "04", word: t("home.method.steps.reconnect.word"), desc: t("home.method.steps.reconnect.desc") },
  ];

  return (
    <section className={styles.section}>
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />
      {/* subtle orbital rings — editorial, not Hero's */}
      <motion.div
        className={styles.orbital}
        aria-hidden="true"
        animate={reduced ? {} : { rotate: [0, 6, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className={styles.inner}>
        {/* ── Header — staggered words ── */}
        <motion.div
          className={styles.header}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: reduced ? 0 : 0.09, delayChildren: reduced ? 0 : 0.12 } },
          }}
        >
          <motion.div
            className={styles.eyebrow}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
            }}
          >
            <motion.span
              className={styles.eyebrowLine}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: EASE }}
              style={{ transformOrigin: "left" }}
            />
            <span className={styles.eyebrowDot} />
            {t("home.method.eyebrow")}
          </motion.div>

          <h2 className={styles.title} aria-label={t("home.method.titleAria")}>
            <span className={styles.titleRow}>
              {titleWords.map((w, i) => (
                <React.Fragment key={w.text}>
                  <motion.span
                    className={`${styles.titleWord} ${w.italic ? styles.titleItalic : ""}`}
                    variants={{
                      hidden: { opacity: 0, y: 18, filter: reduced ? "blur(0px)" : "blur(6px)" },
                      visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.65, ease: EASE } },
                    }}
                  >
                    {w.text}
                  </motion.span>
                  {i < titleWords.length - 1 && (
                    <motion.span
                      className={styles.dot}
                      variants={{
                        hidden: { scale: 0, opacity: 0 },
                        visible: { scale: 1, opacity: 0.55, transition: { duration: 0.45, ease: EASE } },
                      }}
                      animate={
                        reduced
                          ? {}
                          : { scale: [1, 1.18, 1], opacity: [0.55, 0.32, 0.55] }
                      }
                      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                      aria-hidden="true"
                    >
                      ·
                    </motion.span>
                  )}
                </React.Fragment>
              ))}
            </span>
            {/* underline for Reconnect — draws after words */}
            <motion.span
              className={styles.titleUnderline}
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.85, delay: 0.7, ease: EASE }}
              aria-hidden="true"
            />
          </h2>

          <motion.p
            className={styles.sub}
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
            }}
          >
            {t("home.method.sub")}
          </motion.p>
        </motion.div>

        {/* ── Grid — bento pop with stagger, distinct from Intro's clip ── */}
        <motion.div
          className={styles.grid}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: reduced ? 0 : 0.09, delayChildren: reduced ? 0 : 0.18 } },
          }}
        >
          {steps.map((m, i) => (
            <motion.article
              key={m.num}
              className={styles.card}
              variants={{
                hidden: { opacity: 0, y: 28, scale: 0.97, filter: reduced ? "blur(0px)" : "blur(8px)" },
                visible: {
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  filter: "blur(0px)",
                  transition: { duration: 0.68, ease: EASE },
                },
              }}
              whileHover={
                reduced
                  ? {}
                  : { y: -7, scale: 1.015, transition: spring.snappy }
              }
              whileTap={{ scale: 0.98 }}
              style={{ marginTop: i % 2 === 1 && !reduced ? 18 : 0 }}
            >
              {/* number — clip reveal */}
              <div className={styles.cardTop}>
                <motion.span
                  className={styles.num}
                  initial={{ opacity: 0, x: -8 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 + i * 0.07, ease: EASE }}
                >
                  {m.num}
                </motion.span>
                <motion.span
                  className={styles.numLine}
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.35 + i * 0.07, ease: EASE }}
                  style={{ transformOrigin: "left" }}
                  aria-hidden="true"
                />
              </div>

              <h3 className={styles.word}>{m.word}</h3>
              <p className={styles.desc}>{m.desc}</p>

              <motion.span
                className={styles.arrow}
                aria-hidden="true"
                whileHover={reduced ? {} : { x: 3 }}
                transition={spring.snappy}
              >
                →
              </motion.span>

              {/* hover blob — subtle */}
              <div className={styles.cardBlob} aria-hidden="true" />
              {/* top sheen */}
              <div className={styles.cardSheen} aria-hidden="true" />
            </motion.article>
          ))}
        </motion.div>

        {/* ── Journey — line draw + dot pulse (unique) ── */}
        <motion.div
          className={styles.journey}
          aria-hidden="true"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: reduced ? 0 : 0.14, delayChildren: reduced ? 0 : 0.4 } },
          }}
        >
          <motion.span
            className={styles.journeyLine}
            variants={{
              hidden: { scaleX: 0 },
              visible: { scaleX: 1, transition: { duration: 0.7, ease: EASE } },
            }}
            style={{ transformOrigin: "left" }}
          />
          {[0, 1, 2].map((idx) => (
            <React.Fragment key={idx}>
              <motion.span
                className={styles.journeyDot}
                variants={{
                  hidden: { scale: 0, opacity: 0 },
                  visible: { scale: 1, opacity: 1, transition: { duration: 0.4, ease: EASE_OUT_BACK } },
                }}
                animate={
                  reduced
                    ? {}
                    : { boxShadow: ["0 0 0 0 rgba(129,178,154,0.0)", "0 0 0 8px rgba(129,178,154,0.12)", "0 0 0 0 rgba(129,178,154,0.0)"] }
                }
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", delay: 0.6 + idx * 0.4 }}
              />
              {idx < 2 && (
                <motion.span
                  className={styles.journeyLine}
                  variants={{
                    hidden: { scaleX: 0 },
                    visible: { scaleX: 1, transition: { duration: 0.7, ease: EASE } },
                  }}
                  style={{ transformOrigin: "left" }}
                />
              )}
            </React.Fragment>
          ))}
          <motion.span
            className={styles.journeyLine}
            variants={{
              hidden: { scaleX: 0 },
              visible: { scaleX: 1, transition: { duration: 0.7, ease: EASE } },
            }}
            style={{ transformOrigin: "left" }}
          />
          {/* progress shimmer — slow sweep */}
          {!reduced && <motion.span className={styles.journeyShimmer} animate={{ x: ["-100%", "200%"] }} transition={{ duration: 3.2, repeat: Infinity, ease: "linear", repeatDelay: 2 }} />}
        </motion.div>

        <motion.p
          className={styles.journeyCaption}
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.9, ease: EASE }}
        >
          {t("home.method.caption")}
        </motion.p>
      </div>
    </section>
  );
};

export default SomaMethod;

export const EASE_OUT_BACK = [0.34, 1.56, 0.64, 1];
