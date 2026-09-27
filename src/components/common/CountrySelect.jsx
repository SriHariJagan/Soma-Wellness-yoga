import React, { useMemo, useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { COUNTRIES, DEFAULT_COUNTRY_CODE, countryNameFor } from "../../data/countries.js";
import styles from "../Auth/LoginForm.module.css";

/**
 * CountrySelect — searchable country-of-residency dropdown.
 * Independent from phone country prefix. Kenya default.
 * Keyboard accessible (input + listbox), Escape closes.
 */
export default function CountrySelect({ value, onChange, id = "country-select", required = false }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  const selected = useMemo(
    () => COUNTRIES.find((c) => c.code === (value || DEFAULT_COUNTRY_CODE)) || COUNTRIES[0],
    [value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    ).slice(0, 60);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  // Default to Kenya on first mount when uncontrolled/empty.
  useEffect(() => {
    if (!value) onChange?.(DEFAULT_COUNTRY_CODE);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.inputGroup} ref={wrapRef}>
      <label className={styles.label} htmlFor={`${id}-input`}>
        {t("auth.countryOfResidency", "Country of residency")}
      </label>
      <div className={styles.inputWrap}>
        <span className={styles.inputIcon} aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </span>
        <input
          id={`${id}-input`}
          role="combobox"
          aria-expanded={open}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          className={styles.input}
          placeholder={t("auth.countryPlaceholder", "Search country…")}
          value={open ? query : `${selected.name} (${selected.code})`}
          onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
          onFocus={() => { setQuery(""); setOpen(true); }}
          onClick={() => setOpen(true)}
          autoComplete="country-name"
          required={required}
        />
        <input type="hidden" value={selected.code} data-testid="country-code" readOnly />
      </div>
      {open && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          aria-label={t("auth.countryOfResidency", "Country of residency")}
          ref={listRef}
          style={{
            position: "absolute", zIndex: 50, marginTop: 6, maxHeight: 220, overflowY: "auto",
            background: "#fff", border: "1px solid var(--soma-line-strong)", borderRadius: 12,
            boxShadow: "0 18px 44px rgba(24,61,45,0.16)", width: "max-content", minWidth: "100%", maxWidth: "100%", padding: 6, listStyle: "none",
          }}
        >
          {filtered.map((c) => (
            <li key={c.code} role="option" aria-selected={c.code === selected.code} style={{ borderRadius: 8 }}>
              <button
                type="button"
                role="presentation"
                onClick={() => { onChange?.(c.code); setQuery(""); setOpen(false); }}
                style={{
                  display: "flex", width: "100%", textAlign: "left", gap: 8, alignItems: "center",
                  padding: "9px 10px", borderRadius: 8, fontSize: 14,
                  background: c.code === selected.code ? "var(--soma-soft-sage)" : "transparent",
                  color: "var(--soma-charcoal)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--soma-soft-sage)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = c.code === selected.code ? "var(--soma-soft-sage)" : "transparent"; }}
              >
                <span style={{ fontWeight: 700, minWidth: 34, color: "var(--soma-primary)" }}>{c.code}</span>
                <span>{c.name}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li style={{ padding: "10px 12px", fontSize: 13, color: "var(--soma-warm-gray)" }}>
              {t("auth.noCountryFound", "No country found.")}
            </li>
          )}
        </ul>
      )}
      <span style={{ display: "none" }}>{countryNameFor(selected.code)}</span>
    </div>
  );
}
