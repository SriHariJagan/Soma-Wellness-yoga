import React, { useEffect, useMemo, useRef, useState } from "react";
import { getCitiesOf, getStatesOfCountry } from "../../lib/locationData.js";

/**
 * SearchCombo — lightweight searchable dropdown (same interaction pattern
 * as CountrySelect: type to filter, click to pick, Escape closes).
 * `options`: [{ value, label }] or plain strings.
 * `allowCustom`: offers `Use "<query>"` so previously saved free-text
 * values (e.g. legacy cities) are never lost.
 */
function SearchCombo({
  id,
  value,
  options,
  onPick,
  placeholder,
  disabled,
  loading,
  inputClassName,
  allowCustom = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);

  const normalized = useMemo(
    () =>
      (options || []).map((o) =>
        typeof o === "string" ? { value: o, label: o } : o
      ),
    [options]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Cap rendered rows for speed, but keep it generous — the old cap of 60
    // hid alphabetically-late places (e.g. Nairobi) until the user typed.
    if (!q) return normalized.slice(0, 200);
    return normalized
      .filter((o) => o.label.toLowerCase().includes(q))
      .slice(0, 200);
  }, [normalized, query]);
  const truncated = normalized.length > filtered.length;

  const exactMatch =
    query.trim() &&
    normalized.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());
  const showCustom = allowCustom && query.trim() && !exactMatch;

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

  const pick = (v) => {
    onPick?.(v);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className={inputClassName}
        placeholder={loading ? "Loading…" : placeholder}
        value={open ? query : value || ""}
        disabled={disabled || loading}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onClick={() => setOpen(true)}
        autoComplete="off"
      />
      {open && !disabled && !loading && (
        <ul
          role="listbox"
          style={{
            position: "absolute", zIndex: 50, margin: "6px 0 0", left: 0, right: 0,
            maxHeight: 220, overflowY: "auto", background: "#fff",
            border: "1px solid var(--color-border)", borderRadius: 10,
            boxShadow: "0 18px 44px rgba(24,61,45,0.16)", padding: 6, listStyle: "none",
          }}
        >
          {showCustom && (
            <li role="option" aria-selected="false">
              <button
                type="button"
                onClick={() => pick(query.trim())}
                style={{
                  display: "flex", width: "100%", textAlign: "left", padding: "9px 10px",
                  borderRadius: 8, fontSize: 13.5, background: "transparent",
                  color: "var(--color-dark)", cursor: "pointer", border: "none",
                }}
              >
                Use “{query.trim()}”
              </button>
            </li>
          )}
          {filtered.map((o) => (
            <li key={o.value} role="option" aria-selected={o.label === value}>
              <button
                type="button"
                onClick={() => pick(o.value)}
                style={{
                  display: "flex", width: "100%", textAlign: "left", padding: "9px 10px",
                  borderRadius: 8, fontSize: 13.5,
                  background: o.label === value ? "var(--color-primary-light)" : "transparent",
                  color: "var(--color-dark)", cursor: "pointer", border: "none",
                  fontWeight: o.label === value ? 700 : 400,
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
          {filtered.length === 0 && !showCustom && (
            <li style={{ padding: "10px 12px", fontSize: 13, color: "var(--color-text-muted)" }}>
              No matches found.
            </li>
          )}
          {truncated && (
            <li aria-hidden="true" style={{ padding: "8px 12px", fontSize: 11.5, color: "var(--color-text-muted)", borderTop: "1px solid var(--color-border-light)", marginTop: 4 }}>
              Showing {filtered.length} of {normalized.length} — type to narrow down.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * StateSelect — states/counties of the selected country.
 * Renders nothing once loaded when the country has no states, and reports
 * that via `onHasStates` so the parent can hide the whole field row.
 */
export function StateSelect({ countryCode, name, onChange, inputClassName, onHasStates }) {
  // null = loading. The parent remounts this component (via `key`) whenever
  // the country changes, so no in-effect reset is needed here.
  const [states, setStates] = useState(null);
  // True when the dataset chunk itself failed to load — render a free-text
  // fallback so the field never sits stuck on "Loading…".
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let live = true;
    getStatesOfCountry(countryCode).then((list) => {
      if (!live) return;
      if (list === null) {
        setLoadFailed(true);
        setStates([]);
      } else {
        setStates(list);
      }
    });
    return () => {
      live = false;
    };
  }, [countryCode]);

  useEffect(() => {
    if (states !== null) onHasStates?.(loadFailed ? true : states.length > 0);
  }, [states, loadFailed, onHasStates]);

  if (loadFailed) {
    return (
      <input
        id="profile-state"
        type="text"
        value={name || ""}
        onChange={(e) => onChange?.(e.target.value, e.target.value)}
        className={inputClassName}
        maxLength={50}
        autoComplete="off"
        placeholder="Enter state"
      />
    );
  }

  if (states !== null && states.length === 0) return null;

  return (
    <SearchCombo
      id="profile-state"
      value={name || ""}
      options={states || []}
      loading={states === null}
      placeholder="Select state…"
      inputClassName={inputClassName}
      onPick={(pickedCode) => {
        const found = (states || []).find((s) => s.code === pickedCode);
        onChange?.(pickedCode, found ? found.name : pickedCode);
      }}
    />
  );
}

/**
 * CitySelect — cities of the selected state (or of the whole country when
 * no state is picked). Falls back to a free-text input when the dataset
 * has no cities for the selection.
 */
export function CitySelect({ countryCode, stateCode, value, onChange, inputClassName }) {
  // null = loading. The parent remounts this component (via `key`) whenever
  // the country/state changes, so no in-effect reset is needed here.
  // A null result (dataset chunk failed to load) falls through to the
  // free-text input below — the field never sits stuck on "Loading…".
  const [cities, setCities] = useState(null);

  useEffect(() => {
    let live = true;
    getCitiesOf(countryCode, stateCode).then((list) => {
      // Null (dataset failed to load) and empty (no cities) both fall back
      // to free text — the field is never stuck loading.
      if (live) setCities(list || []);
    });
    return () => {
      live = false;
    };
  }, [countryCode, stateCode]);

  if (cities !== null && cities.length === 0) {
    return (
      <input
        id="profile-city"
        type="text"
        value={value || ""}
        onChange={(e) => onChange?.(e.target.value)}
        className={inputClassName}
        maxLength={50}
        autoComplete="off"
        placeholder="Enter city"
      />
    );
  }

  return (
    <SearchCombo
      id="profile-city"
      value={value || ""}
      options={cities || []}
      loading={cities === null}
      placeholder="Select city…"
      inputClassName={inputClassName}
      allowCustom
      onPick={(name) => onChange?.(name)}
    />
  );
}
