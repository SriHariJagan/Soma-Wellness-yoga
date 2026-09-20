import React, { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
} from "framer-motion";
import { Link } from "react-router-dom";
import styles from "./Hero.module.css";
import { EASE, spring, usePrefersReducedMotion } from "../../lib/motion";
import { useTranslation } from "react-i18next";

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
    const target = e.currentTarget;
    if (!target) return;
    pointerRaf.current = requestAnimationFrame(() => {
      pointerRaf.current = 0;
      if (!target || typeof target.getBoundingClientRect !== 'function') return;
      const rect = target.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
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

      {/* watermark removed per brand feedback — clean wellness look */}

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
            {t("hero.eyebrow")}
            <motion.span
              className={styles.eyebrowPulse}
              animate={reduced ? {} : { scale: [1, 1.18, 1], opacity: [0.9, 0.5, 0.9] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.span>

          {/* headline — brand positioning */}
          <h1 className={styles.headline}>
            <span className={styles.headlineClip}>
              <RevealWords text={t("hero.titleA")} delay={0.12} reduced={reduced} />
            </span>
            <span className={styles.headlineClip}>
              <motion.em
                initial={reduced ? { opacity: 1 } : { y: 44, opacity: 0, filter: "blur(10px)" }}
                animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.85, delay: 0.4, ease: EASE }}
                style={{ display: "inline-block" }}
              >
                {t("hero.titleB")}
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
            <MagneticButton reduced={reduced} to="/services" className={styles.primaryBtn}>
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
            Movement · Restoration · Mindfulness — for individuals & organisations
          </motion.div>

          {/* trust line — premium micro-proof */}
          <motion.div
            className={styles.trustLine}
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.6, delay: 0.55 } },
            }}
          >
            <span className={styles.trustDot} />
            Movement · Restoration · Mindfulness — for individuals & organisations
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
                src="/images/backgrounds/immersive-spa-calm.webp"
                alt="Premium spa massage therapy in warm calm light at SomaWellness"
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
                <div className={styles.floatTitle}>Group Classes · 7–8 AM · 8:30–9:30 AM</div>
                <div className={styles.floatSub}>Evening 5:30–6:30 PM · 6:30–7:30 PM · Spring Valley</div>
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

            {/* rotating brand seal */}
            <div className={styles.seal} aria-hidden="true">
              <svg viewBox="0 0 120 120">
                <defs>
                  <path id="somaSealCircle" d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0" fill="none" />
                </defs>
                <text>
                  <textPath href="#somaSealCircle">SomaWellness · Premium Wellness ·</textPath>
                </text>
              </svg>
              <span className={styles.sealCenter}>✦</span>
            </div>

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

      {/* ── Bottom marquee — premium wellness messages ── */}
      <div className={styles.marquee} aria-hidden="true">
        <div className={styles.marqueeTrack}>
          {Array.from({ length: 2 }).map((_, dup) => (
            <div key={dup} className={styles.marqueeGroup}>
              <span>Move with intention · Breathe with awareness · Rest with trust</span>
              <span className={styles.marqueeDot}>•</span>
              <span>Small groups · Certified practitioners · Thoughtful experience</span>
              <span className={styles.marqueeDot}>•</span>
              <span>Massage · Meditation · Private sessions · Teacher training</span>
              <span className={styles.marqueeDot}>•</span>
              <span>Spring Valley, Nairobi · Open mornings & evenings</span>
              <span className={styles.marqueeDot}>•</span>
              <span>SOMAWELLNESS — Wellness, thoughtfully experienced</span>
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
