import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "./PaymentsPage.module.css";
import w from "./widgets/DashboardWidgets.module.css";
import { Stagger, Item, StatCard, Panel, Tabs, Pill, EmptyState, PageHeader } from "./widgets/DashboardWidgets";

export default function PaymentsPage({ student }) {
  const [tab, setTab] = useState("history");
  const payments = student?.payments ?? [];

  const paidTotal    = payments.filter(p => p.status === "paid").reduce((a, p) => a + (p.amount || 0), 0);
  const pendingTotal = payments.filter(p => p.status !== "paid").reduce((a, p) => a + (p.amount || 0), 0);
  const inr = (n) => `₹${(n || 0).toLocaleString("en-IN")}`;

  return (
    <>
      <PageHeader title="Payments" />

      <Stagger>
        <div className={w.statGrid}>
          <StatCard tone="green" icon="ti-circle-check" label="Paid"    value={paidTotal}    format={(n) => n.toLocaleString("en-IN")} prefix="₹" index={0} />
          <StatCard tone="amber" icon="ti-clock"        label="Pending" value={pendingTotal} format={(n) => n.toLocaleString("en-IN")} prefix="₹" index={1} />
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
                    {payments.map((p, i) => (
                      <motion.div
                        key={i}
                        className={styles.txn}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 26 }}
                      >
                        <span className={styles.txnIcon}><i className="ti ti-credit-card" aria-hidden="true" /></span>
                        <span className={styles.txnLabel}>{p.label}</span>
                        <span className={styles.txnAmount}>₹{p.amount?.toLocaleString("en-IN")}</span>
                        <Pill tone={p.status === "paid" ? "green" : "amber"} icon={p.status === "paid" ? "ti-check" : "ti-clock"}>
                          {p.status === "paid" ? "Paid" : "Pending"}
                        </Pill>
                        {p.receiptUrl && (
                          <a href={p.receiptUrl} target="_blank" rel="noreferrer" className={styles.txnDownload}>
                            <button className={styles.iconBtn} aria-label={`Download receipt for ${p.label}`}>
                              <i className="ti ti-download" aria-hidden="true" />
                            </button>
                          </a>
                        )}
                      </motion.div>
                    ))}
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
              <EmptyState
                icon="ti-file-invoice"
                title="Invoices are auto-generated after each payment."
                sub="Click the download icon next to any payment to save it."
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Stagger>
    </>
  );
}
