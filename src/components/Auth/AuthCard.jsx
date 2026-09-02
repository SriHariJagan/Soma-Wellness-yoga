import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./LoginForm.module.css";
import { useTranslation } from "react-i18next";
import AuthShell from "./AuthShell.jsx";
import SocialButtons from "./SocialButtons.jsx";

const API_URL = import.meta.env.VITE_API_URL || "";

const EyeIcon = ({ off }) => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    {off && <line x1="2" y1="2" x2="22" y2="22"/>}
  </svg>
);

/* ── tiny field components ─────────────────────────────────── */
function Field({ id, label, type = "text", value, onChange, placeholder, icon, autoComplete, extra }) {
  return (
    <div className={styles.inputGroup}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <div className={`${styles.inputWrap} ${extra ? styles.hasToggle : ""}`}>
        <span className={styles.inputIcon}>{icon}</span>
        <input
          id={id}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required
          className={styles.input}
          autoComplete={autoComplete}
        />
        {extra}
      </div>
    </div>
  );
}

const MailIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
);
const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
);
const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);

export default function AuthCard({ initialView = "login", redirectTo = "", onLoginSuccess }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [view, setView] = useState(initialView); // login | register | forgot

  // shared state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [fpSent, setFpSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  React.useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const flipTo = (v) => {
    setError(""); setOkMsg(""); setFpSent(false);
    setView(v);
  };

  /* ── LOGIN ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true); setError("");
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
        localStorage.setItem("user", JSON.stringify(cleanUser));
        if (onLoginSuccess) onLoginSuccess(data.token || "", cleanUser);
        const rt = redirectTo || new URLSearchParams(window.location.search).get("redirectTo");
        navigate(rt ? decodeURIComponent(rt) : cleanUser.role === "admin" ? "/yogaadmin" : "/studentdashboard", { replace: true });
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

  /* ── REGISTER ── */
  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) { setError(t("validation.passwordMismatch")); return; }
    setLoading(true); setError("");
    try {
      const ref = new URLSearchParams(window.location.search).get("ref") || undefined;
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, ref }),
      });
      const data = await res.json();
      if (res.ok) {
        setOkMsg(data.msg || t("auth.registerSuccess"));
        setPassword(""); setConfirmPassword("");
        setTimeout(() => { setOkMsg(""); flipTo("login"); }, 1400);
      } else {
        setError(data.error || t("errors.registerFailed"));
      }
    } catch (err) {
      console.error("Register error:", err);
      setError(t("errors.network"));
    } finally {
      setLoading(false);
    }
  };

  /* ── FORGOT ── */
  const handleForgot = async (e) => {
    e.preventDefault();
    if (cooldown > 0) return;
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) { setFpSent(true); setCooldown(60); }
      else setError(data.error || t("errors.generic"));
    } catch (err) {
      console.error(err);
      setError(t("errors.server"));
    } finally {
      setLoading(false);
    }
  };

  const pwExtra = (
    <button type="button" className={styles.pwToggle} onClick={() => setShowPw((s) => !s)} aria-label={showPw ? t("auth.hidePassword") : t("auth.showPassword")} aria-pressed={showPw}>
      <EyeIcon off={showPw} />
    </button>
  );

  return (
    <AuthShell>
      <motion.div
        className={`${styles.formCard} ${styles.flipWrap}`}
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnimatePresence mode="wait">
          {/* ═══════════ LOGIN FACE ═══════════ */}
          {view === "login" && (
            <motion.div
              key="login"
              className={styles.face}
              initial={{ rotateY: -88, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: 88, opacity: 0 }}
              transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className={styles.cardHead}>
                <span className={styles.cardBadge}><span aria-hidden="true">✦</span> SOMA WELLNESS · NAIROBI</span>
                <h1 className={styles.cardTitle}>{t("auth.loginHeading")}</h1>
                <p className={styles.cardSub}>{t("auth.loginSub")}</p>
              </div>

              {error && <div className={`${styles.alert} ${styles.alertErr}`} role="alert"><span aria-hidden="true">⚠</span> {error}</div>}
              {okMsg && <div className={`${styles.alert} ${styles.alertOk}`} role="status"><span aria-hidden="true">✓</span> {okMsg}</div>}

              <SocialButtons />
              <div className={styles.dividerRow}>
                <span className={styles.dividerLine} /><span className={styles.dividerText}>{t("auth.orEmail")}</span><span className={styles.dividerLine} />
              </div>

              <form onSubmit={handleLogin} className={styles.form}>
                <Field id="login-email" label={t("auth.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" icon={<MailIcon />} autoComplete="email" />
                <Field id="login-password" label={t("auth.password")} type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" icon={<LockIcon />} autoComplete="current-password" extra={pwExtra} />
                <div className={styles.formOptions}>
                  <label className={styles.checkbox}><input type="checkbox" /> {t("auth.rememberMe")}</label>
                  <button type="button" className={styles.forgotBtn} onClick={() => flipTo("forgot")}>{t("auth.forgotPassword")}</button>
                </div>
                <motion.button type="submit" className={styles.submitBtn} disabled={loading} whileTap={{ scale: 0.99 }}>
                  {loading ? t("common.loading") : `${t("auth.signIn")} →`}
                </motion.button>
              </form>

              <p className={styles.toggleText}>
                {t("auth.dontHave")}{" "}
                <button type="button" onClick={() => flipTo("register")}>{t("auth.createAccount")}</button>
              </p>
            </motion.div>
          )}

          {/* ═══════════ REGISTER FACE ═══════════ */}
          {view === "register" && (
            <motion.div
              key="register"
              className={styles.face}
              initial={{ rotateY: -88, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: 88, opacity: 0 }}
              transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className={styles.cardHead}>
                <span className={styles.cardBadge}><span aria-hidden="true">✦</span> SOMA WELLNESS · NAIROBI</span>
                <h1 className={styles.cardTitle}>{t("auth.createAccount")}</h1>
                <p className={styles.cardSub}>{t("auth.loginSub")}</p>
              </div>

              {error && <div className={`${styles.alert} ${styles.alertErr}`} role="alert"><span aria-hidden="true">⚠</span> {error}</div>}
              {okMsg && <div className={`${styles.alert} ${styles.alertOk}`} role="status"><span aria-hidden="true">✓</span> {okMsg}</div>}

              <form onSubmit={handleRegister} className={styles.form}>
                <Field id="reg-name" label={t("auth.name")} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("contact.namePlaceholder")} icon={<UserIcon />} autoComplete="name" />
                <Field id="reg-email" label={t("auth.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" icon={<MailIcon />} autoComplete="email" />
                <div className={styles.row}>
                  <Field id="reg-pw" label={t("auth.password")} type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" icon={<LockIcon />} autoComplete="new-password" extra={pwExtra} />
                  <Field id="reg-pw2" label={t("auth.confirmPassword")} type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" icon={<LockIcon />} autoComplete="new-password" />
                </div>
                <motion.button type="submit" className={styles.submitBtn} disabled={loading} whileTap={{ scale: 0.99 }}>
                  {loading ? t("common.loading") : `${t("auth.createAccount")} →`}
                </motion.button>
              </form>

              <p className={styles.toggleText}>
                {t("auth.alreadyHave")}{" "}
                <button type="button" onClick={() => flipTo("login")}>{t("auth.signIn")}</button>
              </p>
            </motion.div>
          )}

          {/* ═══════════ FORGOT FACE ═══════════ */}
          {view === "forgot" && (
            <motion.div
              key="forgot"
              className={styles.face}
              initial={{ rotateY: -88, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: 88, opacity: 0 }}
              transition={{ duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
            >
              {!fpSent ? (
                <>
                  <div className={styles.cardHead}>
                    <span className={styles.cardBadge}><span aria-hidden="true">✦</span> SOMA WELLNESS · NAIROBI</span>
                    <h1 className={styles.cardTitle}>{t("auth.forgotTitle")}</h1>
                    <p className={styles.cardSub}>{t("auth.forgotSubtitle")}</p>
                  </div>
                  {error && <div className={`${styles.alert} ${styles.alertErr}`} role="alert"><span aria-hidden="true">⚠</span> {error}</div>}
                  <form onSubmit={handleForgot} className={styles.form}>
                    <Field id="fp-email" label={t("auth.email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" icon={<MailIcon />} autoComplete="email" />
                    <motion.button type="submit" className={styles.submitBtn} disabled={loading || cooldown > 0} whileTap={{ scale: 0.99 }}>
                      {loading ? t("common.sending") : t("auth.sendResetLink")}
                    </motion.button>
                  </form>
                </>
              ) : (
                <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} style={{ textAlign: "center" }}>
                  <motion.div
                    className={styles.sentIcon}
                    initial={{ scale: 0.4, rotate: -12 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 16 }}
                    aria-hidden="true"
                  >✓</motion.div>
                  <h1 className={styles.cardTitle}>{t("auth.sentTitle")}</h1>
                  <p className={styles.cardSub}>{t("auth.sentDesc", { email })}</p>
                  <button type="button" className={styles.resendBtn} onClick={handleForgot} disabled={cooldown > 0} style={{ marginTop: 14 }}>
                    {cooldown > 0 ? t("auth.resendIn", { seconds: cooldown }) : t("auth.resend")}
                  </button>
                </motion.div>
              )}
              <p className={styles.toggleText} style={{ marginTop: 16 }}>
                {t("auth.remembered")}{" "}
                <button type="button" onClick={() => flipTo("login")}>{t("auth.signIn")}</button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AuthShell>
  );
}
