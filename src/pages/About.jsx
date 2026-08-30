import React from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import SomaPageHeader from "../components/soma/SomaPageHeader";
import SomaCTA from "../components/soma/SomaCTA";
import PageFAQSection from "../components/soma/PageFAQSection";
import { PAGE_FAQS } from "../config/siteContent";
import { EASE, usePrefersReducedMotion } from "../lib/motion";
import { useTranslation } from "react-i18next";

const CountUp = ({ value, suffix = "", reduced }) => {
  const ref = React.useRef(null);
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
  return <span ref={ref}>{Math.round(display)}{suffix}</span>;
};

const fadeIn = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.6, delay, ease: EASE },
});

const About = () => {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();

  return (
    <div style={{ background: "var(--soma-cream)", overflow: "hidden" }}>
      <SomaPageHeader
        eyebrow={t("about.eyebrow")}
        title={t("about.title")}
        subtitle={t("about.subtitle")}
        image="https://images.unsplash.com/photo-1545205597-3d9d02c29597?q=80&w=1400&auto=format&fit=crop"
      />

      {/* ═══════════ STORY SECTION ═══════════ */}
      <section className="about-story">
        <div className="about-story-inner">
          <motion.div className="about-story-img" {...fadeIn(0)}>
            <div className="about-img-wrapper">
              <img
                src="https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=800&auto=format&fit=crop"
                alt="Soma Wellness studio interior"
                loading="lazy"
              />
              <div className="about-img-overlay" />
              <div className="about-img-badge">
                <span className="about-badge-dot" />
                <span>Est. 2008 · Nairobi</span>
              </div>
            </div>
          </motion.div>

          <motion.div className="about-story-text" {...fadeIn(0.15)}>
            <div className="about-eyebrow">
              <span className="about-eyebrow-line" />
              <span className="about-eyebrow-dot" />
              <span>Our Story</span>
            </div>
            <h2 className="about-heading">
              A calm, welcoming{" "}
              <em>home</em> for body, breath and mind.
            </h2>
            <p className="about-body">
              SOMA Wellness Nairobi is an integrated destination in Spring Valley — where Yoga,
              Yoga Therapy, Meditation, Breathwork, Massage and wellness rituals sit together
              under one holistic philosophy. We bring movement, breath, mindfulness, therapy,
              education and lifestyle together so you can cultivate a healthier relationship
              with your body, breath, mind and everyday life.
            </p>
            <p className="about-body-sub">
              Every detail — light, wood, linen, silence — is considered so your nervous system
              can exhale. No mirrors demanding perfection. No hustle disguised as healing. Just
              honest, integrated practice held with care, in Nairobi's most intentional wellness
              space.
            </p>

            <div className="about-stats">
              {[
                { n: 5000, suffix: "+", l: "Students", sub: "Transformed" },
                { n: 18, suffix: "+", l: "Years", sub: "In Practice" },
                { n: 6, suffix: "+", l: "Teachers", sub: "Lineage" },
              ].map((s, i) => (
                <div key={s.l} className="about-stat">
                  <div className="about-stat-num">
                    <CountUp value={s.n} suffix={s.suffix} reduced={reduced} />
                  </div>
                  <div className="about-stat-label">{s.l}</div>
                  <div className="about-stat-sub">{s.sub}</div>
                  {i < 2 && <div className="about-stat-divider" />}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ VALUES SECTION ═══════════ */}
      <section className="about-values">
        <div className="about-values-inner">
          <motion.div className="about-section-header" {...fadeIn(0)}>
            <div className="about-eyebrow">
              <span className="about-eyebrow-dot" />
              <span>What we hold</span>
            </div>
            <h3 className="about-section-title">
              Values you can <em>feel</em>
            </h3>
          </motion.div>

          <div className="about-values-grid">
            {[
              { title: "Lineage, not rigidity", desc: "Traditional roots, taught with modern understanding and kindness.", icon: "◯", color: "#183D2D" },
              { title: "Small & seen", desc: "Groups of 12 max. Hands-on adjustments, real relationships.", icon: "◎", color: "#2E7D5B" },
              { title: "Design as care", desc: "Light, wood, linen and silence — a space that lets you arrive.", icon: "✦", color: "#F4B400" },
              { title: "Science + softness", desc: "Nervous-system aware, inclusive, and paced for real lives.", icon: "⬢", color: "#81B29A" },
              { title: "Community over performance", desc: "We practice together. No mirrors, no hustle.", icon: "♥", color: "#E74C3C" },
              { title: "Every season, every body", desc: "Prenatal, therapeutic, kids, corporate — yoga that meets you.", icon: "✺", color: "#8B5CF6" },
            ].map((v, i) => (
              <motion.div
                key={v.title}
                className="about-value-card"
                {...fadeIn(i * 0.08)}
                whileHover={reduced ? {} : { y: -6, scale: 1.02 }}
              >
                <div className="about-value-icon" style={{ background: v.color }}>
                  {v.icon}
                </div>
                <h4 className="about-value-title">{v.title}</h4>
                <p className="about-value-desc">{v.desc}</p>
                <div className="about-value-line" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ FOUNDER SECTION ═══════════ */}
      <section className="about-founder">
        <div className="about-founder-inner">
          <motion.div className="about-founder-text" {...fadeIn(0)}>
            <div className="about-eyebrow">
              <span className="about-eyebrow-line" />
              <span className="about-eyebrow-dot" />
              <span>Leadership</span>
            </div>
            <h3 className="about-heading">
              Guided by <em>practice</em>
            </h3>
            <p className="about-body">
              Led by teachers rooted in lineage and modern wellness education — yoga therapy,
              meditation and mindful movement for Nairobi's community. We teach from lived
              practice, not performance, and adapt every session to your needs, limitations
              and stage of life.
            </p>
            <div className="about-founder-actions">
              <motion.div whileHover={reduced ? {} : { y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link to="/classes" className="about-btn-primary">
                  Explore programs <span>→</span>
                </Link>
              </motion.div>
              <Link to="/contact" className="about-btn-secondary">
                Visit us
              </Link>
            </div>
          </motion.div>

          <motion.div className="about-founder-img" {...fadeIn(0.15)}>
            <div className="about-img-wrapper about-img-founder">
              <img
                src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop"
                alt="Lead yoga teacher"
                loading="lazy"
              />
              <div className="about-img-overlay" />
              <div className="about-founder-badge">
                <span className="about-badge-dot" />
                <span>6+ teachers · lineage + modern science</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════ GALLERY SECTION ═══════════ */}
      <section className="about-gallery">
        <div className="about-gallery-inner">
          <motion.div className="about-section-header" {...fadeIn(0)}>
            <div className="about-eyebrow">
              <span className="about-eyebrow-dot" />
              <span>Our Space</span>
            </div>
            <h3 className="about-section-title">
              Where <em>calm</em> lives
            </h3>
          </motion.div>

          <div className="about-gallery-grid">
            {[
              { src: "https://images.unsplash.com/photo-1588286840104-8957b019727f?q=80&w=600&auto=format&fit=crop", alt: "Yoga studio", span: "wide" },
              { src: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=600&auto=format&fit=crop", alt: "Meditation", span: "tall" },
              { src: "https://images.unsplash.com/photo-1575052814086-f385e2e2ad33?q=80&w=600&auto=format&fit=crop", alt: "Yoga class", span: "normal" },
              { src: "https://images.unsplash.com/photo-1545389336-cf090694435e?q=80&w=600&auto=format&fit=crop", alt: "Yoga practice", span: "normal" },
              { src: "https://images.unsplash.com/photo-1518611012118-696072aa579a?q=80&w=600&auto=format&fit=crop", alt: "Group class", span: "wide" },
            ].map((img, i) => (
              <motion.div
                key={i}
                className={`about-gallery-item about-gallery-${img.span}`}
                {...fadeIn(i * 0.1)}
                whileHover={reduced ? {} : { scale: 1.03 }}
              >
                <img src={img.src} alt={img.alt} loading="lazy" />
                <div className="about-gallery-overlay">
                  <span>{img.alt}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ TIMELINE SECTION ═══════════ */}
      <section className="about-timeline">
        <div className="about-timeline-inner">
          <motion.div className="about-section-header" {...fadeIn(0)}>
            <div className="about-eyebrow">
              <span className="about-eyebrow-dot" />
              <span>Our Journey</span>
            </div>
            <h3 className="about-section-title">
              From quiet intention to <em>Spring Valley home.</em>
            </h3>
          </motion.div>

          <div className="about-timeline-grid">
            {[
              { year: "2008", title: "First breath", desc: "Begin teaching — small groups, lineage, hands-on." },
              { year: "2018", title: "Nairobi calling", desc: "Bring practice to Spring Valley — integrated vision." },
              { year: "2026", title: "300, never crowded", desc: "Premium, calm, human — capped membership, real care." },
            ].map((s, i) => (
              <motion.div
                key={s.year}
                className="about-timeline-card"
                {...fadeIn(i * 0.1)}
                whileHover={reduced ? {} : { y: -4 }}
              >
                <div className="about-timeline-year">{s.year}</div>
                <div className="about-timeline-title">{s.title}</div>
                <div className="about-timeline-desc">{s.desc}</div>
                <div className="about-timeline-line" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <PageFAQSection title={t("about.faqTitle")} questions={PAGE_FAQS.about} />
      <SomaCTA />

      <style>{`
        /* ═══════════ STORY ═══════════ */
        .about-story { padding: 80px 0; }
        .about-story-inner {
          max-width: 1440px; margin: 0 auto;
          padding: 0 clamp(20px, 4vw, 40px);
          display: grid; grid-template-columns: 0.95fr 1.05fr;
          gap: 48px; align-items: center;
        }
        .about-img-wrapper {
          position: relative; border-radius: 24px; overflow: hidden;
          background: #e8e2d4;
          box-shadow: 0 18px 48px rgba(24,61,45,0.10), 0 8px 20px rgba(24,61,45,0.06);
        }
        .about-img-wrapper img {
          width: 100%; height: 520px; object-fit: cover; display: block;
          transition: transform 0.8s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .about-img-wrapper:hover img { transform: scale(1.04); }
        .about-img-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, transparent 48%, rgba(24,61,45,0.12) 100%);
          pointer-events: none;
        }
        .about-img-badge {
          position: absolute; left: 16px; right: 16px; bottom: 16px;
          background: rgba(255,255,255,0.95); backdrop-filter: blur(12px);
          border-radius: 14px; padding: 12px 16px;
          border: 1px solid rgba(255,255,255,0.72);
          box-shadow: 0 10px 28px rgba(24,61,45,0.10);
          display: flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 700; color: var(--soma-forest);
          letter-spacing: 0.02em;
        }
        .about-badge-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--soma-gold); flex-shrink: 0;
        }

        /* ═══════════ EYEBROW ═══════════ */
        .about-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 10px; font-weight: 700;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: var(--soma-primary);
        }
        .about-eyebrow-line {
          width: 22px; height: 1px;
          background: var(--soma-primary); opacity: 0.44;
        }
        .about-eyebrow-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: linear-gradient(135deg, #F4B400 0%, #FFD54F 100%);
          box-shadow: 0 0 8px rgba(244,180,0,0.28); flex-shrink: 0;
        }

        /* ═══════════ TEXT ═══════════ */
        .about-heading {
          font-family: var(--font-display);
          font-size: clamp(30px, 4vw, 42px);
          font-weight: 300; line-height: 0.92;
          letter-spacing: -0.032em; color: var(--soma-forest);
          margin-top: 14px; position: relative;
        }
        .about-heading em {
          font-style: italic; font-weight: 400;
          color: var(--soma-primary);
        }
        .about-body {
          margin-top: 18px; font-size: 15px;
          line-height: 1.72; color: #5a6b63;
        }
        .about-body-sub {
          margin-top: 12px; font-size: 14px;
          line-height: 1.72; color: #5a6b63;
        }

        /* ═══════════ STATS ═══════════ */
        .about-stats {
          display: flex; gap: 16; margin-top: 28px;
          border-top: 1px solid var(--soma-line);
          padding-top: 20px;
        }
        .about-stat {
          flex: 1; text-align: center; position: relative;
        }
        .about-stat-num {
          font-family: var(--font-display);
          font-size: 28px; font-weight: 600;
          color: var(--soma-forest); letter-spacing: -0.02em;
          line-height: 1;
        }
        .about-stat-label {
          font-size: 10px; font-weight: 800;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--soma-forest); margin-top: 8px;
        }
        .about-stat-sub {
          font-size: 10px; color: var(--soma-warm-gray);
          letter-spacing: 0.04em; margin-top: 2px;
        }
        .about-stat-divider {
          position: absolute; right: -8px; top: 0; bottom: 0;
          width: 1px; background: var(--soma-line); opacity: 0.7;
        }

        /* ═══════════ SECTION HEADER ═══════════ */
        .about-section-header {
          text-align: center; max-width: 640px; margin: 0 auto 40px;
        }
        .about-section-title {
          font-family: var(--font-display);
          font-size: clamp(28px, 3.8vw, 40px);
          font-weight: 300; margin-top: 12px;
          color: var(--soma-forest); letter-spacing: -0.02em;
        }
        .about-section-title em {
          font-style: italic; font-weight: 400;
          color: var(--soma-primary);
        }

        /* ═══════════ VALUES ═══════════ */
        .about-values {
          background: #fff; padding: 80px 0;
          border-top: 1px solid var(--soma-line-light);
          border-bottom: 1px solid var(--soma-line-light);
        }
        .about-values-inner {
          max-width: 1440px; margin: 0 auto;
          padding: 0 clamp(20px, 4vw, 40px);
        }
        .about-values-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        .about-value-card {
          background: linear-gradient(180deg, #FBF7ED 0%, #FFF7E6 100%);
          border: 1px solid rgba(38,51,44,0.06);
          border-radius: 20px; padding: 24px;
          position: relative; overflow: hidden;
          box-shadow: 0 6px 20px rgba(24,61,45,0.04);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .about-value-card:hover {
          box-shadow: 0 12px 32px rgba(24,61,45,0.08);
        }
        .about-value-icon {
          width: 40px; height: 40px; border-radius: 50%;
          color: #fff; display: flex; align-items: center;
          justify-content: center; font-size: 15px;
          box-shadow: 0 4px 12px rgba(24,61,45,0.14);
        }
        .about-value-title {
          font-family: var(--font-display);
          font-size: 18px; font-weight: 600;
          margin-top: 14px; color: var(--soma-forest);
          letter-spacing: -0.01em;
        }
        .about-value-desc {
          margin-top: 8px; font-size: 13px;
          line-height: 1.6; color: #5a6b63;
        }
        .about-value-line {
          height: 1px; margin-top: 14px;
          background: linear-gradient(90deg, var(--soma-gold) 0%, transparent 88%);
          opacity: 0.42;
        }

        /* ═══════════ FOUNDER ═══════════ */
        .about-founder { padding: 80px 0; }
        .about-founder-inner {
          max-width: 1440px; margin: 0 auto;
          padding: 0 clamp(20px, 4vw, 40px);
          display: grid; grid-template-columns: 1.1fr 0.9fr;
          gap: 48px; align-items: center;
        }
        .about-img-founder { height: 480px; }
        .about-img-founder img { height: 100%; }
        .about-founder-badge {
          position: absolute; left: 14px; right: 14px; bottom: 14px;
          background: rgba(255,255,255,0.95); backdrop-filter: blur(12px);
          border-radius: 14px; padding: 10px 14px;
          display: flex; align-items: center; gap: 8px;
          border: 1px solid rgba(255,255,255,0.72);
          box-shadow: 0 8px 24px rgba(24,61,45,0.10);
          font-size: 11px; font-weight: 700;
          color: var(--soma-forest); letter-spacing: 0.02em;
        }
        .about-founder-actions {
          margin-top: 22px; display: flex; gap: 12px; flex-wrap: wrap;
        }
        .about-btn-primary {
          background: linear-gradient(135deg, #183D2D 0%, #2E7D5B 100%);
          color: #fff; padding: 14px 24px; border-radius: 9999px;
          font-size: 11px; font-weight: 800;
          letter-spacing: 0.12em; text-transform: uppercase;
          display: inline-flex; align-items: center; gap: 6px;
          box-shadow: 0 8px 22px rgba(24,61,45,0.18);
          text-decoration: none;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .about-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(24,61,45,0.24);
        }
        .about-btn-secondary {
          border: 1px solid rgba(38,51,44,0.12);
          padding: 13px 24px; border-radius: 9999px;
          font-size: 11px; font-weight: 700;
          letter-spacing: 0.12em; text-transform: uppercase;
          color: var(--soma-forest);
          background: linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.78) 100%);
          backdrop-filter: blur(8px);
          text-decoration: none;
          transition: transform 0.2s, border-color 0.2s;
        }
        .about-btn-secondary:hover {
          border-color: var(--soma-primary);
          transform: translateY(-1px);
        }

        /* ═══════════ GALLERY ═══════════ */
        .about-gallery { padding: 80px 0; background: #fff; }
        .about-gallery-inner {
          max-width: 1440px; margin: 0 auto;
          padding: 0 clamp(20px, 4vw, 40px);
        }
        .about-gallery-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          grid-auto-rows: 220px;
          gap: 16px;
        }
        .about-gallery-item {
          border-radius: 16px; overflow: hidden;
          position: relative; cursor: pointer;
        }
        .about-gallery-item img {
          width: 100%; height: 100%; object-fit: cover;
          transition: transform 0.6s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .about-gallery-item:hover img { transform: scale(1.08); }
        .about-gallery-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(180deg, transparent 50%, rgba(24,61,45,0.7) 100%);
          display: flex; align-items: flex-end;
          padding: 16px; opacity: 0;
          transition: opacity 0.3s ease;
        }
        .about-gallery-item:hover .about-gallery-overlay { opacity: 1; }
        .about-gallery-overlay span {
          color: #fff; font-size: 12px; font-weight: 600;
          letter-spacing: 0.04em;
        }
        .about-gallery-wide { grid-column: span 2; }
        .about-gallery-tall { grid-row: span 2; }

        /* ═══════════ TIMELINE ═══════════ */
        .about-timeline {
          padding: 80px 0;
          background: var(--soma-cream);
        }
        .about-timeline-inner {
          max-width: 1440px; margin: 0 auto;
          padding: 0 clamp(20px, 4vw, 40px);
        }
        .about-timeline-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 18px;
        }
        .about-timeline-card {
          background: linear-gradient(180deg, #fff 0%, #FFFBF8 100%);
          border: 1px solid var(--soma-line-light);
          border-radius: 16px; padding: 24px;
          text-align: center; position: relative;
          overflow: hidden;
          box-shadow: 0 6px 20px rgba(24,61,45,0.04);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .about-timeline-card:hover {
          box-shadow: 0 12px 32px rgba(24,61,45,0.08);
        }
        .about-timeline-year {
          font-family: var(--font-display);
          font-size: 28px; font-weight: 600;
          color: var(--soma-primary); letter-spacing: -0.02em;
        }
        .about-timeline-title {
          font-weight: 700; color: var(--soma-forest);
          margin-top: 8px; font-size: 14px;
        }
        .about-timeline-desc {
          font-size: 13px; color: #5a6b63;
          margin-top: 8px; line-height: 1.5;
        }
        .about-timeline-line {
          height: 2px; margin-top: 16px;
          background: linear-gradient(90deg, transparent, var(--soma-gold), transparent);
          opacity: 0.6;
        }

        /* ═══════════ RESPONSIVE ═══════════ */
        @media (max-width: 1024px) {
          .about-story-inner,
          .about-founder-inner {
            grid-template-columns: 1fr; gap: 32px;
          }
          .about-founder-text { order: 1; }
          .about-founder-img { order: 2; }
          .about-img-wrapper img { height: 400px; }
          .about-img-founder { height: 380px; }
          .about-gallery-grid {
            grid-template-columns: repeat(2, 1fr);
            grid-auto-rows: 180px;
          }
          .about-gallery-wide { grid-column: span 1; }
          .about-gallery-tall { grid-row: span 1; }
        }

        @media (max-width: 768px) {
          .about-values-grid,
          .about-timeline-grid {
            grid-template-columns: 1fr;
          }
          .about-stats { flex-direction: column; gap: 20px; }
          .about-stat-divider { display: none; }
          .about-gallery-grid {
            grid-template-columns: 1fr;
            grid-auto-rows: 200px;
          }
          .about-img-wrapper img { height: 300px; }
          .about-img-founder { height: 320px; }
          .about-heading { font-size: clamp(26px, 6vw, 34px); }
          .about-section-title { font-size: clamp(24px, 5vw, 32px); }
        }

        @media (max-width: 480px) {
          .about-story, .about-founder, .about-values,
          .about-gallery, .about-timeline { padding: 48px 0; }
          .about-img-wrapper img { height: 240px; }
          .about-img-founder { height: 280px; }
          .about-value-card { padding: 18px; }
          .about-timeline-card { padding: 18px; }
        }
      `}</style>
    </div>
  );
};

export default About;
