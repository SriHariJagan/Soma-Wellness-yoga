import React, { useRef, useEffect, useState } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
  useInView,
} from "framer-motion";
import { Link } from "react-router-dom";
import styles from "./Hero.module.css";
import { EASE, spring, usePrefersReducedMotion } from "../../lib/motion";
import { useTranslation } from "react-i18next";

// ──────────────────────────────────────────────────────────────
// Count-up — animates number when in view, honors reduced motion
// ──────────────────────────────────────────────────────────────
const CountUp = ({ value, suffix = "", decimals = 0, duration = 1.2, reduced = false }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) { setDisplay(value); return; }
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / (duration * 1000), 1);
      // easeOutExpo
      const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setDisplay(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration, reduced]);

  const formatted = decimals ? display.toFixed(decimals) : Math.round(display).toLocaleString();
  return <span ref={ref}>{formatted}{suffix}</span>;
};

// ──────────────────────────────────────────────────────────────
// MagneticButton — premium follow cursor, spring back (throttled)
// ──────────────────────────────────────────────────────────────
const MagneticButton = ({ children, className, reduced, ...props }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 140, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 140, damping: 18, mass: 0.4 });
  const rafRef = useRef(0);

  const onMove = (e) => {
    if (reduced) return;
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      x.set(dx * 0.22);
      y.set(dy * 0.28);
    });
  };
  const onLeave = () => { 
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    x.set(0); y.set(0); 
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: sx, y: sy, display: "inline-flex" }}
      whileTap={{ scale: 0.97 }}
    >
      <Link className={className} {...props}>
        {children}
      </Link>
    </motion.div>
  );
};

// ──────────────────────────────────────────────────────────────
// Word reveal helper — splits text into spans
// ──────────────────────────────────────────────────────────────
const RevealWords = ({ text, delay = 0, reduced }) => {
  if (reduced) return <>{text}</>;
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <motion.span
          key={i}
          className={styles.word}
          initial={{ y: 28, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.55, delay: delay + i * 0.04, ease: EASE }}
          style={{ display: "inline-block" }}
        >
          {w}
          {i < words.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </>
  );
};

const Hero = () => {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();
  const ref = useRef(null);

  // Scroll-linked transforms — disabled on mobile and reduced motion for performance
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const shouldParallax = !reduced && !isMobile;
  const { scrollYProgress } = useScroll({
    target: shouldParallax ? ref : undefined,
    offset: ["start start", "end start"],
  });

  const imageY = useTransform(scrollYProgress, [0, 1], [0, shouldParallax ? 32 : 0]);
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, shouldParallax ? 1.02 : 1]);
  const textY = useTransform(scrollYProgress, [0, 1], [0, shouldParallax ? 12 : 0]);
  const watermarkX = useTransform(scrollYProgress, [0, 1], [0, shouldParallax ? -40 : 0]);
  const blobY = useTransform(scrollYProgress, [0, 1], [0, shouldParallax ? -16 : 0]);

  // 3D tilt
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const tiltX = useSpring(useTransform(py, [-0.5, 0.5], [7, -7]), spring.gentle);
  const tiltY = useSpring(useTransform(px, [-0.5, 0.5], [-8, 8]), spring.gentle);
  const glareX = useTransform(px, [-0.5, 0.5], ["-8%", "8%"]);
  const glareY = useTransform(py, [-0.5, 0.5], ["-6%", "6%"]);

  // Cursor orb (follows mouse across whole hero)
  const orbX = useMotionValue(-200);
  const orbY = useMotionValue(-200);
  const orbSX = useSpring(orbX, { stiffness: 90, damping: 20 });
  const orbSY = useSpring(orbY, { stiffness: 90, damping: 20 });

  const pointerRaf = useRef(0);
  const handlePointer = (e) => {
    if (reduced) return;
    if (pointerRaf.current) return;
    pointerRaf.current = requestAnimationFrame(() => {
      pointerRaf.current = 0;
      const rect = e.currentTarget.getBoundingClientRect();
      px.set((e.clientX - rect.left) / rect.width - 0.5);
      py.set((e.clientY - rect.top) / rect.height - 0.5);
      orbX.set(e.clientX - rect.left);
      orbY.set(e.clientY - rect.top);
    });
  };
  const resetPointer = () => {
    if (pointerRaf.current) cancelAnimationFrame(pointerRaf.current);
    px.set(0);
    py.set(0);
  };

  return (
    <motion.section
      ref={ref}
      className={styles.hero}
      onPointerMove={handlePointer}
      onPointerLeave={resetPointer}
    >
      {/* ── Atmospheric background ── */}
      <div className={styles.bg} aria-hidden="true" />
      {/* animated blobs */}
      {!reduced && (
        <>
          <motion.div className={styles.blob + " " + styles.blob1} style={{ y: blobY }} aria-hidden="true" />
          <motion.div className={styles.blob + " " + styles.blob2} style={{ y: blobY }} aria-hidden="true" />
          <motion.div className={styles.blob + " " + styles.blob3} style={{ y: blobY }} aria-hidden="true" />
        </>
      )}
      {/* cursor following orb - desktop only */}
      {!reduced && (
        <motion.div className={styles.cursorOrb} style={{ x: orbSX, y: orbSY }} aria-hidden="true" />
      )}
      {/* grain */}
      <div className={styles.grain} aria-hidden="true" />

      {/* organic rings — slow breathing */}
      <motion.div
        className={styles.ring + " " + styles.ring1}
        aria-hidden="true"
        animate={reduced ? {} : { scale: [1, 1.02, 1], rotate: [0, 0.7, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={styles.ring + " " + styles.ring2}
        aria-hidden="true"
        animate={reduced ? {} : { scale: [1, 1.03, 1], rotate: [0, -0.9, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      />
      <motion.div
        className={styles.ring + " " + styles.ring3}
        aria-hidden="true"
        animate={reduced ? {} : { scale: [1, 1.015, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* watermark kinetic type */}
      <motion.div className={styles.watermarkWrap} style={{ x: watermarkX }} aria-hidden="true">
        <span className={styles.watermark}>SOMA — RETURN TO YOUR CENTER — SOMA — RETURN TO YOUR CENTER —</span>
      </motion.div>

      <div className={styles.content}>
        {/* ── Text ── */}
        <motion.div
          className={styles.text}
          style={{ y: textY }}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: reduced ? 0 : 0.06, delayChildren: reduced ? 0 : 0.10 } },
          }}
        >
          {/* eyebrow */}
          <motion.span
            className={styles.eyebrow}
            variants={{
              hidden: { opacity: 0, y: 14 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
            }}
          >
            <motion.span
              className={styles.eyebrowLine}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
              style={{ transformOrigin: "left" }}
            />
            <span className={styles.eyebrowDot} />
            {t("hero.springValley")} — {t("hero.yogaTherapy")}
            <motion.span
              className={styles.eyebrowPulse}
              animate={reduced ? {} : { scale: [1, 1.18, 1], opacity: [0.9, 0.5, 0.9] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.span>

          {/* headline — split reveal (brand headline stays English for visual identity, subtitle is localized) */}
          <h1 className={styles.headline}>
            <span className={styles.headlineClip}>
              <RevealWords text="RETURN" delay={0.12} reduced={reduced} />
            </span>
            <span className={styles.headlineClip}>
              <motion.span
                className={styles.headlineTo}
                initial={reduced ? { opacity: 1 } : { y: 44, opacity: 0, filter: "blur(8px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.8, delay: 0.32, ease: EASE }}
                style={{ display: "inline-block" }}
              >
                TO YOUR&nbsp;
              </motion.span>
              <motion.em
                initial={reduced ? { opacity: 1 } : { y: 44, opacity: 0, filter: "blur(10px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.85, delay: 0.46, ease: EASE }}
                style={{ display: "inline-block" }}
              >
                CENTER
              </motion.em>
            </span>
            {/* accent underline draw */}
            <motion.span
              className={styles.headlineUnderline}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.9, delay: 1.05, ease: EASE }}
              aria-hidden="true"
            />
          </h1>

          {/* sub — word stagger via CSS but enhanced with motion */}
          <motion.p
            className={styles.sub}
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.7, delay: 0.08, ease: EASE } },
            }}
          >
            {t("hero.subtitle")}
          </motion.p>

          {/* CTAs — magnetic primary */}
          <motion.div
            className={styles.ctaRow}
            variants={{
              hidden: { opacity: 0, y: 14 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
            }}
          >
            <MagneticButton reduced={reduced} to="/classes" className={styles.primaryBtn}>
              <span className={styles.primaryBtnInner}>
                {t("hero.explorePrograms")}
                <motion.span
                  className={styles.btnArrow}
                  animate={reduced ? {} : { x: [0, 3, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </motion.span>
              </span>
              {/* shine sweep */}
              {!reduced && <span className={styles.btnShine} aria-hidden="true" />}
            </MagneticButton>

            <motion.div whileHover={reduced ? {} : { y: -2 }} whileTap={{ scale: 0.98 }} transition={spring.snappy}>
              <Link to="/about" className={styles.secondaryBtn}>
                <span>{t("about.ourStory")}</span>
                <span className={styles.secondaryArrow}>→</span>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            className={styles.secondaryNote}
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { delay: 0.7 } },
            }}
          >
            <span className={styles.noteDot} />
            Small groups · Conscious teachers · No performative wellness
          </motion.div>

          {/* meta stats — count-up */}
          <motion.div
            className={styles.meta}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.55 } },
            }}
          >
            <div className={styles.metaItem}>
              <span className={styles.metaNum}>
                <CountUp value={500} suffix="+" reduced={reduced} />
              </span>
              <span className={styles.metaLabel}>Lives transformed</span>
            </div>
            <span className={styles.metaSep} />
            <div className={styles.metaItem}>
              <span className={styles.metaNum}>
                <CountUp value={18} suffix=" yrs" reduced={reduced} />
              </span>
              <span className={styles.metaLabel}>In practice</span>
            </div>
            <span className={styles.metaSep} />
            <div className={styles.metaItem}>
              <span className={styles.metaNum}>
                <CountUp value={4.9} suffix="★" decimals={1} reduced={reduced} />
              </span>
              <span className={styles.metaLabel}>Community rating</span>
            </div>
            {/* inline micro-proof */}
            <div className={styles.metaProof}>
              <span className={styles.proofDot} />
              300 members · capped, never crowded
            </div>
          </motion.div>
        </motion.div>

        {/* ── Visual ── */}
        <motion.div
          className={styles.visual}
          style={{ y: imageY }}
          initial={{ opacity: 0, scale: 0.96, filter: reduced ? "blur(0px)" : "blur(6px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 1.0, delay: 0.28, ease: EASE }}
        >
          <motion.div
            className={styles.circleWrap}
            style={{ rotateX: tiltX, rotateY: tiltY, transformPerspective: 1100 }}
          >
            {/* soft ambient glow behind circle */}
            <div className={styles.circleGlow} aria-hidden="true" />
            <div className={styles.circleBg} aria-hidden="true" />

            {/* glare follow */}
            {!reduced && (
              <motion.div className={styles.glare} style={{ x: glareX, y: glareY }} aria-hidden="true" />
            )}

            <motion.div
              className={styles.imageCard}
              style={{ scale: imageScale }}
              whileHover={reduced ? {} : { rotate: -0.9 }}
              transition={spring.gentle}
            >
              <motion.img
                src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200&auto=format&fit=crop"
                alt="Attractive wellness practitioner in serene yoga flow — Soma Wellness Nairobi"
                width="1200"
                height="1400"
                fetchPriority="high"
                decoding="async"
                loading="eager"
                initial={{ scale: 1.08 }}
                animate={{ scale: 1 }}
                transition={{ duration: 1.4, ease: EASE }}
                style={{ willChange: "transform" }}
              />
              <div className={styles.imageOverlay} aria-hidden="true" />
              <div className={styles.imageInnerRing} aria-hidden="true" />
              {/* top highlight */}
              <div className={styles.imageHighlight} aria-hidden="true" />
            </motion.div>

            {/* accent dots — pulse */}
            <motion.span
              className={styles.accentDot + " " + styles.accentDotTR}
              aria-hidden="true"
              animate={reduced ? {} : { scale: [1, 1.25, 1], opacity: [1, 0.7, 1] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.span
              className={styles.accentDot + " " + styles.accentDotBL}
              aria-hidden="true"
              animate={reduced ? {} : { scale: [1, 1.2, 1], opacity: [1, 0.65, 1] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
            />

            {/* floating cards — infinite subtle float */}
            <motion.div
              className={`${styles.floatCard} ${styles.floatCardTop}`}
              initial={{ opacity: 0, x: 16, y: 8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 0.9, ...spring.soft }}
              whileHover={reduced ? {} : { y: -3, scale: 1.02 }}
            >
              <motion.span
                className={styles.floatIcon}
                animate={reduced ? {} : { rotate: [0, 6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                ✦
              </motion.span>
              <div>
                <div className={styles.floatTitle}>Morning Flow · 7:30 AM</div>
                <div className={styles.floatSub}>Spring Valley · Limited to 12 · 300 members</div>
              </div>
              {/* live dot */}
              <span className={styles.liveDot} aria-hidden="true" />
            </motion.div>

            <motion.div
              className={`${styles.floatCard} ${styles.floatCardBottom}`}
              initial={{ opacity: 0, x: -16, y: 8 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              transition={{ delay: 1.05, ...spring.soft }}
              whileHover={reduced ? {} : { y: -3, scale: 1.02 }}
            >
              <span className={styles.floatIcon} style={{ background: "#FFF7E6", color: "#F4B400" }}>
                ◯
              </span>
              <div>
                <div className={styles.floatTitle}>Breathe, move, rest</div>
                <div className={styles.floatSub}>Your center, remembered.</div>
              </div>
            </motion.div>

            {/* floating subtle y loop */}
            {!reduced && (
              <>
                <motion.div
                  className={styles.floatLooper}
                  style={{ top: "6%", right: "-6px", position: "absolute", inset: "auto" }}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
                  aria-hidden="true"
                />
                <motion.div
                  className={styles.floatLooper}
                  style={{ bottom: "8%", left: "-10px", position: "absolute", inset: "auto" }}
                  animate={{ y: [0, -5, 0] }}
                  transition={{ duration: 4.1, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                  aria-hidden="true"
                />
              </>
            )}
          </motion.div>
        </motion.div>
      </div>

      {/* ── Bottom proof marquee — infinite ── */}
      <div className={styles.marquee} aria-hidden="true">
        <div className={styles.marqueeTrack}>
          {Array.from({ length: 2 }).map((_, dup) => (
            <div key={dup} className={styles.marqueeGroup}>
              <span>SOMA WELLNESS — SPRING VALLEY, NAIROBI</span>
              <span className={styles.marqueeDot}>•</span>
              <span>300 MEMBERS · NEVER CROWDED</span>
              <span className={styles.marqueeDot}>•</span>
              <span>YOGA · THERAPY · MEDITATION · MASSAGE</span>
              <span className={styles.marqueeDot}>•</span>
              <span>SMALL GROUPS · CONSCIOUS TEACHERS</span>
              <span className={styles.marqueeDot}>•</span>
              <span>RATED 4.9★ BY OUR COMMUNITY</span>
              <span className={styles.marqueeDot}>•</span>
              <span>18 YEARS IN PRACTICE</span>
              <span className={styles.marqueeDot}>•</span>
            </div>
          ))}
        </div>
      </div>

      {/* scroll cue */}
      {!reduced && (
        <motion.div
          className={styles.scrollCue}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.35 }}
          aria-hidden="true"
        >
          <span className={styles.scrollLabel}>Scroll</span>
          <span className={styles.scrollLine} />
        </motion.div>
      )}
    </motion.section>
  );
};

export default Hero;
