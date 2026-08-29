import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getMyOrders, getMyOrderDetail } from "../api/StudentServices.js";
import InvoiceView from "../shared/InvoiceView.jsx";
import c from "./ListCards.module.css";

const TYPE_ICONS = {
  plan: "ti-shield-check",
  service: "ti-package",
  course: "ti-certificate",
  workshop: "ti-award",
  consultation: "ti-stethoscope",
};

const TYPE_LABELS = {
  plan: "Membership",
  service: "Service",
  course: "Course",
  workshop: "Workshop",
  consultation: "Consultation",
};

const PAGE_SIZE = 10;

export default function OrderHistoryPage({ reload, onNavigate }) {
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (typeFilter) params.type = typeFilter;
      const res = await getMyOrders(params);
      let list = res.orders || [];
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter((o) => {
          const orderMatch = o.orderNumber?.toLowerCase().includes(q);
          const itemMatch = (o.items || []).some((i) => i.name?.toLowerCase().includes(q));
          return orderMatch || itemMatch;
        });
      }
      setOrders(list);
      setTotal(res.total || 0);
      setPages(res.pages || 0);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const openDetail = async (orderId) => {
    setDetailLoading(true);
    try {
      const data = await getMyOrderDetail(orderId);
      setDetail(data);
    } catch {
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const openInvoice = async (orderId) => {
    setInvoiceLoading(true);
    try {
      const data = await getMyOrderDetail(orderId);
      setInvoiceOrder(data);
    } catch {
      setInvoiceOrder(null);
    } finally {
      setInvoiceLoading(false);
    }
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

  const fmtPrice = (n) => `\u20B9${Number(n || 0).toLocaleString("en-KE")}`;

  return (
    <div style={{ padding: "16px 0" }}>
      {/* Header */}
      <h2 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px", color: "#1a1a1a" }}>Order History</h2>
      <p style={{ fontSize: 13, color: "#888", margin: "0 0 20px" }}>View all your purchases</p>

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <input
          placeholder="Search by product name or order ID..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{
            flex: 1, minWidth: 200, padding: "9px 14px", borderRadius: 10, border: "1px solid #e5e7eb",
            fontSize: 13, outline: "none", background: "#fff",
          }}
        />
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          style={{
            padding: "9px 14px", borderRadius: 10, border: "1px solid #e5e7eb",
            fontSize: 13, background: "#fff", outline: "none", cursor: "pointer",
          }}
        >
          <option value="">All Types</option>
          <option value="plan">Membership</option>
          <option value="service">Service</option>
          <option value="course">Course</option>
          <option value="workshop">Workshop</option>
          <option value="consultation">Consultation</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: "center", padding: 40, color: "#999", fontSize: 13 }}>Loading orders...</div>
      )}

      {/* Empty */}
      {!loading && orders.length === 0 && (
        <div style={{
          textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 20,
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)", border: "1px solid #f3f4f6",
        }}>
          <i className="ti ti-shopping-cart" style={{ fontSize: 48, color: "#d1d5db", marginBottom: 12, display: "block" }} />
          <h3 style={{ fontSize: 16, fontWeight: 600, color: "#374151", margin: "0 0 4px" }}>No orders yet</h3>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
            {search || typeFilter ? "Try a different search or filter" : "Start by adding items to your cart"}
          </p>
        </div>
      )}

      {/* Order List */}
      {!loading && orders.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {orders.map((order) => {
            const items = order.items || [];
            return (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: "#fff", borderRadius: 16, border: "1px solid #f3f4f6",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)", overflow: "hidden",
                }}
              >
                {/* Header row */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 18px", borderBottom: "1px solid #f3f4f6",
                  background: "#fafafa",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                      {order.orderNumber || "—"}
                    </span>
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20,
                      background: order.status === "completed" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.14)",
                      color: order.status === "completed" ? "#15803d" : "#b45309",
                    }}>
                      {order.status === "completed" ? "Completed" : order.status}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>{fmtDate(order.createdAt)}</span>
                </div>

                {/* Items */}
                <div style={{ padding: "12px 18px" }}>
                  {items.length === 0 && (
                    <div style={{ fontSize: 13, color: "#9ca3af", padding: "8px 0" }}>{order.itemCount} item(s)</div>
                  )}
                  {items.map((item, idx) => (
                    <div key={idx} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "6px 0", borderBottom: idx < items.length - 1 ? "1px solid #f9fafb" : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <i className={`ti ${TYPE_ICONS[item.itemType] || "ti-box"}`}
                          style={{ fontSize: 16, color: "#2E7D5B", width: 20, textAlign: "center" }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>{TYPE_LABELS[item.itemType] || item.itemType}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937" }}>{fmtPrice(item.finalPrice)}</div>
                        {item.discount > 0 && (
                          <div style={{ fontSize: 10, color: "#10b981" }}>-{fmtPrice(item.discount)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 18px", borderTop: "1px solid #f3f4f6", background: "#fafafa",
                }}>
                  <div>
                    {order.couponCode && (
                      <span style={{
                        fontSize: 10, padding: "2px 8px", borderRadius: 12,
                        background: "rgba(46,125,91,0.1)", color: "#2E7D5B", fontWeight: 600,
                      }}>
                        Coupon: {order.couponCode}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>Total</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#2E7D5B" }}>{fmtPrice(order.total)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openDetail(order._id)}
                      style={{
                        padding: "6px 14px", borderRadius: 8, border: "1px solid #e5e7eb",
                        background: "#fff", fontSize: 12, fontWeight: 600, color: "#374151",
                        cursor: "pointer", transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2E7D5B"; e.currentTarget.style.color = "#2E7D5B"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#e5e7eb"; e.currentTarget.style.color = "#374151"; }}
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      disabled={invoiceLoading}
                      onClick={() => openInvoice(order._id)}
                      style={{
                        padding: "6px 14px", borderRadius: 8, border: "none",
                        background: "linear-gradient(135deg, #2E7D5B, #F97316)", color: "#fff",
                        fontSize: 12, fontWeight: 600, cursor: invoiceLoading ? "wait" : "pointer",
                        opacity: invoiceLoading ? 0.7 : 1, transition: "all 0.2s",
                      }}
                    >
                      {invoiceLoading ? "..." : <><i className="ti ti-file-invoice" style={{ marginRight: 4 }} />Invoice</>}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb",
              background: page <= 1 ? "#f9fafb" : "#fff", fontSize: 12, fontWeight: 600,
              color: page <= 1 ? "#d1d5db" : "#374151", cursor: page <= 1 ? "not-allowed" : "pointer",
            }}
          >
            Previous
          </button>
          <span style={{ display: "flex", alignItems: "center", fontSize: 12, color: "#6b7280", padding: "0 8px" }}>
            Page {page} of {pages}
          </span>
          <button
            type="button"
            disabled={page >= pages}
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "1px solid #e5e7eb",
              background: page >= pages ? "#f9fafb" : "#fff", fontSize: 12, fontWeight: 600,
              color: page >= pages ? "#d1d5db" : "#374151", cursor: page >= pages ? "not-allowed" : "pointer",
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {detail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 1000, background: "rgba(45,20,6,0.5)",
              backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center",
              padding: 20,
            }}
            onClick={() => setDetail(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#fff", borderRadius: 24, maxWidth: 580, width: "100%",
                maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column",
                boxShadow: "0 24px 50px -16px rgba(45,20,6,0.3)",
              }}
            >
              {/* Modal header */}
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "18px 22px", borderBottom: "1px solid #f3f4f6",
              }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#1f2937" }}>
                  Order {detail.orderNumber}
                </h3>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  style={{
                    background: "none", border: "none", fontSize: 20, color: "#9ca3af",
                    cursor: "pointer", padding: 4,
                  }}
                >
                  <i className="ti ti-x" />
                </button>
              </div>

              {/* Modal body */}
              <div style={{ padding: "18px 22px", overflowY: "auto", flex: 1 }}>
                {/* Status badges */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                    background: detail.status === "completed" ? "rgba(34,197,94,0.12)" : "rgba(245,158,11,0.14)",
                    color: detail.status === "completed" ? "#15803d" : "#b45309",
                  }}>
                    {detail.status === "completed" ? "Completed" : detail.status}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
                    background: "rgba(99,102,241,0.1)", color: "#6366f1",
                  }}>
                    {detail.paymentMethod || "Manual"}
                  </span>
                </div>

                {/* Date & Payment info */}
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 16, lineHeight: 1.8 }}>
                  <div>Purchased on: <strong style={{ color: "#374151" }}>{fmtDate(detail.createdAt)}</strong></div>
                  <div>Transaction: <strong style={{ color: "#374151" }}>{detail.transactionId || "—"}</strong></div>
                  {detail.couponCode && (
                    <div>Coupon: <strong style={{ color: "#2E7D5B" }}>{detail.couponCode}</strong></div>
                  )}
                </div>

                {/* Items */}
                <h4 style={{ fontSize: 13, fontWeight: 700, color: "#374151", margin: "0 0 10px" }}>Items</h4>
                <div style={{ border: "1px solid #f3f4f6", borderRadius: 12, overflow: "hidden", marginBottom: 16 }}>
                  {(detail.items || []).map((item, idx) => (
                    <div key={idx} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 14px", borderBottom: idx < (detail.items || []).length - 1 ? "1px solid #f9fafb" : "none",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <i className={`ti ${TYPE_ICONS[item.itemType] || "ti-box"}`}
                          style={{ fontSize: 16, color: "#2E7D5B", width: 20, textAlign: "center" }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#1f2937" }}>{item.name}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>{TYPE_LABELS[item.itemType] || item.itemType}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, color: "#6b7280" }}>
                          <span style={{ textDecoration: item.discount > 0 ? "line-through" : "none", color: item.discount > 0 ? "#d1d5db" : "#1f2937", fontWeight: 700 }}>
                            {fmtPrice(item.price)}
                          </span>
                          {item.discount > 0 && (
                            <span style={{ color: "#10b981", fontWeight: 700, marginLeft: 6 }}>
                              {fmtPrice(item.finalPrice)}
                            </span>
                          )}
                        </div>
                        {item.discount > 0 && (
                          <div style={{ fontSize: 10, color: "#10b981" }}>-{fmtPrice(item.discount)}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary */}
                <div style={{
                  background: "#fafafa", borderRadius: 12, padding: "14px 16px",
                  border: "1px solid #f3f4f6",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                    <span>Subtotal</span><span>{fmtPrice(detail.subtotal)}</span>
                  </div>
                  {detail.discount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#10b981", marginBottom: 4 }}>
                      <span>Discount {detail.couponCode ? `(${detail.couponCode})` : ""}</span><span>-{fmtPrice(detail.discount)}</span>
                    </div>
                  )}
                  {detail.couponDiscount > 0 && detail.discount !== detail.couponDiscount && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#10b981", marginBottom: 4 }}>
                      <span>Coupon Discount</span><span>-{fmtPrice(detail.couponDiscount)}</span>
                    </div>
                  )}
                  <div style={{
                    display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700,
                    color: "#2E7D5B", borderTop: "1px solid #e5e7eb", paddingTop: 8, marginTop: 6,
                  }}>
                    <span>Total Paid</span><span>{fmtPrice(detail.total)}</span>
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div style={{
                padding: "14px 22px", borderTop: "1px solid #f3f4f6",
                display: "flex", justifyContent: "flex-end",
              }}>
                <button
                  type="button"
                  onClick={() => setDetail(null)}
                  style={{
                    padding: "8px 20px", borderRadius: 10, border: "none",
                    background: "linear-gradient(135deg, #2E7D5B, #F97316)", color: "#fff",
                    fontSize: 12, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invoice Modal */}
      <AnimatePresence>
        {invoiceOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 1001, background: "rgba(45,20,6,0.5)",
              backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center",
              padding: 20,
            }}
            onClick={() => setInvoiceOrder(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 740, width: "100%", maxHeight: "90vh", overflow: "auto", borderRadius: 16 }}
            >
              <InvoiceView order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
