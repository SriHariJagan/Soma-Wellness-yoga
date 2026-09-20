import { useState, useEffect } from "react";
import styles from "./BrowsePlansPage.module.css";
import w from "./widgets/DashboardWidgets.module.css";
import { Stagger, Item, PageHeader, Pill, PrimaryButton } from "./widgets/DashboardWidgets";
import { getMembershipPlans, addToCart, getActiveMembership } from "../api/StudentServices.js";

const fmtPrice = (n) => "KES " + Number(n || 0).toLocaleString("en-KE");

const BADGE_TONE = {
  "Most Popular": "orange",
  "Recommended": "blue",
  "Best Value": "green",
};

const TIER_ACCENT = {
  Bronze: "#B0793B",
  Silver: "#8A9BA8",
  Gold: "#C9A227",
};

const perMonth = (plan) => {
  const m = Number(plan.durationMonths) || 0;
  return m > 0 ? Math.round(Number(plan.price || 0) / m) : 0;
};

export default function BrowsePlansPage({ student, reload }) {
  const [plans, setPlans] = useState([]);
  const [activeMembership, setActiveMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const flash = (text, type = "success") => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 4000);
  };

  useEffect(() => {
    Promise.all([getMembershipPlans(), getActiveMembership()])
      .then(([p, m]) => {
        setPlans(p);
        setActiveMembership(m);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [reload]);

  async function handlePurchase(planId) {
    setBusyId(planId);
    setMsg({ text: "", type: "" });
    try {
      const result = await addToCart("plan", planId);
      if (result.alreadyInCart) {
        flash("Already in cart", "info");
        window.dispatchEvent(new CustomEvent("app-toast", { detail: { message: `Already in cart`, type: "info" } }));
      } else {
        flash(`${result.item?.name || "Plan"} added to cart!`, "success");
        window.dispatchEvent(new CustomEvent("app-toast", { detail: { message: `${result.item?.name || "Plan"} added to cart`, type: "success" } }));
        window.dispatchEvent(new CustomEvent("cart-update", { detail: { count: result.cartCount } }));
      }
      await reload?.();
    } catch (err) {
      flash(err.message || "Failed to add to cart.", "error");
      window.dispatchEvent(new CustomEvent("app-toast", { detail: { message: err.message || "Failed to add to cart", type: "error" } }));
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title="Membership Plans" sub="Choose the perfect membership for your wellness journey" />
        <div className={styles.planGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.skelCard}>
              <div className={styles.skelBadge} />
              <div className={styles.skelTitle} />
              <div className={styles.skelPrice} />
              <div className={styles.skelDesc} />
              <div className={styles.skelBenefits}>
                {[1, 2, 3].map((j) => <div key={j} className={styles.skelBenefit} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const activePlanId = activeMembership?.planId || activeMembership?._id;
  const isOwned = (plan) => {
    if (!activeMembership) return false;
    if (activeMembership.planId && activeMembership.planId.toString() === plan._id.toString()) return true;
    return activeMembership.planType === plan.name && activeMembership.isActive;
  };

  const hasActivePlan = activeMembership && activeMembership.isActive;

  return (
    <div>
      <PageHeader
        title="Membership Plans"
        sub="Choose the perfect membership for your wellness journey"
      />

      {msg.text && (
        <div className={`${styles.msgBox} ${msg.type === "error" ? styles.msgError : styles.msgSuccess}`}>
          <i className={`ti ${msg.type === "error" ? "ti-alert-circle" : "ti-circle-check"}`} aria-hidden="true" />
          <span>{msg.text}</span>
        </div>
      )}

      <Stagger className={styles.planGrid}>
        {plans.map((plan) => {
          const owned = isOwned(plan);
          const badge = plan.badge || (plan.isPopular ? "Most Popular" : plan.isRecommended ? "Recommended" : "");
          const badgeTone = BADGE_TONE[badge] || "neutral";
          const accent = TIER_ACCENT[plan.name] || null;

          return (
            <Item
              key={plan._id}
              className={`${styles.planCard} ${badge ? styles.planCardFeatured : ""}`}
            >
              {accent && (
                <span
                  aria-hidden="true"
                  style={{ display: "block", height: 5, borderRadius: "16px 16px 0 0", background: `linear-gradient(90deg, ${accent}, ${accent}88)` }}
                />
              )}
              {badge && (
                <span className={styles.planBadge}>
                  <Pill tone={badgeTone}>{badge}</Pill>
                </span>
              )}

              <div className={styles.planCardBody}>
                <h3 className={styles.planName}>{plan.name}</h3>

                <div className={styles.planPriceRow}>
                  <span className={styles.planPrice}>{fmtPrice(plan.price)}</span>
                  <span className={styles.planDuration}>/ {plan.durationMonths} month{plan.durationMonths > 1 ? "s" : ""}</span>
                </div>
                {plan.durationMonths > 1 && (
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: -2 }}>
                    {fmtPrice(perMonth(plan))} per month
                  </div>
                )}

                {plan.description && <p className={styles.planDesc}>{plan.description}</p>}

                <ul className={styles.planBenefits}>
                  {(plan.benefits || []).map((b, i) => (
                    <li key={i} className={styles.planBenefit}>
                      <span className={styles.benefitIcon}>
                        <i className="ti ti-check" aria-hidden="true" />
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {plan.pauseDays > 0 && (
                  <div className={styles.planPauseInfo}>
                    <i className="ti ti-player-pause" aria-hidden="true" />
                    <span>Pause for up to {plan.pauseDays} days</span>
                  </div>
                )}
              </div>

              <div className={styles.planCardFooter}>
                {owned ? (
                  <div className={styles.ownedBadge}>
                    <i className="ti ti-circle-check" aria-hidden="true" />
                    Current Plan
                  </div>
                ) : hasActivePlan ? (
                  <PrimaryButton disabled>
                    Switch Plan
                  </PrimaryButton>
                ) : (
                  <PrimaryButton
                    onClick={() => handlePurchase(plan._id)}
                    disabled={busyId === plan._id}
                    className={styles.purchaseBtn}
                  >
                    {busyId === plan._id ? "Adding…" : "Add to Cart"}
                  </PrimaryButton>
                )}
              </div>
            </Item>
          );
        })}
      </Stagger>
    </div>
  );
}

