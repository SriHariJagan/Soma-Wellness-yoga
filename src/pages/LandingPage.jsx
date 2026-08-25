import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
import {
  LuCheck, LuChevronDown, LuArrowRight, LuSparkles, LuAward, LuCalendarDays,
  LuUserCheck, LuClock, LuMapPin, LuPhone, LuBadgeCheck,
} from "react-icons/lu";
import {
  EASE, spring, maybe, viewportOnce, usePrefersReducedMotion,
  staggerContainer, fadeUp, blurIn, scaleIn,
} from "../lib/motion";
import { getLandingPage } from "../data/landingPages";
import "./LandingPage.css";

const STAT_ICONS = {
  award: LuAward,
  calendar: LuCalendarDays,
  user: LuUserCheck,
  clock: LuClock,
};

const heroContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.2 } },
};

const heroItem = {
  hidden: { opacity: 0, y: 28, filter: "blur(8px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: EASE } },
};

const CountUp = ({ text }) => {
  const ref = React.useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = usePrefersReducedMotion();
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!inView || reduced) return;
    const match = text.match(/^(\d+)(.*)$/);
    if (!match) return;
    const target = parseInt(match[1], 10);
    const duration = 1200;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, text]);

  if (reduced) return text;
  const match = text.match(/^(\d+)(.*)$/);
  if (!match) return text;
  return <span ref={ref}>{count}{match[2]}</span>;
};

const LandingPage = ({ slug }) => {
  const page = getLandingPage(`/${slug}`);
  const reduced = usePrefersReducedMotion();
  const [openFaq, setOpenFaq] = useState(0);

  if (!page) return null;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <div className="lp">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      {/* ── Cinematic hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-bg" style={{ backgroundImage: `url(${page.heroImage || "/images/services/yoga2.webp"})` }} />
        <div className="lp-hero-scrim" />
        {!reduced && (
          <motion.div
            className="lp-hero-mesh"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <motion.div
          className="lp-orb lp-orb--a"
          animate={reduced ? undefined : { y: [0, -24, 0], opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="lp-orb lp-orb--b"
          animate={reduced ? undefined : { y: [0, 20, 0], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />

        <motion.div className="lp-hero-inner" variants={heroContainer} initial="hidden" animate="visible">
          <motion.span className="lp-eyebrow" variants={heroItem}>
            <span className="lp-eyebrow-dot" />
            <LuMapPin aria-hidden="true" /> {page.heroEyebrow || "Malviya Nagar, Jaipur"}
          </motion.span>

          <motion.h1 className="lp-hero-title" variants={heroItem}>{page.h1}</motion.h1>

          <motion.p className="lp-hero-lead" variants={heroItem}>
            {page.heroLead ? (
              <>
                {page.heroLeadStrong && <strong>{page.heroLeadStrong}</strong>} {page.heroLead}
              </>
            ) : (
              <>
                <strong>One-to-one yoga training</strong> designed around your body, goals, and schedule —
                with an experienced instructor focused entirely on you.
              </>
            )}
          </motion.p>

          <motion.div className="lp-hero-actions" variants={heroItem}>
            <motion.span
              className="lp-btn lp-btn-primary"
              whileHover={reduced ? undefined : { y: -3 }}
              whileTap={{ scale: 0.96 }}
              transition={spring.snappy}
            >
              <Link to={page.cta.buttonLink}>{page.cta.buttonLabel} <LuArrowRight aria-hidden="true" /></Link>
            </motion.span>
            <motion.span
              className="lp-btn lp-btn-ghost"
              whileHover={reduced ? undefined : { y: -3 }}
              whileTap={{ scale: 0.96 }}
              transition={spring.snappy}
            >
              <Link to={page.cta.secondaryLink}>{page.cta.secondaryLabel}</Link>
            </motion.span>
          </motion.div>

          <motion.div className="lp-hero-meta" variants={heroItem}>
            <LuPhone aria-hidden="true" /> <a href="tel:+919675547597">+91 96755 47597</a>
            <span className="lp-hero-meta-sep">•</span>
            <LuSparkles aria-hidden="true" /> Sessions tailored to your fitness level
          </motion.div>
        </motion.div>

        <motion.div
          className="lp-scroll-hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: reduced ? 0.6 : 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
        >
          <motion.span
            className="lp-scroll-mouse"
            animate={reduced ? undefined : { y: [0, 8, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
          <span>Scroll to explore</span>
        </motion.div>
      </section>

      {/* ── Stats band ── */}
      <section className="lp-stats">
        <div className="lp-container">
          <motion.div
            className="lp-stats-grid"
            variants={maybe(staggerContainer(0.1), reduced)}
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
          >
            {page.stats.map((stat, i) => {
              const Icon = STAT_ICONS[stat.icon] || LuAward;
              return (
                <motion.div key={i} className="lp-stat" variants={maybe(fadeUp, reduced)}>
                  <span className="lp-stat-icon"><Icon aria-hidden="true" /></span>
                  <span className="lp-stat-label"><CountUp text={stat.label} /></span>
                  <span className="lp-stat-sub">{stat.sub}</span>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* ── Content sections ── */}
      <section className="lp-sections">
        <div className="lp-container">
          {page.sections.map((section, i) => {
            const withImage = section.image;
            return (
              <motion.article
                key={i}
                className={`lp-section${withImage ? " lp-section--split" : ""}${i % 2 ? " lp-section--alt" : ""}`}
                variants={maybe(fadeUp, reduced)}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
              >
                <div className="lp-section-body">
                  <span className="lp-section-index">{String(i + 1).padStart(2, "0")}</span>
                  <h2 className="lp-section-title">{section.heading}</h2>
                  {section.paragraphs.map((text, j) => (
                    <p key={j} className="lp-section-text">{text}</p>
                  ))}
                  {section.bullets && (
                    <motion.ul
                      className="lp-bullets"
                      variants={maybe(staggerContainer(0.06), reduced)}
                      initial="hidden"
                      whileInView="visible"
                      viewport={viewportOnce}
                    >
                      {section.bullets.map((item, k) => (
                        <motion.li key={k} className="lp-bullet" variants={maybe(scaleIn, reduced)}>
                          <span className="lp-bullet-check"><LuCheck aria-hidden="true" /></span>
                          {item}
                        </motion.li>
                      ))}
                    </motion.ul>
                  )}
                  {section.links && (
                    <div className="lp-links">
                      {section.links.map((link, k) => (
                        <motion.span
                          key={k}
                          className="lp-inline-link"
                          whileHover={reduced ? undefined : { y: -3 }}
                          whileTap={{ scale: 0.97 }}
                          transition={spring.snappy}
                        >
                          <Link to={link.to}>{link.label} <LuArrowRight aria-hidden="true" /></Link>
                        </motion.span>
                      ))}
                    </div>
                  )}
                </div>

                {withImage && (
                  <div className="lp-section-media">
                    <motion.div
                      className="lp-media-frame"
                      variants={maybe(scaleIn, reduced)}
                      initial="hidden"
                      whileInView="visible"
                      viewport={viewportOnce}
                    >
                      <img src={section.image} alt={section.imageAlt || section.heading} loading="lazy" />
                      <motion.span
                        className="lp-media-badge"
                        animate={reduced ? undefined : { y: [0, -8, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <LuUserCheck aria-hidden="true" /> {section.mediaBadge || "1-to-1 Guidance"}
                      </motion.span>
                    </motion.div>
                  </div>
                )}
              </motion.article>
            );
          })}
        </div>
      </section>

      {/* ── FAQ ── */}
      {page.faqs && (
        <section className="lp-faq">
          <div className="lp-faq-pattern" />
          <div className="lp-container">
            <motion.div
              variants={maybe(fadeUp, reduced)}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
            >
              <span className="lp-eyebrow lp-eyebrow--dark"><span className="lp-eyebrow-dot" /> Common Questions</span>
              <h2 className="lp-faq-title">Frequently Asked Questions</h2>
            </motion.div>

            <motion.div
              className="lp-faq-list"
              variants={maybe(staggerContainer(0.08), reduced)}
              initial="hidden"
              whileInView="visible"
              viewport={viewportOnce}
            >
              {page.faqs.map((faq, i) => {
                const open = openFaq === i;
                return (
                  <motion.div key={i} className="lp-faq-item" variants={maybe(fadeUp, reduced)}>
                    <button
                      type="button"
                      className="lp-faq-question"
                      onClick={() => setOpenFaq(open ? -1 : i)}
                      aria-expanded={open}
                    >
                      {faq.q}
                      <motion.span
                        className="lp-faq-icon"
                        animate={{ rotate: open ? 180 : 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                      >
                        <LuChevronDown aria-hidden="true" />
                      </motion.span>
                    </button>
                    <AnimatePresence initial={false}>
                      {open && (
                        <motion.div
                          key="answer"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.35, ease: EASE }}
                          className="lp-faq-answer-wrap"
                        >
                          <p className="lp-faq-answer">{faq.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>
      )}

      {/* ── CTA banner ── */}
      <section className="lp-cta">
        <div className="lp-cta-pattern" />
        <motion.div
          className="lp-cta-orb"
          animate={reduced ? undefined : { y: [0, -18, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="lp-container">
          <motion.div
            variants={maybe(staggerContainer(0.12), reduced)}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="lp-cta-inner"
          >
            <motion.h2 className="lp-cta-title" variants={maybe(blurIn, reduced)}>{page.cta.heading}</motion.h2>
            <motion.p className="lp-cta-text" variants={maybe(fadeUp, reduced)}>{page.cta.text}</motion.p>
            <motion.div className="lp-cta-actions" variants={maybe(fadeUp, reduced)}>
              <motion.span
                className="lp-btn lp-btn-light"
                whileHover={reduced ? undefined : { y: -3 }}
                whileTap={{ scale: 0.96 }}
                transition={spring.snappy}
              >
                <Link to={page.cta.buttonLink}>{page.cta.buttonLabel} <LuArrowRight aria-hidden="true" /></Link>
              </motion.span>
              <motion.span
                className="lp-btn lp-btn-outline-light"
                whileHover={reduced ? undefined : { y: -3 }}
                whileTap={{ scale: 0.96 }}
                transition={spring.snappy}
              >
                <Link to="/contact"><LuPhone aria-hidden="true" /> Call us</Link>
              </motion.span>
            </motion.div>
            <motion.p className="lp-cta-note" variants={maybe(fadeUp, reduced)}>
              <LuBadgeCheck aria-hidden="true" /> No experience needed · Free consultation · Flexible scheduling
            </motion.p>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;