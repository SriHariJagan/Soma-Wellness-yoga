import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import SomaPageHeader from "../components/soma/SomaPageHeader";
import SomaCTA from "../components/soma/SomaCTA";

const About = () => {
  return (
    <div style={{ background: "var(--soma-cream)" }}>
      <SomaPageHeader
        eyebrow="About SOMA Wellness Nairobi · Spring Valley"
        title="An integrated wellness<br /><em>destination.</em>"
        subtitle="Not a studio, gym or spa — but a calm, premium home for Yoga, Therapy, Meditation and mindful living in Nairobi. Rebalance · Renew · Restore · Reconnect."
        image="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=900&auto=format&fit=crop"
      />

      {/* Story */}
      <section style={{ padding: "56px 0", maxWidth: 1440, margin: "0 auto", paddingLeft: "clamp(20px,4vw,40px)", paddingRight: "clamp(20px,4vw,40px)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 48, alignItems: "center" }} className="about-grid">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--soma-primary)" }}>Our story</span>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px,4vw,40px)", fontWeight: 300, lineHeight: 0.95, letterSpacing: "-0.03em", color: "var(--soma-forest)", marginTop: 12 }}>
              A calm, welcoming <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--soma-primary)" }}>home</em> for body, breath and mind.
            </h2>
            <p style={{ marginTop: 16, fontSize: 15, lineHeight: 1.7, color: "#5a6b63" }}>
              SOMA Wellness Nairobi is an integrated destination in Spring Valley — where Yoga, Yoga Therapy, Meditation, Breathwork, Massage and wellness rituals sit together under one holistic philosophy. We bring movement, breath, mindfulness, therapy, education and lifestyle together so you can cultivate a healthier relationship with your body, breath, mind and everyday life.
            </p>
            <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.7, color: "#5a6b63" }}>
              Every detail — light, wood, linen, silence — is considered so your nervous system can exhale. No mirrors demanding perfection. No hustle disguised as healing. Just honest, integrated practice held with care, in Nairobi’s most intentional wellness space (300 members, never crowded).
            </p>
            <div style={{ display: "flex", gap: 16, marginTop: 20, borderTop: "1px solid var(--soma-line)", paddingTop: 18 }}>
              <div><div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--soma-forest)" }}>5000+</div><div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--soma-warm-gray)" }}>students</div></div>
              <div style={{ width: 1, background: "var(--soma-line)" }} />
              <div><div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--soma-forest)" }}>18+</div><div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--soma-warm-gray)" }}>years</div></div>
              <div style={{ width: 1, background: "var(--soma-line)" }} />
              <div><div style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--soma-forest)" }}>6+</div><div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--soma-warm-gray)" }}>teachers</div></div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.98 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ position: "relative", borderRadius: 24, overflow: "hidden", background: "#e8e2d4", boxShadow: "0 16px 40px rgba(24,61,45,0.10)" }}>
            <img src="https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?q=80&w=900&auto=format&fit=crop" alt="Soma studio" style={{ width: "100%", height: 520, objectFit: "cover" }} loading="lazy" />
            <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, background: "rgba(255,255,255,0.94)", backdropFilter: "blur(10px)", borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--soma-primary)" }}>Our promise</div>
              <div style={{ fontSize: 12, color: "var(--soma-charcoal)", marginTop: 2 }}>Premium, calm, human — always. Small groups, conscious teachers.</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Values */}
      <section style={{ background: "#fff", padding: "64px 0", borderTop: "1px solid var(--soma-line-light)", borderBottom: "1px solid var(--soma-line-light)" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 clamp(20px,4vw,40px)" }}>
          <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 36px" }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--soma-primary)" }}>What we hold</span>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(26px,3.8vw,38px)", fontWeight: 300, marginTop: 10, color: "var(--soma-forest)" }}>Values you can <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--soma-primary)" }}>feel</em></h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
            {[
              { title: "Lineage, not rigidity", desc: "Traditional roots, taught with modern understanding and kindness." },
              { title: "Small & seen", desc: "Groups of 12 max. Hands-on adjustments, real relationships." },
              { title: "Design as care", desc: "Light, wood, linen and silence — a space that lets you arrive." },
              { title: "Science + softness", desc: "Nervous-system aware, inclusive, and paced for real lives." },
              { title: "Community over performance", desc: "We practice together. No mirrors, no hustle." },
              { title: "Every season, every body", desc: "Prenatal, therapeutic, kids, corporate — yoga that meets you." },
            ].map((v) => (
              <div key={v.title} style={{ background: "var(--soma-cream)", border: "1px solid var(--soma-line-light)", borderRadius: 20, padding: 22 }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--soma-gold)" }}>—</div>
                <h4 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, marginTop: 8, color: "var(--soma-forest)" }}>{v.title}</h4>
                <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.6, color: "#5a6b63" }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder */}
      <section style={{ padding: "64px 0" }}>
        <div style={{ maxWidth: 1440, margin: "0 auto", padding: "0 clamp(20px,4vw,40px)", display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 32, alignItems: "center" }}>
          <div style={{ borderRadius: 20, overflow: "hidden", background: "#ddd" }}>
            <img src="/images/instructor/kapil.webp" alt="Lead teacher" style={{ width: "100%", height: 480, objectFit: "cover" }} loading="lazy" onError={(e) => { e.currentTarget.src = "https://images.unsplash.com/photo-1447452001602-7090c7ab2db3?q=80&w=800&auto=format&fit=crop"; }} />
          </div>
          <div>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--soma-primary)" }}>Leadership</span>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 300, marginTop: 8, color: "var(--soma-forest)" }}>Guided by <em style={{ fontStyle: "italic", fontWeight: 400, color: "var(--soma-primary)" }}>practice</em></h3>
            <p style={{ marginTop: 12, fontSize: 14, lineHeight: 1.7, color: "#5a6b63" }}>
              Led by teachers rooted in lineage and modern wellness education — yoga therapy, meditation and mindful movement for Nairobi’s community. We teach from lived practice, not performance, and adapt every session to your needs, limitations and stage of life.
            </p>
            <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
              <Link to="/classes" style={{ background: "var(--soma-forest)", color: "#fff", padding: "12px 20px", borderRadius: 9999, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>Explore programs</Link>
              <Link to="/contact" style={{ border: "1px solid var(--soma-line-strong)", padding: "12px 20px", borderRadius: 9999, fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--soma-forest)", background: "#fff" }}>Visit us</Link>
            </div>
          </div>
        </div>
      </section>

      <SomaCTA />

      <style>{`@media(max-width:900px){.about-grid{grid-template-columns:1fr !important;}}`}</style>
    </div>
  );
};

export default About;
