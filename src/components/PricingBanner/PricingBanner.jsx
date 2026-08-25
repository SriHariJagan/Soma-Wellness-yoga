import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import styles from "./PricingBanner.module.css";
import { checkTrialEligibility } from "../api/StudentServices.js";

const API_DOMAIN = import.meta.env.VITE_API_URL || "";

const fmtPrice = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

const Membership = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [eligibilityMsg, setEligibilityMsg] = useState("");
  const [checking, setChecking] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_DOMAIN}/api/public/plans`)
      .then((r) => r.json())
      .then((data) => setPlans(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleStartFree() {
    if (!token) {
      navigate("/login?redirectTo=/studentdashboard?tab=trial");
      return;
    }
    setChecking(true);
    setEligibilityMsg("");
    try {
      const data = await checkTrialEligibility();
      if (data.eligible) {
        navigate("/studentdashboard?tab=trial");
      } else {
        setEligibilityMsg(data.message || "You are not eligible for the free trial.");
      }
    } catch (err) {
      setEligibilityMsg("Unable to verify eligibility. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  async function handleAddToCart(plan) {
    if (!token) {
      navigate("/login?redirectTo=/");
      return;
    }
  }

  return (
    <section className={styles.section} id="membership">
      <div className={styles.container}>
        <motion.header className={styles.header} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
          <p className={styles.headerLabel}>Join Our Community</p>
          <h2 className={styles.headerTitle}>Transform Your Life with Pragya Yoga</h2>
          <p className={styles.headerSub}>
            Over <strong>10,000 members</strong> have embraced{" "}
            <strong>authentic Indian wellness yoga</strong> with Pragya Yoga
            Alliance in Jaipur. Rooted in{" "}
            <strong>Bharat's timeless tradition</strong> and supported by{" "}
            <strong>modern scientific wellness practices</strong>, our memberships
            give you unlimited access to classes, meditations, and exclusive
            workshops.
          </p>
        </motion.header>

        {eligibilityMsg && (
          <div className={styles.msgBox}>
            <span>{eligibilityMsg}</span>
            <button onClick={() => setEligibilityMsg("")} className={styles.msgDismiss} aria-label="Dismiss">✕</button>
          </div>
        )}
        {checking && (
          <div className={styles.checkingBox}>
            <span className={styles.spinner} />
            Checking eligibility…
          </div>
        )}
        <div className={styles.grid}>
          {loading ? (
            <>
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
            </>
          ) : (
            plans.map((plan, idx) => {
              return (
                <motion.article
                  key={plan._id}
                  className={styles.card}
                  initial={{ opacity: 0, y: 36 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -8 }}
                >
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{plan.name}</h3>
                    <div className={styles.priceRow}>
                      <span className={styles.priceAmount}>{fmtPrice(plan.price)}</span>
                      <span className={styles.pricePeriod}>/ {plan.durationMonths} month{plan.durationMonths > 1 ? "s" : ""}</span>
                    </div>
                    {plan.description && <p className={styles.cardDesc}>{plan.description}</p>}
                    <ul className={styles.cardBenefits}>
                      {(plan.benefits || []).map((b, i) => (
                        <li key={i}>
                          <span className={styles.benefitIcon}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </span>
                          {b}
                        </li>
                      ))}
                    </ul>
                    {plan.pauseDays > 0 && (
                      <div className={styles.pauseInfo}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                        <span>Pause for up to {plan.pauseDays} days</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.cardFooter}>
                    {token ? (
                      <Link to="/studentdashboard?tab=plan" className={styles.btnPrimary}>
                        Get Started
                      </Link>
                    ) : (
                      <Link to="/login?redirectTo=/" className={styles.btnPrimary}>
                        Get Started
                      </Link>
                    )}
                  </div>
                </motion.article>
              );
            })
          )}
        </div>

        {/* 7-Day Free Trial CTA */}
        <motion.div
          className={styles.trialSection}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className={styles.trialContent}>
            <div className={styles.trialIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h3 className={styles.trialTitle}>Start Your 7-Day Free Trial</h3>
            <p className={styles.trialDesc}>
              Experience authentic yoga classes, guided meditation, and wellness sessions for seven days completely free. Explore our community and discover the benefits before choosing a membership plan.
            </p>
            <div className={styles.trialActions}>
              <button onClick={handleStartFree} className={styles.trialBtn}>
                {checking ? (
                  <>
                    <span className={styles.spinner} />
                    Checking…
                  </>
                ) : (
                  "Start Free Trial"
                )}
              </button>
              <Link to="/classes" className={styles.trialSecondary}>
                Learn More
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Membership;
