import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./PaymentsPage.module.css";
import w from "./widgets/DashboardWidgets.module.css";
import { Stagger, Item, StatCard, Panel, Tabs, Pill, EmptyState, PageHeader } from "./widgets/DashboardWidgets";

// Amounts from the API are integer MINOR units (KES cents).
const toMajor = (minor) => (Number(minor) || 0) / 100;
const fmtMajor = (minor) =>
  `KES ${toMajor(minor).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_TONE = { paid: "green", pending: "amber", failed: "red", refunded: "neutral", refunding: "amber" };
const STATUS_ICON = { paid: "ti-check", pending: "ti-clock", failed: "ti-x", refunded: "ti-receipt-refund", refunding: "ti-clock" };
const STATUS_LABEL = { paid: "Paid", pending: "Pending", failed: "Failed", refunded: "Refunded", refunding: "Refunding" };

export default function PaymentsPage({ student }) {
  const [tab, setTab] = useState("history");
  const payments = student?.payments ?? [];

  const sumBy = (status) => payments.filter((p) => p.status === status).reduce((a, p) => a + (p.amount || 0), 0);
  const paidTotal    = sumBy("paid");
  const pendingTotal = sumBy("pending");
  const fmtStat = (n) => toMajor(n).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const invoiced = payments.filter((p) => p.invoiceNo);

  return (
    <>
      <PageHeader title="Payments" />

      <Stagger>
        <div className={w.statGrid}>
          <StatCard tone="green" icon="ti-circle-check" label="Paid"    value={paidTotal}    format={fmtStat} prefix="KES " index={0} />
          <StatCard tone="amber" icon="ti-clock"        label="Pending" value={pendingTotal} format={fmtStat} prefix="KES " index={1} />
        </div>

        <Item>
          <Tabs
            layoutId="paymentsTab"
            active={tab}
            onChange={setTab}
            tabs={[
              { id: "history",  label: "History",  icon: "ti-history" },
              { id: "invoices", label: "Invoices", icon: "ti-file-invoice" },
            ]}
          />
        </Item>

        <AnimatePresence mode="wait">
          {tab === "history" && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {payments.length === 0 ? (
                <EmptyState icon="ti-receipt" title="No payments yet." />
              ) : (
                <Panel title="History" icon="ti-history" padded={false}>
                  <div className={styles.list}>
                    {payments.map((p, i) => {
                      const st = STATUS_LABEL[p.status] ? p.status : "pending";
                      return (
                        <motion.div
                          key={p._id || i}
                          className={styles.txn}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(i, 8) * 0.05, type: "spring", stiffness: 300, damping: 26 }}
                        >
                          <span className={styles.txnIcon}><i className="ti ti-credit-card" aria-hidden="true" /></span>
                          <span className={styles.txnLabel}>{p.label}</span>
                          <span className={styles.txnAmount}>{fmtMajor(p.amount)}</span>
                          <Pill tone={STATUS_TONE[st]} icon={STATUS_ICON[st]}>
                            {STATUS_LABEL[st]}
                          </Pill>
                          {p.receiptUrl && (
                            <a href={p.receiptUrl} target="_blank" rel="noreferrer" className={styles.txnDownload}>
                              <button className={styles.iconBtn} aria-label={`Download receipt for ${p.label}`}>
                                <i className="ti ti-download" aria-hidden="true" />
                              </button>
                            </a>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </Panel>
              )}
            </motion.div>
          )}

          {tab === "invoices" && (
            <motion.div
              key="invoices"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              {invoiced.length === 0 ? (
                <EmptyState
                  icon="ti-file-invoice"
                  title="No invoices yet."
                  sub="Invoices are auto-generated after each verified payment."
                />
              ) : (
                <Panel title="Invoices" icon="ti-file-invoice" padded={false}>
                  <div className={styles.list}>
                    {invoiced.map((p, i) => (
                      <motion.div
                        key={p._id || i}
                        className={styles.txn}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i, 8) * 0.05, type: "spring", stiffness: 300, damping: 26 }}
                      >
                        <span className={styles.txnIcon}><i className="ti ti-file-invoice" aria-hidden="true" /></span>
                        <span className={styles.txnLabel}>{p.invoiceNo}</span>
                        <span className={styles.txnAmount}>{fmtMajor(p.amount)}</span>
                        <Pill tone={STATUS_TONE[p.status] || "amber"} icon={STATUS_ICON[p.status] || "ti-clock"}>
                          {STATUS_LABEL[p.status] || "Pending"}
                        </Pill>
                      </motion.div>
                    ))}
                  </div>
                </Panel>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Stagger>
    </>
  );
}
