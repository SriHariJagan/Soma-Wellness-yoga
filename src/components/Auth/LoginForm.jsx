import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import styles from "./LoginForm.module.css";

const LoginForm = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
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
          referralCount: data.user?.referralCount || 0,
          months: data.user?.months || 0,
          certifs: data.user?.certifs || 0,
          stats: data.user?.stats || { classes: 0, attendancePct: 0 },
          progress: data.user?.progress || { flexibility: 0, strength: 0, breathing: 0, meditation: 0 },
          badges: data.user?.badges || []
        };

        const safeToken = data.token || "";
        localStorage.setItem("token", safeToken);
        if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("user", JSON.stringify(cleanUser));

        if (onLoginSuccess) onLoginSuccess(safeToken, cleanUser);

        const redirectTo = new URLSearchParams(window.location.search).get("redirectTo");
        if (redirectTo) {
          navigate(decodeURIComponent(redirectTo), { replace: true });
        } else {
          navigate(cleanUser.role === "admin" ? "/yogaadmin" : "/studentdashboard", { replace: true });
        }
      } else {
        alert(data.error || "Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <motion.div className={styles.formCard} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className={styles.formHeader}>
          <div className={styles.logoMark}>
            <img src="/images/soma/logo.png" alt="Soma Wellness" width="44" height="44" style={{ objectFit: "contain" }} />
          </div>
          <h2 className={styles.title}>Welcome Back</h2>
          <p className={styles.subtitle}>Sign in to continue your wellness journey</p>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </span>
              <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required className={styles.input} />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Password</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
              <input type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required className={styles.input} />
            </div>
          </div>

          <div className={styles.formOptions}>
            <label className={styles.checkbox}>
              <input type="checkbox" /> Remember me
            </label>
            <button type="button" className={styles.forgotBtn} onClick={() => navigate("/forgot-password")}>Forgot Password?</button>
          </div>

          <motion.button type="submit" className={styles.submitBtn} disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            {loading ? "Signing in..." : "Sign In"}
          </motion.button>
        </form>

        <p className={styles.toggleText}>
          Don't have an account?{" "}
          <button type="button" onClick={() => {
            const redirectTo = new URLSearchParams(window.location.search).get("redirectTo");
            navigate(redirectTo ? `/newuser?redirectTo=${encodeURIComponent(redirectTo)}` : "/newuser");
          }}>Create Account</button>
        </p>
      </motion.div>
    </div>
  );
};

export default LoginForm;
