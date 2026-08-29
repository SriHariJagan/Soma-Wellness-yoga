import React from "react";
import { motion } from "framer-motion";
import SomaPageHeader from "../components/soma/SomaPageHeader";
import { PRIVATE_RATES } from "../config/siteContent";
import SomaCTA from "../components/soma/SomaCTA";
import SomaGuarantee from "../components/soma/SomaGuarantee";
import PageFAQSection from "../components/soma/PageFAQSection";
import { PAGE_FAQS } from "../config/siteContent";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import styles from "./Private.module.css";

const Private = () => {
  const { t } = useTranslation();
  const steps = [
    { n: "01", title: t("private.stepAssessmentTitle"), desc: t("private.stepAssessmentDesc"), img: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop" },
    { n: "02", title: t("private.stepPlanTitle"), desc: t("private.stepPlanDesc"), img: "https://images.unsplash.com/photo-1591343395082-e120087004b4?q=80&w=800&auto=format&fit=crop" },
    { n: "03", title: t("private.stepSessionsTitle"), desc: t("private.stepSessionsDesc"), img: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?q=80&w=800&auto=format&fit=crop" },
  ];
  return (
    <div style={{ background: "var(--soma-cream)" }}>
      <SomaPageHeader
        eyebrow={t("private.eyebrow")}
        title={t("private.title")}
        subtitle={t("private.subtitle")}
        image="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=900&auto=format&fit=crop"
      />

      {/* Sticky story */}
      <section className={styles.section}>
        <div className={styles.storyGrid}>
          <div className={styles.stickyCard}>
            <img src="https://images.unsplash.com/photo-1599901860904-17e6ed7083a0?q=80&w=800&auto=format&fit=crop" alt="Private yoga attractive" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 40%, rgba(24,61,45,0.55) 100%)" }} />
            <div style={{ position: "absolute", left: 16, right: 16, bottom: 16, background: "rgba(255,255,255,0.94)", backdropFilter: "blur(10px)", borderRadius: 14, padding: "12px 14px" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--soma-primary)" }}>{t("private.whyPrivate")}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--soma-forest)", marginTop: 2 }}>{t("private.whyPrivateDesc")}</div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {steps.map((s, i) => (
              <motion.div key={s.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ delay: i * 0.08 }} className={styles.stepCard}>
                <div style={{ height: 160, background: "#eee" }}><img src={s.img} alt={s.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" /></div>
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "var(--soma-gold)" }}>{s.n}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--soma-forest)", marginTop: 4 }}>{s.title}</div>
                  <div style={{ fontSize: 13, lineHeight: 1.6, color: "#5a6b63", marginTop: 6 }}>{s.desc}</div>
                </div>
              </motion.div>
            ))}
            <div style={{ background: "var(--soma-forest)", color: "#fff", borderRadius: 16, padding: 18 }}>
              <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.7 }}>{t("private.differentAtSoma")}</div>
              <div className={styles.compareGrid}>
                <div><strong style={{ color: "var(--soma-gold)" }}>{t("private.group")}</strong><br />{t("private.groupDesc")}</div>
                <div><strong style={{ color: "var(--soma-gold)" }}>{t("private.privateYou")}</strong><br />{t("private.privateDesc")}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.pricingSection}>
        <div className={styles.pricingWrapper}>
          <div className={styles.pricingScroll}>
            <div className={styles.pricingHeader}>
              <span>{t("private.service")}</span><span style={{ textAlign: "right" }}>{t("private.length")}</span><span style={{ textAlign: "right" }}>{t("private.price")}</span>
            </div>
            {PRIVATE_RATES.map((r, i) => (
              <div key={i} className={styles.pricingRow}>
                <span>{r.service}</span><span style={{ textAlign: "right", color: "#5a6b63" }}>{r.len}</span><span style={{ textAlign: "right", fontWeight: 700, color: "var(--soma-forest)" }}>{r.price}</span>
              </div>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 11, color: "var(--soma-warm-gray)", marginTop: 10, textAlign: "center" }}>Members 15% off · Home/hotel from 9,500 quoted on distance/group/duration · Therapy complements medical care, clearance may be required · 12h cancel (half), no-show full.</p>
      </section>

      {/* Private testimonials - unique */}
      <section style={{ maxWidth: 960, margin: "0 auto", padding: "0 clamp(20px,4vw,40px) 32px" }}>
        <div className={styles.testimonialsGrid}>
          {[
            { q: "After my knee surgery, one-to-one therapy brought me back to walking without fear. Amina’s assessment was thorough, not rushed. I felt safe.", n: "Patricia W.", r: "Therapy · 10 sessions" },
            { q: "I travel for work. Private at my hotel at 6am — Daniel meets me where I am. No gym energy, just breath and focus.", n: "Brian O.", r: "Private · Executive" },
          ].map((t) => (
            <div key={t.n} style={{ background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 16, padding: 18 }}>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 15, lineHeight: 1.5, color: "var(--soma-forest)" }}>"{t.q}"</div>
              <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: "var(--soma-forest)" }}>{t.n} <span style={{ fontWeight: 400, color: "#5a6b63" }}>· {t.r}</span></div>
            </div>
          ))}
        </div>
      </section>

      <SomaGuarantee />

      <PageFAQSection title={t("private.faqTitle")} questions={PAGE_FAQS.private} />

      <SomaCTA />
    </div>
  );
};
export default Private;
