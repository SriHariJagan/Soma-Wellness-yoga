import React from "react";
import { motion } from "framer-motion";
import SomaPageHeader from "../components/soma/SomaPageHeader";
import { MEMBERSHIPS, MEMBERSHIP_PAY_AHEAD, FOUNDING_RATES } from "../config/siteContent";
import { Link, useNavigate } from "react-router-dom";
import SomaCTA from "../components/soma/SomaCTA";
import PageFAQSection from "../components/soma/PageFAQSection";
import { PAGE_FAQS } from "../config/siteContent";
import { EASE, usePrefersReducedMotion } from "../lib/motion";
import { useTranslation } from "react-i18next";
import CheckoutGate from "../components/checkout/CheckoutGate.jsx";
import styles from "./Classes.module.css";

const Classes = () => {
  const { t } = useTranslation();
  const reduced = usePrefersReducedMotion();
  const navigate = useNavigate();

  // Translated membership tiers (name/sub/features from locale files)
  const tierData = t("home.pricing.members", { returnObjects: true });
  const memberships = ["jua", "amani", "uzima", "family"].map((k, i) => ({
    name: tierData?.[k]?.name || MEMBERSHIPS[i]?.name,
    sub: tierData?.[k]?.sub || MEMBERSHIPS[i]?.sub,
    price: MEMBERSHIPS[i]?.price,
    per: MEMBERSHIPS[i]?.per,
    badge: MEMBERSHIPS[i]?.badge,
    accent: MEMBERSHIPS[i]?.accent,
    features: Array.isArray(tierData?.[k]?.features) ? tierData[k].features : (MEMBERSHIPS[i]?.features || []),
  }));
  return (
    <div style={{ background: "var(--soma-cream)" }}>
      <SomaPageHeader
        eyebrow={t("join.eyebrow")}
        title={t("join.title")}
        subtitle={t("join.subtitle")}
        image="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=900&auto=format&fit=crop"
      />
      <section className={styles.section}>
        {/* Try us first — premium */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.12, delayChildren: reduced ? 0 : 0.1 } } }}
          className={styles.tryUsGrid}
        >
          <motion.div
            variants={{ hidden: { opacity: 0, y: 18, scale: 0.98 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.6, ease: EASE } } }}
            whileHover={reduced ? {} : { y: -4, scale: 1.01 }}
            style={{ background: "linear-gradient(135deg, #183D2D 0%, #1e4d3a 60%, #2E7D5B 100%)", color: "#fff", borderRadius: 18, padding: 22, position: "relative", overflow: "hidden", boxShadow: "0 16px 36px rgba(24,61,45,0.18), inset 0 1px 0 rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, border: "1px solid rgba(255,255,255,0.08)", borderRadius: "50%", pointerEvents: "none" }} aria-hidden="true" />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(112deg, transparent 38%, rgba(255,255,255,0.08) 48%, rgba(255,255,255,0.16) 50%, transparent 62%)", pointerEvents: "none" }} aria-hidden="true" />
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.72, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F4B400", boxShadow: "0 0 8px rgba(244,180,0,0.32)", display: "inline-block", flexShrink: 0 }} /> {t("join.tryUsFirst")}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 600, marginTop: 10, letterSpacing: "-0.01em" }}>{t("join.discovery")}</div>
            <div style={{ fontSize: 13, opacity: 0.88, marginTop: 6, lineHeight: 1.5 }}>{t("join.discoveryDesc")}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 14 }}>
              <span style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>3,000</span>
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, letterSpacing: "0.06em" }}>KES</span>
              <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.7, delay: 0.4, ease: EASE }} style={{ flex: 1, height: 1, background: "rgba(244,180,0,0.28)", transformOrigin: "left", marginLeft: 8 }} aria-hidden="true" />
            </div>
            <div style={{ fontSize: 11, opacity: 0.62, marginTop: 6, letterSpacing: "0.04em" }}>{t("join.singleClass")}</div>
          </motion.div>
          <motion.div
            variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
            whileHover={reduced ? {} : { y: -3 }}
            style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.86) 100%)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.62)", borderRadius: 18, padding: 22, display: "flex", flexDirection: "column", justifyContent: "center", boxShadow: "0 10px 32px rgba(24,61,45,0.07), inset 0 1px 0 rgba(255,255,255,0.72)", position: "relative", overflow: "hidden" }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)", pointerEvents: "none" }} aria-hidden="true" />
            <div style={{ fontFamily: "var(--font-display)", fontSize: 19, color: "var(--soma-forest)", fontWeight: 500, letterSpacing: "-0.015em" }}>{t("join.pickLevel")}</div>
            <div style={{ fontSize: 13, color: "#5a6b63", marginTop: 8, lineHeight: 1.6 }}>{t("join.pickLevelDesc")}</div>
            <div style={{ fontSize: 11, color: "var(--soma-warm-gray)", marginTop: 12, background: "var(--soma-ivory)", border: "1px solid var(--soma-line-light)", padding: "8px 10px", borderRadius: 10, display: "inline-flex", gap: 12, flexWrap: "wrap" }}>
              <span>{t("join.registrationWaived")}</span> <span style={{ opacity: 0.5 }}>·</span> <span>{t("join.guestMatTowel")}</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Membership grid — premium tilt */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.08, delayChildren: reduced ? 0 : 0.12 } } }}
          className={styles.membershipGrid}
        >
          {memberships.map((m, i) => (
            <motion.div
              key={m.name}
              variants={{ hidden: { opacity: 0, y: 24, scale: 0.97, filter: reduced ? "blur(0px)" : "blur(6px)" }, visible: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.58, ease: EASE } } }}
              whileHover={reduced ? {} : m.accent ? { y: -10, scale: 1.025 } : { y: -6, scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: m.accent ? "linear-gradient(135deg, #183D2D 0%, #1c4a34 55%, #1e5c3f 100%)" : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.88) 100%)",
                color: m.accent ? "#fff" : "var(--soma-charcoal)",
                border: `1px solid ${m.accent ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.62)"}`,
                borderRadius: 20,
                padding: 18,
                position: "relative",
                overflow: "hidden",
                backdropFilter: "blur(10px)",
                boxShadow: m.accent ? "0 18px 48px rgba(24,61,45,0.22), 0 8px 20px rgba(24,61,45,0.14), inset 0 1px 0 rgba(255,255,255,0.14)" : "0 10px 34px rgba(24,61,45,0.08), inset 0 1px 0 rgba(255,255,255,0.72)",
                display: "flex",
                flexDirection: "column",
                gap: 0,
              }}
            >
              <div style={{ position: "absolute", inset: 0, background: m.accent ? "linear-gradient(112deg, transparent 32%, rgba(255,255,255,0.08) 48%, transparent 62%)" : "linear-gradient(112deg, transparent 38%, rgba(255,255,255,0.18) 48%, rgba(255,255,255,0.30) 50%, transparent 62%)", opacity: m.accent ? 0.6 : 0, pointerEvents: "none" }} aria-hidden="true" />
              {m.badge && (
                <motion.span
                  initial={{ scale: 0.9, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.06, ease: EASE }}
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    background: "linear-gradient(135deg, #F4B400 0%, #FFD54F 100%)",
                    color: "var(--soma-forest)",
                    fontSize: 9,
                    fontWeight: 900,
                    letterSpacing: "0.10em",
                    padding: "6px 9px",
                    borderRadius: 9999,
                    boxShadow: "0 4px 14px rgba(244,180,0,0.24), 0 0 0 4px rgba(244,180,0,0.10), inset 0 1px 0 rgba(255,255,255,0.7)",
                    zIndex: 2,
                  }}
                >
                  {m.badge}
                </motion.span>
              )}
              <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, color: m.accent ? "#fff" : "var(--soma-forest)", letterSpacing: "0.03em" }}>{m.name}</div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: m.accent ? "rgba(255,247,230,0.68)" : "#5a6b63", marginTop: 4 }}>{m.sub}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 10, position: "relative" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700, color: m.accent ? "#fff" : "var(--soma-forest)", letterSpacing: "-0.02em" }}>{m.price}</span>
                <em style={{ fontSize: 11, fontStyle: "normal", color: m.accent ? "rgba(255,247,230,0.62)" : "#5a6b63" }}>{m.per}</em>
                <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.3 + i * 0.06, ease: EASE }} style={{ position: "absolute", left: 0, right: 0, bottom: -4, height: 1, background: m.accent ? "linear-gradient(90deg, #FFD54F 0%, transparent 88%)" : "linear-gradient(90deg, var(--soma-gold) 0%, transparent 88%)", opacity: m.accent ? 0.95 : 0.42, transformOrigin: "left" }} aria-hidden="true" />
              </div>
              <ul style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, fontSize: 12, lineHeight: 1.5, color: m.accent ? "rgba(255,247,230,0.88)" : "#5a6b63", flex: 1 }}>
                {m.features.map((f) => (
                  <li key={f} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.accent ? "var(--soma-gold)" : "var(--soma-primary)", marginTop: 6, flexShrink: 0, boxShadow: m.accent ? "0 0 8px rgba(244,180,0,0.32)" : "0 0 0 4px rgba(46,125,91,0.08)" }} aria-hidden="true" />
                    {f}
                  </li>
                ))}
              </ul>
              <motion.div whileHover={reduced ? {} : { y: -2 }} whileTap={{ scale: 0.98 }} style={{ marginTop: 16 }}>
                <CheckoutGate
                  intent={{ name: m.name, price: `KES ${m.price}/mo`, sub: m.sub, per: '/mo', type: 'membership', tier: m.name }}
                  onProceed={() => navigate("/payment", { state: { name: m.name, price: `KES ${m.price}/mo`, time: m.sub } })}
                >
                  <button
                    className={m.accent ? "memberBtnAccent" : "memberBtn"}
                    style={{
                      display: "inline-flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 6,
                      background: m.accent ? "#fff" : "linear-gradient(135deg, #183D2D 0%, #2E7D5B 100%)",
                      color: m.accent ? "var(--soma-forest)" : "#fff",
                      padding: "11px 14px",
                      borderRadius: 9999,
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      width: "100%",
                      textAlign: "center",
                      boxShadow: m.accent ? "0 6px 18px rgba(0,0,0,0.12)" : "0 8px 22px rgba(24,61,45,0.18)",
                      border: m.accent ? "1px solid #fff" : "1px solid transparent",
                      transition: "all 0.22s ease",
                      cursor: "pointer",
                    }}
                  >
                    {t("join.choose", { tier: m.name.split(" ")[1] })} <motion.span whileHover={reduced ? {} : { x: 3 }} transition={{ type: "spring", stiffness: 400, damping: 18 }}>→</motion.span>
                  </button>
                </CheckoutGate>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
        <style>{`
          .memberBtn:hover { background: linear-gradient(135deg, #1a4d35 0%, #3a9a73 100%) !important; box-shadow: 0 12px 28px rgba(24,61,45,0.24) !important; transform: translateY(-1px); }
          .memberBtnAccent:hover { background: linear-gradient(135deg, #F4B400 0%, #FFD54F 100%) !important; color: var(--soma-forest) !important; border-color: var(--soma-gold) !important; box-shadow: 0 12px 28px rgba(244,180,0,0.28) !important; transform: translateY(-1px); }
        `}</style>

        {/* Pay ahead — premium glass */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          className={styles.payAheadWrapper}
        >
          <div className={styles.payAheadScroll}>
          <div style={{ padding: "18px 20px", background: "linear-gradient(135deg, #FFF7E6 0%, #F5EFE0 100%)", borderBottom: "1px solid var(--soma-line-light)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--soma-gold)", boxShadow: "0 0 10px rgba(244,180,0,0.28)", flexShrink: 0 }} aria-hidden="true" />
              <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500, color: "var(--soma-forest)", letterSpacing: "-0.015em" }}>{t("join.payAhead")}</span>
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", background: "var(--soma-gold)", color: "var(--soma-forest)", padding: "5px 8px", borderRadius: 9999 }}>{t("join.upToOff")}</span>
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#5a6b63", background: "#fff", border: "1px solid var(--soma-line-light)", padding: "6px 10px", borderRadius: 9999 }}>{t("join.discounts")}</div>
          </div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.05, delayChildren: reduced ? 0 : 0.12 } } }}
            className={styles.payAheadGrid}
          >
            <div style={{ background: "var(--soma-ivory)", padding: "14px 16px", fontWeight: 700, color: "var(--soma-forest)", borderBottom: "1px solid var(--soma-line-light)", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>{t("join.plan")}</div>
            {["JUA", "AMANI", "UZIMA", "FAMILY"].map((h) => (
              <div key={h} style={{ background: "linear-gradient(135deg, #183D2D 0%, #1e4d3a 100%)", color: "#fff", padding: "14px 12px", textAlign: "center", fontWeight: 800, fontSize: 11, letterSpacing: "0.08em", borderBottom: "1px solid #183D2D", position: "relative" }}>
                {h} {h === "UZIMA" && <span style={{ position: "absolute", top: 6, right: 6, width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", boxShadow: "0 0 8px rgba(244,180,0,0.32)" }} aria-hidden="true" />}
              </div>
            ))}
            {MEMBERSHIP_PAY_AHEAD.map((r, i) => {
              const rowLabels = [t("join.monthly"), t("join.threeMonths"), t("join.sixMonths"), t("join.twelveMonths")];
              return (
              <React.Fragment key={i}>
                <motion.div variants={{ hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: EASE } } }} style={{ padding: "13px 16px", fontWeight: 700, color: i === 3 ? "var(--soma-primary)" : "var(--soma-charcoal)", background: i % 2 ? "#fff" : "var(--soma-cream)", borderTop: "1px solid var(--soma-line-light)", display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: i === 3 ? "var(--soma-gold)" : "var(--soma-primary)", flexShrink: 0, opacity: i === 3 ? 1 : 0.7 }} aria-hidden="true" /> {rowLabels[i]}
                </motion.div>
                {[
                  { v: r.jua, accent: i === 3 },
                  { v: r.amani, accent: i === 3 },
                  { v: r.uzima, accent: true },
                  { v: r.family, accent: i === 3 },
                ].map((cell, ci) => (
                  <motion.div
                    key={ci}
                    variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } } }}
                    whileHover={reduced ? {} : { scale: 1.02, backgroundColor: cell.accent ? "rgba(244,180,0,0.08)" : "rgba(46,125,91,0.04)" }}
                    style={{
                      padding: 13,
                      textAlign: "center",
                      color: cell.accent ? "var(--soma-forest)" : "var(--soma-forest)",
                      fontWeight: cell.accent ? 800 : 600,
                      background: i % 2 ? "#fff" : "var(--soma-cream)",
                      borderTop: "1px solid var(--soma-line-light)",
                      borderLeft: ci === 2 ? "1px solid rgba(244,180,0,0.18)" : "none",
                      borderRight: ci === 2 ? "1px solid rgba(244,180,0,0.18)" : "none",
                      position: "relative",
                    }}
                  >
                    {cell.v}
                    {i === 3 && ci === 2 && <span style={{ position: "absolute", top: 4, right: 4, fontSize: 8, fontWeight: 800, color: "var(--soma-gold)", letterSpacing: "0.06em" }}>BEST</span>}
                  </motion.div>
                ))}
              </React.Fragment>
              );
            })}
           </motion.div>
          </div>
         </motion.div>

        {/* Passes + SOMA DAILY — premium bento */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
          variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.10, delayChildren: reduced ? 0 : 0.12 } } }}
          className={styles.bentoGrid}
        >
          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
            whileHover={reduced ? {} : { y: -3 }}
            style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.90) 100%)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.62)", borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 12, boxShadow: "0 10px 32px rgba(24,61,45,0.07), inset 0 1px 0 rgba(255,255,255,0.72)", position: "relative", overflow: "hidden" }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.85), transparent)", pointerEvents: "none" }} aria-hidden="true" />
            {/* header — fills empty space */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--soma-gold)", boxShadow: "0 0 10px rgba(244,180,0,0.28)", flexShrink: 0 }} aria-hidden="true" />
              <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--soma-primary)" }}>{t("join.flexiblePasses")}</span>
              <span style={{ fontSize: 10, fontWeight: 700, background: "var(--soma-ivory)", border: "1px solid var(--soma-line-light)", padding: "4px 8px", borderRadius: 9999, color: "var(--soma-warm-gray)", letterSpacing: "0.06em" }}>{t("join.noCommitment")}</span>
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 500, color: "var(--soma-forest)", letterSpacing: "-0.015em", lineHeight: 1.1 }} dangerouslySetInnerHTML={{ __html: t("join.payAsYouGo") }} />
            <div style={{ fontSize: 12.5, color: "#5a6b63", lineHeight: 1.6 }}>{t("join.payAsYouGoDesc")}</div>

            <div className={styles.passesGrid}>
              {[
                { n: t("join.fiveClasses"), p: `2,200 ${t("join.perClass")}`, w: t("join.weeks"), c: "11,000", note: t("join.shareable") },
                { n: t("join.tenClasses"), p: `2,100 ${t("join.perClass")}`, w: t("join.months"), c: "21,000", note: t("join.bestValuePass") },
              ].map((x, xi) => (
                <motion.div
                  key={x.n}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.12 + xi * 0.08, ease: EASE }}
                  whileHover={reduced ? {} : { y: -3, scale: 1.02 }}
                  style={{ background: "linear-gradient(180deg, var(--soma-cream) 0%, #FFF7E6 100%)", border: "1px solid rgba(38,51,44,0.06)", borderRadius: 14, padding: 16, textAlign: "center", position: "relative", overflow: "hidden", boxShadow: "0 4px 14px rgba(24,61,45,0.04), inset 0 1px 0 rgba(255,255,255,0.7)" }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--soma-forest)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--soma-primary)", boxShadow: "0 0 0 5px rgba(46,125,91,0.12)", flexShrink: 0 }} aria-hidden="true" /> {x.n}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--soma-charcoal)", marginTop: 6 }}>{x.p} · {x.w}</div>
                  <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "var(--soma-forest)", marginTop: 8, letterSpacing: "-0.02em", textShadow: "0 1px 0 rgba(255,255,255,0.6)" }}>{x.c}<span style={{ fontSize: 11, fontWeight: 600, color: "var(--soma-warm-gray)", marginLeft: 4 }}>KES</span></div>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--soma-primary)", marginTop: 6, background: "rgba(46,125,91,0.08)", padding: "4px 8px", borderRadius: 9999, display: "inline-block" }}>{x.note}</div>
                  <motion.span initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.4 + xi * 0.08, ease: EASE }} style={{ display: "block", height: 1, background: "linear-gradient(90deg, transparent, var(--soma-gold), transparent)", marginTop: 10, transformOrigin: "center" }} aria-hidden="true" />
                </motion.div>
              ))}
            </div>

            <ul className={styles.benefitsGrid}>
              <li style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--soma-gold)", flexShrink: 0 }} />{t("join.anyGroupClass")}</li>
              <li style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--soma-gold)", flexShrink: 0 }} />{t("join.shareWithFamily")}</li>
              <li style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--soma-gold)", flexShrink: 0 }} />{t("join.validFromFirstUse")}</li>
              <li style={{ display: "flex", gap: 6, alignItems: "center" }}><span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--soma-gold)", flexShrink: 0 }} />{t("join.pauseOnce")}</li>
            </ul>

            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--soma-forest)", textAlign: "center", background: "linear-gradient(180deg, var(--soma-ivory) 0%, #FFF7E6 100%)", border: "1px solid rgba(38,51,44,0.10)", padding: "9px 12px", borderRadius: 9999, letterSpacing: "0.03em", boxShadow: "0 2px 10px rgba(24,61,45,0.04), inset 0 1px 0 rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-primary)", boxShadow: "0 0 0 4px rgba(46,125,91,0.12)", flexShrink: 0 }} /> Not ready for a membership · 5 or 10 class pass
            </div>
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }}
            whileHover={reduced ? {} : { y: -3, scale: 1.01 }}
            style={{ background: "linear-gradient(135deg, #183D2D 0%, #1e4d3a 65%, #2E7D5B 100%)", color: "#fff", borderRadius: 18, padding: 20, display: "flex", flexDirection: "column", gap: 10, position: "relative", overflow: "hidden", boxShadow: "0 16px 36px rgba(24,61,45,0.18), inset 0 1px 0 rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.10)" }}
          >
            <div style={{ position: "absolute", top: -40, right: -40, width: 140, height: 140, border: "1px solid rgba(255,255,255,0.07)", borderRadius: "50%", pointerEvents: "none" }} aria-hidden="true" />
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", opacity: 0.72, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", boxShadow: "0 0 8px rgba(244,180,0,0.32)", flexShrink: 0 }} aria-hidden="true" /> {t("join.somaDaily")}
            </div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 400, letterSpacing: "-0.015em", lineHeight: 1 }}>{t("join.takeHome")}</div>
            <ul style={{ fontSize: 12.5, lineHeight: 1.6, opacity: 0.92, marginTop: 4, display: "flex", flexDirection: "column", gap: 6 }}>
              {((() => { const b = t("join.takeHomeBullets", { returnObjects: true }); return Array.isArray(b) ? b : []; })()).map((b) => (
                <li key={b} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--soma-gold)", marginTop: 7, flexShrink: 0, boxShadow: "0 0 8px rgba(244,180,0,0.22)" }} aria-hidden="true" /> {b}
                </li>
              ))}
            </ul>
            <div style={{ display: "flex", gap: 16, marginTop: 10, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", padding: "10px 12px", borderRadius: 12, backdropFilter: "blur(8px)" }}>
              <div><span style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}>{t("home.pricing.daily.monthly")}</span><span style={{ fontSize: 11, opacity: 0.72 }}> {t("join.perMonthShort")}</span></div>
              <span style={{ opacity: 0.3, alignSelf: "center" }}>·</span>
              <div><span style={{ fontWeight: 800, fontSize: 17 }}>{t("home.pricing.daily.yearly")}</span><span style={{ fontSize: 11, opacity: 0.72 }}> {t("join.perYearShort")} · {t("join.twoMonthsFree")}</span></div>
            </div>
            <div style={{ fontSize: 11, opacity: 0.72, marginTop: 4, lineHeight: 1.5, fontStyle: "italic" }}>{t("join.includedWith")}</div>
          </motion.div>
        </motion.div>

        {/* Founding — premium gold bento */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: EASE }}
          style={{ marginTop: 20, background: "linear-gradient(135deg, #FFF7E6 0%, #FFFBF0 50%, #F5EFE0 100%)", border: "1px solid rgba(244,180,0,0.18)", borderRadius: 18, padding: 20, position: "relative", overflow: "hidden", boxShadow: "0 12px 32px rgba(244,180,0,0.08), inset 0 1px 0 rgba(255,255,255,0.72)" }}
        >
          <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, border: "1px solid rgba(244,180,0,0.10)", borderRadius: "50%", pointerEvents: "none" }} aria-hidden="true" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, position: "relative" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #F4B400 0%, #FFD54F 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, boxShadow: "0 4px 14px rgba(244,180,0,0.22)" }} aria-hidden="true">✦</span>
              <div>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 500, color: "var(--soma-forest)", letterSpacing: "-0.015em" }}>Founding Members — first 100 or first 90 days</div>
                <div style={{ fontSize: 12.5, color: "#5a6b63", marginTop: 4, lineHeight: 1.5 }}>{t("join.foundingDesc")}</div>
              </div>
            </div>
            <motion.div whileHover={reduced ? {} : { scale: 1.02 }} style={{ fontSize: 11, fontWeight: 800, background: "linear-gradient(135deg, #F4B400 0%, #FFD54F 100%)", color: "var(--soma-forest)", padding: "9px 14px", borderRadius: 9999, boxShadow: "0 6px 18px rgba(244,180,0,0.22), inset 0 1px 0 rgba(255,255,255,0.6)", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{t("join.saveUpTo")}</motion.div>
          </div>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : 0.07, delayChildren: reduced ? 0 : 0.12 } } }}
            className={styles.foundingGrid}
          >
            {FOUNDING_RATES.map((r) => (
              <motion.div
                key={r.tier}
                variants={{ hidden: { opacity: 0, y: 12, scale: 0.98 }, visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: EASE } } }}
                whileHover={reduced ? {} : { y: -4, scale: 1.02 }}
                style={{ background: "linear-gradient(180deg, #fff 0%, #FFFBF8 100%)", border: "1px solid rgba(38,51,44,0.06)", borderRadius: 14, padding: 14, textAlign: "center", position: "relative", overflow: "hidden", boxShadow: "0 4px 16px rgba(24,61,45,0.05), inset 0 1px 0 rgba(255,255,255,0.7)" }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(244,180,0,0.42), transparent)", pointerEvents: "none" }} aria-hidden="true" />
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--soma-forest)", letterSpacing: "0.06em", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--soma-gold)", flexShrink: 0 }} aria-hidden="true" /> {r.tier}
                </div>
                <div style={{ fontSize: 12.5, color: "#5a6b63", marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <span style={{ textDecoration: "line-through", opacity: 0.55, fontSize: 11 }}>{r.normal}</span>
                  <span style={{ color: "var(--soma-warm-gray)" }}>→</span>
                  <span style={{ color: "var(--soma-primary)", fontWeight: 800, fontSize: 13 }}>{r.founding}</span>
                </div>
                <motion.div initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6, ease: EASE }} style={{ height: 1, background: "linear-gradient(90deg, transparent, var(--soma-gold), transparent)", marginTop: 10, transformOrigin: "center" }} aria-hidden="true" />
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--soma-gold)", marginTop: 8, background: "rgba(244,180,0,0.10)", padding: "4px 8px", borderRadius: 9999, display: "inline-block" }}>Save {r.save}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <div style={{ marginTop: 16, fontSize: 11, color: "var(--soma-warm-gray)", lineHeight: 1.6, textAlign: "center" }}>
          Spring Valley, Nairobi · All prices in KES, VAT included · August 2026 · Prices subject to management approval. Good to know: book ahead for private/therapy/massage · packages start from first use · unused sessions don’t carry over · 12h cancellation (half fee), no-show full fee · medical clearance may be required.
        </div>
      </section>
      <PageFAQSection title={t("join.faqTitle")} questions={PAGE_FAQS.join} />

      <SomaCTA />
    </div>
  );
};
export default Classes;
