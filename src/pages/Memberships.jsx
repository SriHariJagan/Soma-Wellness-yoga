import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import SomaPageHeader from "../components/soma/SomaPageHeader";
import SomaCTA from "../components/soma/SomaCTA";
import PageFAQSection from "../components/soma/PageFAQSection";
import { PAGE_FAQS } from "../config/siteContent";
import { EASE, usePrefersReducedMotion } from "../lib/motion";
import CheckoutGate from "../components/checkout/CheckoutGate.jsx";
import { addToCart, showToast, notifyCartUpdate, getAuthHeaders, isAuthenticated } from "../utils/payment";
import styles from "./Memberships.module.css";

const API = import.meta.env.VITE_API_URL || "";
const fmt = (n) => Number(n || 0).toLocaleString("en-KE");

// Authoritative defaults — backend remains the source of truth for price.
const FALLBACK = {
  name: "SOMA WELLNESS CIRCLE",
  subtitle: "Annual Privilege Membership",
  tagline: "Your year of wellness, inspiration and member-only privileges.",
  price: 36500,
  durationMonths: 12,
  benefits: [
    "5% saving on regular-priced SOMA services.*",
    "Weekly motivational and wellness inspiration.",
    "One curated “Good Read” wellness article every month.",
    "Member-only premium content: short yoga, breathwork, meditation and wellness resources.",
    "Complimentary access to designated SOMA meditation, garden and reading/relaxation spaces during member hours.",
    "Priority booking for appointments, workshops and selected events.",
    "A birthday wellness gift from SOMA.",
    "One guest privilege each year for a selected community/meditation experience.",
    "Early invitations to new programs, special events and member experiences.",
  ],
  notIncluded: [
    "It is not an unlimited yoga-class membership.",
    "Yoga classes, private sessions, therapy, massage and other treatments remain separately chargeable.",
    "The 5% benefit does not stack with already discounted packages, memberships or promotional offers.",
  ],
  whyJoin:
    "A simple way to stay connected with SOMA all year — receive practical wellness guidance, enjoy member savings and belong to a calm wellness community, without committing to a full yoga package.",
  positioning:
    "A loyalty and lifestyle subscription for people who want ongoing connection with SOMA — not a replacement for the main yoga or therapy packages.",
};

const Memberships = () => {
  const reduced = usePrefersReducedMotion();
  const navigate = useNavigate();
  const [circle, setCircle] = useState(FALLBACK);
  const [planId, setPlanId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);
  const [status, setStatus] = useState(null); // { active, validUntil }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Preferred: dedicated Circle endpoint (includes planId).
        const r = await fetch(`${API}/api/public/wellness-circle`);
        if (r.ok) {
          const data = await r.json();
          if (!cancelled && data) {
            setCircle({
              name: (data.name || FALLBACK.name).toUpperCase(),
              subtitle: data.subtitle || FALLBACK.subtitle,
              tagline: data.tagline || FALLBACK.tagline,
              price: Number(data.price) || FALLBACK.price,
              durationMonths: Number(data.durationMonths) || 12,
              benefits: Array.isArray(data.benefits) && data.benefits.length ? data.benefits : FALLBACK.benefits,
              notIncluded: Array.isArray(data.notIncluded) && data.notIncluded.length ? data.notIncluded : FALLBACK.notIncluded,
              whyJoin: data.whyJoin || FALLBACK.whyJoin,
              positioning: data.positioning || FALLBACK.positioning,
            });
            if (data.planId) setPlanId(data.planId);
            if (!data.planId) {
              // Fall back to plans list for the id only.
              const rp = await fetch(`${API}/api/public/plans`);
              if (rp.ok) {
                const list = await rp.json();
                const found = (Array.isArray(list) ? list : [])[0];
                if (found?._id && !cancelled) setPlanId(found._id);
              }
            }
          }
        } else {
          const rp = await fetch(`${API}/api/public/plans`);
          if (rp.ok) {
            const list = await rp.json();
            const found = (Array.isArray(list) ? list : [])[0];
            if (found && !cancelled) {
              if (found._id) setPlanId(found._id);
              if (Number(found.price) > 0) setCircle((c) => ({ ...c, price: Number(found.price) }));
            }
          }
        }
      } catch {}
      finally { if (!cancelled) setLoading(false); }
      // Authenticated: check for an existing active Circle (gates duplicate purchase).
      try {
        if (isAuthenticated()) {
          const rs = await fetch(`${API}/api/student/membership/circle`, { headers: getAuthHeaders() });
          if (rs.ok) {
            const s = await rs.json();
            if (!cancelled) setStatus(s);
          }
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const buy = async () => {
    if (!planId || buying) return;
    setBuying(true);
    try {
      await addToCart("plan", planId);
      showToast("SOMA Wellness Circle added to cart", "success");
      notifyCartUpdate();
      navigate("/studentdashboard?tab=cart");
    } catch (err) {
      showToast(err.message || "Could not add to cart", "error");
    } finally {
      setBuying(false);
    }
  };

  const alreadyActive = !!(status && status.active);
  const validUntil = status?.validUntil ? new Date(status.validUntil).toLocaleDateString("en-KE", { day: "2-digit", month: "2-digit", year: "numeric" }) : null;

  const cta = (label = "BECOME A SOMA MEMBER") => {
    if (alreadyActive) return null;
    if (!planId) {
      return (
        <button type="button" className={styles.bookAccent} disabled>
          {label}
        </button>
      );
    }
    return (
      <CheckoutGate
        intent={{ name: "SOMA Wellness Circle", price: `KES ${fmt(circle.price)}`, sub: "Annual Privilege Membership · 1 year", type: "membership", itemType: "plan", itemId: planId }}
        onProceed={buy}
      >
        <button type="button" className={styles.bookAccent} disabled={buying}>
          {buying ? "Adding…" : label}
        </button>
      </CheckoutGate>
    );
  };

  return (
    <div className={styles.page}>
      <SomaPageHeader
        eyebrow="Membership"
        title="SOMA Wellness Circle"
        subtitle={`${circle.subtitle} — ${circle.tagline} All prices in KES, VAT included.`}
        image="/images/headers/classes-memberships.webp"
      />

      <section className={styles.section}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: EASE }}
          className={styles.introBar}
        >
          <span className={styles.introDot} aria-hidden="true" />
          <p>{circle.positioning}</p>
          <span className={styles.introPill}>1 year · KES 36,500</span>
        </motion.div>

        {loading ? (
          <div className={styles.gridSingle}>
            <div className={styles.skeleton} aria-hidden="true">
              <div className={styles.skelLine} style={{ width: "40%" }} />
              <div className={styles.skelLine} style={{ width: "70%", height: 26 }} />
              <div className={styles.skelLine} style={{ width: "100%" }} />
              <div className={styles.skelLine} style={{ width: "85%" }} />
            </div>
          </div>
        ) : (
          <motion.article
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.55, ease: EASE }}
            className={`${styles.card} ${styles.cardAccent} ${styles.circleCard} ${styles.heroCard}`}
          >
            <div className={styles.cardSheen} aria-hidden="true" />
            <div className={styles.heroOrbA} aria-hidden="true" />
            <div className={styles.heroOrbB} aria-hidden="true" />
            <span className={styles.ribbon}>{circle.subtitle}</span>

            <div className={styles.heroEmblem} aria-hidden="true">
              <span className={styles.heroEmblemInner}>◉</span>
            </div>

            <div className={styles.termRow}>
              <span className={styles.termDot} style={{ background: "#FFD54F" }} aria-hidden="true" />
              <span className={styles.termLabel}>Annual Privilege Membership</span>
              <span className={styles.termSep} aria-hidden="true">·</span>
              <span className={styles.termMonths}>12 months</span>
            </div>

            <h3 className={styles.planName}>{circle.name}</h3>
            <p className={styles.planDesc}>{circle.tagline}</p>

            <div className={styles.heroPriceRow}>
              <span className={styles.heroPrice}>{fmt(circle.price)}</span>
              <span className={styles.priceCur}>KES / Year</span>
              <span className={styles.perMonth}>Just KES 100 Per Day</span>
            </div>

            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <span className={styles.heroStatNum}>12</span>
                <span className={styles.heroStatLabel}>months of wellness</span>
              </div>
              <div className={styles.heroStatDiv} aria-hidden="true" />
              <div className={styles.heroStat}>
                <span className={styles.heroStatNum}>9</span>
                <span className={styles.heroStatLabel}>member privileges</span>
              </div>
              <div className={styles.heroStatDiv} aria-hidden="true" />
              <div className={styles.heroStat}>
                <span className={styles.heroStatNum}>5%</span>
                <span className={styles.heroStatLabel}>member saving</span>
              </div>
            </div>

            {alreadyActive && (
              <div className={styles.activeNote} role="status">
                You already have an active SOMA Wellness Circle membership.
                {validUntil && <> Valid until <strong>{validUntil}</strong>.</>}
              </div>
            )}

            <div className={styles.cardActions}>
              {alreadyActive ? (
                <Link to="/studentdashboard?tab=plan" className={styles.bookAccent}>View My Membership →</Link>
              ) : (
                <>
                  {cta()}
                  <Link to="/contact" className={styles.enquireGhost}>Enquire</Link>
                </>
              )}
            </div>
          </motion.article>
        )}

        {/* WHAT MEMBERS RECEIVE */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: EASE }}
          className={styles.perksPanel}
        >
          <div className={styles.perksHead}>
            <span className={styles.perksEyebrow}>Annual Privilege Membership</span>
            <h3 className={styles.perksTitle}>What members <em>receive</em></h3>
            <p className={styles.perksSub}>Nine privileges, one calm year of belonging.</p>
          </div>
          <div className={styles.perkGrid}>
            {circle.benefits.map((b, i) => (
              <motion.div
                key={b}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: Math.min(i * 0.05, 0.3), ease: EASE }}
                whileHover={reduced ? {} : { y: -4 }}
                className={`${styles.perkCard} ${i === 0 ? styles.perkCardGold : ""}`}
              >
                <span className={styles.perkNum} aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <span className={styles.perkIcon} aria-hidden="true">
                  {["✦", "❀", "✎", "◐", "❋", "⟡", "♥", "◉", "✉"][i % 9]}
                </span>
                <span className={styles.perkText}>{b}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* HOW IT WORKS */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: EASE }}
          className={styles.steps}
        >
          {[
            { n: "01", t: "Become a member", d: "One tap starts your secure checkout." },
            { n: "02", t: "Pay securely", d: "M-Pesa payment, verified instantly." },
            { n: "03", t: "Enjoy a full year", d: "Savings, reads and privileges begin." },
          ].map((s, i) => (
            <div key={s.n} className={styles.step}>
              <span className={styles.stepNum} aria-hidden="true">{s.n}</span>
              <div className={styles.stepTitle}>{s.t}</div>
              <div className={styles.stepDesc}>{s.d}</div>
              {i < 2 && <span className={styles.stepArrow} aria-hidden="true">→</span>}
            </div>
          ))}
        </motion.div>

        {/* WHY JOIN */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: EASE }}
          className={styles.servicesNote}
        >
          <div>
            <div className={styles.servicesTitle}>Why join?</div>
            <div className={styles.servicesDesc}>“{circle.whyJoin}”</div>
          </div>
        </motion.div>

        {/* WHAT IT DOES NOT INCLUDE */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: EASE }}
          className={styles.compare}
        >
          <div className={styles.compareHead}><span>Important: what it does not include</span></div>
          <ul className={styles.circleList}>
            {circle.notIncluded.map((b) => (
              <li key={b}><span className={styles.cross} aria-hidden="true">•</span>{b}</li>
            ))}
          </ul>
        </motion.div>

        {/* Bottom CTA */}
        {!alreadyActive && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, ease: EASE }}
            className={styles.bottomCta}
          >
            <div className={styles.bottomCtaOrbs} aria-hidden="true" />
            <div className={styles.bottomCtaEyebrow}>Your year of wellness awaits</div>
            <div className={styles.bottomCtaPrice}>KES {fmt(circle.price)} <span>/ Year</span></div>
            <div className={styles.bottomCtaPer}>Just KES 100 Per Day · 5% member saving included</div>
            <div className={styles.cardActions} style={{ maxWidth: 420, margin: "14px auto 0" }}>
              {cta()}
            </div>
          </motion.div>
        )}

        <div className={styles.finePrint}>
          Spring Valley, Nairobi · All prices in KES, VAT included · Membership activates only after verified payment ·
          Valid for 1 year from payment date · 5% saving applies to regular-priced services only and does not stack with discounted packages or promotions.
        </div>
      </section>

      <PageFAQSection title="Membership questions" questions={PAGE_FAQS.join} />
      <SomaCTA />
    </div>
  );
};

export default Memberships;
