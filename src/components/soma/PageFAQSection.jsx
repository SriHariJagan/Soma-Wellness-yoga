import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { FAQ_ITEMS } from "../../config/siteContent.js";
import { EASE } from "../../lib/motion.js";

export default function PageFAQSection({ title = "Common questions", subtitle, questions, compact = false }) {
  const [open, setOpen] = useState(0);
  const items = (questions || [])
    .map((q) => FAQ_ITEMS.find((f) => f.q === q))
    .filter(Boolean);
  if (!items.length) return null;
  return (
    <section style={{ maxWidth: compact ? 960 : 1440, margin: "0 auto", padding: compact ? "0 clamp(20px,4vw,40px) 32px" : "36px clamp(20px,4vw,40px) 32px" }}>
      <div style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 18px" }}>
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--soma-primary)", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--soma-gold)", flexShrink: 0 }} aria-hidden="true" /> {subtitle || "Questions & guidance"}
        </span>
        <h3 style={{ fontFamily: "var(--font-display)", fontSize: compact ? 20 : 24, fontWeight: 300, color: "var(--soma-forest)", marginTop: 8, letterSpacing: "-0.02em" }}>{title}</h3>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} style={{ background: isOpen ? "linear-gradient(135deg, #183D2D 0%, #1e4d3a 100%)" : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.92) 100%)", border: `1px solid ${isOpen ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.62)"}`, borderRadius: 16, overflow: "hidden", boxShadow: isOpen ? "0 12px 32px rgba(24,61,45,0.14)" : "0 6px 20px rgba(24,61,45,0.06), inset 0 1px 0 rgba(255,255,255,0.72)" }}>
              <button onClick={() => setOpen(isOpen ? -1 : i)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "15px 16px", textAlign: "left", background: "transparent", color: isOpen ? "#fff" : "var(--soma-forest)", cursor: "pointer", border: "none" }}>
                <span style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 500, letterSpacing: "-0.01em", lineHeight: 1.3 }}>{item.q}</span>
                <motion.span animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.22, ease: EASE }} style={{ width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${isOpen ? "rgba(255,255,255,0.22)" : "rgba(38,51,44,0.10)"}`, background: isOpen ? "rgba(255,255,255,0.12)" : "var(--soma-ivory)", color: isOpen ? "#fff" : "var(--soma-forest)", flexShrink: 0, fontSize: 16 }}>+</motion.span>
              </button>
              <AnimatePresence>
                {isOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.26, ease: EASE }}>
                    <div style={{ padding: "12px 16px 16px", fontSize: 12.5, lineHeight: 1.7, color: isOpen ? "rgba(255,247,230,0.88)" : "#5a6b63", borderTop: `1px solid ${isOpen ? "rgba(255,255,255,0.10)" : "var(--soma-line-light)"}` }}>{item.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: "center", marginTop: 14 }}>
        <Link to="/faq" style={{ fontSize: 11, fontWeight: 700, color: "var(--soma-primary)", letterSpacing: "0.06em", textTransform: "uppercase" }}>View all 25 FAQs →</Link>
      </div>
    </section>
  );
}
