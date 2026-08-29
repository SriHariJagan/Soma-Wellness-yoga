import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import styles from "./LoginForm.module.css";
import { useTranslation } from "react-i18next";
import AuthShell from "./AuthShell.jsx";
import SocialButtons from "./SocialButtons.jsx";

const EyeIcon = ({ off }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    {off && <line x1="2" y1="2" x2="22" y2="22"/>}
  </svg>
);

const LoginForm = ({ onLoginSuccess }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setError("");
    const API_URL = import.meta.env.VITE_API_URL || '';

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (res.ok) {
        const cleanUser = {
          id: data.user?.id || data.user?._id || "",
          email: data.user?.email || email,
          name: data.user?.name || email.split("@")[0].toUpperCase(),
          role: data.user?.role || "student",
          planMonths: data.user?.planMonths || 0,
          planActive: data.user?.planActive || (data.user?.planMonths > 0) || false,
        };
        localStorage.setItem("token", data.token || "");
        if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("user", JSON.stringify(cleanUser));

        if (onLoginSuccess) onLoginSuccess(data.token || "", cleanUser);

        const redirectTo =
          location.state?.redirectTo ||
          new URLSearchParams(window.location.search).get("redirectTo");
        if (redirectTo) navigate(decodeURIComponent(redirectTo), { replace: true });
        else navigate(cleanUser.role === "admin" ? "/yogaadmin" : "/studentdashboard", { replace: true });
      } else {
        setError(data.error || t("errors.loginFailed"));
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(t("errors.network"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <motion.div
        className={styles.formCard}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div className={styles.cardHead}>
          <span className={styles.cardBadge}>
            <span aria-hidden="true">✦</span> SOMA WELLNESS · NAIROBI
          </span>
          <h1 className={styles.cardTitle}>{t("auth.loginHeading")}</h1>
          <p className={styles.cardSub}>{t("auth.loginSub")}</p>
        </div>

        {error && (
          <div className={`${styles.alert} ${styles.alertErr}`} role="alert">
            <span aria-hidden="true">⚠</span> {error}
          </div>
        )}

        {/* Social */}
        <SocialButtons />
        <div className={styles.dividerRow}>
          <span className={styles.dividerLine} />
          <span className={styles.dividerText}>{t("auth.orEmail")}</span>
          <span className={styles.dividerLine} />
        </div>

        {/* Email form */}
        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="login-email">{t("auth.email")}</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </span>
              <input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={styles.input} autoComplete="email" />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="login-password">{t("auth.password")}</label>
            <div className={`${styles.inputWrap} ${styles.hasToggle}`}>
              <span className={styles.inputIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
              <input id="login-password" type={showPw ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className={styles.input} autoComplete="current-password" />
              <button type="button" className={styles.pwToggle} onClick={() => setShowPw((s) => !s)} aria-label={showPw ? t("auth.hidePassword") : t("auth.showPassword")} aria-pressed={showPw}>
                <EyeIcon off={showPw} />
              </button>
            </div>
          </div>

          <div className={styles.formOptions}>
            <label className={styles.checkbox}>
              <input type="checkbox" /> {t("auth.rememberMe")}
            </label>
            <button type="button" className={styles.forgotBtn} onClick={() => navigate("/forgot-password")}>{t("auth.forgotPassword")}</button>
          </div>

          <motion.button type="submit" className={styles.submitBtn} disabled={loading} whileHover={{ scale: loading ? 1 : 1.01 }} whileTap={{ scale: 0.99 }}>
            {loading ? t("common.loading") : `${t("auth.signIn")} →`}
          </motion.button>
        </form>

        <p className={styles.toggleText}>
          {t("auth.dontHave")}{" "}
          <button type="button" onClick={() => navigate("/newuser")}>{t("auth.createAccount")}</button>
        </p>
      </motion.div>
    </AuthShell>
  );
};

export default LoginForm;
