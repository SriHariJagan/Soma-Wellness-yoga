import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import SomaPageHeader from "../components/soma/SomaPageHeader";
import SomaCTA from "../components/soma/SomaCTA";
import PageFAQSection from "../components/soma/PageFAQSection";
import { PAGE_FAQS } from "../config/siteContent";
import { EASE, usePrefersReducedMotion } from "../lib/motion";
import CheckoutGate from "../components/checkout/CheckoutGate.jsx";
import { addToCart, showToast, notifyCartUpdate } from "../utils/payment";
import styles from "./Memberships.module.css";

const API = import.meta.env.VITE_API_URL || "";
const fmt = (n) => Number(n || 0).toLocaleString("en-KE");

// Static fallback — mirrors server/seed-tiers.js (Bronze 3mo / Silver 6mo / Gold 12mo)
const FALLBACK_PLANS = [
  {
    name: "Bronze",
    description: "Three months of unlimited group yoga — build your foundation.",
    price: 48000,
    durationMonths: 3,
    pauseDays: 7,
    benefits: [
      "Unlimited group yoga classes",
      "1 meditation session per week",
      "Mat and props provided",
      "Post-class herbal tea",
    ],
    badge: "",
    isPopular: false,
    displayOrder: 1,
  },
  {
    name: "Silver",
    description: "Six months of unlimited practice plus recovery — our most loved tier.",
    price: 88000,
    durationMonths: 6,
    pauseDays: 14,
    benefits: [
      "Everything in Bronze",
      "2 steam sessions per month",
      "1 massage per quarter",
      "Priority class booking",
    ],
    badge: "Most Popular",
    isPopular: true,
    displayOrder: 2,
  },
  {
    name: "Gold",
    description: "Twelve months of all-inclusive wellness — yoga, recovery and personal guidance.",
    price: 160000,
    durationMonths: 12,
    pauseDays: 30,
    benefits: [
      "Everything in Silver",
      "4 steam sessions per month",
      "1 massage per month",
      "1 private session per quarter",
      "Guest passes (2 per year)",
    ],
    badge: "Best Value",
    isPopular: false,
    displayOrder: 3,
  },
];

const TIER_STYLE = {
  Bronze: { term: "3 months", dot: "#B0793B", accent: false },
  Silver: { term: "6 months", dot: "#8A9BA8", accent: true },
  Gold: { term: "12 months", dot: "#C9A227", accent: false },
};

const perMonth = (plan) => {
  const m = Number(plan.durationMonths) || 0;
  return m > 0 ? Math.round(Number(plan.price || 0) / m) : 0;
};

const PlanCard = ({ plan, index }) => {
  const navigate = useNavigate();
  const reduced = usePrefersReducedMotion();
  const [buying, setBuying] = useState(false);
  const look = TIER_STYLE[plan.name] || { term: `${plan.durationMonths} months`, dot: "var(--soma-primary)", accent: false };
  const badge = plan.badge || (plan.isPopular ? "Most Popular" : "");
  const canBuy = Boolean(plan._id) && Number(plan.price) > 0;

  const buy = async () => {
    if (!canBuy || buying) return;
    setBuying(true);
    try {
      await addToCart("plan", plan._id);
      showToast(`${plan.name} added to cart`, "success");
      notifyCartUpdate();
      navigate("/studentdashboard?tab=cart");
    } catch (err) {
      showToast(err.message || "Could not add to cart", "error");
    } finally {
      setBuying(false);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.08, 0.16), ease: EASE }}
      whileHover={reduced ? {} : look.accent ? { y: -10, scale: 1.02 } : { y: -6, scale: 1.01 }}
      className={`${styles.card} ${look.accent ? styles.cardAccent : ""}`}
    >
      <div className={styles.cardSheen} aria-hidden="true" />
      {badge && <span className={styles.badge}>{badge}</span>}

      <div className={styles.termRow}>
        <span className={styles.termDot} style={{ background: look.dot }} aria-hidden="true" />
        <span className={styles.termLabel}>{look.term}</span>
        <span className={styles.termSep} aria-hidden="true">·</span>
        <span className={styles.termMonths}>
          {plan.durationMonths} month{plan.durationMonths > 1 ? "s" : ""}
        </span>
      </div>

      <h3 className={styles.planName}>{plan.name}</h3>
      {plan.description && <p className={styles.planDesc}>{plan.description}</p>}

      <div className={styles.priceRow}>
        <span className={styles.price}>{fmt(plan.price)}</span>
        <span className={styles.priceCur}>KES total</span>
      </div>
      <div className={styles.perMonth}>≈ KES {fmt(perMonth(plan))} per month</div>

      <ul className={styles.benefits}>
        {(plan.benefits || []).map((b) => (
          <li key={b}>
            <span className={styles.check} aria-hidden="true">✓</span>
            {b}
          </li>
        ))}
      </ul>

      {plan.pauseDays > 0 && (
        <div className={styles.pauseNote}>Pause for up to {plan.pauseDays} days</div>
      )}

      <div className={styles.cardActions}>
        {canBuy && (
          <CheckoutGate
            intent={{ name: `${plan.name} Membership`, price: `KES ${fmt(plan.price)}`, sub: `${look.term} · unlimited practice`, type: "membership", itemType: "plan", itemId: plan._id }}
            onProceed={buy}
          >
            <button type="button" className={look.accent ? styles.bookAccent : styles.book} disabled={buying}>
              {buying ? "Adding…" : `Choose ${plan.name}`}
            </button>
          </CheckoutGate>
        )}
        <Link to="/contact" className={canBuy ? styles.enquireGhost : styles.enquire}>
          Enquire
        </Link>
      </div>
    </motion.article>
  );
};

const Memberships = () => {
  const reduced = usePrefersReducedMotion();
  const [plans, setPlans] = useState(FALLBACK_PLANS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/api/public/plans`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const allowed = new Set(["bronze", "silver", "gold"]);
        const terms = list
          .filter((p) => p && p.active !== false && allowed.has(String(p.name || "").toLowerCase()))
          .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0) || (a.durationMonths || 0) - (b.durationMonths || 0));
        if (terms.length > 0) setPlans(terms);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <SomaPageHeader
        eyebrow="Memberships"
        title="Three terms. One practice."
        subtitle="Bronze, Silver and Gold — 3, 6 or 12 months of unlimited practice with recovery built in. All prices in KES, VAT included."
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
          <p>
            Commit to your practice for a full term and save — every tier includes unlimited group yoga,
            with steam, massage and private sessions as you move from <strong>Bronze → Silver → Gold</strong>.
          </p>
          <span className={styles.introPill}>3 · 6 · 12 months</span>
        </motion.div>

        {loading ? (
          <div className={styles.grid}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skeleton} aria-hidden="true">
                <div className={styles.skelLine} style={{ width: "40%" }} />
                <div className={styles.skelLine} style={{ width: "70%", height: 26 }} />
                <div className={styles.skelLine} style={{ width: "100%" }} />
                <div className={styles.skelLine} style={{ width: "85%" }} />
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.grid}>
            {plans.map((plan, i) => (
              <PlanCard key={plan._id || plan.name} plan={plan} index={i} />
            ))}
          </div>
        )}

        {/* Compare strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: EASE }}
          className={styles.compare}
        >
          <div className={styles.compareHead}>
            <span>Compare at a glance</span>
            <Link to="/services" className={styles.compareLink}>Prefer monthly? See Services →</Link>
          </div>
          <div className={styles.compareGrid}>
            <div className={styles.compareCellHead}>Term</div>
            {plans.map((p) => (
              <div key={p.name} className={styles.compareCellTop}>{p.durationMonths} months</div>
            ))}
            <div className={styles.compareCellHead}>Total</div>
            {plans.map((p) => (
              <div key={p.name} className={styles.compareCell}>KES {fmt(p.price)}</div>
            ))}
            <div className={styles.compareCellHead}>Per month</div>
            {plans.map((p) => (
              <div key={p.name} className={styles.compareCellStrong}>KES {fmt(perMonth(p))}</div>
            ))}
            <div className={styles.compareCellHead}>Pause</div>
            {plans.map((p) => (
              <div key={p.name} className={styles.compareCell}>Up to {p.pauseDays || 0} days</div>
            ))}
          </div>
        </motion.div>

        {/* Monthly tiers live in Services */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: EASE }}
          className={styles.servicesNote}
        >
          <div>
            <div className={styles.servicesTitle}>Looking for a monthly plan instead?</div>
            <div className={styles.servicesDesc}>
              SOMA JUA, AMANI, UZIMA and FAMILY — plus class passes and SOMA DAILY — live in Services.
            </div>
          </div>
          <motion.div whileHover={reduced ? {} : { y: -2 }} whileTap={{ scale: 0.98 }}>
            <Link to="/services" className={styles.servicesBtn}>Browse Services →</Link>
          </motion.div>
        </motion.div>

        <div className={styles.finePrint}>
          Spring Valley, Nairobi · All prices in KES, VAT included · Life happens — pause your term with no penalty ·
          Unused sessions don&apos;t carry over · 12h cancellation (half fee), no-show full fee.
        </div>
      </section>

      <PageFAQSection title="Membership questions" questions={PAGE_FAQS.join} />
      <SomaCTA />
    </div>
  );
};

export default Memberships;
