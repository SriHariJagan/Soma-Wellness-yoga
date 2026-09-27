import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { bulkEmailApi } from "../api/AdminServices.js";
import { COUNTRIES } from "../../data/countries.js";

const WEEKDAYS = [
  { v: 1, short: "Mon", label: "Monday" }, { v: 2, short: "Tue", label: "Tuesday" },
  { v: 3, short: "Wed", label: "Wednesday" }, { v: 4, short: "Thu", label: "Thursday" },
  { v: 5, short: "Fri", label: "Friday" }, { v: 6, short: "Sat", label: "Saturday" },
  { v: 7, short: "Sun", label: "Sunday" },
];
const PLAN_OPTIONS = [
  // One chip; expands to every historical planType alias so no member is missed.
  { label: "Wellness Circle", values: ["Soma Wellness Circle", "SOMA Wellness Circle", "SOMA WELLNESS CIRCLE"] },
];
const ROLE_OPTIONS = ["student", "reception"];

const emptyForm = {
  name: "", description: "", subject: "", title: "", bodyHtml: "",
  dayOfWeek: 1, time: "09:00", allUsers: true,
  roles: ["student"], planTypes: [], countries: [],
  status: "active",
};

const card = {
  background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 16, padding: 20,
};
const labelStyle = { fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: "var(--soma-forest)", display: "grid", gap: 6 };
function inputStyle() {
  return {
    width: "100%", padding: "11px 13px", borderRadius: 10, fontSize: 14, fontWeight: 500,
    border: "1px solid var(--soma-line-strong)", background: "#FBFAF6", color: "var(--soma-charcoal)",
  };
}
const primaryBtn = {
  background: "var(--soma-forest)", color: "#fff", borderRadius: 9999,
  padding: "11px 24px", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer",
};
const ghostBtn = {
  borderRadius: 9999, padding: "9px 18px", fontSize: 12, fontWeight: 700,
  border: "1px solid var(--soma-line-strong)", background: "#fff", cursor: "pointer", color: "var(--soma-forest)",
};

/**
 * BulkEmailManager — weekly bulk-email campaigns.
 * Admin (or communications.bulk). Sends via the existing notification
 * pipeline: Africa/Nairobi schedule, batched, idempotent, opt-out aware.
 */
export default function BulkEmailManager() {
  const [schedules, setSchedules] = useState([]);
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [preview, setPreview] = useState(null);
  const [testEmails, setTestEmails] = useState("");
  const [countryQuery, setCountryQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: "", tone: "" });
  const bodyRef = useRef(null);

  // Wrap selected text (or insert placeholder) with an HTML tag — like a normal email editor.
  const wrapSelection = (before, after = "", placeholder = "text") => {
    const el = bodyRef.current;
    const current = form.bodyHtml || "";
    if (!el) {
      set("bodyHtml", `${current}${before}${placeholder}${after}`);
      return;
    }
    const { selectionStart = 0, selectionEnd = 0 } = el;
    const selected = current.slice(selectionStart, selectionEnd) || placeholder;
    const next = current.slice(0, selectionStart) + before + selected + after + current.slice(selectionEnd);
    set("bodyHtml", next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = selectionStart + before.length + selected.length + after.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const insertLink = () => {
    const url = window.prompt("Link address (https://…)", "https://");
    if (!url) return;
    wrapSelection(`<a href="${url.replace(/"/g, "")}">`, "</a>", "link text");
  };

  const insertList = (ordered) => {
    const el = bodyRef.current;
    const current = form.bodyHtml || "";
    const block = ordered
      ? "<ol>\n  <li>First point</li>\n  <li>Second point</li>\n</ol>\n"
      : "<ul>\n  <li>First point</li>\n  <li>Second point</li>\n</ul>\n";
    if (!el) {
      set("bodyHtml", `${current}${block}`);
      return;
    }
    const { selectionStart = current.length } = el;
    const next = current.slice(0, selectionStart) + block + current.slice(selectionStart);
    set("bodyHtml", next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = selectionStart + block.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const flash = useCallback((text, tone = "ok") => {
    setMsg({ text, tone });
    setTimeout(() => setMsg({ text: "", tone: "" }), 5000);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([bulkEmailApi.list(), bulkEmailApi.runs({})]);
      setSchedules(Array.isArray(s) ? s : []);
      setRuns(r?.runs || []);
    } catch (err) {
      flash(err.message || "Could not load bulk-email data", "err");
    } finally {
      setLoading(false);
    }
  }, [flash]);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return COUNTRIES.slice(0, 12);
    return COUNTRIES.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q).slice(0, 12);
  }, [countryQuery]);

  const toggleInList = (list, value) => (
    list.includes(value) ? list.filter((x) => x !== value) : [...list, value]
  );

  const startEdit = (s) => {
    setEditingId(s._id);
    setForm({
      name: s.name || "", description: s.description || "",
      subject: s.templateData?.subject || "", title: s.templateData?.title || "",
      bodyHtml: s.templateData?.bodyHtml || "",
      dayOfWeek: s.trigger?.dayOfWeek || 1, time: s.trigger?.time || "09:00",
      allUsers: s.audience?.allUsers ?? true,
      roles: s.audience?.roles?.length ? s.audience.roles : ["student"],
      planTypes: s.audience?.planTypes || [], countries: s.audience?.countries || [],
      status: s.status === "paused" ? "paused" : "active",
    });
    setPreview(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); setPreview(null); setCountryQuery(""); };

  const save = async (e) => {
    e?.preventDefault?.();
    setBusy(true);
    try {
      if (editingId) await bulkEmailApi.update(editingId, form);
      else await bulkEmailApi.create(form);
      flash(editingId ? "Campaign updated." : "Campaign created — it will send automatically every week.");
      cancelEdit();
      await load();
    } catch (err) {
      flash(err.message || "Save failed", "err");
    } finally {
      setBusy(false);
    }
  };

  const doPreview = async (id) => {
    try {
      const p = await bulkEmailApi.preview(id);
      setPreview({ id, ...p });
    } catch (err) {
      flash(err.message || "Preview failed", "err");
    }
  };

  const doTest = async (id) => {
    const emails = testEmails.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
    if (!emails.length) { flash("Enter 1–5 test email addresses first", "err"); return; }
    setBusy(true);
    try {
      await bulkEmailApi.testSend(id, emails);
      flash(`Test email sent to ${emails.join(", ")}`);
    } catch (err) {
      flash(err.message || "Test send failed", "err");
    } finally {
      setBusy(false);
    }
  };

  const doRun = async (id) => {
    if (!window.confirm("Send this campaign to its audience now? Duplicate protection prevents double-sends.")) return;
    setBusy(true);
    try {
      const r = await bulkEmailApi.runNow(id);
      if (r.duplicate) flash("Already sent for this period — duplicate prevented.");
      else flash("Send started in the background — counts appear in Recent sends below.");
      await load();
      // Refresh runs so counts appear without manual reload.
      setTimeout(load, 15000);
      setTimeout(load, 45000);
    } catch (err) {
      flash(err.message || "Send failed", "err");
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async (id) => {
    if (!window.confirm("Delete this campaign schedule? Past run history is kept.")) return;
    try {
      await bulkEmailApi.remove(id);
      flash("Campaign deleted.");
      await load();
    } catch (err) {
      flash(err.message || "Delete failed", "err");
    }
  };

  const weekdayLabel = (v) => WEEKDAYS.find((d) => d.v === v)?.label || "";

  if (loading) return <p role="status">Loading bulk-email campaigns…</p>;

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 1080 }}>
      {/* ── Header ── */}
      <div>
        <h2 style={{ margin: 0, fontSize: 22, color: "var(--soma-forest)" }}>Weekly Bulk Email</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5a6b63" }}>
          One campaign, sent automatically every week — no manual work after setup.
        </p>
      </div>

      {/* ── How it works ── */}
      <section aria-label="How weekly email works" style={{ ...card, background: "linear-gradient(135deg, var(--soma-forest) 0%, #245c43 100%)", border: "none", color: "#FFF7E6" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          {[
            { n: "1", t: "Compose once", d: "Write the subject and content. Preview it and send yourself a test." },
            { n: "2", t: "Pick a day & time", d: "Choose any weekday and time. Everything runs on Africa/Nairobi time." },
            { n: "3", t: "It sends itself", d: "Batched delivery, unsubscribed users skipped, never sent twice in a week." },
          ].map((s) => (
            <div key={s.n} style={{ display: "flex", gap: 10 }}>
              <span style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: "rgba(244,180,0,0.9)", color: "var(--soma-forest)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                fontWeight: 800, fontSize: 13,
              }}>{s.n}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{s.t}</div>
                <div style={{ fontSize: 12, opacity: 0.82, marginTop: 2, lineHeight: 1.5 }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {msg.text && (
        <div role={msg.tone === "err" ? "alert" : "status"} style={{
          padding: "10px 14px", borderRadius: 10, fontSize: 14,
          background: msg.tone === "err" ? "#FDECEC" : "#EEF5F0",
          border: `1px solid ${msg.tone === "err" ? "#F3B4B4" : "var(--soma-line-strong)"}`,
          color: msg.tone === "err" ? "#B42318" : "var(--soma-forest)",
        }}>
          {msg.text}
        </div>
      )}

      {/* ── Composer ── */}
      <section aria-label={editingId ? "Edit campaign" : "New campaign"} style={card}>
        <h3 style={{ margin: "0 0 2px", fontSize: 17, color: "var(--soma-forest)" }}>
          {editingId ? "Edit campaign" : "New campaign"}
        </h3>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: "#5a6b63" }}>Fill the three blocks below, then save.</p>
        <form onSubmit={save} style={{ display: "grid", gap: 18 }}>
          {/* 1 · Message */}
          <fieldset style={{ border: "1px solid var(--soma-line-light)", borderRadius: 12, padding: 14, margin: 0 }}>
            <legend style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--soma-primary)", padding: "0 6px" }}>1 · Message</legend>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                <label style={labelStyle}>Campaign name (internal)
                  <input style={inputStyle()} value={form.name} onChange={(e) => set("name", e.target.value)} required maxLength={120} placeholder="Monday motivation" />
                </label>
                <label style={labelStyle}>Email subject (members see this)
                  <input style={inputStyle()} value={form.subject} onChange={(e) => set("subject", e.target.value)} required maxLength={200} placeholder="Your weekly wellness note" />
                </label>
              </div>
              <label style={labelStyle}>Heading inside the email
                <input style={inputStyle()} value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} placeholder="Soma Wellness Weekly" />
              </label>
              <label style={labelStyle}>Email content — write like a normal email, use the buttons to format
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }} role="toolbar" aria-label="Format email content">
                  {[
                    ["B", "Bold", () => wrapSelection("<strong>", "</strong>", "bold text"), { fontWeight: 800 }],
                    ["I", "Italic", () => wrapSelection("<em>", "</em>", "italic text"), { fontStyle: "italic" }],
                    ["H", "Heading", () => wrapSelection("<h3>", "</h3>", "Section heading"), { fontWeight: 800 }],
                    ["• List", "Bullet list", () => insertList(false), {}],
                    ["1. List", "Numbered list", () => insertList(true), {}],
                    ["🔗 Link", "Add link", insertLink, {}],
                    ["¶ Break", "Line break", () => wrapSelection("", "<br />", ""), {}],
                  ].map(([label, title, onClick, extra]) => (
                    <button
                      key={title}
                      type="button"
                      title={title}
                      aria-label={title}
                      onClick={onClick}
                      style={{
                        padding: "6px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer",
                        border: "1px solid var(--soma-line-strong)", background: "#fff",
                        color: "var(--soma-forest)", ...extra,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <textarea ref={bodyRef} style={{ ...inputStyle(), minHeight: 110, fontFamily: "inherit", lineHeight: 1.6 }} value={form.bodyHtml} onChange={(e) => set("bodyHtml", e.target.value)} required placeholder="Write your message here… select text, then click Bold, List, Link, etc." />
              </label>
            </div>
          </fieldset>

          {/* 2 · Schedule */}
          <fieldset style={{ border: "1px solid var(--soma-line-light)", borderRadius: 12, padding: 14, margin: 0 }}>
            <legend style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--soma-primary)", padding: "0 6px" }}>2 · Schedule · Nairobi time</legend>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }} role="group" aria-label="Weekday">
              {WEEKDAYS.map((d) => (
                <button
                  key={d.v}
                  type="button"
                  onClick={() => set("dayOfWeek", d.v)}
                  aria-pressed={form.dayOfWeek === d.v}
                  title={d.label}
                  style={{
                    padding: "8px 0", width: 52, borderRadius: 10, fontSize: 12, fontWeight: 800, cursor: "pointer",
                    background: form.dayOfWeek === d.v ? "var(--soma-forest)" : "#FBFAF6",
                    color: form.dayOfWeek === d.v ? "#fff" : "var(--soma-forest)",
                    border: "1px solid var(--soma-line-strong)",
                  }}
                >
                  {d.short}
                </button>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
              <label style={labelStyle}>Time (24h EAT)
                <input style={inputStyle()} type="time" value={form.time} onChange={(e) => set("time", e.target.value)} required />
              </label>
              <div style={labelStyle}>Status
                <div style={{ display: "flex", gap: 8 }} role="group" aria-label="Status">
                  {[["active", "Active"], ["paused", "Paused"]].map(([v, label]) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => set("status", v)}
                      aria-pressed={form.status === v}
                      style={{
                        flex: 1, padding: "10px 0", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer",
                        background: form.status === v ? "var(--soma-forest)" : "#FBFAF6",
                        color: form.status === v ? "#fff" : "var(--soma-forest)",
                        border: "1px solid var(--soma-line-strong)",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </fieldset>

          {/* 3 · Audience */}
          <fieldset style={{ border: "1px solid var(--soma-line-light)", borderRadius: 12, padding: 14, margin: 0 }}>
            <legend style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--soma-primary)", padding: "0 6px" }}>3 · Who receives it</legend>
            <div style={{ display: "flex", gap: 8, marginBottom: form.allUsers ? 0 : 14 }} role="group" aria-label="Audience">
              {[ [true, "Everyone eligible"], [false, "Choose groups…"] ].map(([v, label]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => set("allUsers", v)}
                  aria-pressed={form.allUsers === v}
                  style={{
                    padding: "9px 18px", borderRadius: 9999, fontSize: 13, fontWeight: 800, cursor: "pointer",
                    background: form.allUsers === v ? "var(--soma-forest)" : "#FBFAF6",
                    color: form.allUsers === v ? "#fff" : "var(--soma-forest)",
                    border: "1px solid var(--soma-line-strong)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {!form.allUsers && (
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div style={{ ...labelStyle, marginBottom: 6 }}>Roles</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {ROLE_OPTIONS.map((r) => (
                      <button
                        key={r} type="button"
                        onClick={() => set("roles", toggleInList(form.roles, r))}
                        aria-pressed={form.roles.includes(r)}
                        style={{
                          padding: "7px 16px", borderRadius: 9999, fontSize: 12, fontWeight: 700, cursor: "pointer", textTransform: "capitalize",
                          background: form.roles.includes(r) ? "var(--soma-soft-sage)" : "#fff",
                          border: `1px solid ${form.roles.includes(r) ? "var(--soma-primary)" : "var(--soma-line-strong)"}`,
                          color: "var(--soma-forest)",
                        }}
                      >
                        {form.roles.includes(r) ? "✓ " : ""}{r}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ ...labelStyle, marginBottom: 6 }}>Active members of plan</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {PLAN_OPTIONS.map((opt) => {
                      const selected = opt.values.some((v) => form.planTypes.includes(v));
                      return (
                        <button
                          key={opt.label} type="button"
                          onClick={() => set("planTypes", selected
                            ? form.planTypes.filter((x) => !opt.values.includes(x))
                            : [...new Set([...form.planTypes, ...opt.values])])}
                          aria-pressed={selected}
                          style={{
                            padding: "7px 16px", borderRadius: 9999, fontSize: 12, fontWeight: 700, cursor: "pointer",
                            background: selected ? "var(--soma-soft-sage)" : "#fff",
                            border: `1px solid ${selected ? "var(--soma-primary)" : "var(--soma-line-strong)"}`,
                            color: "var(--soma-forest)",
                          }}
                        >
                          {selected ? "✓ " : ""}{opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div style={{ ...labelStyle, marginBottom: 6 }}>
                    Countries {form.countries.length > 0 && <span style={{ color: "var(--soma-primary)" }}>· {form.countries.length} selected</span>}
                    {form.countries.length > 0 && (
                      <button type="button" onClick={() => set("countries", [])} style={{ marginLeft: 8, fontSize: 11, color: "#B42318", textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>
                        Clear
                      </button>
                    )}
                  </div>
                  <input
                    style={{ ...inputStyle(), marginBottom: 8 }}
                    value={countryQuery}
                    onChange={(e) => setCountryQuery(e.target.value)}
                    placeholder="Type to search countries… (empty = all countries)"
                    aria-label="Search countries"
                  />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", maxHeight: 132, overflowY: "auto", padding: 4, border: "1px solid var(--soma-line-light)", borderRadius: 10 }}>
                    {(countryQuery.trim() ? filteredCountries : COUNTRIES.slice(0, 12)).map((c) => (
                      <button
                        key={c.code} type="button"
                        onClick={() => set("countries", toggleInList(form.countries, c.code))}
                        aria-pressed={form.countries.includes(c.code)}
                        style={{
                          padding: "6px 13px", borderRadius: 9999, fontSize: 12, cursor: "pointer",
                          background: form.countries.includes(c.code) ? "var(--soma-soft-sage)" : "#fff",
                          border: `1px solid ${form.countries.includes(c.code) ? "var(--soma-primary)" : "var(--soma-line-light)"}`,
                          color: "var(--soma-forest)", whiteSpace: "nowrap",
                        }}
                      >
                        {form.countries.includes(c.code) ? "✓ " : ""}{c.name}
                      </button>
                    ))}
                  </div>
                  {!countryQuery.trim() && (
                    <p style={{ fontSize: 11, color: "#5a6b63", margin: "6px 0 0" }}>Showing nearby countries first — search for any other.</p>
                  )}
                </div>
              </div>
            )}
          </fieldset>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="submit" disabled={busy} style={primaryBtn}>
              {busy ? "Saving…" : editingId ? "Update campaign" : "Create campaign"}
            </button>
            {editingId && <button type="button" onClick={cancelEdit} style={ghostBtn}>Cancel</button>}
          </div>
        </form>
      </section>

      {/* ── Campaigns ── */}
      <section aria-label="Existing campaigns" style={card}>
        <h3 style={{ margin: "0 0 4px", fontSize: 17, color: "var(--soma-forest)" }}>
          Campaigns {schedules.length > 0 && <span style={{ color: "var(--soma-warm-gray)", fontWeight: 500 }}>({schedules.length})</span>}
        </h3>
        {schedules.length === 0 && (
          <p style={{ fontSize: 14, color: "#5a6b63", margin: "8px 0 0" }}>
            No campaigns yet — the form above creates your first weekly email.
          </p>
        )}
        <div style={{ display: "grid", gap: 10, marginTop: schedules.length ? 12 : 0 }}>
          {schedules.map((s) => (
            <article key={s._id} style={{ border: "1px solid var(--soma-line-light)", borderRadius: 12, padding: 14, background: "#FBFAF6" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span aria-hidden="true" style={{
                    width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                    background: s.status === "paused" ? "#C9C2B4" : "var(--soma-primary)",
                  }} />
                  <div>
                    <strong style={{ color: "var(--soma-forest)", fontSize: 14 }}>{s.name}</strong>
                    <div style={{ fontSize: 12, color: "#5a6b63" }}>
                      Every {weekdayLabel(s.trigger?.dayOfWeek)} · {s.trigger?.time} EAT
                      {s.stats ? ` · ${s.stats.runCount} sends · ${s.stats.totalSent} emails` : ""}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => startEdit(s)} style={ghostBtn}>Edit</button>
                  <button type="button" onClick={() => doPreview(s._id)} style={ghostBtn}>Preview & test</button>
                  <button type="button" onClick={() => doRun(s._id)} disabled={busy} style={{ ...ghostBtn, background: "var(--soma-primary)", color: "#fff", border: "none" }}>Send now</button>
                  <button type="button" onClick={() => doDelete(s._id)} style={{ ...ghostBtn, border: "1px solid #F3B4B4", color: "#B42318" }}>Delete</button>
                </div>
              </div>
              {preview?.id === s._id && (
                <div style={{ marginTop: 12, borderTop: "1px solid var(--soma-line-light)", paddingTop: 12 }}>
                  <p style={{ fontSize: 13, margin: "0 0 8px" }}>
                    <strong>Will reach {preview.recipientCount} people</strong>
                    <span style={{ color: "#5a6b63" }}> (unsubscribed excluded)</span>
                  </p>
                  <div style={{ border: "1px solid var(--soma-line-light)", borderRadius: 10, padding: 14, maxHeight: 280, overflowY: "auto", background: "#fff" }}>
                    <h4 style={{ margin: "0 0 8px", color: "var(--soma-forest)" }}>{preview.title}</h4>
                    <div dangerouslySetInnerHTML={{ __html: preview.bodyHtml }} />
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    <input style={{ ...inputStyle(), flex: "1 1 220px" }} value={testEmails} onChange={(e) => setTestEmails(e.target.value)} placeholder="Test: your@email.com" aria-label="Test email addresses" />
                    <button type="button" onClick={() => doTest(s._id)} disabled={busy} style={ghostBtn}>Send test</button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* ── Runs ── */}
      <section aria-label="Recent sends" style={card}>
        <h3 style={{ margin: "0 0 12px", fontSize: 17, color: "var(--soma-forest)" }}>Recent sends</h3>
        {runs.length === 0 && <p style={{ fontSize: 14, color: "#5a6b63", margin: 0 }}>Nothing sent yet.</p>}
        {runs.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", whiteSpace: "nowrap" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--soma-warm-gray)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  <th style={{ padding: "6px 8px" }}>Campaign</th><th style={{ padding: "6px 8px" }}>Week of</th>
                  <th style={{ padding: "6px 8px" }}>Status</th><th style={{ padding: "6px 8px" }}>Sent</th>
                  <th style={{ padding: "6px 8px" }}>Failed</th><th style={{ padding: "6px 8px" }}>Skipped</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr key={r._id} style={{ borderTop: "1px solid var(--soma-line-light)" }}>
                    <td style={{ padding: "8px" }}>{r.schedule?.name || "—"}</td>
                    <td style={{ padding: "8px" }}>{r.runDate}</td>
                    <td style={{ padding: "8px" }}>
                      <span style={{
                        fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 9999,
                        background: r.status === "completed" ? "var(--soma-soft-sage)" : r.status === "failed" ? "#FDECEC" : "#FFF7E6",
                        color: r.status === "failed" ? "#B42318" : "var(--soma-forest)",
                      }}>{r.status}</span>
                    </td>
                    <td style={{ padding: "8px" }}>{r.sent}</td>
                    <td style={{ padding: "8px" }}>{r.failed}</td>
                    <td style={{ padding: "8px" }}>{r.skipped}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
