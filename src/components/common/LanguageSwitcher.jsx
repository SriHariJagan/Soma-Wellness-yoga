import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

const LANGS = [
  { code: "en", flag: "🇬🇧", labelEn: "English", labelNative: "English" },
  { code: "sw", flag: "🇹🇿", labelEn: "Kiswahili", labelNative: "Kiswahili" },
];

export default function LanguageSwitcher({ variant = "navbar", compact = false }) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = (i18n.language || "en").split("-")[0];
  const currentLang = LANGS.find((l) => l.code === current) || LANGS[0];

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const change = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem("soma_language", code);
    setOpen(false);
    // Avoid full reload; i18n will trigger rerender
  };

  if (compact) {
    return (
      <div ref={ref} style={{ position: "relative" }}>
        <button
          onClick={() => setOpen(!open)}
          aria-label={t("language.selectLanguage")}
          aria-expanded={open}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 12px 7px 10px", borderRadius: 9999,
            border: "1px solid var(--soma-line)",
            background: "rgba(255,255,255,0.72)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", cursor: "pointer",
            color: "var(--soma-forest)", lineHeight: 1, transition: "all 0.2s ease"
          }}
        >
          <span aria-hidden="true" style={{ fontSize: 14 }}>{currentLang.flag}</span> {currentLang.labelNative} <span style={{ opacity: 0.5, fontSize: 10 }}>▾</span>
        </button>
        {open && (
          <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 12, overflow: "hidden", boxShadow: "0 12px 32px rgba(24,61,45,0.12)", minWidth: 160, zIndex: 50 }}>
            {LANGS.map((l) => (
              <button
                key={l.code}
                onClick={() => change(l.code)}
                style={{
                  display: "flex", width: "100%", alignItems: "center", gap: 8,
                  padding: "10px 12px", fontSize: 12, fontWeight: current === l.code ? 800 : 500,
                  background: current === l.code ? "var(--soma-ivory)" : "#fff",
                  color: "var(--soma-forest)", border: "none", cursor: "pointer", textAlign: "left"
                }}
              >
                <span aria-hidden="true">{l.flag}</span> {l.labelNative} <span style={{ marginLeft: "auto", opacity: 0.6, fontSize: 10 }}>{l.code.toUpperCase()}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Navbar variant: pill toggle
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <div style={{ display: "inline-flex", background: "var(--soma-ivory)", border: "1px solid var(--soma-line-light)", borderRadius: 9999, padding: 2, gap: 2 }}>
        {LANGS.map((l) => {
          const active = current === l.code;
          return (
            <button
              key={l.code}
              onClick={() => change(l.code)}
              aria-label={`${t("language.selectLanguage")}: ${l.labelNative}`}
              aria-pressed={active}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 12px", borderRadius: 9999, fontSize: 11, fontWeight: 800,
                letterSpacing: "0.04em", textTransform: "uppercase",
                background: active ? "linear-gradient(135deg, #183D2D 0%, #2E7D5B 100%)" : "transparent",
                color: active ? "#fff" : "var(--soma-forest)",
                border: "none", cursor: "pointer", transition: "all 0.2s ease"
              }}
            >
              <span aria-hidden="true">{l.flag}</span> {l.labelNative}
            </button>
          );
        })}
      </div>
    </div>
  );
}
