import { useCallback, useEffect, useState } from "react";
import { adminStoreOrdersApi } from "../api/AdminServices.js";
import s from "./StoreOrders.module.css";

const inr = (n) => `KES ${Number(n || 0).toLocaleString("en-KE")}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "–");

const STATUS_META = {
  payment_pending: { label: "Payment Pending", cls: "amber" },
  payment_confirmed: { label: "Payment Confirmed", cls: "green" },
  packed: { label: "Packed", cls: "blue" },
  dispatched: { label: "Dispatched", cls: "orange" },
  delivered: { label: "Delivered", cls: "green" },
  on_hold: { label: "On Hold", cls: "amber" },
  cancelled: { label: "Cancelled", cls: "red" },
  returned: { label: "Returned", cls: "red" },
};

const NEXT_STATUSES = {
  payment_pending: ["payment_confirmed", "on_hold", "cancelled"],
  payment_confirmed: ["packed", "on_hold", "cancelled"],
  packed: ["dispatched", "on_hold", "cancelled"],
  dispatched: ["delivered", "on_hold", "returned"],
  delivered: ["returned"],
  on_hold: ["payment_pending", "payment_confirmed", "packed", "dispatched", "cancelled", "returned"],
  cancelled: [],
  returned: [],
};

const STATUS_FILTERS = ["all", "payment_pending", "payment_confirmed", "packed", "dispatched", "delivered", "on_hold", "cancelled", "returned"];

export default function StoreOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // order id
  const [detail, setDetail] = useState(null); // {order, items}
  const [flash, setFlash] = useState(null);

  const showFlash = (message, type = "success") => {
    setFlash({ message, type });
    setTimeout(() => setFlash(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminStoreOrdersApi.list({ status: filter === "all" ? "" : filter, search, limit: 50 });
      setOrders(data.orders || []);
    } catch (err) {
      showFlash(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (id) => {
    setSelected(id);
    try {
      const data = await adminStoreOrdersApi.detail(id);
      setDetail(data);
    } catch (err) {
      showFlash(err.message, "error");
    }
  };

  const refreshDetail = async () => {
    if (!selected) return;
    try {
      const data = await adminStoreOrdersApi.detail(selected);
      setDetail(data);
      await load();
    } catch (err) {
      showFlash(err.message, "error");
    }
  };

  const counts = (st) => (st === "all" ? orders.length : orders.filter((o) => o.status === st).length);

  return (
    <div>
      <div className={s.head}>
        <div>
          <h1 className={s.title}>Store Orders</h1>
          <p className={s.sub}>Book orders — payments, packing, dispatch and delivery</p>
        </div>
      </div>

      {flash && <div className={`${s.flash} ${flash.type === "error" ? s.flashError : ""}`}>{flash.message}</div>}

      <div className={s.filters}>
        {STATUS_FILTERS.map((st) => (
          <button key={st} className={`${s.chip} ${filter === st ? s.chipActive : ""}`} onClick={() => setFilter(st)}>
            {st === "all" ? "All" : STATUS_META[st]?.label || st} <span className={s.chipCount}>{counts(st)}</span>
          </button>
        ))}
      </div>

      <div className={s.toolbar}>
        <input className={s.search} placeholder="Search order #, name, email, phone, PIN…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <p className={s.loading}>Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className={s.loading}>No book orders here yet.</p>
      ) : (
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Placed</th></tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o._id} className={s.clickRow} onClick={() => openDetail(o._id)}>
                  <td>
                    <div className={s.orderNo}>{o.orderNumber}</div>
                    {o.courier && <div className={s.muted}>📦 {o.courier}{o.trackingNumber ? ` · ${o.trackingNumber}` : ""}</div>}
                  </td>
                  <td>
                    <div>{o.customer?.fullName || o.customer?.name || "–"}</div>
                    <div className={s.muted}>{o.customer?.phone}</div>
                  </td>
                  <td className={s.muted}>{o.itemCount ?? "–"} item(s)</td>
                  <td><strong>{inr(o.total)}</strong></td>
                  <td><span className={`${s.badge} ${s[STATUS_META[o.status]?.cls || "muted"]}`}>{STATUS_META[o.status]?.label || o.status}</span></td>
                  <td className={s.muted}>{fmtDate(o.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <DetailDrawer
          selected={selected}
          detail={detail}
          onClose={() => { setSelected(null); setDetail(null); }}
          onChanged={refreshDetail}
          showFlash={showFlash}
        />
      )}
    </div>
  );
}

function DetailDrawer({ selected, detail, onClose, onChanged, showFlash }) {
  const [reason, setReason] = useState("");
  const [confirmStatus, setConfirmStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({ courier: "", trackingNumber: "" });
  const [showDispatch, setShowDispatch] = useState(false);
  const [note, setNote] = useState("");

  const order = detail?.order;
  if (!order) return null;

  const next = NEXT_STATUSES[order.status] || [];

  const doTransition = async (to) => {
    const needsReason = to === "cancelled" || to === "on_hold";
    if (needsReason && !String(reason || "").trim()) {
      showFlash(`A reason is required to ${to === "cancelled" ? "cancel" : "hold"} this order`, "error");
      return;
    }
    setBusy(true);
    try {
      await adminStoreOrdersApi.setStatus(selected, to, reason || "");
      setConfirmStatus(null);
      setReason("");
      showFlash(`Order marked ${STATUS_META[to]?.label}`);
      await onChanged();
    } catch (err) {
      showFlash(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const doDispatch = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await adminStoreOrdersApi.dispatch(selected, dispatchForm.courier, dispatchForm.trackingNumber);
      setShowDispatch(false);
      showFlash("Dispatch details saved");
      await onChanged();
    } catch (err) {
      showFlash(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const doNote = async (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    setBusy(true);
    try {
      await adminStoreOrdersApi.addNote(selected, note.trim());
      setNote("");
      showFlash("Note added");
      await onChanged();
    } catch (err) {
      showFlash(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.overlay} onClick={onClose}>
      <div className={s.drawer} onClick={(e) => e.stopPropagation()}>
        <div className={s.drawerHead}>
          <div>
            <h2>Order {order.orderNumber}</h2>
            <span className={`${s.badge} ${s[STATUS_META[order.status]?.cls || "muted"]}`}>{STATUS_META[order.status]?.label || order.status}</span>
          </div>
          <button className={s.closeBtn} onClick={onClose}>✕</button>
        </div>

        <div className={s.drawerBody}>
          <section className={s.block}>
            <h3>Items</h3>
            {(detail.items || []).map((it) => (
              <div key={it._id} className={s.itemRow}>
                {it.image ? <img src={it.image} alt="" className={s.thumb} /> : <div className={s.thumbPlaceholder}>{it.name?.slice(0, 1)}</div>}
                <div className={s.itemInfo}>
                  <div className={s.itemName}>{it.name}</div>
                  <div className={s.muted}>SKU: {it.metadata?.sku || "–"} · qty {it.quantity}</div>
                </div>
                <div className={s.itemPrice}>{inr((it.finalPrice ?? it.price) * (it.quantity || 1))}</div>
              </div>
            ))}
            <div className={s.totals}>
              <div><span>Subtotal</span><span>{inr(order.subtotal)}</span></div>
              {order.discount > 0 && <div><span>Discount</span><span className={s.neg}>−{inr(order.discount)}</span></div>}
              <div><span>Shipping ({order.shippingType || "flat"})</span><span>{inr(order.shippingCharge)}</span></div>
              <div className={s.grand}><span>Total</span><span>{inr(order.total)}</span></div>
            </div>
          </section>

          <section className={s.block}>
            <h3>Ship to</h3>
            <div className={s.address}>
              <div><strong>{order.shippingAddress?.fullName}</strong></div>
              <div>{order.shippingAddress?.line1}{order.shippingAddress?.line2 ? `, ${order.shippingAddress.line2}` : ""}</div>
              <div>{order.shippingAddress?.city}, {order.shippingAddress?.state} – {order.shippingAddress?.pincode}</div>
              <div>{order.shippingAddress?.country}</div>
              <div className={s.muted}>{order.customer?.phone} · {order.customer?.email}</div>
            </div>
            <div className={s.est}>Estimated delivery: {order.estimatedDelivery?.minDays ?? "?"}–{order.estimatedDelivery?.maxDays ?? "?"} days after dispatch</div>
            {order.expectedDelivery && <div className={s.muted}>Expected by {fmtDate(order.expectedDelivery)}</div>}
            {order.dispatchDate && <div className={s.muted}>Dispatched {fmtDate(order.dispatchDate)}</div>}
            {order.deliveredAt && <div className={s.muted}>Delivered {fmtDate(order.deliveredAt)}</div>}
            {order.cancelledAt && <div className={s.muted}>Cancelled {fmtDate(order.cancelledAt)}{order.cancellationReason ? ` — ${order.cancellationReason}` : ""}</div>}
          </section>

          <section className={s.block}>
            <h3>Payment</h3>
            <div className={s.muted}>Method: {order.paymentMethod || "Razorpay"}</div>
            <div className={s.muted}>Payment ID: {order.payment || "–"}</div>
          </section>

          {next.length > 0 && (
            <section className={s.block}>
              <h3>Update status</h3>
              {confirmStatus ? (
                <div className={s.confirmBox}>
                  <p>Move to <strong>{STATUS_META[confirmStatus]?.label}</strong>?</p>
                  {(confirmStatus === "cancelled" || confirmStatus === "on_hold") && (
                    <textarea
                      placeholder={confirmStatus === "cancelled" ? "Reason for cancellation (shown to customer)" : "Reason for hold (internal)"}
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={2}
                    />
                  )}
                  <div className={s.confirmActions}>
                    <button className={s.ghostBtn} onClick={() => { setConfirmStatus(null); setReason(""); }}>Back</button>
                    <button className={s.primaryBtn} disabled={busy} onClick={() => doTransition(confirmStatus)}>Confirm</button>
                  </div>
                </div>
              ) : (
                <div className={s.nextBtns}>
                  {next.map((st) => (
                    <button key={st} className={s.ghostBtn} onClick={() => setConfirmStatus(st)}>
                      {STATUS_META[st]?.label}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {(order.status === "payment_confirmed" || order.status === "packed" || order.status === "dispatched") && (
            <section className={s.block}>
              <h3>Dispatch details</h3>
              {showDispatch ? (
                <form className={s.dispatchForm} onSubmit={doDispatch}>
                  <input placeholder="Courier (e.g. DTDC, Delhivery…)" value={dispatchForm.courier} onChange={(e) => setDispatchForm({ ...dispatchForm, courier: e.target.value })} />
                  <input placeholder="Tracking / AWB number" value={dispatchForm.trackingNumber} onChange={(e) => setDispatchForm({ ...dispatchForm, trackingNumber: e.target.value })} />
                  <div className={s.confirmActions}>
                    <button type="button" className={s.ghostBtn} onClick={() => setShowDispatch(false)}>Cancel</button>
                    <button type="submit" className={s.primaryBtn} disabled={busy}>Save</button>
                  </div>
                </form>
              ) : (
                <button className={s.ghostBtn} onClick={() => setShowDispatch(true)}>+ Add courier & tracking</button>
              )}
              {order.courier && (
                <div className={s.muted}>Current: {order.courier} · {order.trackingNumber || "no tracking number"}</div>
              )}
            </section>
          )}

          <section className={s.block}>
            <h3>Timeline</h3>
            <div className={s.timeline}>
              {(order.timeline || []).slice().reverse().map((t, i) => (
                <div key={i} className={s.tlItem}>
                  <div className={s.tlDot} />
                  <div>
                    <div className={s.tlStatus}>{STATUS_META[t.status]?.label || t.status}</div>
                    <div className={s.tlNote}>{t.note}</div>
                    <div className={s.muted}>{fmtDate(t.at)}{t.by ? ` · ${t.by}` : ""}</div>
                  </div>
                </div>
              ))}
              {(order.timeline || []).length === 0 && <div className={s.muted}>No timeline entries.</div>}
            </div>
          </section>

          <section className={s.block}>
            <h3>Internal notes</h3>
            {(order.internalNotes || []).map((n, i) => (
              <div key={i} className={s.note}>{n}</div>
            ))}
            <form className={s.noteForm} onSubmit={doNote}>
              <input placeholder="Add an internal note…" value={note} onChange={(e) => setNote(e.target.value)} />
              <button type="submit" className={s.primaryBtn} disabled={busy}>Add</button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}