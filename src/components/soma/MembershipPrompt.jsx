import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./MembershipPrompt.module.css";
import { EASE } from "../../lib/motion";

const API = import.meta.env.VITE_API_URL || "";
const NEVER_KEY = "soma-membership-prompt-never";
const DELAY_MS = 5000;

// Static fallback — mirrors server/seed-tiers.js
const FALLBACK = [
  { name: "Bronze", price: 48000, durationMonths: 3, badge: "" },
  { name: "Silver", price: 88000, durationMonths: 6, badge: "Most Popular" },
  { name: "Gold", price: 160000, durationMonths: 12, badge: "Best Value" },
];

const TIER_DOT = { Bronze: "#B0793B", Silver: "#8A9BA8", Gold: "#C9A227" };
const fmt = (n) => Number(n || 0).toLocaleString("en-KE");
const perMonth = (p) => (p.durationMonths > 0 ? Math.round(p.price / p.durationMonths) : p.price);

// Routes where the prompt must never appear
const HIDDEN_ON = ["/memberships", "/login", "/forgot-password", "/reset-password", "/payment", "/yogaadmin", "/studentdashboard", "/reception", "/profile"];

const MembershipPrompt = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [plans, setPlans] = useState(FALLBACK);
  const [selected, setSelected] = useState("Silver");

  useEffect(() => {
    fetch(`${API}/api/public/plans`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const allowed = new Set(["bronze", "silver", "gold"]);
        const terms = list
          .filter((p) => p && allowed.has(String(p.name || "").toLowerCase()))
          .sort((a, b) => (a.durationMonths || 0) - (b.durationMonths || 0));
        if (terms.length > 0) {
          setPlans(terms);
          const popular = terms.find((t) => t.isPopular || /popular/i.test(t.badge || ""));
          if (popular) setSelected(popular.name);
        }
      })
      .catch(() => {});
  }, []);

  // Shows on every public page load after a short delay — so it also
  // reappears on refresh. Only stays hidden when the visitor clicks
  // "Don't show again", or on excluded routes (memberships, dashboards…).
  useEffect(() => {
    if (HIDDEN_ON.includes(location.pathname)) return;
    try {
      if (localStorage.getItem(NEVER_KEY)) return;
    } catch {}
    const timer = setTimeout(() => setOpen(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open ]);

  const close = () => {
    setOpen(false);
  };

  const neverShow = () => {
    try { localStorage.setItem(NEVER_KEY, "1"); } catch {}
    setOpen(false);
  };

  const choose = (planName) => {
    close();
    navigate("/memberships");
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label="Choose your membership plan"
        >
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.45, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.glow} aria-hidden="true" />
            <button className={styles.close} onClick={close} aria-label="Close">
              ✕
            </button>

            <div className={styles.head}>
              <span className={styles.eyebrow}>
                <span className={styles.eyebrowDot} aria-hidden="true" />
                Memberships · 3 · 6 · 12 months
              </span>
              <h3 className={styles.title}>
                Choose your <em>membership</em>
              </h3>
              <p className={styles.sub}>
                Unlimited practice with recovery built in. Pick a term to begin —
                all prices in KES, VAT included.
              </p>
            </div>

            <div className={styles.options} role="radiogroup" aria-label="Membership plans">
              {plans.map((p) => {
                const active = selected === p.name;
                const badge = p.badge || (p.isPopular ? "Most Popular" : "");
                return (
                  <button
                    key={p.name}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setSelected(p.name)}
                    className={`${styles.option} ${active ? styles.optionActive : ""}`}
                  >
                    {badge && <span className={styles.optionBadge}>{badge}</span>}
                    <span className={styles.optionTop}>
                      <span className={styles.optionDot} style={{ background: TIER_DOT[p.name] || "var(--soma-primary)" }} aria-hidden="true" />
                      <span className={styles.optionName}>{p.name}</span>
                      <span className={styles.optionTerm}>{p.durationMonths} months</span>
                      <span className={`${styles.radio} ${active ? styles.radioOn : ""}`} aria-hidden="true" />
                    </span>
                    <span className={styles.optionPriceRow}>
                      <span className={styles.optionPrice}>KES {fmt(p.price)}</span>
                      <span className={styles.optionPer}>≈ KES {fmt(perMonth(p))}/mo</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.cta} onClick={() => choose(selected)}>
                Continue with {selected} →
              </button>
              <div className={styles.dismissRow}>
                <button type="button" className={styles.later} onClick={close}>
                  Maybe later
                </button>
                <span className={styles.dismissSep} aria-hidden="true">·</span>
                <button type="button" className={styles.later} onClick={neverShow}>
                  Don&apos;t show again
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MembershipPrompt;
