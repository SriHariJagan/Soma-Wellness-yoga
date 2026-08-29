import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaMagnifyingGlassLocation, FaTruckFast, FaBoxOpen, FaReceipt, FaCreditCard,
  FaHouseChimney, FaEnvelope, FaCircleCheck, FaTriangleExclamation, FaCircleInfo,
} from "react-icons/fa6";
import { trackOrder } from "../components/api/BookServices";
import { useScrollToSection } from "../hooks/useScrollToSection";
import { useTranslation } from "react-i18next";
import styles from "./OrderTracking.module.css";

const inr = (n) => `KES ${Number(n || 0).toLocaleString("en-KE")}`;

const OrderTracking = () => {
  useScrollToSection();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();

  const STATUS_META = {
    payment_pending:   { label: t("orderTracking.statusAwaitingPayment"),   color: "#D97706", bg: "rgba(217,119,6,0.12)" },
    payment_confirmed: { label: t("orderTracking.statusPaymentConfirmed"),  color: "#2563EB", bg: "rgba(37,99,235,0.12)" },
    packed:            { label: t("orderTracking.statusPacked"),             color: "#D97706", bg: "rgba(217,119,6,0.12)" },
    dispatched:        { label: t("orderTracking.statusDispatched"),         color: "#7C3AED", bg: "rgba(124,58,237,0.12)" },
    delivered:         { label: t("orderTracking.statusDelivered"),          color: "#16A34A", bg: "rgba(22,163,74,0.12)" },
    on_hold:           { label: t("orderTracking.statusOnHold"),            color: "#D97706", bg: "rgba(217,119,6,0.12)" },
    cancelled:         { label: t("orderTracking.statusCancelled"),          color: "#DC2626", bg: "rgba(220,38,38,0.12)" },
    returned:          { label: t("orderTracking.statusReturned"),           color: "#DC2626", bg: "rgba(220,38,38,0.12)" },
  };

  const STAGES = [
    { key: "payment_pending",   label: t("orderTracking.stageOrderPlaced"),       icon: FaReceipt },
    { key: "payment_confirmed", label: t("orderTracking.stagePaymentConfirmed"),  icon: FaCreditCard },
    { key: "packed",            label: t("orderTracking.stagePacked"),             icon: FaBoxOpen },
    { key: "dispatched",        label: t("orderTracking.stageDispatched"),         icon: FaTruckFast },
    { key: "delivered",         label: t("orderTracking.stageDelivered"),          icon: FaHouseChimney },
  ];

  const [orderNumber, setOrderNumber] = useState(searchParams.get("order") || "");
  const [email, setEmail] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null")?.email || ""; } catch { return ""; }
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (searchParams.get("order")) setResult(null);
  }, [searchParams]);

  const handleTrack = async (e) => {
    e?.preventDefault();
    setError("");
    setResult(null);
    if (!orderNumber.trim() || !email.trim()) {
      setError(t("orderTracking.enterOrderAndEmail") || "Enter your order number and the email used at checkout");
      return;
    }
    setLoading(true);
    try {
      const res = await trackOrder(orderNumber.trim().toUpperCase(), email.trim());
      setResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (d) => (d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "");
  const fmtTime = (d) => (d ? new Date(d).toLocaleString("en-KE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

  const status = result?.order?.status || "";
  const meta = STATUS_META[status] || { label: status, color: "var(--color-dark-secondary)", bg: "rgba(0,0,0,0.06)" };
  const STAGE_INDEX = { payment_pending: 0, payment_confirmed: 1, packed: 2, dispatched: 3, delivered: 4 };
  const currentStage = STAGE_INDEX[status];
  const TERMINAL = new Set(["cancelled", "returned"]);
  const isTerminal = TERMINAL.has(status);

  const timelineByStatus = useMemo(() => {
    const map = {};
    (result?.order?.timeline || []).forEach((t) => { if (!map[t.status]) map[t.status] = t; });
    return map;
  }, [result]);

  const fadeUp = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: "easeOut" },
  };

  return (
    <div className={styles.page}>
      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <motion.div
          className={styles.heroFloat}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          <FaTruckFast />
        </motion.div>
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>{t("orderTracking.storeName")}</span>
          <h1>{t("orderTracking.title")}</h1>
          <p className={styles.heroSub}>{t("orderTracking.subtitle")}</p>
        </div>
      </section>

      {/* ── Search form ── */}
      <div className={styles.wrap}>
        <motion.form onSubmit={handleTrack} className={styles.form} {...fadeUp}>
          <label className={styles.field}>
            <span>{t("orderTracking.orderNumber")}</span>
            <div className={styles.inputBox}>
              <FaMagnifyingGlassLocation className={styles.inputIcon} />
              <input value={orderNumber} onChange={(e) => setOrderNumber(e.target.value.toUpperCase())} placeholder={t("orderTracking.orderPlaceholder")} autoComplete="off" />
            </div>
          </label>
          <label className={styles.field}>
            <span>{t("orderTracking.emailLabel")}</span>
            <div className={styles.inputBox}>
              <FaEnvelope className={styles.inputIcon} />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("orderTracking.emailPlaceholder")} />
            </div>
          </label>
          <button type="submit" className={styles.trackBtn} disabled={loading}>
            {loading ? <span className={styles.spinner} /> : <FaMagnifyingGlassLocation />}
            {loading ? t("orderTracking.looking") : t("orderTracking.trackBtn")}
          </button>
          <p className={styles.helpNote}>{t("orderTracking.invalidFormat")}</p>
        </motion.form>

        {error && (
          <motion.div className={styles.errorBox} {...fadeUp}>
            <FaTriangleExclamation /> {error}
          </motion.div>
        )}

        {result && (
          <motion.div className={styles.result} {...fadeUp}>
            {/* ── Header ── */}
            <div className={styles.resultHeader}>
              <div>
                <p className={styles.orderLabel}>{t("orderTracking.order")}</p>
                <h2 className={styles.orderNo}>{result.order.orderNumber}</h2>
                <span className={styles.statusChip} style={{ color: meta.color, background: meta.bg }}>
                  <FaCircleCheck style={{ fontSize: 11 }} /> {meta.label}
                </span>
              </div>
              <div className={styles.amountBlock}>
                <span className={styles.amountLabel}>{t("orderTracking.totalPaid")}</span>
                <div className={styles.amount}>{inr(result.order.total)}</div>
              </div>
            </div>

            {/* ── Terminal state banner ── */}
            {isTerminal && (
              <div className={styles.terminalBanner}>
                <FaCircleInfo />
                <div>
                  <strong>{meta.label}</strong>
                  {result.order.cancellationReason && <span> — {result.order.cancellationReason}</span>}
                  {result.order.cancelledAt && <div className={styles.terminalDate}>on {fmt(result.order.cancelledAt)}</div>}
                </div>
              </div>
            )}

            {/* ── Progress stepper ── */}
            {!isTerminal && (
              <div className={styles.stepper}>
                {STAGES.map((stage, i) => {
                  const StageIcon = stage.icon;
                  const done = currentStage !== undefined && i < currentStage;
                  const active = currentStage === i;
                  const entry = timelineByStatus[stage.key];
                  return (
                    <div key={stage.key} className={styles.step}>
                      <div className={`${styles.stepIcon} ${done ? styles.stepDone : ""} ${active ? styles.stepActive : ""}`}>
                        {done ? <FaCircleCheck /> : <StageIcon />}
                      </div>
                      <div className={styles.stepText}>
                        <div className={`${styles.stepLabel} ${active ? styles.stepLabelActive : ""}`}>{stage.label}</div>
                        <div className={styles.stepDate}>{entry ? fmt(entry.at) : (done ? t("orderTracking.completed") : t("orderTracking.pending"))}</div>
                      </div>
                      {i < STAGES.length - 1 && <div className={`${styles.stepLine} ${done ? styles.stepLineDone : ""}`} />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Dispatch / packing cards ── */}
            {(result.order.status === "dispatched" || result.order.trackingNumber) && (
              <div className={styles.dispatchCard}>
                <FaTruckFast />
                <div>
                  <div className={styles.cardTitle}>{t("orderTracking.dispatchedVia")} {result.order.courier || "courier"}</div>
                  {result.order.trackingNumber && (
                    <div className={styles.cardRow}>{t("orderTracking.trackingAwb")} <strong>{result.order.trackingNumber}</strong></div>
                  )}
                  {result.order.expectedDelivery && (
                    <div className={styles.cardRow}>{t("orderTracking.expectedDelivery")} <strong>{fmt(result.order.expectedDelivery)}</strong></div>
                  )}
                </div>
              </div>
            )}

            {(result.order.status === "payment_confirmed" || result.order.status === "packed") && result.order.estimatedDelivery && (
              <div className={styles.packCard}>
                <FaBoxOpen />
                <div>
                  <div className={styles.cardTitle}>{t("orderTracking.beingPacked")}</div>
                  <div className={styles.cardRow}>{t("orderTracking.estimatedDelivery", { min: result.order.estimatedDelivery.minDays, max: result.order.estimatedDelivery.maxDays })}</div>
                </div>
              </div>
            )}

            {/* ── Items ── */}
            <div className={styles.sectionTitle}>{t("orderTracking.itemsInOrder")}</div>
            <div className={styles.items}>
              {(result.items || []).map((i, idx) => (
                <div key={idx} className={styles.itemRow}>
                  {i.image ? <img src={i.image} alt={i.name} className={styles.itemThumb} /> : <div className={styles.itemThumbPlaceholder}>{i.name?.slice(0, 1)}</div>}
                  <div className={styles.itemInfo}>
                    <div className={styles.itemName}>{i.name}</div>
                    <div className={styles.itemMeta}>{inr(i.finalPrice ?? i.price)} {t("orderTracking.each")}</div>
                  </div>
                  <span className={styles.qtyChip}>{t("orderTracking.qty")} {i.quantity || 1}</span>
                </div>
              ))}
            </div>

            {/* ── Totals ── */}
            <div className={styles.totals}>
              <div className={styles.totalRow}><span>{t("orderTracking.subtotal")}</span><span>{inr(result.order.subtotal)}</span></div>
              {result.order.discount > 0 && <div className={styles.totalRow}><span>{t("orderTracking.discount")}</span><span className={styles.discount}>− {inr(result.order.discount)}</span></div>}
              <div className={styles.totalRow}>
                <span>{t("orderTracking.shipping")}</span>
                {result.order.shippingCharge > 0 ? <span>{inr(result.order.shippingCharge)}</span> : <span className={styles.freeChip}>{t("orderTracking.free")}</span>}
              </div>
              <div className={`${styles.totalRow} ${styles.total}`}><span>{t("orderTracking.total")}</span><span>{inr(result.order.total)}</span></div>
            </div>

            {/* ── Activity log ── */}
            {(result.order.timeline || []).length > 0 && (
              <div className={styles.activity}>
                <div className={styles.sectionTitle}>{t("orderTracking.orderActivity")}</div>
                {(result.order.timeline || []).map((t, i) => {
                  const m = STATUS_META[t.status] || { color: "var(--color-text-secondary)", label: t.status };
                  return (
                    <div key={i} className={styles.activityRow}>
                      <span className={styles.activityDot} style={{ background: m.color }} />
                      <div>
                        <div className={styles.activityLabel}>{m.label}</div>
                        <div className={styles.activityMeta}>{t.note || t("orderTracking.statusUpdated")}{t.by ? ` — by ${t.by}` : ""}</div>
                      </div>
                      <span className={styles.activityDate}>{fmtTime(t.at)}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── CTAs ── */}
            <div className={styles.ctaRow}>
              <Link to="/books" className={styles.ctaPrimary}>{t("orderTracking.continueShopping")}</Link>
               <a href="mailto:hello@somawellness.in" className={styles.ctaGhost}>{t("orderTracking.needHelp")}</a>
            </div>
          </motion.div>
        )}

        {!result && !error && (
          <p className={styles.backLink}><Link to="/books">{t("orderTracking.backToStore")}</Link></p>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;
