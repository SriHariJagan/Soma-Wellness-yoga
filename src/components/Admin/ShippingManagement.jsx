import { useCallback, useEffect, useState } from "react";
import { adminShippingApi } from "../api/AdminServices.js";
import s from "./ShippingManagement.module.css";

const inr = (n) => `KES ${Number(n || 0).toLocaleString("en-KE")}`;

const TYPE_LABEL = {
  flat: "Flat rate",
  free: "Free shipping",
  unavailable: "Unavailable",
};

const emptyRule = {
  name: "", priority: 0, status: "active", country: "India", states: "",
  allowedPincodes: "", blockedPincodes: "", pincodeRanges: "",
  shippingType: "flat", shippingAmount: 60, freeShippingThreshold: 0,
  deliveryMinDays: 3, deliveryMaxDays: 5, notes: "",
};

export default function ShippingManagement() {
  const [rules, setRules] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [flash, setFlash] = useState(null);
  const [saving, setSaving] = useState(false);

  const showFlash = (message, type = "success") => {
    setFlash({ message, type });
    setTimeout(() => setFlash(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminShippingApi.list();
      setRules(data.rules || []);
      setSettings(data.settings || null);
    } catch (err) {
      showFlash(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveRule = async (data) => {
    setSaving(true);
    try {
      if (modal.mode === "edit") {
        await adminShippingApi.update(modal.rule._id, data);
        showFlash("Rule updated");
      } else {
        await adminShippingApi.create(data);
        showFlash("Rule created");
      }
      setModal(null);
      await load();
    } catch (err) {
      showFlash(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule) => {
    try {
      await adminShippingApi.toggle(rule._id, rule.status === "active" ? "inactive" : "active");
      showFlash(rule.status === "active" ? "Rule disabled" : "Rule enabled");
      await load();
    } catch (err) { showFlash(err.message, "error"); }
  };

  const deleteRule = async (rule) => {
    if (!confirm(`Delete shipping rule "${rule.name}"?`)) return;
    try {
      await adminShippingApi.remove(rule._id);
      showFlash("Rule deleted");
      await load();
    } catch (err) { showFlash(err.message, "error"); }
  };

  const stats = {
    active: rules.filter((r) => r.status === "active").length,
    inactive: rules.filter((r) => r.status === "inactive").length,
    blocked: rules.reduce((n, r) => n + (r.blockedPincodes?.length || 0), 0),
    allowed: rules.reduce((n, r) => n + (r.allowedPincodes?.length || 0), 0),
    ranges: rules.reduce((n, r) => n + (r.pincodeRanges?.length || 0), 0),
    free: rules.filter((r) => r.shippingType === "free").length,
    unavailable: rules.filter((r) => r.shippingType === "unavailable").length,
    states: new Set(rules.flatMap((r) => r.states || [])).size,
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminShippingApi.saveSettings({
        freeShippingThreshold: Number(e.target.freeShippingThreshold.value || 0),
        defaultShippingCharge: Number(e.target.defaultShippingCharge.value || 0),
        deliveryMinDays: Number(e.target.deliveryMinDays.value || 0),
        deliveryMaxDays: Number(e.target.deliveryMaxDays.value || 0),
      });
      showFlash("Shipping settings saved");
      await load();
    } catch (err) {
      showFlash(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const scopeOf = (r) => {
    if (r.blockedPincodes?.length) return `Blocked PINs: ${r.blockedPincodes.join(", ")}`;
    if (r.allowedPincodes?.length) return `PINs: ${r.allowedPincodes.join(", ")}`;
    if (r.pincodeRanges?.length) return `PIN ranges: ${r.pincodeRanges.map((x) => `${x.from}–${x.to}`).join(", ")}`;
    if (r.states?.length) return `States: ${r.states.join(", ")}`;
    if (r.country && r.country !== "*") return `Country: ${r.country}`;
    return "Default (all)";
  };

  return (
    <div>
      <div className={s.head}>
        <div>
          <h1 className={s.title}>Shipping</h1>
          <p className={s.sub}>Delivery is available everywhere by default. Rules only change the terms for their coverage; block PINs or use the "Unavailable" type to restrict delivery.</p>
        </div>
        <button className={s.primaryBtn} onClick={() => setModal({ mode: "create" })}>+ Add Rule</button>
      </div>

      {flash && <div className={`${s.flash} ${flash.type === "error" ? s.flashError : ""}`}>{flash.message}</div>}

      <div className={s.cards}>
        <form className={s.settingsCard} onSubmit={saveSettings}>
          <h2>Store defaults</h2>
          <div className={s.settingsGrid}>
            <label><span>Free shipping threshold (KES )</span>
              <input name="freeShippingThreshold" type="number" min="0" step="0.01" defaultValue={settings?.freeShippingThreshold ?? 999} />
            </label>
            <label><span>Default shipping charge (KES )</span>
              <input name="defaultShippingCharge" type="number" min="0" step="0.01" defaultValue={settings?.defaultShippingCharge ?? 60} />
            </label>
            <label><span>Delivery min days</span>
              <input name="deliveryMinDays" type="number" min="0" defaultValue={settings?.deliveryMinDays ?? 3} />
            </label>
            <label><span>Delivery max days</span>
              <input name="deliveryMaxDays" type="number" min="0" defaultValue={settings?.deliveryMaxDays ?? 5} />
            </label>
          </div>
          <button className={s.primaryBtn} type="submit" disabled={saving || !settings}>{saving ? "Saving…" : "Save defaults"}</button>
          <p className={s.hint}>Orders above the free-shipping threshold pay no shipping; the default charge applies when no rule matches.</p>
        </form>

        <div className={s.summaryCard}>
          <h2>Shipping stats</h2>
          <div className={s.statGrid}>
            <div className={s.stat}><strong>{stats.active}</strong><span>Active rules</span></div>
            <div className={s.stat}><strong>{stats.inactive}</strong><span>Inactive rules</span></div>
            <div className={s.stat}><strong>{stats.blocked}</strong><span>Blocked PINs</span></div>
            <div className={s.stat}><strong>{stats.allowed}</strong><span>Allowlisted PINs</span></div>
            <div className={s.stat}><strong>{stats.ranges}</strong><span>PIN ranges</span></div>
            <div className={s.stat}><strong>{stats.states}</strong><span>States covered</span></div>
            <div className={s.stat}><strong>{stats.free}</strong><span>Free-ship rules</span></div>
            <div className={s.stat}><strong>{stats.unavailable}</strong><span>Unavailable rules</span></div>
          </div>
          <p className={s.hint}>
            Defaults: {inr(settings?.defaultShippingCharge ?? 60)} / order · free above {inr(settings?.freeShippingThreshold ?? 999)} · {settings?.deliveryMinDays ?? 3}–{settings?.deliveryMaxDays ?? 5} days
          </p>
        </div>
      </div>

      {loading ? (
        <p className={s.loading}>Loading rules…</p>
      ) : rules.length === 0 ? (
        <p className={s.loading}>No shipping rules yet. Add one to control delivery for PIN codes, states or countries.</p>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr><th>Rule</th><th>Applies to</th><th>Type</th><th>Charge</th><th>Free above</th><th>ETA (days)</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r._id}>
                  <td>
                    <div className={s.ruleName}>{r.name}</div>
                    <div className={s.muted}>priority {r.priority}</div>
                  </td>
                  <td className={s.muted}>{scopeOf(r)}</td>
                  <td><span className={s.badge}>{TYPE_LABEL[r.shippingType] || r.shippingType}</span></td>
                  <td>{r.shippingType === "free" ? "—" : inr(r.shippingAmount)}</td>
                  <td>{r.freeShippingThreshold ? inr(r.freeShippingThreshold) : "—"}</td>
                  <td>{r.deliveryMinDays}–{r.deliveryMaxDays}</td>
                  <td><span className={`${s.badge} ${r.status === "active" ? s.ok : s.mutedBadge}`}>{r.status}</span></td>
                  <td>
                    <div className={s.actions}>
                      <button className={s.linkBtn} onClick={() => setModal({ mode: "edit", rule: r })}>Edit</button>
                      <button className={s.linkBtn} onClick={() => toggleRule(r)}>{r.status === "active" ? "Disable" : "Enable"}</button>
                      <button className={`${s.linkBtn} ${s.dangerLink}`} onClick={() => deleteRule(r)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && <RuleModal mode={modal.mode} rule={modal.rule} saving={saving} onClose={() => setModal(null)} onSave={saveRule} />}
    </div>
  );
}

const PIN_RE = /^\d{6}$/;

function parsePins(value) {
  const items = String(value || "")
    .split(/[\s,]+/)
    .map((x) => x.trim())
    .filter(Boolean);
  const valid = [];
  const invalid = [];
  for (const item of items) (PIN_RE.test(item) ? valid : invalid).push(item);
  return { valid, invalid };
}

function PinChips({ valid, invalid, onRemove }) {
  const chips = [...valid.map((p) => ({ p, bad: false })), ...invalid.map((p) => ({ p, bad: true }))];
  if (!chips.length) return null;
  return (
    <div className={s.chips}>
      {chips.map((c) => (
        <button type="button" key={c.p} className={`${s.chip} ${c.bad ? s.chipBad : ""}`} onClick={() => onRemove(c.p)} title="Remove PIN">{c.p} ✕</button>
      ))}
    </div>
  );
}

function RuleModal({ mode, rule, saving, onClose, onSave }) {
  const [form, setForm] = useState(
    rule
      ? {
          ...emptyRule,
          ...rule,
          states: (rule.states || []).join(", "),
          allowedPincodes: (rule.allowedPincodes || []).join(", "),
          blockedPincodes: (rule.blockedPincodes || []).join(", "),
        }
      : emptyRule
  );
  const [ranges, setRanges] = useState((rule?.pincodeRanges || []).map((r) => ({ from: String(r.from), to: String(r.to) })));
  const [rangeFrom, setRangeFrom] = useState("");
  const [rangeTo, setRangeTo] = useState("");
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
    setErrors((er) => ({ ...er, [field]: null }));
  };

  const allowed = parsePins(form.allowedPincodes);
  const blocked = parsePins(form.blockedPincodes);
  const states = String(form.states || "").split(",").map((x) => x.trim()).filter(Boolean);
  const typeUnavailable = form.shippingType === "unavailable";

  const removePin = (field, value) => {
    const { valid, invalid } = parsePins(form[field]);
    setForm({ ...form, [field]: [...valid, ...invalid].filter((p) => p !== value).join(", ") });
  };

  const addRange = () => {
    if (!PIN_RE.test(rangeFrom) || !PIN_RE.test(rangeTo)) {
      setErrors((er) => ({ ...er, ranges: "Both ends of a range must be valid 6-digit PIN codes." }));
      return;
    }
    if (Number(rangeFrom) > Number(rangeTo)) {
      setErrors((er) => ({ ...er, ranges: "Range start must be lower than or equal to range end." }));
      return;
    }
    setRanges([...ranges, { from: rangeFrom, to: rangeTo }]);
    setRangeFrom("");
    setRangeTo("");
    setErrors((er) => ({ ...er, ranges: null }));
  };

  const removeRange = (idx) => setRanges(ranges.filter((_, i) => i !== idx));

  const scopePreview = () => {
    const parts = [];
    const country = String(form.country || "").trim();
    parts.push(country && country !== "*" ? country : "All countries");
    if (states.length) parts.push(`${states.length} state${states.length > 1 ? "s" : ""}`);
    if (allowed.valid.length) parts.push(`${allowed.valid.length} allowed PIN${allowed.valid.length > 1 ? "s" : ""}`);
    if (blocked.valid.length) parts.push(`${blocked.valid.length} blocked PIN${blocked.valid.length > 1 ? "s" : ""}`);
    if (ranges.length) parts.push(`${ranges.length} PIN range${ranges.length > 1 ? "s" : ""}`);
    return parts.join(" · ");
  };

  const submit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!form.name.trim()) errs.name = "Give the rule a name.";
    if (allowed.invalid.length) errs.allowedPincodes = `Not valid PINs: ${allowed.invalid.join(", ")}`;
    if (blocked.invalid.length) errs.blockedPincodes = `Not valid PINs: ${blocked.invalid.join(", ")}`;
    if (ranges.some((r) => !PIN_RE.test(r.from) || !PIN_RE.test(r.to))) errs.ranges = "One or more ranges are invalid.";
    if (form.shippingType === "flat" && !(Number(form.shippingAmount) > 0)) errs.shippingAmount = "Enter a flat charge, or switch to Free shipping.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    onSave({
      name: form.name,
      priority: Number(form.priority || 0),
      status: form.status,
      country: form.country,
      states,
      allowedPincodes: allowed.valid,
      blockedPincodes: blocked.valid,
      pincodeRanges: ranges,
      shippingType: form.shippingType,
      shippingAmount: Number(form.shippingAmount || 0),
      freeShippingThreshold: Number(form.freeShippingThreshold || 0),
      deliveryMinDays: Number(form.deliveryMinDays || 0),
      deliveryMaxDays: Number(form.deliveryMaxDays || 0),
      notes: form.notes,
    });
  };

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHead}>
          <h2>{mode === "edit" ? "Edit shipping rule" : "New shipping rule"}</h2>
          <button className={s.closeBtn} onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className={s.modalForm} noValidate>
          <div className={s.scopePreview}><strong>Rule applies to:</strong> {scopePreview()}</div>

          <div className={s.section}>
            <h3>Scope</h3>
            <div className={s.formGrid}>
              <label className={s.field}><span>Country (* = any)</span>
                <input value={form.country} onChange={set("country")} placeholder="e.g. India" />
                <em className={s.fieldNote}>“*” or empty means all countries.</em>
              </label>
              <label className={s.field}><span>States / regions</span>
                <input value={form.states} onChange={set("states")} placeholder="e.g. Maharashtra, Karnataka" />
                <em className={s.fieldNote}>Comma separated. Leave empty for all states.</em>
              </label>
            </div>
          </div>

          <div className={s.section}>
            <h3>PIN restrictions <span className={s.sectionHint}>unmatched PINs get the store defaults — only blocked/unavailable restrict</span></h3>
            <div className={s.pinRow}>
              <label className={s.field}><span>Allow list — get this rule's terms</span>
                <input value={form.allowedPincodes} onChange={set("allowedPincodes")} placeholder="110001, 400001, 560001" className={errors.allowedPincodes ? s.inputBad : ""} />
                <PinChips valid={allowed.valid} invalid={allowed.invalid} onRemove={(p) => removePin("allowedPincodes", p)} />
                <em className={s.fieldNote}>Only these PINs get this rule's terms — every other PIN falls back to the store defaults.</em>
                {errors.allowedPincodes && <span className={s.error}>{errors.allowedPincodes}</span>}
              </label>
              <label className={s.field}><span>Block list — never these PINs</span>
                <input value={form.blockedPincodes} onChange={set("blockedPincodes")} placeholder="194101, 202001" className={errors.blockedPincodes ? s.inputBad : ""} />
                <PinChips valid={blocked.valid} invalid={blocked.invalid} onRemove={(p) => removePin("blockedPincodes", p)} />
                <em className={s.fieldNote}>Blocked PINs win over allow lists and ranges.</em>
                {errors.blockedPincodes && <span className={s.error}>{errors.blockedPincodes}</span>}
              </label>
            </div>
            <label className={s.field}><span>PIN ranges</span>
              <div className={s.rangeRow}>
                <input value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)} placeholder="560001" className={s.rangeInput} />
                <span className={s.rangeDash}>–</span>
                <input value={rangeTo} onChange={(e) => setRangeTo(e.target.value)} placeholder="560099" className={s.rangeInput} />
                <button type="button" className={s.ghostBtn} onClick={addRange}>Add range</button>
              </div>
              {ranges.length > 0 && (
                <div className={s.chips}>
                  {ranges.map((r, i) => (
                    <button type="button" key={`${r.from}-${r.to}`} className={s.chip} onClick={() => removeRange(i)} title="Remove range">{r.from}–{r.to} ✕</button>
                  ))}
                </div>
              )}
              <em className={s.fieldNote}>Ranges cover every PIN between the two codes (e.g. 560001–560099).</em>
              {errors.ranges && <span className={s.error}>{errors.ranges}</span>}
            </label>
          </div>

          <div className={s.section}>
            <h3>Delivery terms</h3>
            <div className={s.formGrid}>
              <label className={s.field}><span>Shipping type</span>
                <select value={form.shippingType} onChange={set("shippingType")}>
                  <option value="flat">Flat rate</option>
                  <option value="free">Free shipping</option>
                  <option value="unavailable">Unavailable (no delivery)</option>
                </select>
              </label>
              <label className={s.field}><span>Charge (KES )</span>
                <input type="number" min="0" step="0.01" value={form.shippingAmount} onChange={set("shippingAmount")} disabled={typeUnavailable || form.shippingType === "free"} className={errors.shippingAmount ? s.inputBad : ""} />
                {errors.shippingAmount && <span className={s.error}>{errors.shippingAmount}</span>}
              </label>
              <label className={s.field}><span>Free above (KES , 0 = never)</span>
                <input type="number" min="0" step="0.01" value={form.freeShippingThreshold} onChange={set("freeShippingThreshold")} disabled={typeUnavailable} />
              </label>
              <label className={s.field}><span>Delivery min days</span>
                <input type="number" min="0" value={form.deliveryMinDays} onChange={set("deliveryMinDays")} disabled={typeUnavailable} />
              </label>
              <label className={s.field}><span>Delivery max days</span>
                <input type="number" min="0" value={form.deliveryMaxDays} onChange={set("deliveryMaxDays")} disabled={typeUnavailable} />
              </label>
            </div>
            {typeUnavailable && <em className={s.fieldNote}>Delivery is refused for the scope above — charge and ETA are ignored.</em>}
          </div>

          <div className={s.section}>
            <h3>Management</h3>
            <div className={s.formGrid}>
              <label className={s.field}><span>Rule name *</span>
                <input value={form.name} onChange={set("name")} placeholder="e.g. Metro cities flat KES 60" className={errors.name ? s.inputBad : ""} />
                {errors.name && <span className={s.error}>{errors.name}</span>}
              </label>
              <label className={s.field}><span>Priority (higher wins ties)</span><input type="number" value={form.priority} onChange={set("priority")} placeholder="0" /></label>
              <label className={s.field}><span>Status</span>
                <select value={form.status} onChange={set("status")}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className={s.field}><span>Notes (internal)</span><input value={form.notes} onChange={set("notes")} placeholder="Optional — e.g. reason for blocking" /></label>
            </div>
          </div>

          <div className={s.modalFoot}>
            <button type="button" className={s.ghostBtn} onClick={onClose}>Cancel</button>
            <button type="submit" className={s.primaryBtn} disabled={saving}>{saving ? "Saving…" : "Save rule"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}