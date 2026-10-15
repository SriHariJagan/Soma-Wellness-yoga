import { memo, useEffect, useMemo, useState } from "react";
import styles from "./PaymentsPage.module.css";
import w from "./widgets/DashboardWidgets.module.css";
import { getMyPayments } from "../api/StudentServices.js";

// ─────────────────────────────────────────────────────────────
// PaymentsPage — History + Invoices for the student dashboard.
//
// PERFORMANCE NOTES (why this file avoids animation libraries):
// • The previous version wrapped the header, KPI cards, tabs and EVERY
//   row in Framer Motion (Stagger + springs + per-row delays +
//   AnimatePresence crossfades) and animated the KES totals with a
//   scroll-triggered CountUp. With data already in hand that added
//   ~0.5–0.8s of dead time before the table/cards settled.
// • This version renders the exact same markup/classes with plain JSX:
//   first paint shows the numbers and rows immediately, tab switches
//   are a synchronous state flip with no exit-wait.
// • Amounts from the API are integer MINOR units (KES cents).
// ─────────────────────────────────────────────────────────────

// Module-level formatter: one instance reused for every row (the old code
// built a fresh `toLocaleString` options object per row per render).
const kesFormat = new Intl.NumberFormat("en-KE", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const toMajor = (minor) => (Number(minor) || 0) / 100;
const fmtMajor = (minor) => `KES ${kesFormat.format(toMajor(minor))}`;
const fmtPlain = (minor) => kesFormat.format(toMajor(minor));

const STATUS_TONE = { paid: "green", pending: "amber", failed: "red", refunded: "neutral", refunding: "amber" };
const STATUS_ICON = { paid: "ti-check", pending: "ti-clock", failed: "ti-x", refunded: "ti-receipt-refund", refunding: "ti-clock" };
const STATUS_LABEL = { paid: "Paid", pending: "Pending", failed: "Failed", refunded: "Refunded", refunding: "Refunding" };

const canonStatus = (p) => (STATUS_LABEL[p?.status] ? p.status : "pending");

function sameList(a, b) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x._id !== y._id || x.amount !== y.amount || x.status !== y.status || x.invoiceNo !== y.invoiceNo) return false;
  }
  return true;
}

const TxnRow = memo(function TxnRow({ p, icon, label }) {
  const st = canonStatus(p);
  return (
    <div className={styles.txn}>
      <span className={styles.txnIcon}><i className={`ti ${icon}`} aria-hidden="true" /></span>
      <span className={styles.txnLabel}>{label}</span>
      <span className={styles.txnAmount}>{fmtMajor(p.amount)}</span>
      <span className={`${w.pill} ${w[`pill_${STATUS_TONE[st]}`] || ""}`}>
        <i className={`ti ${STATUS_ICON[st]}`} aria-hidden="true" />
        {STATUS_LABEL[st]}
      </span>
      {p.receiptUrl && (
        <a href={p.receiptUrl} target="_blank" rel="noreferrer" className={styles.txnDownload} aria-label={`Download receipt for ${label}`}>
          <span className={styles.iconBtn} aria-hidden="true">
            <i className="ti ti-download" />
          </span>
        </a>
      )}
    </div>
  );
});

function StaticEmpty({ icon, title, sub }) {
  return (
    <div className={w.empty}>
      <div className={w.emptyDeco} aria-hidden="true">
        <span className={w.emptyOrb} />
        <span className={w.emptyOrb2} />
      </div>
      <span className={w.emptyIcon} aria-hidden="true">
        <i className={`ti ${icon}`} />
      </span>
      {title && <p className={w.emptyTitle}>{title}</p>}
      {sub && <p className={w.emptySub}>{sub}</p>}
    </div>
  );
}

export default function PaymentsPage({ student }) {
  const [tab, setTab] = useState("history");
  const propPayments = student?.payments ?? [];

  // Paint instantly from the dashboard payload, then refresh once in the
  // background from the lightweight /payments endpoint (lean + projected +
  // HTTP-cached for 30s). The prop rows stay visible the whole time — the
  // refresh never blanks the list, it only swaps in fresher data.
  const [live, setLive] = useState(null);
  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    getMyPayments()
      .then((rows) => {
        if (cancelled || !Array.isArray(rows)) return;
        setLive((prev) => {
          const base = prev ?? propPayments;
          return sameList(base, rows) ? base : rows;
        });
      })
      .catch(() => {});
    return () => { cancelled = true; ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const payments = live ?? propPayments;

  const { paidTotal, pendingTotal, invoiced } = useMemo(() => {
    let paid = 0, pending = 0;
    const inv = [];
    for (const p of payments) {
      if (p.status === "paid") paid += p.amount || 0;
      else if (p.status === "pending") pending += p.amount || 0;
      if (p.invoiceNo) inv.push(p);
    }
    return { paidTotal: paid, pendingTotal: pending, invoiced: inv };
  }, [payments]);

  // Pre-formatted strings: StatCards render strings verbatim (no CountUp),
  // so the KES values land on first paint.
  const paidStr = useMemo(() => fmtPlain(paidTotal), [paidTotal]);
  const pendingStr = useMemo(() => fmtPlain(pendingTotal), [pendingTotal]);

  return (
    <>
      <header className={w.pageHeader}>
        <div className={w.pageHeaderText}>
          <h1 className={w.pageTitle}>Payments</h1>
        </div>
      </header>

      <div className={w.statGrid}>
        <div className={`${w.stat} ${w.tone_green}`}>
          <div className={w.statGlow} aria-hidden="true" />
          <div className={w.statTop}>
            <span className={w.statIcon}>
              <i className="ti ti-circle-check" aria-hidden="true" />
            </span>
          </div>
          <div className={w.statValue}>KES {paidStr}</div>
          <div className={w.statLabel}>Paid</div>
        </div>
        <div className={`${w.stat} ${w.tone_amber}`}>
          <div className={w.statGlow} aria-hidden="true" />
          <div className={w.statTop}>
            <span className={w.statIcon}>
              <i className="ti ti-clock" aria-hidden="true" />
            </span>
          </div>
          <div className={w.statValue}>KES {pendingStr}</div>
          <div className={w.statLabel}>Pending</div>
        </div>
      </div>

      <div className={w.tabs} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "history"}
          className={`${w.tab} ${tab === "history" ? w.tabActive : ""}`}
          onClick={() => setTab("history")}
        >
          <i className="ti ti-history" aria-hidden="true" />
          <span className={w.tabLabel}>History</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "invoices"}
          className={`${w.tab} ${tab === "invoices" ? w.tabActive : ""}`}
          onClick={() => setTab("invoices")}
        >
          <i className="ti ti-file-invoice" aria-hidden="true" />
          <span className={w.tabLabel}>Invoices</span>
        </button>
      </div>

      {tab === "history" && (
        payments.length === 0 ? (
          <StaticEmpty icon="ti-receipt" title="No payments yet." />
        ) : (
          <section className={`${w.panel} ${w.panelFlush}`}>
            <header className={w.panelHead}>
              <h2 className={w.panelTitle}>
                <i className="ti ti-history" aria-hidden="true" />
                History
              </h2>
            </header>
            <div className={styles.list}>
              {payments.map((p, i) => (
                <TxnRow key={p._id || i} p={p} icon="ti-credit-card" label={p.label} />
              ))}
            </div>
          </section>
        )
      )}

      {tab === "invoices" && (
        invoiced.length === 0 ? (
          <StaticEmpty
            icon="ti-file-invoice"
            title="No invoices yet."
            sub="Invoices are auto-generated after each verified payment."
          />
        ) : (
          <section className={`${w.panel} ${w.panelFlush}`}>
            <header className={w.panelHead}>
              <h2 className={w.panelTitle}>
                <i className="ti ti-file-invoice" aria-hidden="true" />
                Invoices
              </h2>
            </header>
            <div className={styles.list}>
              {invoiced.map((p, i) => (
                <TxnRow key={p._id || i} p={p} icon="ti-file-invoice" label={p.invoiceNo} />
              ))}
            </div>
          </section>
        )
      )}
    </>
  );
}
