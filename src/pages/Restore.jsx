import React, { useRef } from "react";
import { motion } from "framer-motion";
import SomaPageHeader from "../components/soma/SomaPageHeader";
import { RESTORE_TREATMENTS } from "../config/siteContent";
import SomaCTA from "../components/soma/SomaCTA";
import PageFAQSection from "../components/soma/PageFAQSection";
import { PAGE_FAQS } from "../config/siteContent";
import { EASE, usePrefersReducedMotion } from "../lib/motion";
import { useTranslation } from "react-i18next";
import styles from "./Restore.module.css";

const Restore = () => {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();
  const scrollRef = useRef(null);

  const signatures = [
    { name: "STILLNESS", sub: t("restore.sig.stillness.sub"), desc: t("restore.sig.stillness.desc"), len: "2 hrs", price: "11,000", img: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=800&auto=format&fit=crop" },
    { name: "THE ACACIA", sub: t("restore.sig.acacia.sub"), desc: t("restore.sig.acacia.desc"), len: "2.5 hrs", price: "18,500", img: "https://images.unsplash.com/photo-1600334089648-bd6e2a7a65a8?q=80&w=800&auto=format&fit=crop" },
    { name: "FOR TWO", sub: t("restore.sig.forTwo.sub"), desc: t("restore.sig.forTwo.desc"), len: "2 hrs", price: "22,500", per: t("restore.sig.forTwoPer"), img: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=800&auto=format&fit=crop" },
    { name: "BREATHE", sub: t("restore.sig.breathe.sub"), desc: t("restore.sig.breathe.desc"), len: "90 min", price: "4,500", img: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?q=80&w=800&auto=format&fit=crop" },
    { name: "NIDRA", sub: t("restore.sig.nidra.sub"), desc: t("restore.sig.nidra.desc"), len: "75 min", price: "3,800", img: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=800&auto=format&fit=crop" },
    { name: "AROMA", sub: t("restore.sig.aroma.sub"), desc: t("restore.sig.aroma.desc"), len: "90 min", price: "6,500", img: "https://images.unsplash.com/photo-1591343395082-e120087004b4?q=80&w=800&auto=format&fit=crop" },
  ];
  return (
    <div style={{ background: "var(--soma-cream)" }}>
      <SomaPageHeader
        eyebrow={t("restore.eyebrow")}
        title={t("restore.title")}
        subtitle={t("restore.subtitle")}
        image="https://images.unsplash.com/photo-1596178065887-1198b6148b2b?q=80&w=900&auto=format&fit=crop"
      />

      {/* Treatments - editorial premium */}
      <section className={styles.section}>
        <div className={styles.treatmentsGrid}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--soma-gold)", boxShadow: "0 0 10px rgba(244,180,0,0.28)", flexShrink: 0 }} aria-hidden="true" />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--soma-primary)" }}>{t("restore.massageMeditation")}</span>
              <span style={{ fontSize: 10, fontWeight: 700, background: "var(--soma-ivory)", border: "1px solid var(--soma-line-light)", padding: "4px 8px", borderRadius: 9999, color: "var(--soma-warm-gray)" }}>7 treatments</span>
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 300, color: "var(--soma-forest)", letterSpacing: "-0.02em", lineHeight: 0.95 }}><span dangerouslySetInnerHTML={{ __html: t("restore.unhurriedTouch") }} /></h3>
            <p style={{ fontSize: 13.5, color: "#5a6b63", marginTop: 8, lineHeight: 1.6 }}>{t("restore.meditationIncluded")}</p>
            <div className={styles.pricingWrapper}>
              <div className={styles.pricingScroll}>
                <div className={styles.pricingHeader}>
                <span>{t("restore.treatment")}</span><span style={{ textAlign: "right" }}>{t("restore.length")}</span><span style={{ textAlign: "right" }}>{t("restore.price")}</span>
                <span style={{ position: "absolute", bottom: 0, left: 16, right: 16, height: 1, background: "linear-gradient(90deg, transparent, rgba(244,180,0,0.42), transparent)", pointerEvents: "none" }} aria-hidden="true" />
              </div>
              {RESTORE_TREATMENTS.map((t, i) => (
                <motion.div
                  key={i}
                  variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } } }}
                  whileHover={reduced ? {} : { x: 2, backgroundColor: i % 2 ? "rgba(244,180,0,0.04)" : "rgba(46,125,91,0.03)" }}
                  className={styles.pricingRow}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--soma-primary)", flexShrink: 0, opacity: 0.9 }} aria-hidden="true" />
                    {t.name}
                  </span>
                  <span style={{ textAlign: "right", color: "#5a6b63", fontWeight: 500 }}>{t.len}</span>
                  <span style={{ textAlign: "right", fontWeight: 800, color: "var(--soma-forest)", letterSpacing: "-0.01em" }}>{t.price} <span style={{ fontSize: 10, fontWeight: 600, color: "var(--soma-warm-gray)" }}>KES</span></span>
                </motion.div>
              ))}
                </div>
              </div>
            </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.18, ease: EASE }}
            whileHover={reduced ? {} : { y: -4, scale: 1.01 }}
            className={styles.stickyCard}
          >
            <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, border: "1px solid rgba(255,255,255,0.07)", borderRadius: "50%", pointerEvents: "none" }} aria-hidden="true" />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(112deg, transparent 38%, rgba(255,255,255,0.06) 48%, transparent 62%)", pointerEvents: "none" }} aria-hidden="true" />
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.72, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", boxShadow: "0 0 8px rgba(244,180,0,0.32)", flexShrink: 0 }} aria-hidden="true" /> The Six-Week Reset
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 300, marginTop: 10, letterSpacing: "-0.02em", lineHeight: 0.95 }}>Six weeks to <em style={{ fontStyle: "italic", color: "#F4B400" }}>rebuild</em></div>
            <div style={{ fontSize: 13, lineHeight: 1.65, opacity: 0.88, marginTop: 10 }}>Opening assessment · 12 yoga · 6 meditation/Nidra · 2 sixty-min massages · home plan · closing review</div>
            <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.4, ease: EASE }} style={{ height: 1, background: "linear-gradient(90deg, rgba(244,180,0,0.42) 0%, transparent 88%)", marginTop: 14, transformOrigin: "left" }} aria-hidden="true" />
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 14 }}>
              <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>32,000</span>
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.72, letterSpacing: "0.06em" }}>KES</span>
              <span style={{ fontSize: 10, fontWeight: 700, background: "var(--soma-gold)", color: "var(--soma-forest)", padding: "4px 8px", borderRadius: 9999, marginLeft: 8 }}>{t("restore.mostChosen")}</span>
            </div>
            <div style={{ fontSize: 11, opacity: 0.62, marginTop: 8, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.10)", padding: "8px 10px", borderRadius: 10, backdropFilter: "blur(6px)" }}>{t("restore.matsOils")}</div>
            <motion.div initial={{ clipPath: "inset(10% 0 0 0)" }} whileInView={{ clipPath: "inset(0% 0 0 0)" }} viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE }} style={{ marginTop: 16, borderRadius: 14, overflow: "hidden", position: "relative", border: "1px solid rgba(255,255,255,0.14)" }}>
              <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=600&auto=format&fit=crop" alt="Reset" style={{ width: "100%", height: 168, objectFit: "cover", display: "block" }} loading="lazy" />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 52%, rgba(24,61,45,0.18) 100%)", pointerEvents: "none" }} aria-hidden="true" />
              <div style={{ position: "absolute", left: 10, bottom: 10, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(8px)", padding: "6px 10px", borderRadius: 9999, fontSize: 10, fontWeight: 700, color: "var(--soma-forest)", letterSpacing: "0.06em", boxShadow: "0 4px 14px rgba(0,0,0,0.12)" }}>6 weeks · 21 sessions</div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Signature - premium horizontal */}
      <section className={styles.signatureSection}>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap" }}
        >
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--soma-gold)", boxShadow: "0 0 10px rgba(244,180,0,0.28)", flexShrink: 0 }} aria-hidden="true" />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--soma-primary)" }}>{t("restore.signature")}</span>
              <span style={{ fontSize: 10, background: "var(--soma-ivory)", border: "1px solid var(--soma-line-light)", padding: "4px 8px", borderRadius: 9999, color: "var(--soma-warm-gray)", fontWeight: 700 }}>6 journeys · drag →</span>
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 300, color: "var(--soma-forest)", letterSpacing: "-0.02em", lineHeight: 0.95 }}>Signature <em style={{ fontStyle: "italic", color: "var(--soma-primary)" }}>experiences</em></h3>
            <p style={{ fontSize: 12.5, color: "#5a6b63", marginTop: 6, lineHeight: 1.6 }}>Half a morning or an afternoon, one journey. Mon–Fri 10:00–15:00 · Weekends 20% surcharge · Swipe →</p>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--soma-warm-gray)", background: "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.78) 100%)", border: "1px solid rgba(255,255,255,0.62)", padding: "8px 12px", borderRadius: 9999, boxShadow: "0 4px 14px rgba(24,61,45,0.06)", display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-primary)", flexShrink: 0 }} aria-hidden="true" /> Drag / scroll →
          </div>
        </motion.div>

        <div className={styles.signatureCarousel} ref={scrollRef}>
          <motion.div
            drag={reduced ? false : "x"}
            dragConstraints={{ left: -1100, right: 0 }}
            dragElastic={0.18}
            dragMomentum={true}
            whileTap={{ cursor: "grabbing" }}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.07, delayChildren: reduced ? 0 : 0.1 } } }}
            className={styles.signatureTrack}
          >
            {signatures.map((s) => (
              <motion.div
                key={s.name}
                variants={{ hidden: { opacity: 0, y: 18, scale: 0.97 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE } } }}
                whileHover={reduced ? {} : { y: -6, scale: 1.015 }}
                whileTap={{ scale: 0.98 }}
                className={styles.signatureCard}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)", pointerEvents: "none", zIndex: 2 }} aria-hidden="true" />
                <div style={{ height: 200, overflow: "hidden", background: "#e8e2d4", position: "relative" }}>
                  <motion.img
                    src={s.img}
                    alt={s.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
                    loading="lazy"
                    draggable={false}
                    whileHover={reduced ? {} : { scale: 1.06 }}
                    transition={{ duration: 0.7, ease: EASE }}
                  />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 42%, rgba(24,61,45,0.14) 100%)", pointerEvents: "none" }} aria-hidden="true" />
                  <div style={{ position: "absolute", inset: 10, border: "1px solid rgba(255,255,255,0.42)", borderRadius: 12, pointerEvents: "none" }} aria-hidden="true" />
                  <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(8px)", padding: "6px 10px", borderRadius: 9999, fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--soma-forest)", boxShadow: "0 4px 14px rgba(0,0,0,0.10)", display: "inline-flex", alignItems: "center", gap: 6, pointerEvents: "none" }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", flexShrink: 0 }} aria-hidden="true" /> {s.len} · {s.price} KES {s.per || ""}
                  </div>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 500, color: "var(--soma-forest)", letterSpacing: "-0.015em", lineHeight: 1 }}>{s.name}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--soma-primary)", textTransform: "uppercase", letterSpacing: "0.07em", marginTop: 6 }}>{s.sub}</div>
                  <div style={{ fontSize: 12.5, color: "#5a6b63", marginTop: 8, lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Benefits & safety — premium */}
      <section className={styles.section}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.09, delayChildren: reduced ? 0 : 0.12 } } }}
          className={styles.benefitsGrid}
        >
          {[
            { t: "Deep calm, not sedation", d: "Restorative yoga + Nidra + massage to down-regulate, not just relax.", icon: "◯" },
            { t: "Premium, unhurried", d: "2–2.5 hrs, tea, rest, no rushing. Real recovery, not a quick spa slot.", icon: "✦" },
            { t: "Safe & medical-aware", d: "Tell us about pregnancy, surgery, pain or heart concerns. Clearance respected.", icon: "✓" },
          ].map((b) => (
            <motion.div
              key={b.t}
              variants={{ hidden: { opacity: 0, y: 16, scale: 0.98 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: EASE } } }}
              whileHover={reduced ? {} : { y: -4, scale: 1.015 }}
              style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.90) 100%)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.62)", borderRadius: 16, padding: 18, position: "relative", overflow: "hidden", boxShadow: "0 8px 24px rgba(24,61,45,0.06), inset 0 1px 0 rgba(255,255,255,0.72)", textAlign: "left" }}
            >
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)", pointerEvents: "none" }} aria-hidden="true" />
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #183D2D 0%, #2E7D5B 100%)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, boxShadow: "0 4px 12px rgba(24,61,45,0.14)" }} aria-hidden="true">{b.icon}</div>
              <div style={{ fontWeight: 700, color: "var(--soma-forest)", fontSize: 14, marginTop: 12, letterSpacing: "-0.01em" }}>{b.t}</div>
              <div style={{ fontSize: 12.5, color: "#5a6b63", marginTop: 8, lineHeight: 1.6 }}>{b.d}</div>
              <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }} style={{ display: "block", height: 1, background: "linear-gradient(90deg, var(--soma-gold) 0%, transparent 88%)", marginTop: 12, transformOrigin: "left", opacity: 0.42 }} aria-hidden="true" />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Gift vouchers — NEW premium where thin */}
      <section className={styles.section}>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, ease: EASE }}
          className={styles.giftGrid}
        >
          <motion.div
            whileHover={reduced ? {} : { y: -4, scale: 1.01 }}
            style={{ background: "linear-gradient(135deg, #183D2D 0%, #1c4a34 55%, #2E7D5B 100%)", color: "#fff", borderRadius: 20, padding: 24, position: "relative", overflow: "hidden", border: "1px solid rgba(255,255,255,0.10)", boxShadow: "0 20px 48px rgba(24,61,45,0.18), inset 0 1px 0 rgba(255,255,255,0.10)" }}
          >
            <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, border: "1px solid rgba(255,255,255,0.08)", borderRadius: "50%", pointerEvents: "none" }} aria-hidden="true" />
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.72, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", boxShadow: "0 0 8px rgba(244,180,0,0.32)", flexShrink: 0 }} aria-hidden="true" /> Gift vouchers · 12 months
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 300, marginTop: 10, lineHeight: 0.95, letterSpacing: "-0.02em" }}><span dangerouslySetInnerHTML={{ __html: t("restore.giftTitle") }} /></div>
            <div style={{ fontSize: 13, lineHeight: 1.65, opacity: 0.88, marginTop: 10 }}>Valid 12 months, any treatment or journey. Beautifully wrapped at reception or emailed instantly.</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 16 }}>
              {[
                { v: "5,000", l: "Taster" },
                { v: "11,000", l: "Stillness" },
                { v: "Custom", l: "Any amount" },
              ].map((g) => (
                <div key={g.v} style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, padding: 12, textAlign: "center", backdropFilter: "blur(8px)" }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{g.v}</div>
                  <div style={{ fontSize: 10, opacity: 0.72, marginTop: 2, letterSpacing: "0.06em", textTransform: "uppercase" }}>{g.l}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, background: "#fff", color: "var(--soma-forest)", padding: "8px 12px", borderRadius: 9999 }}>Buy at reception →</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.72)", alignSelf: "center" }}>or email · instant</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.12, ease: EASE }}
            style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.90) 100%)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.62)", borderRadius: 20, padding: 22, boxShadow: "0 12px 36px rgba(24,61,45,0.07), inset 0 1px 0 rgba(255,255,255,0.72)", display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 400, color: "var(--soma-forest)", letterSpacing: "-0.015em" }}>{t("restore.whatToKnow")}</div>
            <ul style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12.5, color: "#5a6b63", lineHeight: 1.6 }}>
              <li style={{ display: "flex", gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", marginTop: 7, flexShrink: 0 }} /> {t("restore.know1")}</li>
              <li style={{ display: "flex", gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", marginTop: 7, flexShrink: 0 }} /> {t("restore.know2")}</li>
              <li style={{ display: "flex", gap: 8 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", marginTop: 7, flexShrink: 0 }} /> {t("restore.know3")}</li>
            </ul>
            <div style={{ marginTop: 4, background: "var(--soma-ivory)", border: "1px solid var(--soma-line-light)", borderRadius: 12, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--soma-forest)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>✦</span>
              <span style={{ fontSize: 11, color: "var(--soma-warm-gray)", lineHeight: 1.5 }}><strong style={{ color: "var(--soma-forest)" }}>{t("restore.needHelp")}</strong> {t("restore.needHelpDesc")}</span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      <PageFAQSection title={t("restore.faqTitle")} questions={PAGE_FAQS.restore} />

      <SomaCTA />

    </div>
  );
};
export default Restore;
