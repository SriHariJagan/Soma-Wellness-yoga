import { useEffect, useState } from "react";
import styles from "./Profile.module.css";

export default function Profile() {
  const [darkMode, setDarkMode] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [barsReady, setBarsReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const API_URL = import.meta.env.VITE_API_URL || "";
    fetch(`${API_URL}/api/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch profile");
        return res.json();
      })
      .then((data) => {
        setProfile(data);
        setTimeout(() => setBarsReady(true), 200);
      })
      .catch((err) => {
        console.error("Profile fetch error:", err);
        setError(`Error: ${err.message}`);
      });
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  if (error) return <p className={styles.error}>{error}</p>;
  if (!profile) return (
    <div className={styles.loadingWrap}>
      <div className={styles.spinner} />
      <p className={styles.loadingText}>Loading profile…</p>
    </div>
  );

  const progressEntries = [
    { label: "Flexibility", pct: profile.progress?.flexibility ?? 0 },
    { label: "Strength",    pct: profile.progress?.strength    ?? 0 },
    { label: "Breathing",   pct: profile.progress?.breathing   ?? 0 },
    { label: "Meditation",  pct: profile.progress?.meditation  ?? 0 },
  ];

  const infoRows = [
    { icon: "🧘", label: "Style",      value: profile.style     || "Hatha & Vinyasa" },
    { icon: "📅", label: "Joined",     value: profile.joined    || "—" },
    { icon: "📈", label: "Level",      value: profile.level     || "Beginner" },
    { icon: "⏰", label: "Next class", value: profile.nextClass || "—" },
  ];

  const initials = profile.name?.[0]?.toUpperCase() ?? "?";

  return (
    <div className={`${styles.root} ${darkMode ? styles.dark : ""}`}>
      <div className={styles.card}>

        {/* ── Hero ── */}
        <div className={styles.hero}>
          <div className={styles.orb1} />
          <div className={styles.orb2} />

          <button
            className={styles.modeBtn}
            onClick={() => setDarkMode((d) => !d)}
            aria-label="Toggle night mode"
          >
            <MoonIcon />
            {darkMode ? "Light" : "Night"}
          </button>

          <div className={styles.avatarWrap}>
            <div className={styles.avatarRing}>
              {profile.logo ? (
                <img src={profile.logo} alt="avatar" className={styles.avatarImg} />
              ) : (
                <div className={styles.avatarInner}>{initials}</div>
              )}
              <span className={styles.onlineDot} />
            </div>
            <h1 className={styles.name}>{profile.name}</h1>
            <p className={styles.email}>{profile.email}</p>
            <div className={styles.pill}>
              <span className={styles.pillDot} />
              Online
            </div>
          </div>
        </div>

        {/* ── Stats shelf ── */}
        <div className={styles.statsShelf}>
          {[
            { num: profile.stats?.classes ?? 0, label: "Classes" },
            { num: profile.stats?.months  ?? 0, label: "Months"  },
            { num: profile.stats?.certifs ?? 0, label: "Certifs" },
          ].map(({ num, label }) => (
            <div className={styles.statBox} key={label}>
              <p className={styles.statNum}>{num}</p>
              <p className={styles.statLbl}>{label}</p>
            </div>
          ))}
        </div>

        {/* ── Body ── */}
        <div className={styles.body}>

          {/* Student info */}
          <p className={styles.sectionLabel}>Student info</p>
          <div className={styles.infoList}>
            {infoRows.map((row) => (
              <div className={styles.infoRow} key={row.label}>
                <span className={styles.infoIcon}>{row.icon}</span>
                <span className={styles.infoLbl}>{row.label}</span>
                <span className={styles.infoVal}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Progress */}
          <p className={`${styles.sectionLabel} ${styles.mt}`}>Practice progress</p>
          <div className={styles.progressWrap}>
            {progressEntries.map(({ label, pct }) => (
              <div className={styles.progRow} key={label}>
                <div className={styles.progHeader}>
                  <span className={styles.progName}>{label}</span>
                  <span className={styles.progPct}>{pct}%</span>
                </div>
                <div className={styles.track}>
                  <div
                    className={styles.fill}
                    style={{ width: barsReady ? `${pct}%` : "0%" }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Badges */}
          <p className={`${styles.sectionLabel} ${styles.mt}`}>Interests</p>
          <div className={styles.badgeRow}>
            {profile.badges?.length > 0 ? (
              profile.badges.map((b) => (
                <span className={styles.badge} key={b}>{b}</span>
              ))
            ) : (
              <span className={styles.hint}>No interests added yet.</span>
            )}
          </div>

          {/* Actions */}
          <div className={styles.divider} />
          <div className={styles.btnRow}>
            <button className={`${styles.btn} ${styles.btnDanger}`} onClick={handleLogout}>
              <LogoutIcon /> Logout
            </button>
            <button className={styles.btn} onClick={() => setDarkMode((d) => !d)}>
              <MoonIcon /> {darkMode ? "Light mode" : "Night mode"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

function LogoutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
