import React, { useRef } from "react";
import { motion, useInView } from "framer-motion";
import styles from "./SomaTrustStrip.module.css";
import { EASE, usePrefersReducedMotion } from "../../lib/motion";

// CountUp for stats — premium, distinct from Hero's
const CountStat = ({ value, suffix = "", reduced }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = React.useState(reduced ? value : 0);

  React.useEffect(() => {
    if (reduced) { setDisplay(value); return; }
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / 1100, 1);
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, reduced]);

  const isFloat = value % 1 !== 0;
  const formatted = isFloat ? display.toFixed(1) : Math.round(display).toString();
  return <span ref={ref}>{formatted}{suffix}</span>;
};

const stats = [
  { n: 300, suffix: "", l: "members max", s: "never crowded, always seen" },
  { n: 18, suffix: "+", l: "years teaching", s: "lineage + modern science" },
  { n: 4.9, suffix: "★", l: "community love", s: "500+ lives transformed" },
  { n: 0, suffix: "", custom: "KES 0", l: "hidden fees", s: "VAT included, no surprises" },
];

const badges = [
  "Yoga Alliance lineage",
  "Medical clearance respected",
  "12 max per class",
  "Pause anytime",
  "12h cancellation, no tricks",
];

const SomaTrustStrip = () => {
  const reduced = usePrefersReducedMotion();

  return (
    <section className={styles.strip} aria-label="Trust indicators">
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      <div className={styles.inner}>
        <motion.div
          className={styles.top}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <span className={styles.eyebrow}>
            <span className={styles.eyebrowDot} />
            Trusted, transparent, premium
            <motion.span className={styles.eyebrowLine} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE }} style={{ transformOrigin: "left" }} aria-hidden="true" />
          </span>
          <div className={styles.press}>
            <span>Featured in</span>
            <em>Business Daily</em> <span className={styles.pressDot} aria-hidden="true">·</span>
            <em>Cosmopolitan</em> <span className={styles.pressDot} aria-hidden="true">·</span>
            <em>Parents Kenya</em> <span className={styles.pressDot} aria-hidden="true">·</span>
            <em>Nairobi Wellness</em>
          </div>
        </motion.div>

        <motion.div
          className={styles.grid}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.08, delayChildren: reduced ? 0 : 0.14 } } }}
        >
          {stats.map((s) => (
            <motion.div
              key={s.l}
              className={styles.card}
              variants={{
                hidden: { opacity: 0, y: 18, scale: 0.98 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: EASE } },
              }}
              whileHover={reduced ? {} : { y: -4, scale: 1.015 }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
            >
              <div className={styles.cardSheen} aria-hidden="true" />
              <div className={styles.num}>
                {s.custom ? s.custom : <CountStat value={s.n} suffix={s.suffix} reduced={reduced} />}
              </div>
              <div className={styles.label}>{s.l}</div>
              <motion.span className={styles.labelLine} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3, ease: EASE }} style={{ transformOrigin: "center" }} aria-hidden="true" />
              <div className={styles.sub}>{s.s}</div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className={styles.badges}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-30px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.06, delayChildren: reduced ? 0 : 0.22 } } }}
        >
          {badges.map((b) => (
            <motion.span
              key={b}
              className={styles.badge}
              variants={{ hidden: { opacity: 0, y: 8, scale: 0.96 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE } } }}
              whileHover={reduced ? {} : { y: -2, scale: 1.02 }}
            >
              <span className={styles.badgeCheck}>✓</span> {b}
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default SomaTrustStrip;
