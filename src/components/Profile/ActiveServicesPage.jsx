import { useState, useEffect, useCallback } from "react";
import styles from "./ActiveServicesPage.module.css";
import w from "./widgets/DashboardWidgets.module.css";
import {
  Stagger, Item, Panel, ProgressRing, Pill, PrimaryButton,
  PageHeader, StatCard, EmptyState,
} from "./widgets/DashboardWidgets";
import { getAllEnrollments, renewService } from "../api/StudentServices.js";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—";

const STATUS_TONE = {
  active: "green",
  expired: "danger",
  paused: "amber",
  cancelled: "danger",
  completed: "blue",
  converted: "blue",
  refunded: "danger",
};

const PAYMENT_TONE = {
  paid: "green",
  pending: "amber",
  failed: "danger",
  refunded: "neutral",
};

const MODE_ICON = {
  offline: "ti-building-store",
  online: "ti-video",
  home: "ti-home",
  hybrid: "ti-arrows-join",
};

const ENROLL_TYPE_META = {
  service:     { icon: "ti-package",    color: "#16A34A", label: "Service" },
  membership:  { icon: "ti-shield-check", color: "#F97316", label: "Plan" },
  trial:       { icon: "ti-gift",       color: "#D97706", label: "Trial" },
  course:      { icon: "ti-books",      color: "#8B5CF6", label: "Course" },
  workshop:    { icon: "ti-award",      color: "#7C3AED", label: "Workshop" },
  yttc:        { icon: "ti-certificate", color: "#0891B2", label: "YTTC" },
};

/* ── summary card for non‑service active enrollments ── */
function ActiveSummaryCard({ item }) {
  const meta = ENROLL_TYPE_META[item.type] || { icon: "ti-file", color: "#6B7280", label: item.type };
  const tone = STATUS_TONE[item.status] || "neutral";

  const dates = [
    ...(item.expiryDate ? [{ icon: "ti-calendar-off", label: "Expires", value: fmtDate(item.expiryDate), color: "amber" }] : []),
    ...(item.activationDate ? [{ icon: "ti-calendar-plus", label: "Started", value: fmtDate(item.activationDate), color: "blue" }] : []),
    ...(item.daysLeft > 0 ? [{ icon: "ti-clock-hour-4", label: "Days left", value: `${item.daysLeft} days`, color: "green" }] : []),
  ];

  return (
    <Item className={styles.serviceCard}>
      <div className={styles.cardDeco} aria-hidden="true" />
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleRow}>
          <div className={styles.archivedTitleGroup}>
            <span className={styles.archivedTypeBadge} style={{ background: `${meta.color}18`, color: meta.color }}>
              <i className={`ti ${meta.icon}`} aria-hidden="true" />
              {meta.label}
            </span>
            <h3 className={styles.serviceName}>{item.name}</h3>
          </div>
          <div className={styles.cardBadges}>
            <Pill tone={tone} icon="ti-circle-check">{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</Pill>
          </div>
        </div>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.ringCol}>
          <ProgressRing value={item.progressPct} size={110} stroke={10} tone={tone}>
            <span className={styles.ringPct} style={{ fontSize: 24 }}>{item.progressPct}%</span>
            <span className={styles.ringSub}>Progress</span>
          </ProgressRing>
        </div>
        <div className={styles.detailCol}>
          {item.instructorName && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}><i className="ti ti-user" aria-hidden="true" />Instructor</span>
              <span className={styles.metaValue}>{item.instructorName}</span>
            </div>
          )}
          {item.scheduleTime && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}><i className="ti ti-clock" aria-hidden="true" />Time</span>
              <span className={styles.metaValue}>{item.scheduleTime}</span>
            </div>
          )}
          {item.price > 0 && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}><i className="ti ti-currency-rupee" aria-hidden="true" />Price</span>
              <span className={styles.metaValue}>&#8377;{item.price}</span>
            </div>
          )}
        </div>
      </div>
      {dates.length > 0 && (
        <div className={styles.dateGrid} style={{ gridTemplateColumns: `repeat(${Math.min(dates.length, 3)}, 1fr)` }}>
          {dates.map((d) => (
            <div key={d.label} className={`${styles.dateTile} ${styles[`tile_${d.color}`]}`}>
              <span className={styles.dateIcon}><i className={`ti ${d.icon}`} aria-hidden="true" /></span>
              <div>
                <span className={styles.dateLabel}>{d.label}</span>
                <span className={styles.dateValue}>{d.value}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Item>
  );
}

/* ── archived enrollment card (all types, read‑only) ── */
function ArchivedCard({ item }) {
  const [showHistory, setShowHistory] = useState(false);
  const meta = ENROLL_TYPE_META[item.type] || { icon: "ti-file", color: "#6B7280", label: item.type };
  const tone = STATUS_TONE[item.status] || "neutral";

  const dates = [
    ...(item.activationDate ? [{ icon: "ti-calendar-plus", label: "Start date", value: fmtDate(item.activationDate), color: "blue" }] : []),
    ...(item.expiryDate ? [{ icon: "ti-calendar-off", label: "Expiry date", value: fmtDate(item.expiryDate), color: "amber" }] : []),
    ...(item.purchaseDate ? [{ icon: "ti-shopping-cart", label: "Purchased", value: fmtDate(item.purchaseDate), color: "green" }] : []),
    ...(item.completionDate ? [{ icon: "ti-circle-check", label: "Completed on", value: fmtDate(item.completionDate), color: "green" }] : []),
  ];

  return (
    <Item className={`${styles.serviceCard} ${styles.archivedCard}`}>
      <div className={styles.cardDeco} aria-hidden="true" />
      <div className={styles.cardHeader}>
        <div className={styles.cardTitleRow}>
          <div className={styles.archivedTitleGroup}>
            <span className={styles.archivedTypeBadge} style={{ background: `${meta.color}18`, color: meta.color }}>
              <i className={`ti ${meta.icon}`} aria-hidden="true" />
              {meta.label}
            </span>
            <h3 className={styles.serviceName}>{item.name}</h3>
          </div>
          <div className={styles.cardBadges}>
            <Pill tone={tone} icon={tone === "green" ? "ti-circle-check" : "ti-circle-x"}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Pill>
            {item.paymentStatus && (
              <Pill tone={PAYMENT_TONE[item.paymentStatus] || "neutral"} icon={item.paymentStatus === "paid" ? "ti-credit-card" : "ti-alert-circle"}>
                {item.paymentStatus.charAt(0).toUpperCase() + item.paymentStatus.slice(1)}
              </Pill>
            )}
          </div>
        </div>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.ringCol}>
          <ProgressRing value={item.progressPct} size={110} stroke={10} tone={tone}>
            <span className={styles.ringPct} style={{ fontSize: 24 }}>{item.progressPct}%</span>
            <span className={styles.ringSub}>Used</span>
          </ProgressRing>
        </div>
        <div className={styles.detailCol}>
          {item.category && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}><i className="ti ti-tag" aria-hidden="true" />Category</span>
              <span className={styles.metaValue}>{item.category}</span>
            </div>
          )}
          {item.instructorName && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}><i className="ti ti-user" aria-hidden="true" />Instructor</span>
              <span className={styles.metaValue}>{item.instructorName}</span>
            </div>
          )}
          {item.invoiceNo && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}><i className="ti ti-file-invoice" aria-hidden="true" />Invoice</span>
              <span className={styles.metaValue}>{item.invoiceNo}</span>
            </div>
          )}
          {item.transactionId && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}><i className="ti ti-receipt" aria-hidden="true" />Txn ID</span>
              <span className={styles.metaValue}>{item.transactionId}</span>
            </div>
          )}
          {item.price > 0 && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}><i className="ti ti-currency-rupee" aria-hidden="true" />Price</span>
              <span className={styles.metaValue}>&#8377;{item.price}</span>
            </div>
          )}
        </div>
      </div>
      {dates.length > 0 && (
        <div className={styles.dateGrid} style={{ gridTemplateColumns: `repeat(${Math.min(dates.length, 3)}, 1fr)` }}>
          {dates.map((d) => (
            <div key={d.label} className={`${styles.dateTile} ${styles[`tile_${d.color}`]}`}>
              <span className={styles.dateIcon}><i className={`ti ${d.icon}`} aria-hidden="true" /></span>
              <div>
                <span className={styles.dateLabel}>{d.label}</span>
                <span className={styles.dateValue}>{d.value}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {item.history?.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <button
            className={styles.historyToggle}
            onClick={() => setShowHistory((v) => !v)}
          >
            <i className="ti ti-clock" aria-hidden="true" />
            History ({item.history.length})
            <i className={`ti ti-chevron-${showHistory ? "up" : "down"}`} aria-hidden="true" />
          </button>
          {showHistory && (
            <div className={styles.historyList} style={{ marginTop: 8 }}>
              {item.history.map((h, i) => (
                <div key={i} className={styles.historyItem}>
                  <span className={styles.historyDot} aria-hidden="true" />
                  <div className={styles.historyBody}>
                    <span className={styles.historyAction}>{h.action}</span>
                    {h.note && <span className={styles.historyNote}>{h.note}</span>}
                  </div>
                  <span className={styles.historyDate}>{h.at ? fmtDate(h.at) : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Item>
  );
}

export default function ActiveServicesPage({ onNavigate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAllEnrollments();
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function renewAction(id) {
    setBusy(`renew-${id}`);
    setMsg("");
    try {
      await renewService(id);
      await load();
      setMsg("Service renewed successfully.");
    } catch (err) {
      setMsg(err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy("");
    }
  }

  if (loading) return null;

  const enrollments = data?.enrollments || [];
  const stats = data?.stats || {};
  const catalog = data?.catalog || [];

  const activeEnrollments = enrollments.filter((e) => e.isActive);
  const archivedEnrollments = enrollments.filter((e) => !e.isActive);
  const hasActive = activeEnrollments.length > 0;
  const hasArchived = archivedEnrollments.length > 0;

  return (
    <>
      <PageHeader
        title="Active services"
        actions={
          hasActive ? (
            <Pill tone="green" icon="ti-circle-check">{stats.activeCount} Active</Pill>
          ) : null
        }
      />

      {hasActive ? (
        <>
          <Stagger>
            <div className={w.statGrid}>
              <StatCard icon="ti-shield-check" label="Active enrollments" value={stats.activeCount} tone="orange" />
              <StatCard icon="ti-archive" label="Archived" value={stats.archivedCount} tone="neutral" />
            </div>
          </Stagger>

          <Stagger>
            {activeEnrollments.map((e) => {
              if (e.type === 'service') {
                const tone = STATUS_TONE[e.status] || "neutral";
                const payTone = PAYMENT_TONE[e.paymentStatus] || "neutral";
                const modeIcon = MODE_ICON[e.mode] || "ti-layout-grid";

                const dates = [
                  ...(e.activationDate ? [{ icon: "ti-calendar-plus", label: "Start date", value: fmtDate(e.activationDate), color: "blue" }] : []),
                  ...(e.expiryDate ? [{ icon: "ti-calendar-off", label: "Expiry date", value: fmtDate(e.expiryDate), color: "amber" }] : []),
                  ...(e.completionDate ? [{ icon: "ti-circle-check", label: "Completed on", value: fmtDate(e.completionDate), color: "green" }] : []),
                  ...(e.daysLeft !== null ? [{ icon: "ti-clock-hour-4", label: "Days remaining", value: `${e.daysLeft} days`, color: "green" }] : []),
                ];

                return (
                  <Item key={`svc-${e._id}`} className={styles.serviceCard}>
                    <div className={styles.cardDeco} aria-hidden="true" />
                    <div className={styles.cardHeader}>
                      <div className={styles.cardTitleRow}>
                        <h3 className={styles.serviceName}>{e.serviceName}</h3>
                        <div className={styles.cardBadges}>
                          <Pill tone={tone} icon={e.isActive ? "ti-circle-check" : "ti-circle-x"}>
                            {e.status.charAt(0).toUpperCase() + e.status.slice(1)}
                          </Pill>
                          <Pill tone={payTone} icon={e.paymentStatus === "paid" ? "ti-credit-card" : "ti-alert-circle"}>
                            {e.paymentStatus.charAt(0).toUpperCase() + e.paymentStatus.slice(1)}
                          </Pill>
                          {e.mode && <Pill tone="neutral" icon={modeIcon}>{e.mode}</Pill>}
                        </div>
                      </div>
                    </div>

                    <div className={styles.cardBody}>
                      <div className={styles.ringCol}>
                        <ProgressRing value={e.progressPct} size={130} stroke={11} tone={tone}>
                          <span className={styles.ringPct}>{e.progressPct}%</span>
                          <span className={styles.ringSub}>Used</span>
                        </ProgressRing>
                        {e.totalSessions > 0 && (
                          <div className={styles.sessionMeta}>
                            <span>{e.usedSessions} / {e.totalSessions} sessions</span>
                          </div>
                        )}
                      </div>

                      <div className={styles.detailCol}>
                        {e.category && (
                          <div className={styles.metaRow}>
                            <span className={styles.metaLabel}><i className="ti ti-tag" aria-hidden="true" />Category</span>
                            <span className={styles.metaValue}>{e.category}</span>
                          </div>
                        )}
                        {e.typeMeta && (
                          <div className={styles.metaRow}>
                            <span className={styles.metaLabel}><i className="ti ti-flame" aria-hidden="true" />Type</span>
                            <span className={styles.metaValue}>{e.typeMeta}</span>
                          </div>
                        )}
                        {e.instructorName && (
                          <div className={styles.metaRow}>
                            <span className={styles.metaLabel}><i className="ti ti-user" aria-hidden="true" />Instructor</span>
                            <span className={styles.metaValue}>{e.instructorName}</span>
                          </div>
                        )}
                        {e.scheduleDays?.length > 0 && (
                          <div className={styles.metaRow}>
                            <span className={styles.metaLabel}><i className="ti ti-calendar" aria-hidden="true" />Schedule</span>
                            <span className={styles.metaValue}>{e.scheduleDays.join(", ")}{e.scheduleTime ? ` · ${e.scheduleTime}` : ""}</span>
                          </div>
                        )}
                        {e.transactionId && (
                          <div className={styles.metaRow}>
                            <span className={styles.metaLabel}><i className="ti ti-receipt" aria-hidden="true" />Txn ID</span>
                            <span className={styles.metaValue}>{e.transactionId}</span>
                          </div>
                        )}
                        {e.payment?.invoiceNo && (
                          <div className={styles.metaRow}>
                            <span className={styles.metaLabel}><i className="ti ti-file-invoice" aria-hidden="true" />Invoice</span>
                            <span className={styles.metaValue}>{e.payment.invoiceNo}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.dateGrid}>
                      {dates.map((d) => (
                        <div key={d.label} className={`${styles.dateTile} ${styles[`tile_${d.color}`]}`}>
                          <span className={styles.dateIcon}><i className={`ti ${d.icon}`} aria-hidden="true" /></span>
                          <div>
                            <span className={styles.dateLabel}>{d.label}</span>
                            <span className={styles.dateValue}>{d.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className={styles.cardActions}>
                      <PrimaryButton icon="ti-refresh" onClick={() => renewAction(e._id)} disabled={!!busy}>
                        {busy === `renew-${e._id}` ? "Renewing…" : "Renew Service"}
                      </PrimaryButton>
                    </div>

                    {e.history?.length > 0 && (
                      <Panel title="History" icon="ti-clock" padded={false}>
                        <div className={styles.historyList}>
                          {e.history.map((h, i) => (
                            <div key={i} className={styles.historyItem}>
                              <span className={styles.historyDot} aria-hidden="true" />
                              <div className={styles.historyBody}>
                                <span className={styles.historyAction}>{h.action}</span>
                                {h.note && <span className={styles.historyNote}>{h.note}</span>}
                              </div>
                              <span className={styles.historyDate}>{h.at ? fmtDate(h.at) : ""}</span>
                            </div>
                          ))}
                        </div>
                      </Panel>
                    )}

                    {e.totalSessions > 0 && (
                      <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(22,163,74,0.05)', borderRadius: 10, border: '1px solid rgba(22,163,74,0.15)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#16A34A' }}>
                            <i className="ti ti-yoga" style={{ marginRight: 4 }} />
                            Session Progress
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A' }}>
                            {e.usedSessions} / {e.totalSessions}
                          </span>
                        </div>
                        <div style={{ height: 6, background: 'rgba(0,0,0,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 4, background: '#16A34A',
                            width: `${e.progressPct}%`, transition: 'width 0.6s ease',
                          }} />
                        </div>
                      </div>
                    )}
                  </Item>
                );
              }

              return <ActiveSummaryCard key={`${e.type}-${e._id}`} item={e} />;
            })}
          </Stagger>

          {catalog.length > 0 && (
            <Panel title="Browse available services" icon="ti-search" className={styles.catalogSection}>
              <div className={styles.browsePrompt}>
                <i className="ti ti-building-store" aria-hidden="true" />
                <div>
                  <strong>Looking for something new?</strong>
                  <p>Browse our full catalog of yoga services with premium cards, filters, and easy enrollment.</p>
                </div>
                <PrimaryButton icon="ti-arrow-right" onClick={() => onNavigate?.("browseServices")}>
                  Browse services
                </PrimaryButton>
              </div>
            </Panel>
          )}

          {msg && (
            <div className={`${styles.msgBox} ${msg.includes("Something") || msg.includes("cancelled") ? styles.msgError : styles.msgSuccess}`}>
              <i className="ti ti-info-circle" aria-hidden="true" />
              <span>{msg}</span>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          icon="ti-bundle"
          title="No active services yet"
          sub="Explore our yoga services and enroll in the one that suits you best."
          action={
            catalog.length > 0 ? (
              <PrimaryButton icon="ti-building-store" onClick={() => onNavigate?.("browseServices")}>
                Browse services
              </PrimaryButton>
            ) : (
              <PrimaryButton icon="ti-calendar" onClick={() => onNavigate?.("classes")}>
                Browse classes & workshops
              </PrimaryButton>
            )
          }
        />
      )}

      {!hasActive && catalog.length > 0 && (
        <Stagger>
          <Panel title="Available services" icon="ti-building-store" className={styles.catalogSection}>
            <div className={styles.browsePrompt}>
              <i className="ti ti-building-store" aria-hidden="true" />
              <div>
                <strong>Ready to start your practice?</strong>
                <p>Browse our full catalog and find the perfect yoga service for you.</p>
              </div>
              <PrimaryButton icon="ti-arrow-right" onClick={() => onNavigate?.("browseServices")}>
                Browse services
              </PrimaryButton>
            </div>
          </Panel>
        </Stagger>
      )}

      {!hasActive && msg && (
        <div className={`${styles.msgBox} ${msg.includes("Something") ? styles.msgError : styles.msgSuccess}`} style={{ marginTop: 16 }}>
          <i className="ti ti-info-circle" aria-hidden="true" />
          <span>{msg}</span>
        </div>
      )}

      {hasArchived && (
        <section className={styles.archivedSection}>
          <button
            className={styles.archivedToggle}
            onClick={() => setArchivedOpen((v) => !v)}
            aria-expanded={archivedOpen}
          >
            <div className={styles.archivedToggleLeft}>
              <i className="ti ti-archive" aria-hidden="true" />
              <span>Archived Enrollments</span>
              <span className={styles.archivedCount}>{archivedEnrollments.length}</span>
            </div>
            <i className={`ti ti-chevron-${archivedOpen ? "up" : "down"}`} aria-hidden="true" />
          </button>

          {archivedOpen && (
            <div className={styles.archivedBody}>
              <p className={styles.archivedSub}>
                These enrollments are no longer active. Progress is frozen at their final value.
              </p>
              <Stagger>
                {archivedEnrollments.map((item, i) => (
                  <ArchivedCard key={`arch-${item.type}-${item._id}-${i}`} item={item} />
                ))}
              </Stagger>
            </div>
          )}
        </section>
      )}
    </>
  );
}