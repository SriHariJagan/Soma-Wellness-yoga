import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import styles from "./LoginForm.module.css";
import { useTranslation } from "react-i18next";
import AuthShell from "./AuthShell.jsx";

const COOLDOWN = 60;

const ForgotPassword = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cooldown > 0) return;
    setLoading(true);
    setError("");
    const API_URL = import.meta.env.VITE_API_URL || '';

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setSent(true);
        setCooldown(COOLDOWN);
      } else {
        setError(data.error || t("errors.generic"));
      }
    } catch (err) {
      console.error(err);
      setError(t("errors.server"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <motion.div
        className={`${styles.formCard} ${styles.forgotCard}`}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {!sent ? (
          <>
            <div className={styles.cardHead}>
              <span className={styles.cardBadge}>
                <span aria-hidden="true">✦</span> SOMA WELLNESS · NAIROBI
              </span>
              <h1 className={styles.cardTitle}>{t("auth.forgotTitle")}</h1>
              <p className={styles.cardSub}>{t("auth.forgotSubtitle")}</p>
            </div>

            {error && (
              <div className={`${styles.alert} ${styles.alertErr}`} role="alert">
                <span aria-hidden="true">⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <label className={styles.label} htmlFor="fp-email">{t("auth.email")}</label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </span>
                  <input id="fp-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={styles.input} autoComplete="email" />
                </div>
              </div>

              <motion.button type="submit" className={styles.submitBtn} disabled={loading || cooldown > 0} whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: 0.99 }}>
                {loading ? t("common.sending") : t("auth.sendResetLink")}
              </motion.button>
            </form>
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{ textAlign: "center" }}
          >
            <motion.div
              className={styles.sentIcon}
              initial={{ scale: 0.4, rotate: -12 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 16 }}
              aria-hidden="true"
            >
              ✓
            </motion.div>
            <h1 className={styles.cardTitle}>{t("auth.sentTitle")}</h1>
            <p className={styles.cardSub}>
              {t("auth.sentDesc", { email })}
            </p>
            <button
              type="button"
              className={styles.resendBtn}
              onClick={handleSubmit}
              disabled={cooldown > 0}
              style={{ marginTop: 16 }}
            >
              {cooldown > 0
                ? t("auth.resendIn", { seconds: cooldown })
                : t("auth.resend")}
            </button>
            <p className={styles.toggleText} style={{ marginTop: 22 }}>
              {t("auth.remembered")}{" "}
              <button type="button" onClick={() => navigate("/login")}>{t("auth.signIn")}</button>
            </p>
          </motion.div>
        )}

        <p className={styles.toggleText} style={{ marginTop: sent ? 0 : 20 }}>
          <button type="button" onClick={() => navigate("/login")}>← {t("auth.backToSignIn")}</button>
        </p>
      </motion.div>
    </AuthShell>
  );
};

export default ForgotPassword;
