import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import s from "./Dashboard.shared.module.css";
import {
  getCart, removeFromCart, applyCouponToCart, removeCouponFromCart, checkoutCart, verifyPayment,
} from "../api/StudentServices.js";

const API_URL = import.meta.env.VITE_API_URL || "";

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

const ITEM_ICONS = {
  plan:          "ti ti-currency-rupee",
  service:       "ti ti-package",
  course:        "ti ti-book",
  workshop:      "ti ti-award",
  consultation:  "ti ti-stethoscope",
  book:          "ti ti-book-2",
};
const ITEM_LABELS = {
  plan:          "Membership",
  service:       "Service",
  course:        "Course",
  workshop:      "Workshop",
  consultation:  "Consultation",
  book:          "Book",
};

let globalRefreshCart = null;
export function setCartRefreshFn(fn) { globalRefreshCart = fn; }
export async function triggerCartRefresh() { if (globalRefreshCart) await globalRefreshCart(); }

export default function CartPage({ onNavigate, reload: reloadParent }) {
  const navigate = useNavigate();
  const [cartData, setCartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [couponMsg, setCouponMsg] = useState({ text: "", type: "" });
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getCart();
      setCartData(data);
    } catch { setCartData(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCart(); globalRefreshCart = fetchCart; return () => { globalRefreshCart = null; }; }, [fetchCart]);

  async function handleRemove(itemId) {
    setBusyId(itemId);
    try {
      const res = await removeFromCart(itemId);
      await fetchCart();
      if (res.cartCount !== undefined) {
        const evt = new CustomEvent("cart-update", { detail: { count: res.cartCount } });
        window.dispatchEvent(evt);
      }
    } catch {}
    finally { setBusyId(null); }
  }

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponMsg({ text: "", type: "" });
    try {
      const res = await applyCouponToCart(couponCode.trim());
      showToast(res.msg || "Coupon applied!", "success");
      await fetchCart();
    } catch (err) {
      setCouponMsg({ text: err.message || "Failed to apply coupon", type: "error" });
    }
  }

  async function handleRemoveCoupon() {
    try {
      const res = await removeCouponFromCart();
      setCouponCode("");
      await fetchCart();
      showToast("Coupon removed", "info");
    } catch (err) {
      setCouponMsg({ text: err.message || "Failed to remove coupon", type: "error" });
    }
  }

  const summary = cartData?.summary;
  const bookItems = (cartData?.items || []).filter((i) => i.itemType === "book");
  const hasBooks = bookItems.length > 0;
  const hasNonBooks = (cartData?.items || []).some((i) => i.itemType !== "book");

  async function handleCheckout() {
    // Books need a shipping address — they use the dedicated book checkout.
    if (hasBooks) {
      navigate("/checkout");
      return;
    }
    setCheckingOut(true);
    setCouponMsg({ text: "", type: "" });
    try {
      const idempotencyKey = `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const res = await checkoutCart(idempotencyKey);

      if (!res.requiresPayment || !res.razorpay?.order_id) {
        setCheckoutResult(res);
        window.dispatchEvent(new CustomEvent("cart-update", { detail: { count: 0 } }));
        showToast("Enrollment successful!", "success");
        if (reloadParent) setTimeout(reloadParent, 500);
        setCheckingOut(false);
        return;
      }

      const { razorpay } = res;
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load payment gateway. Check your connection.");

      const rzp = new window.Razorpay({
        key: razorpay.key || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: razorpay.amount,
        currency: razorpay.currency || "INR",
        name: "Pragya Yoga",
        description: "Cart Checkout",
        order_id: razorpay.order_id,
        theme: { color: "#F97316" },
        handler: async (response) => {
          try {
            const verify = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (!verify.success) throw new Error(verify.message || "Payment could not be verified.");
            setCheckoutResult(res);
            window.dispatchEvent(new CustomEvent("cart-update", { detail: { count: 0 } }));
            showToast("Enrollment successful!", "success");
            if (reloadParent) setTimeout(reloadParent, 500);
          } catch (err) {
            setCouponMsg({ text: err.message || "Payment verification failed.", type: "error" });
          } finally {
            setCheckingOut(false);
          }
        },
        modal: {
          ondismiss: () => {
            setCheckingOut(false);
            setCouponMsg({ text: "Payment cancelled. You can try again when ready.", type: "error" });
          },
        },
      });

      rzp.on("payment.failed", (resp) => {
        setCheckingOut(false);
        setCouponMsg({ text: resp?.error?.description || "Payment failed. Please try again.", type: "error" });
      });

      rzp.open();
    } catch (err) {
      setCouponMsg({ text: err.message || "Checkout failed. Please try again.", type: "error" });
      setCheckingOut(false);
    }
  }

  if (checkoutResult) {
    return (
      <div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", padding: "40px 20px" }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
            style={{
              width: 80, height: 80, borderRadius: "50%",
              background: "rgba(16,185,129,0.1)", color: "#10B981",
              display: "grid", placeItems: "center", fontSize: 32,
              margin: "0 auto 20px",
            }}
          >
            <i className="ti ti-circle-check" />
          </motion.div>
          <h2 style={{ color: "var(--color-dark)", margin: "0 0 4px", fontSize: 20 }}>Enrollment Successful!</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 13, margin: "0 0 4px" }}>
            Order #{checkoutResult.order?.orderNumber}
          </p>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 13, margin: "0 0 24px" }}>
            Total paid: ₹{(checkoutResult.order?.total || 0).toLocaleString("en-IN")}
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => { setCheckoutResult(null); fetchCart(); }}
              style={{
                padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: "none", background: "linear-gradient(135deg, #F97316, #EA580C)",
                color: "#fff", cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              Continue Shopping
            </button>
            <button
              onClick={() => onNavigate?.("orders")}
              style={{
                padding: "10px 24px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                border: "1px solid #E7D7BE", background: "#fff", color: "#6B5E4E",
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              View My Order
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: "fixed", top: 16, right: 16, zIndex: 9999,
              padding: "12px 20px", borderRadius: 10,
              background: toast.type === "success" ? "rgba(16,185,129,0.95)" : "rgba(249,115,22,0.95)",
              color: "#fff", fontSize: 13, fontWeight: 600,
              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              display: "flex", alignItems: "center", gap: 8,
              fontFamily: "'Inter', sans-serif",
            }}
          >
            <i className={`ti ${toast.type === "success" ? "ti-circle-check" : "ti-info-circle"}`} />
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      <p className={s.pageTitle}>My Cart</p>

      {/* Coupon message */}
      {couponMsg.text && (
        <div style={{
          padding: "8px 14px", borderRadius: 8, marginBottom: 12, fontSize: 12,
          background: couponMsg.type === "error" ? "rgba(220,38,38,0.08)" : "rgba(16,185,129,0.08)",
          color: couponMsg.type === "error" ? "#DC2626" : "#10B981",
          border: `1px solid ${couponMsg.type === "error" ? "rgba(220,38,38,0.2)" : "rgba(16,185,129,0.2)"}`,
        }}>
          <i className={`ti ${couponMsg.type === "error" ? "ti-alert-circle" : "ti-circle-check"}`} style={{ marginRight: 6 }} />
          {couponMsg.text}
        </div>
      )}

      {loading ? (
        <div className={s.card}>
          {[1, 2].map((i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: i < 2 ? "1px solid var(--color-border-light)" : "none" }}>
              <div className={s.skel} style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className={s.skel} style={{ height: 14, width: "50%", marginBottom: 8, borderRadius: 6 }} />
                <div className={s.skel} style={{ height: 12, width: "30%", borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      ) : !cartData || !summary || summary.itemCount === 0 ? (
        <div className={s.card} style={{ textAlign: "center", padding: "60px 40px" }}>
          <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }}>
            <i className="ti ti-shopping-cart-off" style={{ fontSize: 56, color: "#D1C4B5", marginBottom: 16, display: "block" }} />
          </motion.div>
          <p style={{ color: "#6B5E4E", fontWeight: 600, fontSize: 15, margin: 0 }}>Your cart is empty</p>
          <p style={{ fontSize: 12, color: "#9C8E7C", marginTop: 6, maxWidth: 300, margin: "6px auto 20px" }}>
            Browse membership plans, yoga services, or workshops to get started on your wellness journey.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              onClick={() => onNavigate?.("browsePlans")}
              style={{
                padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 600,
                border: "none", background: "linear-gradient(135deg, #F97316, #EA580C)",
                color: "#fff", cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              Browse Plans
            </button>
            <button
              onClick={() => onNavigate?.("browseServices")}
              style={{
                padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 500,
                border: "1px solid #E7D7BE", background: "#fff", color: "#6B5E4E",
                cursor: "pointer", fontFamily: "'Inter', sans-serif",
              }}
            >
              Browse Services
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
          {/* Items */}
          <div>
            <AnimatePresence initial={false}>
              {cartData.items.map((item, i) => (
                <motion.div
                  key={item._id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={s.card} style={{
                    display: "flex", gap: 14, marginBottom: 10, padding: 14,
                    borderLeft: `3px solid ${item.discount > 0 ? "#10B981" : "#E7D7BE"}`,
                  }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                      background: "rgba(249,115,22,0.08)", color: "#F97316",
                      display: "grid", placeItems: "center", fontSize: 20,
                    }}>
                      <i className={ITEM_ICONS[item.itemType] || "ti ti-box"} />
                    </div>

<div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: 13.5, color: "var(--color-dark)", margin: 0 }}>
                              {item.name}
                            </p>
                            <p style={{ fontSize: 11, color: "#9C8E7C", margin: "2px 0 0" }}>
                              {ITEM_LABELS[item.itemType] || item.itemType}
                              {item.itemType === "book" && item.quantity > 1 ? ` × ${item.quantity}` : ""}
                            </p>
                          </div>
                        <button
                          onClick={() => handleRemove(item._id)}
                          disabled={busyId === item._id}
                          style={{
                            border: "none", background: "none", color: "#DC2626", cursor: "pointer",
                            padding: 4, opacity: busyId === item._id ? 0.5 : 1, fontSize: 16, lineHeight: 1,
                          }}
                          title="Remove"
                        >
                          <i className="ti ti-trash" />
                        </button>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-dark)" }}>
                          ₹{item.finalPrice.toLocaleString("en-IN")}
                        </span>
                        {item.discount > 0 && (
                          <>
                            <span style={{ fontSize: 12, color: "#9C8E7C", textDecoration: "line-through" }}>
                              ₹{item.price.toLocaleString("en-IN")}
                            </span>
                            <span style={{
                              fontSize: 10, fontWeight: 600, color: "#10B981",
                              padding: "1px 6px", borderRadius: 6, background: "rgba(16,185,129,0.1)",
                            }}>
                              -₹{item.discount.toLocaleString("en-IN")}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Order Summary */}
          <div>
            <div className={s.card} style={{ position: "sticky", top: 16 }}>
              <p style={{ fontWeight: 700, fontSize: 14, color: "var(--color-dark)", margin: "0 0 14px" }}>
                Order Summary
              </p>

              {/* Coupon */}
              <div style={{ marginBottom: 14 }}>
                {summary.couponCode ? (
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 12px", borderRadius: 8,
                    background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
                  }}>
                    <div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#10B981" }}>{summary.couponCode}</span>
                      <span style={{ fontSize: 11, color: "#6B5E4E", marginLeft: 4 }}>
                        (-₹{summary.couponDiscount.toLocaleString("en-IN")})
                      </span>
                    </div>
                    <button onClick={handleRemoveCoupon} style={{ border: "none", background: "none", color: "#DC2626", cursor: "pointer", fontSize: 14, padding: 2 }}>
                      <i className="ti ti-x" />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 6 }}>
                    <input
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      style={{
                        flex: 1, height: 34, borderRadius: 8, border: "1px solid #E7D7BE",
                        fontSize: 12, fontFamily: "'Inter', sans-serif", padding: "0 10px",
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleApplyCoupon()}
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={!couponCode.trim()}
                      style={{
                        height: 34, padding: "0 12px", borderRadius: 8, fontSize: 11,
                        fontWeight: 600, border: "none", cursor: couponCode.trim() ? "pointer" : "not-allowed",
                        background: couponCode.trim() ? "rgba(249,115,22,0.1)" : "#F5F0EB",
                        color: couponCode.trim() ? "#F97316" : "#9C8E7C",
                        fontFamily: "'Inter', sans-serif",
                      }}
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>

              {/* Price Breakdown */}
              <div style={{ borderTop: "1px solid var(--color-border-light)", paddingTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B5E4E", marginBottom: 6 }}>
                  <span>Subtotal ({summary.itemCount} item{summary.itemCount > 1 ? "s" : ""})</span>
                  <span>₹{summary.subtotal.toLocaleString("en-IN")}</span>
                </div>
                {summary.discount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#10B981", marginBottom: 6 }}>
                    <span>Discount</span>
                    <span>-₹{summary.discount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#6B5E4E", marginBottom: 6 }}>
                  <span>Tax</span>
                  <span>₹{(summary.tax || 0).toLocaleString("en-IN")}</span>
                </div>
                {hasBooks && (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#D97706", marginBottom: 6 }}>
                    <span>Delivery</span>
                    <span>At checkout</span>
                  </div>
                )}
              </div>

              <div style={{
                display: "flex", justifyContent: "space-between",
                borderTop: "1px solid var(--color-border-light)",
                paddingTop: 12, marginTop: 8, fontWeight: 700, fontSize: 15, color: "var(--color-dark)",
              }}>
                <span>Total</span>
                <span>₹{summary.total.toLocaleString("en-IN")}</span>
              </div>

              {hasBooks && (
                <p style={{ fontSize: 11, color: "#D97706", margin: "8px 0 0", lineHeight: 1.5 }}>
                  <i className="ti ti-truck" style={{ marginRight: 4 }} />
                  Delivery charge is calculated at checkout based on your PIN code.
                </p>
              )}

              {summary.discount > 0 && (
                <p style={{ fontSize: 11, color: "#10B981", margin: "6px 0 0", textAlign: "right" }}>
                  You save ₹{summary.discount.toLocaleString("en-IN")}
                </p>
              )}

              {hasBooks && hasNonBooks && (
                <p style={{ fontSize: 11, color: "#D97706", margin: "10px 0 0", lineHeight: 1.5 }}>
                  Books are checked out separately (they need a shipping address). Finish the non-book items first, then check out your books.
                </p>
              )}

              <motion.button
                onClick={handleCheckout}
                disabled={checkingOut || (hasBooks && hasNonBooks)}
                whileTap={{ scale: 0.97 }}
                style={{
                  width: "100%", marginTop: 16, padding: "12px 0", borderRadius: 10,
                  fontSize: 13, fontWeight: 700, border: "none",
                  cursor: checkingOut || (hasBooks && hasNonBooks) ? "not-allowed" : "pointer",
                  background: checkingOut ? "#F5F0EB" : "linear-gradient(135deg, #F97316, #EA580C)",
                  color: checkingOut ? "#9C8E7C" : "#fff",
                  fontFamily: "'Inter', sans-serif", transition: "all 0.2s",
                }}
              >
                {checkingOut ? (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{
                      width: 14, height: 14, border: "2px solid #9C8E7C", borderTopColor: "transparent",
                      borderRadius: "50%", display: "inline-block",
                      animation: "spin 0.6s linear infinite",
                    }} />
                    Processing...
                  </span>
                ) : hasBooks ? "Checkout Books (Shipping)" : "Proceed to Checkout"}
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
