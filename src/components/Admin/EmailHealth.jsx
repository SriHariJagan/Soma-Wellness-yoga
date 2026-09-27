import React, { useCallback, useEffect, useRef, useState } from 'react';
import s from './YogaAdmin.module.css';
import { LuActivity, LuMail, LuDatabase, LuRefreshCw, LuSend, LuCircleCheck, LuCircleX, LuClock, LuLoader, LuChartBar } from 'react-icons/lu';
import { getEmailHealth, testSmtp as testSmtpApi } from '../api/AdminServices.js';

const card = {
  background: "#fff", border: "1px solid var(--soma-line-light)", borderRadius: 16, padding: 20,
};

function statusTone(status) {
  const v = String(status || '').toLowerCase();
  if (['delivered', 'sent', 'connected', 'verified', 'healthy', 'completed'].includes(v)) return 'green';
  if (['pending', 'queued', 'connecting', 'unverified', 'degraded', 'active', 'waiting'].includes(v)) return 'amber';
  return 'red';
}

const TONE = {
  green: { dot: 'var(--soma-primary)', bg: 'var(--soma-soft-sage)', text: 'var(--soma-forest)' },
  amber: { dot: '#D9A419', bg: '#FFF7E6', text: '#7A5A00' },
  red: { dot: '#B42318', bg: '#FDECEC', text: '#B42318' },
};

function Pill({ status, children }) {
  const tone = TONE[statusTone(status)] || TONE.red;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800,
      letterSpacing: "0.04em", padding: "4px 12px", borderRadius: 9999,
      background: tone.bg, color: tone.text, whiteSpace: "nowrap",
    }}>
      <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: tone.dot }} />
      {children || status}
    </span>
  );
}

function ServiceCard({ icon, label, value, status, hint }) {
  const tone = TONE[statusTone(status)] || TONE.red;
  return (
    <div style={{
      ...card, padding: 18, borderTop: `3px solid ${tone.dot}`,
      display: "flex", gap: 14, alignItems: "flex-start",
    }}>
      <span style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: tone.bg, color: tone.text,
        display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 19,
      }} aria-hidden="true">
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--soma-warm-gray)" }}>
          {label}
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--soma-forest)", margin: "2px 0 6px" }}>
          {value}
        </div>
        <Pill status={status} />
        {hint && <div style={{ fontSize: 11, color: "#5a6b63", marginTop: 6 }}>{hint}</div>}
      </div>
    </div>
  );
}

function MiniStat({ icon, label, value, tone }) {
  const t = TONE[tone] || TONE.green;
  return (
    <div style={{
      border: "1px solid var(--soma-line-light)", borderRadius: 12, padding: 12,
      display: "flex", gap: 10, alignItems: "center", background: "#FBFAF6", minWidth: 0,
    }}>
      <span style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        background: t.bg, color: t.text,
        display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16,
      }} aria-hidden="true">
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "var(--soma-forest)", lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 11, color: "var(--soma-warm-gray)" }}>{label}</div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div role="status" aria-label="Loading system health" style={{ display: "grid", gap: 14 }}>
      <div className="shimmer" style={{ height: 64, borderRadius: 14, background: "#F1EDE2" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="shimmer" style={{ height: 150, borderRadius: 16, background: "#F1EDE2" }} />
        ))}
      </div>
      <div className="shimmer" style={{ height: 220, borderRadius: 16, background: "#F1EDE2" }} />
    </div>
  );
}

export default function EmailHealth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [smtpTesting, setSmtpTesting] = useState(false);
  const [smtpResult, setSmtpResult] = useState(null);
  const [page, setPage] = useState(1);
  const pageRef = useRef(1);
  const dataRef = useRef(null);
  const [tableLoading, setTableLoading] = useState(false);
  const PAGE_SIZE = 50;

  const load = useCallback(async (targetPage = pageRef.current) => {
    const isFirstLoad = targetPage === 1 && !dataRef.current;
    if (isFirstLoad) setLoading(true);
    else setTableLoading(true);
    setError(null);
    try {
      // Safety net: never spin forever if the server hangs.
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out — the server took too long to respond.')), 25000)
      );
      const result = await Promise.race([getEmailHealth({ page: targetPage, limit: PAGE_SIZE }), timeout]);
      setData(result);
      dataRef.current = result;
      const resolved = result?.notifications?.page || targetPage;
      pageRef.current = resolved;
      setPage(resolved);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setTableLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const handleTestSmtp = async () => {
    setSmtpTesting(true);
    setSmtpResult(null);
    try {
      const result = await testSmtpApi();
      setSmtpResult({ type: 'success', message: result.message });
    } catch (err) {
      setSmtpResult({ type: 'error', message: err.message });
    } finally {
      setSmtpTesting(false);
    }
  };

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div style={{ ...card, textAlign: 'center', padding: 56 }} role="alert">
        <LuCircleX size={34} color="#B42318" style={{ marginBottom: 12 }} />
        <div style={{ color: "#B42318", fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Could not load system health</div>
        <div style={{ color: '#5a6b63', fontSize: 13, marginBottom: 18, maxWidth: 460, marginLeft: "auto", marginRight: "auto" }}>{error}</div>
        <button
          onClick={load}
          style={{ background: "var(--soma-forest)", color: "#fff", border: "none", borderRadius: 9999, padding: "10px 26px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
        >
          Try again
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { database, smtp, notifications, queue } = data;
  const queueDown = Boolean(queue.unavailable);
  const totalPages = notifications.pages || 1;
  const totalItems = notifications.total ?? notifications.recent?.length ?? 0;

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 1080 }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, color: "var(--soma-forest)" }}>Email & Notification Health</h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5a6b63" }}>
            Delivery, queue and system status at a glance · updated {data.timestamp ? new Date(data.timestamp).toLocaleTimeString() : "—"}
          </p>
        </div>
        <button
          onClick={load}
          style={{
            display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 9999,
            padding: "9px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer",
            border: "1px solid var(--soma-line-strong)", background: "#fff", color: "var(--soma-forest)",
          }}
        >
          <LuRefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* ── Service status ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14 }}>
        <ServiceCard
          icon={<LuDatabase />}
          label="Database"
          value={database === 'connected' ? 'Connected' : 'Not connected'}
          status={database}
        />
        <ServiceCard
          icon={<LuMail />}
          label="SMTP email"
          value={smtp.status === 'verified' ? 'Verified' : smtp.status === 'unverified' ? 'Needs attention' : 'Not configured'}
          status={smtp.status === 'verified' ? 'verified' : smtp.status === 'unverified' ? 'degraded' : 'unconfigured'}
          hint={smtp.note}
        />
        <ServiceCard
          icon={<LuChartBar />}
          label="Delivery queue"
          value={queueDown ? 'Unavailable' : 'Active'}
          status={queueDown ? 'unknown' : 'healthy'}
          hint={queueDown ? "Emails send directly via SMTP until Redis recovers." : "Queued delivery running normally."}
        />
      </div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        <div style={card}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "var(--soma-forest)", display: "flex", alignItems: "center", gap: 8 }}>
            <LuCircleCheck aria-hidden="true" /> Notifications
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            <MiniStat icon={<LuCircleCheck />} label="Delivered" value={notifications.successCount ?? 0} tone="green" />
            <MiniStat icon={<LuCircleX />} label="Failed" value={notifications.failedCount ?? 0} tone={notifications.failedCount > 0 ? "red" : "green"} />
            <MiniStat icon={<LuClock />} label="Pending" value={notifications.pendingCount ?? 0} tone="amber" />
          </div>
        </div>
        <div style={card}>
          <h3 style={{ margin: "0 0 12px", fontSize: 15, color: "var(--soma-forest)", display: "flex", alignItems: "center", gap: 8 }}>
            <LuChartBar aria-hidden="true" /> Queue
          </h3>
          {queueDown ? (
            <p style={{ fontSize: 13, color: "#5a6b63", margin: 0 }}>
              Queue statistics unavailable while Redis is down. Deliveries continue directly — nothing is lost.
            </p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              <MiniStat icon={<LuClock />} label="Waiting" value={queue.waiting ?? 0} tone="amber" />
              <MiniStat icon={<LuActivity />} label="Active" value={queue.active ?? 0} tone="green" />
              <MiniStat icon={<LuCircleCheck />} label="Completed" value={queue.completed ?? 0} tone="green" />
              <MiniStat icon={<LuCircleX />} label="Failed" value={queue.failed ?? 0} tone={queue.failed > 0 ? "red" : "green"} />
            </div>
          )}
        </div>
      </div>

      {/* ── Recent ── */}
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <h3 style={{ margin: 0, fontSize: 15, color: "var(--soma-forest)" }}>Recent notifications</h3>
          <span style={{ fontSize: 12, color: "var(--soma-warm-gray)" }}>
            {totalItems > 0 ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, totalItems)} of ${totalItems}` : "None yet"}
          </span>
        </div>
        <div style={{ overflowX: "auto", opacity: tableLoading ? 0.55 : 1, transition: "opacity 200ms" }} aria-busy={tableLoading}>
          <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse", whiteSpace: "nowrap" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--soma-warm-gray)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                <th style={{ padding: "6px 8px" }}>Recipient</th>
                <th style={{ padding: "6px 8px" }}>Type</th>
                <th style={{ padding: "6px 8px" }}>Status</th>
                <th style={{ padding: "6px 8px" }}>When</th>
              </tr>
            </thead>
            <tbody>
              {(!notifications.recent || notifications.recent.length === 0) && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: 28, color: "var(--soma-warm-gray)" }}>
                    No notifications yet — sends will appear here.
                  </td>
                </tr>
              )}
              {(notifications.recent || []).map((n) => (
                <tr key={n.id} style={{ borderTop: "1px solid var(--soma-line-light)" }}>
                  <td style={{ padding: "8px", maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {n.email || 'system'}
                  </td>
                  <td style={{ padding: "8px", textTransform: 'capitalize' }}>{n.type || 'general'}</td>
                  <td style={{ padding: "8px" }}><Pill status={n.status || 'unknown'} /></td>
                  <td style={{ padding: "8px", color: "var(--soma-warm-gray)", fontSize: 12 }}>
                    {n.createdAt ? new Date(n.createdAt).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 14 }}>
            <button
              type="button"
              onClick={() => load(page - 1)}
              disabled={page <= 1 || tableLoading}
              style={{
                borderRadius: 9999, padding: "7px 18px", fontSize: 12, fontWeight: 800,
                border: "1px solid var(--soma-line-strong)", background: "#fff", color: "var(--soma-forest)",
                cursor: page <= 1 || tableLoading ? "not-allowed" : "pointer", opacity: page <= 1 || tableLoading ? 0.45 : 1,
              }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--soma-warm-gray)", minWidth: 110, textAlign: "center" }} aria-live="polite">
              {tableLoading ? "Loading emails…" : `Page ${page} of ${totalPages}`}
            </span>
            <button
              type="button"
              onClick={() => load(page + 1)}
              disabled={page >= totalPages || tableLoading}
              style={{
                borderRadius: 9999, padding: "7px 18px", fontSize: 12, fontWeight: 800,
                border: "1px solid var(--soma-line-strong)", background: "#fff", color: "var(--soma-forest)",
                cursor: page >= totalPages || tableLoading ? "not-allowed" : "pointer", opacity: page >= totalPages || tableLoading ? 0.45 : 1,
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── SMTP test ── */}
      <div style={card}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15, color: "var(--soma-forest)", display: "flex", alignItems: "center", gap: 8 }}>
          <LuSend aria-hidden="true" /> Test SMTP
        </h3>
        <p style={{ fontSize: 13, color: "#5a6b63", margin: "0 0 12px" }}>
          Sends a test email to your own admin address to prove end-to-end delivery.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: "wrap" }}>
          <button
            onClick={handleTestSmtp}
            disabled={smtpTesting}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "var(--soma-forest)", color: "#fff", border: "none",
              borderRadius: 9999, padding: "10px 24px", fontSize: 13, fontWeight: 800,
              cursor: smtpTesting ? "wait" : "pointer", opacity: smtpTesting ? 0.7 : 1,
            }}
          >
            {smtpTesting ? <LuLoader size={14} className={s.spin} /> : <LuSend size={14} />}
            {smtpTesting ? 'Sending…' : 'Send test email'}
          </button>
          {smtpResult && (
            <span role="status" style={{ fontSize: 13, color: smtpResult.type === 'success' ? '#16A34A' : '#B42318', fontWeight: 600 }}>
              {smtpResult.type === 'success' ? '✓ ' : '✕ '}{smtpResult.message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
