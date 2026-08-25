import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import styles from "./ForgotPassword.module.css";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const API_URL = import.meta.env.VITE_API_URL || '';

    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(data.msg || "Password reset link sent to your email.");
        setIsError(false);
      } else {
        setMessage(data.error || "Error sending reset link.");
        setIsError(true);
      }
    } catch (err) {
      console.error(err);
      setMessage("Server error. Please try again.");
      setIsError(true);
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
          <h2 className={styles.title}>Forgot Password</h2>
          <p className={styles.subtitle}>Enter your email and we'll send you a reset link</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>Email</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </span>
              <input type="email" placeholder="Enter your email" value={email} onChange={(e) => setEmail(e.target.value)} required className={styles.input} />
            </div>
          </div>

          <motion.button type="submit" className={styles.submitBtn} disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            {loading ? "Sending..." : "Send Reset Link"}
          </motion.button>
        </form>

        {message && (
          <p className={isError ? styles.errorMsg : styles.successMsg}>{message}</p>
        )}

        <p className={styles.backLink}>
          <button type="button" onClick={() => navigate("/login")}>← Back to Sign In</button>
        </p>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
