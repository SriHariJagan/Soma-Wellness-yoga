import React from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import SomaPageHeader from "../components/soma/SomaPageHeader";
import SomaCTA from "../components/soma/SomaCTA";
import PageFAQSection from "../components/soma/PageFAQSection";
import { PAGE_FAQS } from "../config/siteContent";
import { EASE, usePrefersReducedMotion } from "../lib/motion";

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

const About = () => {
  const reduced = usePrefersReducedMotion();
  return (
    <div style={{ background: "var(--soma-cream)" }}>
      <SomaPageHeader
        eyebrow="About SOMA Wellness Nairobi · Spring Valley"
        title="An integrated wellness<br /><em>destination.</em>"
        subtitle="Not a studio, gym or spa — but a calm, premium home for Yoga, Therapy, Meditation and mindful living in Nairobi. Rebalance · Renew · Restore · Reconnect."
        image="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=900&auto=format&fit=crop"
      />

      {/* Story — premium editorial */}
      <section style={{ padding: "64px 0", maxWidth: 1440, margin: "0 auto", paddingLeft: "clamp(20px,4vw,40px)", paddingRight: "clamp(20px,4vw,40px)", position: "relative" }}>
        <div style={{ position: "absolute", top: 40, right: -40, width: 340, height: 340, background: "radial-gradient(50% 50% at 50% 50%, rgba(129,178,154,0.07) 0%, transparent 72%)", borderRadius: "50%", pointerEvents: "none" }} aria-hidden="true" />
        <div style={{ display: "grid", gridTemplateColumns: "0.95fr 1.05fr", gap: 48, alignItems: "center", position: "relative" }} className="about-grid">
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.75, ease: EASE }}
            whileHover={reduced ? {} : { y: -4 }}
            style={{ position: "relative", borderRadius: 24, overflow: "hidden", background: "#e8e2d4", boxShadow: "0 18px 48px rgba(24,61,45,0.10), 0 8px 20px rgba(24,61,45,0.06), inset 0 1px 0 rgba(255,255,255,0.42)", border: "1px solid rgba(255,255,255,0.52)", order: 1 }}
          >
            <motion.img
              src="https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?q=80&w=900&auto=format&fit=crop"
              alt="Soma studio"
              style={{ width: "100%", height: 520, objectFit: "cover", display: "block" }}
              loading="lazy"
              initial={reduced ? { scale: 1 } : { scale: 1.06 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: EASE }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 48%, rgba(24,61,45,0.08) 100%)", pointerEvents: "none" }} aria-hidden="true" />
            <div style={{ position: "absolute", inset: 12, border: "1px solid rgba(255,255,255,0.38)", borderRadius: 16, pointerEvents: "none" }} aria-hidden="true" />
            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3, ease: EASE }} style={{ position: "absolute", left: 16, right: 16, bottom: 16, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", borderRadius: 16, padding: "14px 16px", border: "1px solid rgba(255,255,255,0.72)", boxShadow: "0 10px 28px rgba(24,61,45,0.10)" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--soma-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", flexShrink: 0 }} aria-hidden="true" /> Our promise
              </div>
              <div style={{ fontSize: 12, color: "var(--soma-charcoal)", marginTop: 4, lineHeight: 1.5 }}>Premium, calm, human — always. Small groups, conscious teachers.</div>
            </motion.div>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.10, delayChildren: reduced ? 0 : 0.12 } } }}
            style={{ order: 2 }}
          >
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } }} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 22, height: 1, background: "var(--soma-primary)", opacity: 0.44, display: "inline-block" }} aria-hidden="true" />
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "linear-gradient(135deg, #F4B400 0%, #FFD54F 100%)", boxShadow: "0 0 8px rgba(244,180,0,0.28)", flexShrink: 0 }} aria-hidden="true" />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--soma-primary)" }}>Our story</span>
            </motion.div>
            <motion.h2
              variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } } }}
              style={{ fontFamily: "var(--font-display)", fontSize: "clamp(30px,4vw,42px)", fontWeight: 300, lineHeight: 0.92, letterSpacing: "-0.032em", color: "var(--soma-forest)", marginTop: 14, position: "relative" }}
            >
              A calm, welcoming <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--soma-primary)" }}>home</em> for body, breath and mind.
              <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.4, ease: EASE }} style={{ position: "absolute", left: 0, right: 22, bottom: -4, height: 2, background: "linear-gradient(90deg, rgba(244,180,0,0.28) 0%, transparent 88%)", transformOrigin: "left", borderRadius: 999 }} aria-hidden="true" />
            </motion.h2>
            <motion.p variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }} style={{ marginTop: 18, fontSize: 15, lineHeight: 1.72, color: "#5a6b63" }}>
              SOMA Wellness Nairobi is an integrated destination in Spring Valley — where Yoga, Yoga Therapy, Meditation, Breathwork, Massage and wellness rituals sit together under one holistic philosophy. We bring movement, breath, mindfulness, therapy, education and lifestyle together so you can cultivate a healthier relationship with your body, breath, mind and everyday life.
            </motion.p>
            <motion.p variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }} style={{ marginTop: 12, fontSize: 14, lineHeight: 1.72, color: "#5a6b63" }}>
              Every detail — light, wood, linen, silence — is considered so your nervous system can exhale. No mirrors demanding perfection. No hustle disguised as healing. Just honest, integrated practice held with care, in Nairobi’s most intentional wellness space (300 members, never crowded).
            </motion.p>
            <motion.div
              variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.08 } } }}
              style={{ display: "flex", gap: 16, marginTop: 22, borderTop: "1px solid var(--soma-line)", paddingTop: 18 }}
            >
              {[
                { n: 5000, suffix: "+", l: "students", sub: "transformed" },
                { n: 18, suffix: "+", l: "years", sub: "in practice" },
                { n: 6, suffix: "+", l: "teachers", sub: "lineage" },
              ].map((s, i) => (
                <React.Fragment key={s.l}>
                  <motion.div variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }} style={{ textAlign: "center", flex: 1 }}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.6, delay: 0.2 + i * 0.08, ease: EASE }}
                      style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600, color: "var(--soma-forest)", letterSpacing: "-0.02em", lineHeight: 1, display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2 }}
                    >
                      <CountUp value={s.n} suffix={s.suffix} reduced={reduced} />
                    </motion.div>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--soma-forest)", marginTop: 6 }}>{s.l}</div>
                    <div style={{ fontSize: 10, color: "var(--soma-warm-gray)", letterSpacing: "0.04em" }}>{s.sub}</div>
                    <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.4 + i * 0.08, ease: EASE }} style={{ display: "block", height: 2, background: "linear-gradient(90deg, var(--soma-gold) 0%, transparent 88%)", marginTop: 8, transformOrigin: "center", borderRadius: 999 }} aria-hidden="true" />
                  </motion.div>
                  {i < 2 && <div style={{ width: 1, background: "var(--soma-line)", alignSelf: "stretch", opacity: 0.7 }} aria-hidden="true" />}
                </React.Fragment>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Values — premium */}
      <section style={{ background: "#fff", padding: "72px 0", borderTop: "1px solid var(--soma-line-light)", borderBottom: "1px solid var(--soma-line-light)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(60% 60% at 50% 0%, rgba(129,178,154,0.05) 0%, transparent 62%)", pointerEvents: "none" }} aria-hidden="true" />
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 clamp(20px,4vw,40px)", position: "relative" }}>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: EASE }}
            style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 36px" }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--soma-primary)", display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", boxShadow: "0 0 8px rgba(244,180,0,0.28)", flexShrink: 0 }} aria-hidden="true" /> What we hold
            </span>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,3.8vw,40px)", fontWeight: 300, marginTop: 12, color: "var(--soma-forest)", letterSpacing: "-0.02em" }}>
              Values you can <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--soma-primary)" }}>feel</em>
              <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3, ease: EASE }} style={{ display: "block", height: 2, background: "linear-gradient(90deg, transparent, var(--soma-gold), transparent)", marginTop: 10, transformOrigin: "center", opacity: 0.9 }} aria-hidden="true" />
            </h3>
          </motion.div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.07, delayChildren: reduced ? 0 : 0.12 } } }}
            style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}
          >
            {[
              { title: "Lineage, not rigidity", desc: "Traditional roots, taught with modern understanding and kindness.", icon: "◯" },
              { title: "Small & seen", desc: "Groups of 12 max. Hands-on adjustments, real relationships.", icon: "◎" },
              { title: "Design as care", desc: "Light, wood, linen and silence — a space that lets you arrive.", icon: "✦" },
              { title: "Science + softness", desc: "Nervous-system aware, inclusive, and paced for real lives.", icon: "⬢" },
              { title: "Community over performance", desc: "We practice together. No mirrors, no hustle.", icon: "♥" },
              { title: "Every season, every body", desc: "Prenatal, therapeutic, kids, corporate — yoga that meets you.", icon: "✺" },
            ].map((v) => (
              <motion.div
                key={v.title}
                variants={{ hidden: { opacity: 0, y: 16, scale: 0.98 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE } } }}
                whileHover={reduced ? {} : { y: -5, scale: 1.015 }}
                style={{ background: "linear-gradient(180deg, #FBF7ED 0%, #FFF7E6 100%)", border: "1px solid rgba(38,51,44,0.06)", borderRadius: 20, padding: 22, position: "relative", overflow: "hidden", boxShadow: "0 6px 20px rgba(24,61,45,0.04), inset 0 1px 0 rgba(255,255,255,0.7)" }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)", pointerEvents: "none" }} aria-hidden="true" />
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #183D2D 0%, #2E7D5B 100%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, boxShadow: "0 4px 12px rgba(24,61,45,0.14)" }} aria-hidden="true">{v.icon}</div>
                <h4 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, marginTop: 12, color: "var(--soma-forest)", letterSpacing: "-0.01em" }}>{v.title}</h4>
                <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: "#5a6b63" }}>{v.desc}</p>
                <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }} style={{ display: "block", height: 1, background: "linear-gradient(90deg, var(--soma-gold) 0%, transparent 88%)", marginTop: 12, transformOrigin: "left", opacity: 0.42 }} aria-hidden="true" />
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Founder — premium */}
      <section style={{ padding: "72px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(50% 50% at 20% 20%, rgba(129,178,154,0.05) 0%, transparent 62%)", pointerEvents: "none" }} aria-hidden="true" />
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 clamp(20px,4vw,40px)", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 36, alignItems: "center", position: "relative" }}>
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-60px" }} variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.10, delayChildren: reduced ? 0 : 0.14 } } }}>
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } }} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 22, height: 1, background: "var(--soma-primary)", opacity: 0.44, display: "inline-block" }} aria-hidden="true" />
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "linear-gradient(135deg, #F4B400 0%, #FFD54F 100%)", flexShrink: 0 }} aria-hidden="true" />
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--soma-primary)" }}>Leadership</span>
            </motion.div>
            <motion.h3 variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } } }} style={{ fontFamily: "var(--font-display)", fontSize: 34, fontWeight: 300, marginTop: 12, color: "var(--soma-forest)", letterSpacing: "-0.02em", lineHeight: 0.92 }}>
              Guided by <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--soma-primary)" }}>practice</em>
              <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.4, ease: EASE }} style={{ display: "block", height: 2, background: "linear-gradient(90deg, rgba(244,180,0,0.28) 0%, transparent 88%)", marginTop: 8, transformOrigin: "left", borderRadius: 999 }} aria-hidden="true" />
            </motion.h3>
            <motion.p variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }} style={{ marginTop: 14, fontSize: 15, lineHeight: 1.72, color: "#5a6b63" }}>
              Led by teachers rooted in lineage and modern wellness education — yoga therapy, meditation and mindful movement for Nairobi’s community. We teach from lived practice, not performance, and adapt every session to your needs, limitations and stage of life.
            </motion.p>
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } }} style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
              <motion.div whileHover={reduced ? {} : { y: -2 }} whileTap={{ scale: 0.98 }}>
                <Link to="/classes" style={{ background: "linear-gradient(135deg, #183D2D 0%, #2E7D5B 100%)", color: "#fff", padding: "13px 20px", borderRadius: 9999, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", display: "inline-flex", alignItems: "center", gap: 6, boxShadow: "0 8px 22px rgba(24,61,45,0.18)" }}>
                  Explore programs <span>→</span>
                </Link>
              </motion.div>
              <Link to="/contact" style={{ border: "1px solid rgba(38,51,44,0.12)", padding: "12px 20px", borderRadius: 9999, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--soma-forest)", background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.78) 100%)", backdropFilter: "blur(8px)" }}>
                Visit us
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.75, ease: EASE }}
            whileHover={reduced ? {} : { y: -4 }}
            style={{ borderRadius: 24, overflow: "hidden", background: "#e8e2d4", position: "relative", boxShadow: "0 18px 48px rgba(24,61,45,0.10), 0 8px 20px rgba(24,61,45,0.06), inset 0 1px 0 rgba(255,255,255,0.42)", border: "1px solid rgba(255,255,255,0.52)" }}
          >
            <motion.img
              src="/images/instructor/kapil.webp"
              alt="Lead teacher"
              style={{ width: "100%", height: 480, objectFit: "cover", display: "block" }}
              loading="lazy"
              onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?q=80&w=800&auto=format&fit=crop"; }}
              initial={reduced ? { scale: 1 } : { scale: 1.06 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, ease: EASE }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 48%, rgba(24,61,45,0.08) 100%)", pointerEvents: "none" }} aria-hidden="true" />
            <div style={{ position: "absolute", inset: 12, border: "1px solid rgba(255,255,255,0.38)", borderRadius: 16, pointerEvents: "none" }} aria-hidden="true" />
            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3, ease: EASE }} style={{ position: "absolute", left: 14, right: 14, bottom: 14, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(12px)", borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, border: "1px solid rgba(255,255,255,0.72)", boxShadow: "0 8px 24px rgba(24,61,45,0.10)" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--soma-gold)", boxShadow: "0 0 10px rgba(244,180,0,0.28)", flexShrink: 0 }} aria-hidden="true" />
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--soma-forest)", letterSpacing: "0.02em" }}>6+ teachers · lineage + modern science</span>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* NEW — Studio timeline where thin */}
      <section style={{ maxWidth: 1440, margin: "0 auto", padding: "0 clamp(20px,4vw,40px) 64px" }}>
        <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }} style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 20px" }}>
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--soma-primary)", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", flexShrink: 0 }} aria-hidden="true" /> Our journey
          </span>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 300, color: "var(--soma-forest)", marginTop: 8 }}>From quiet intention to <em style={{ fontStyle: "italic", color: "var(--soma-primary)" }}>Spring Valley home.</em></h3>
        </motion.div>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.08 } } }}
          style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}
        >
          {[
            { year: "2008", title: "First breath", desc: "Begin teaching — small groups, lineage, hands-on." },
            { year: "2018", title: "Nairobi calling", desc: "Bring practice to Spring Valley — integrated vision." },
            { year: "2026", title: "300, never crowded", desc: "Premium, calm, human — capped membership, real care." },
          ].map((s) => (
            <motion.div key={s.year} variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }} whileHover={reduced ? {} : { y: -4 }} style={{ background: "linear-gradient(180deg, #fff 0%, #FFFBF8 100%)", border: "1px solid var(--soma-line-light)", borderRadius: 16, padding: 18, textAlign: "center", position: "relative", overflow: "hidden", boxShadow: "0 6px 20px rgba(24,61,45,0.04)" }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(244,180,0,0.32), transparent)", pointerEvents: "none" }} aria-hidden="true" />
              <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 600, color: "var(--soma-primary)", letterSpacing: "-0.02em" }}>{s.year}</div>
              <div style={{ fontWeight: 700, color: "var(--soma-forest)", marginTop: 6, fontSize: 13 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: "#5a6b63", marginTop: 6, lineHeight: 1.5 }}>{s.desc}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <PageFAQSection title="About SOMA — common questions" questions={PAGE_FAQS.about} />

      <SomaCTA />

      <style>{`@media(max-width:900px){.about-grid{grid-template-columns:1fr !important;}}`}</style>
    </div>
  );
};

export default About;
