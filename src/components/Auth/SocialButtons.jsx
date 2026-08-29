import React from "react";
import { useTranslation } from "react-i18next";
import styles from "./SocialButtons.module.css";

const API_URL = import.meta.env.VITE_API_URL || "";

/* Official-style brand marks (compact inline SVGs) */
const ICONS = {
  google: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.09 3.57-5.16 3.57-8.81z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.93-2.91l-3.87-3a7.26 7.26 0 0 1-10.8-3.81H1.27v3.09A12 12 0 0 0 12 24z"/>
      <path fill="#FBBC05" d="M5.26 14.28a7.2 7.2 0 0 1 0-4.56V6.63H1.27a12 12 0 0 0 0 10.74l3.99-3.09z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43A11.98 11.98 0 0 0 1.27 6.63l3.99 3.09A7.17 7.17 0 0 1 12 4.75z"/>
    </svg>
  ),
  facebook: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.88 11.85v-8.38H7.08V12h3.04V9.36c0-3 1.79-4.67 4.53-4.67 1.31 0 2.68.24 2.68.24v2.95H15.8c-1.49 0-1.95.92-1.95 1.87V12h3.32l-.53 3.47h-2.79v8.38A12 12 0 0 0 24 12z"/>
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="currentColor" d="M18.9 2.1h3.68l-8.04 9.19L24 23.9h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 2.1h7.59l5.24 6.93L18.9 2.1zm-1.29 19.6h2.04L6.49 4.16H4.3l13.31 17.54z"/>
    </svg>
  ),
  github: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="currentColor" d="M12 .3a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.66-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.11-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.65 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.81 5.62-5.49 5.92.43.37.81 1.1.81 2.23v3.3c0 .32.21.7.83.58A12 12 0 0 0 12 .3z"/>
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#0A66C2" d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05a3.74 3.74 0 0 1 3.37-1.85c3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0z"/>
    </svg>
  ),
  microsoft: (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
      <path fill="#F25022" d="M1 1h10.5v10.5H1z"/><path fill="#7FBA00" d="M12.5 1H23v10.5H12.5z"/>
      <path fill="#00A4EF" d="M1 12.5h10.5V23H1z"/><path fill="#FFB900" d="M12.5 12.5H23V23H12.5z"/>
    </svg>
  ),
};

const PROVIDERS = [
  { id: "google", label: "Google", icon: "google" },
  { id: "facebook", label: "Facebook", icon: "facebook" },
  { id: "x", label: "X", icon: "x" },
  { id: "github", label: "GitHub", icon: "github" },
  { id: "linkedin", label: "LinkedIn", icon: "linkedin" },
  { id: "microsoft", label: "Microsoft", icon: "microsoft" },
];

export default function SocialButtons({ redirectTo = "" }) {
  const { t } = useTranslation();
  const back = redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : "";
  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>
        {PROVIDERS.map((p) => (
          <a
            key={p.id}
            href={`${API_URL}/api/auth/${p.id}${back}`}
            className={`${styles.btn} ${styles[p.id]}`}
            aria-label={t("auth.continueWith", { provider: p.label })}
            title={t("auth.continueWith", { provider: p.label })}
          >
            {ICONS[p.icon]}
          </a>
        ))}
      </div>
      <div className={styles.hint}>{t("auth.socialHint")}</div>
    </div>
  );
}
