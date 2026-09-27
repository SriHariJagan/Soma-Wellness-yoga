import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import styles from "./ResetPassword.module.css";
import { useTranslation } from "react-i18next";

const ResetPassword = () => {
  const { t } = useTranslation();
  const { token } = useParams();
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      setMessage(t("validation.passwordMismatch"));
      setIsError(true);
      return;
    }

    setLoading(true);
    const API_URL = import.meta.env.VITE_API_URL || '';

    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage(data.msg || t("auth.resetSuccess"));
        setIsError(false);
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setMessage(data.error || t("errors.generic"));
        setIsError(true);
      }
    } catch (err) {
      console.error(err);
      setMessage(t("errors.server"));
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
          <h2 className={styles.title}>{t("auth.resetPassword")}</h2>
          <p className={styles.subtitle}>{t("auth.resetSubtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label className={styles.label}>{t("auth.newPassword")}</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
              <input type="password" placeholder={t("auth.newPassword")} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className={styles.input} aria-label={t("auth.newPassword")} />
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>{t("auth.confirmPassword")}</label>
            <div className={styles.inputWrap}>
              <span className={styles.inputIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              </span>
              <input type="password" placeholder={t("auth.confirmPassword")} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className={styles.input} aria-label={t("auth.confirmPassword")} />
            </div>
          </div>

          <motion.button type="submit" className={styles.submitBtn} disabled={loading} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            {loading ? t("common.loading") : t("auth.resetPassword")}
          </motion.button>
        </form>

        {message && (
          <p className={isError ? styles.errorMsg : styles.successMsg}>{message}</p>
        )}

        <p className={styles.backLink}>
          <button type="button" onClick={() => navigate("/login")}>← {t("auth.backToSignIn")}</button>
        </p>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
