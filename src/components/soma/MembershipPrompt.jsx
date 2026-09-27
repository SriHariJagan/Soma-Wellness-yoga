import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import styles from "./MembershipPrompt.module.css";
import { EASE } from "../../lib/motion";
import { priceDisplay } from "../../lib/pricing.js";
import { formatKES } from "../../lib/currency.js";
import { SESSION_KEYS } from "../../config/chatbotConfig.js";

const NEVER_KEY = "soma-membership-prompt-never";
const DAY_KEY = "soma-popup-last-shown";
const DELAY_MS = 9000;

const TITLE_TOP = "SOMA Wellness";
const TITLE_EM = "Circle";
// DISPLAY prices only — payable amount always comes from the backend Circle price.
const FALLBACK_PAYABLE = 36500;
const DESCRIPTION =
  "Enjoy 5% off regular-priced services, monthly wellness reads, weekly inspiration, premium member content, access to selected SOMA wellness spaces, priority booking, birthday surprises and exclusive member invitations.";

const PERKS = [
  { icon: "✦", label: "5% member saving" },
  { icon: "❀", label: "Monthly good read" },
  { icon: "◐", label: "Premium content" },
  { icon: "♡", label: "Birthday gift" },
];

// Routes where the prompt must never appear
const HIDDEN_ON = ["/memberships", "/login", "/forgot-password", "/reset-password", "/payment", "/yogaadmin", "/studentdashboard", "/reception", "/profile", "/gallery"];

const API_URL = import.meta.env.VITE_API_URL || "";

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function chatbotWelcomeActive() {
  try {
    return (
      sessionStorage.getItem(SESSION_KEYS.WELCOME_SHOWN) === "1" &&
      sessionStorage.getItem(SESSION_KEYS.WELCOME_DISMISSED) !== "1"
    );
  } catch {
    return false;
  }
}

function normalizeUpcoming(events, workshops, offerings) {
  const out = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (const e of events || []) {
    if (e.isPublished === false) continue;
    const d = e.date ? new Date(e.date) : null;
    if (!d || Number.isNaN(d.getTime()) || d < now) continue;
    const regs = Array.isArray(e.registrations) ? e.registrations.length : 0;
    out.push({
      kind: "event",
      id: String(e._id || e.id || e.title),
      title: e.title || "Community event",
      date: d,
      startTime: e.startTime || "",
      endTime: e.endTime || "",
      location: e.location || "Spring Valley, Nairobi",
      online: /online|zoom|meet|virtual/i.test(`${e.location || ""} ${e.description || ""}`),
      image: e.image || "",
      description: (e.description || "").slice(0, 140),
      seatsLeft: e.capacity > 0 ? Math.max(0, e.capacity - regs) : null,
      cta: "/events",
    });
  }
  for (const w of workshops || []) {
    if (w.isPublished === false || w.archived) continue;
    const d = w.date ? new Date(w.date) : null;
    if (!d || Number.isNaN(d.getTime()) || d < now) continue;
    const regs = Array.isArray(w.registrations) ? w.registrations.length : 0;
    out.push({
      kind: "workshop",
      id: String(w._id || w.id || w.name),
      title: w.name || "Workshop",
      date: d,
      startTime: w.startTime || "",
      endTime: w.endTime || "",
      location: w.zoomLink ? "Online" : "Spring Valley, Nairobi",
      online: Boolean(w.zoomLink),
      image: w.image || "",
      description: (w.description || "").slice(0, 140),
      seatsLeft: w.capacity > 0 ? Math.max(0, w.capacity - regs) : null,
      cta: "/offerings",
    });
  }
  for (const o of offerings || []) {
    if (o.status === "draft" || o.status === "archived" || o.visibility === "hidden") continue;
    if (o.bookingEnabled === false) continue;
    const d = o.startDate ? new Date(o.startDate) : null;
    if (d && !Number.isNaN(d.getTime()) && d < now) continue;
    out.push({
      kind: "class",
      id: String(o._id || o.slug || o.name),
      title: o.name || "Offering",
      date: d,
      startTime: "",
      endTime: "",
      location: "Spring Valley, Nairobi",
      online: /online/i.test(`${o.description || ""} ${o.subcategory || ""}`),
      image: o.image || (Array.isArray(o.gallery) ? o.gallery[0] : "") || "",
      description: (o.subtitle || o.description || "").slice(0, 140),
      seatsLeft: o.capacity > 0 ? o.capacity : null,
      cta: "/offerings",
    });
  }
  out.sort((a, b) => (a.date || new Date(8640000000000000)) - (b.date || new Date(8640000000000000)));
  return out.slice(0, 4);
}

const MembershipPrompt = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("membership"); // membership | upcoming
  const [memberCheckDone, setMemberCheckDone] = useState(false);
  const [isActiveMember, setIsActiveMember] = useState(false);
  const [payable, setPayable] = useState(FALLBACK_PAYABLE);
  const [upcoming, setUpcoming] = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(false);

  // Authoritative payable price for display derivation (display-only).
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/public/wellness-circle`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d && Number(d.price) > 0) setPayable(Number(d.price));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const display = priceDisplay(payable, { durationMonths: 12 });
  const PRICE = `${formatKES(display.displayMonthlyPrice)}/month`;
  const PER_DAY = `${formatKES(display.displayDailyPrice)}/day · 1 year of wellness`;

  // Active Circle members never see the popup — re-checked on every
  // navigation so a fresh purchase/login takes effect immediately.
  // Logged-out visitors (no token) keep the default behaviour.
  useEffect(() => {
    let cancelled = false;
    setMemberCheckDone(false);
    setIsActiveMember(false);
    let token = null;
    try { token = localStorage.getItem("token"); } catch {}
    if (!token) {
      setMemberCheckDone(true);
      return;
    }
    fetch(`${API_URL}/api/student/membership/circle`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        setIsActiveMember(!!d?.active);
        setMemberCheckDone(true);
      })
      .catch(() => {
        if (!cancelled) setMemberCheckDone(true);
      });
    return () => { cancelled = true; };
  }, [location.pathname]);

  // Frequency cap: at most once per day + never on excluded routes/members.
  // Waits for the chatbot welcome popup to finish (retries) instead of
  // silently skipping, so the popup reliably appears once per day.
  // Preview: append ?forcePopup=1 to bypass caps (never for active members).
  useEffect(() => {
    if (!memberCheckDone || isActiveMember) return;
    if (HIDDEN_ON.includes(location.pathname)) return;
    const params = new URLSearchParams(location.search);
    const force = params.get("forcePopup") === "1";
    if (!force) {
      try {
        if (localStorage.getItem(NEVER_KEY)) return;
        if (localStorage.getItem(DAY_KEY) === todayKey()) return;
      } catch {}
    }
    let attempts = 0;
    const MAX_ATTEMPTS = 12;
    let timer = null;
    const tryShow = () => {
      if (!force && chatbotWelcomeActive() && attempts < MAX_ATTEMPTS) {
        // Chatbot still engaging — retry in 4s rather than stacking popups.
        attempts += 1;
        timer = setTimeout(tryShow, 4000);
        return;
      }
      if (!force && chatbotWelcomeActive()) return; // gave up this visit
      setOpen(true);
      try { localStorage.setItem(DAY_KEY, todayKey()); } catch {}
    };
    timer = setTimeout(tryShow, DELAY_MS);
    return () => { if (timer) clearTimeout(timer); };
  }, [location.pathname, memberCheckDone, isActiveMember]);

  // Lazy-load upcoming only when the popup opens (protects landing LCP).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setUpcomingLoading(true);
    (async () => {
      try {
        const [evR, wkR, ofR] = await Promise.allSettled([
          fetch(`${API_URL}/api/public/events?past=1`).then((r) => (r.ok ? r.json() : [])),
          fetch(`${API_URL}/api/public/workshops`).then((r) => (r.ok ? r.json() : [])),
          fetch(`${API_URL}/api/offerings?status=available&limit=8`).then((r) => (r.ok ? r.json() : [])),
        ]);
        const ev = evR.status === "fulfilled" ? (Array.isArray(evR.value) ? evR.value : evR.value?.events || []) : [];
        const wk = wkR.status === "fulfilled" ? (Array.isArray(wkR.value) ? wkR.value : wkR.value?.workshops || []) : [];
        const of = ofR.status === "fulfilled" ? (Array.isArray(ofR.value) ? ofR.value : ofR.value?.data || ofR.value?.offerings || []) : [];
        if (!cancelled) setUpcoming(normalizeUpcoming(ev, wk, of));
      } catch {
        if (!cancelled) setUpcoming([]);
      } finally {
        if (!cancelled) setUpcomingLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open ]);

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

  const goUpcoming = (item) => {
    close();
    navigate(item.cta || "/events");
  };

  const fmtDate = (d) => {
    try {
      return new Date(d).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });
    } catch { return ""; }
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

            <div role="tablist" aria-label="Membership and upcoming" style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 14 }}>
              {[
                { id: "membership", label: "Membership" },
                { id: "upcoming", label: "Happening soon" },
              ].map((tabDef) => (
                <button
                  key={tabDef.id}
                  role="tab"
                  aria-selected={tab === tabDef.id}
                  onClick={() => setTab(tabDef.id)}
                  style={{
                    fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                    padding: "8px 16px", borderRadius: 9999, cursor: "pointer",
                    background: tab === tabDef.id ? "var(--soma-forest)" : "transparent",
                    color: tab === tabDef.id ? "#fff" : "var(--soma-forest)",
                    border: "1px solid var(--soma-line-strong)",
                  }}
                >
                  {tabDef.label}
                </button>
              ))}
            </div>

            {tab === "membership" && (
              <>
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
                  {PERKS.map((perk) => (
                    <span key={perk.label} className={styles.perk}>
                      <span className={styles.perkIcon} aria-hidden="true">{perk.icon}</span>
                      {perk.label}
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
              </>
            )}

            {tab === "upcoming" && (
              <div role="tabpanel" aria-label="Upcoming events, classes and workshops">
                <div className={styles.head}>
                  <span className={styles.eyebrow}>
                    <span className={styles.eyebrowDot} aria-hidden="true" />
                    Events · Classes · Workshops
                  </span>
                  <h3 className={styles.title}>
                    Happening <em>soon</em>
                  </h3>
                  <p className={styles.sub}>Live from our current schedule — reserve your place before seats fill.</p>
                </div>
                {upcomingLoading && (
                  <p className={styles.sub} role="status">Loading upcoming schedule…</p>
                )}
                {!upcomingLoading && upcoming.length === 0 && (
                  <div className={styles.actions}>
                    <p className={styles.sub}>No upcoming items right now — explore memberships meanwhile.</p>
                    <button type="button" className={styles.cta} onClick={() => setTab("membership")}>
                      VIEW MEMBERSHIP →
                    </button>
                  </div>
                )}
                {!upcomingLoading && upcoming.length > 0 && (
                  <ul style={{ listStyle: "none", margin: "6px 0 4px", padding: 0, display: "grid", gap: 10, maxHeight: 320, overflowY: "auto" }}>
                    {upcoming.map((item) => (
                      <li
                        key={`${item.kind}-${item.id}`}
                        style={{
                          display: "flex", gap: 12, alignItems: "center", textAlign: "left",
                          background: "rgba(255,255,255,0.7)", border: "1px solid var(--soma-line-light)",
                          borderRadius: 14, padding: 10,
                        }}
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt=""
                            loading="lazy"
                            style={{ width: 64, height: 64, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <span style={{ width: 64, height: 64, borderRadius: 10, background: "var(--soma-soft-sage)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }} aria-hidden="true">
                            {item.kind === "event" ? "✦" : item.kind === "workshop" ? "◐" : "❀"}
                          </span>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--soma-primary)" }}>
                              {item.kind}
                            </span>
                            {item.date && (
                              <span style={{ fontSize: 11, color: "var(--soma-warm-gray)" }}>{fmtDate(item.date)}{item.startTime ? ` · ${item.startTime}${item.endTime ? `–${item.endTime}` : ""}` : ""}</span>
                            )}
                            <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 9999, background: item.online ? "#EEF5F0" : "#FFF7E6", border: "1px solid var(--soma-line-light)" }}>
                              {item.online ? "Online" : "In person"}
                            </span>
                          </div>
                          <div style={{ fontWeight: 700, color: "var(--soma-forest)", fontSize: 14, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.title}
                          </div>
                          <div style={{ fontSize: 12, color: "#5a6b63", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {item.location}
                            {typeof item.seatsLeft === "number" ? ` · ${item.seatsLeft} seats left` : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => goUpcoming(item)}
                          aria-label={`Register for ${item.title}`}
                          style={{
                            fontSize: 12, fontWeight: 800, padding: "8px 14px", borderRadius: 9999,
                            background: "var(--soma-forest)", color: "#fff", flexShrink: 0,
                          }}
                        >
                          Join →
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className={styles.actions}>
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
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MembershipPrompt;
