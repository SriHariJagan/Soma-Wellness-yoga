import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./MembershipPrompt.module.css";
import { EASE } from "../../lib/motion";

const NEVER_KEY = "soma-membership-prompt-never";
const DELAY_MS = 5000;

const TITLE_TOP = "SOMA Wellness";
const TITLE_EM = "Circle";
const PRICE = "KES 36,500";
const PER_DAY = "Just KES 100 per day · 1 year";
const DESCRIPTION =
  "Enjoy 5% off regular-priced services, monthly wellness reads, weekly inspiration, premium member content, access to selected SOMA wellness spaces, priority booking, birthday surprises and exclusive member invitations.";

const PERKS = [
  { icon: "✦", label: "5% member saving" },
  { icon: "❀", label: "Monthly good read" },
  { icon: "◐", label: "Premium content" },
  { icon: "♡", label: "Birthday gift" },
];

// Routes where the prompt must never appear
const HIDDEN_ON = ["/memberships", "/login", "/forgot-password", "/reset-password", "/payment", "/yogaadmin", "/studentdashboard", "/reception", "/profile"];

const MembershipPrompt = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

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

  const become = () => {
    close();
    // Real purchase flow — the membership page CTA starts checkout/payment.
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
          aria-label="Join SOMA Wellness Circle"
        >
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, y: 36, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.5, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.orbA} aria-hidden="true" />
            <div className={styles.orbB} aria-hidden="true" />
            <div className={styles.grain} aria-hidden="true" />
            <button className={styles.close} onClick={close} aria-label="Close">
              ✕
            </button>

            <div className={styles.ring} aria-hidden="true">
              <span className={styles.ringInner}>◉</span>
            </div>

            <div className={styles.head}>
              <span className={styles.eyebrow}>
                <span className={styles.eyebrowDot} aria-hidden="true" />
                Annual Privilege Membership · 1 year
              </span>
              <h3 className={styles.title}>
                {TITLE_TOP} <em>{TITLE_EM}</em>
              </h3>
              <div className={styles.priceRow}>
                <span className={styles.price}>{PRICE}</span>
                <span className={styles.perDay}>{PER_DAY}</span>
              </div>
              <p className={styles.sub}>{DESCRIPTION}</p>
            </div>

            <div className={styles.perks}>
              {PERKS.map((p) => (
                <span key={p.label} className={styles.perk}>
                  <span className={styles.perkIcon} aria-hidden="true">{p.icon}</span>
                  {p.label}
                </span>
              ))}
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.cta} onClick={become}>
                <span className={styles.ctaSheen} aria-hidden="true" />
                BECOME A SOMA MEMBER →
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
