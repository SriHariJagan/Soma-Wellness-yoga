import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FaTruckFast, FaShieldHalved, FaLock } from "react-icons/fa6";
import { getCart, updateCartItemQty, removeCartItem, applyCouponToCart, removeCouponFromCart, validateBookCart, checkoutBooks, verifyPayment, loadRazorpay, checkShippingAvailability } from "../components/api/BookServices";
import { useScrollToSection } from "../hooks/useScrollToSection";
import styles from "./BookCheckout.module.css";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

const emptyAddress = {
  fullName: "", phone: "", email: "", line1: "", line2: "", city: "", state: "", pincode: "", country: "India",
};

const BookCheckout = () => {
  useScrollToSection();
  const navigate = useNavigate();
  const location = useLocation();
  const [user] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
  });

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState("");
  const [couponErr, setCouponErr] = useState("");
  const [address, setAddress] = useState({ ...emptyAddress, email: user?.email || "" });
  const [pinCheck, setPinCheck] = useState(null);
  const [pinChecked, setPinChecked] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(null);
  const [quantities, setQuantities] = useState({});

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }
    getCart()
      .then((res) => {
        setCart(res);
        const q = {};
        (res.items || []).forEach((i) => { q[i._id] = i.quantity || 1; });
        setQuantities(q);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [navigate, location.pathname]);

  const bookItems = useMemo(() => (cart?.items || []).filter((i) => i.itemType === "book"), [cart]);
  const otherItems = useMemo(() => (cart?.items || []).filter((i) => i.itemType !== "book"), [cart]);

  // Server-authoritative prices for books (quantity-scaled).
  const [serverLines, setServerLines] = useState(null);
  const [validateErr, setValidateErr] = useState("");
  const [validateTick, setValidateTick] = useState(0);

  useEffect(() => {
    if (bookItems.length === 0) return;
    setValidateErr("");
    validateBookCart()
      .then(setServerLines)
      .catch((e) => setValidateErr(e.message));
  }, [bookItems.length, JSON.stringify(quantities), validateTick]);

  const set = (field) => (e) => {
    setAddress({ ...address, [field]: e.target.value });
    if (fieldErrors[field]) setFieldErrors((fe) => { const n = { ...fe }; delete n[field]; return n; });
  };

  const handleQty = async (cartItemId, delta) => {
    const next = Math.max(1, Math.min(99, (quantities[cartItemId] || 1) + delta));
    setQuantities((q) => ({ ...q, [cartItemId]: next }));
    try {
      const res = await updateCartItemQty(cartItemId, next);
      setCart((c) => ({
        ...c,
        items: c.items.map((i) => (i._id === cartItemId ? res.item : i)),
        summary: res.summary,
      }));
    } catch (e) {
      setError(e.message);
    }
  };

  const handleRemove = async (cartItemId) => {
    try {
      await removeCartItem(cartItemId);
      setCart((c) => ({ ...c, items: c.items.filter((i) => i._id !== cartItemId) }));
    } catch (e) {
      setError(e.message);
    }
  };

  const handleCoupon = async (apply) => {
    setCouponErr("");
    setCouponMsg("");
    try {
      if (apply) {
        if (!couponInput.trim()) { setCouponErr("Enter a coupon code"); return; }
        await applyCouponToCart(couponInput.trim().toUpperCase());
        setCouponMsg(`Coupon ${couponInput.trim().toUpperCase()} applied`);
        setCouponInput("");
        const res = await getCart();
        setCart(res);
      } else {
        await removeCouponFromCart();
        setCouponMsg("Coupon removed");
        const res = await getCart();
        setCart(res);
      }
    } catch (e) {
      setCouponErr(e.message);
    }
  };

  const handlePinCheck = async () => {
    const pin = (address.pincode || "").trim();
    if (!/^\d{6}$/.test(pin)) { setPinCheck(null); setPinChecked(""); setError("Enter a valid 6-digit PIN code"); return; }
    setError("");
    setPinLoading(true);
    try {
      const shipping = await checkShippingAvailability({ pincode: pin, state: address.state, country: address.country });
      setPinCheck({ shipping });
      setPinChecked(pin);
      if (!shipping.available) setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setPinLoading(false);
    }
  };

  // Auto-check delivery as soon as a complete PIN is entered.
  useEffect(() => {
    const pin = (address.pincode || "").trim();
    if (/^\d{6}$/.test(pin) && pin !== pinChecked && !pinLoading) {
      handlePinCheck();
    } else if (!/^\d{6}$/.test(pin) && pinCheck) {
      setPinCheck(null);
    }
  }, [address.pincode, pinChecked, pinLoading, pinCheck]);

  const shippingInfo = pinCheck?.shipping?.available
    ? pinCheck.shipping
    : null;

  const subtotal = serverLines?.subtotal ?? null;
  const shippingCharge = shippingInfo ? (shippingInfo.freeShippingThreshold > 0 && subtotal >= shippingInfo.freeShippingThreshold ? 0 : shippingInfo.shippingCharge) : 0;
  const total = subtotal !== null ? Math.round((subtotal + shippingCharge) * 100) / 100 : null;

  const handlePay = async () => {
    setError("");
    const required = [
      ["fullName", "Full name"], ["phone", "Mobile number"], ["email", "Email"],
      ["line1", "Address line 1"], ["city", "City"], ["state", "State"], ["pincode", "PIN code"],
    ];
    const missing = required.filter(([k]) => !String(address[k] || "").trim());
    if (missing.length > 0) {
      const fe = {};
      missing.forEach(([k]) => { fe[k] = true; });
      setFieldErrors(fe);
      setError(`Please fill in: ${missing.map(([, l]) => l).join(", ")}`);
      const first = document.getElementById(`addr-${missing[0][0]}`);
      if (first) first.focus();
      return;
    }
    setFieldErrors({});
    if (!shippingInfo) {
      setError("Check delivery availability for your PIN code first");
      return;
    }
    setPaying(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Could not load Razorpay. Check your connection and try again.");
      if (!RAZORPAY_KEY_ID) throw new Error("Payment is not configured. Please contact support.");

      const idempotencyKey = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const result = await checkoutBooks({ idempotencyKey, address });

      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY_ID,
        amount: result.razorpay.amount,
        currency: result.razorpay.currency,
        name: "Pragya Yoga Bookstore",
        description: `Order ${result.order.orderNumber}`,
        order_id: result.razorpay.order_id,
        prefill: { name: address.fullName, email: address.email, contact: address.phone },
        theme: { color: "#2E7D5B" },
        handler: async (response) => {
          try {
            const verify = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setSuccess({ orderNumber: result.order.orderNumber, email: address.email, verify });
            try { await getCart().then((c) => setCart(c)); } catch {}
          } catch (err) {
            setError(err.message);
          } finally {
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPaying(false);
            setError("Payment cancelled. No amount was deducted. Your order is saved for 1 hour — you can retry anytime, after which it is automatically cancelled.");
          },
        },
      });

      rzp.on("payment.failed", () => {
        setPaying(false);
        setError("Payment failed. No amount was deducted. Your order is saved for 1 hour — you can retry, after which it is automatically cancelled.");
      });

      rzp.open();
    } catch (err) {
      setError(err.message);
      setPaying(false);
    }
  };

  if (success) {
    return (
      <div className={styles.successPage}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <h1>Order confirmed!</h1>
          <p>Thank you for your purchase. Your order <strong>#{success.orderNumber}</strong> has been confirmed.</p>
          <p className={styles.successSub}>A confirmation email is on its way to <strong>{success.email}</strong>. We will pack and dispatch your books soon.</p>
          <div className={styles.successActions}>
            <button className={styles.primaryBtn} onClick={() => navigate("/")}>← Back to Home</button>
            <Link to={`/order-tracking?order=${success.orderNumber}`} className={styles.secondaryBtn}>Track your order</Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className={styles.statePage}>Loading your cart…</div>;

  if (bookItems.length === 0 && otherItems.length > 0) {
    return (
      <div className={styles.statePage}>
        <p>Your cart contains only non-book items.</p>
        <Link to="/studentdashboard?tab=cart">Go to your cart</Link>
      </div>
    );
  }

  if (bookItems.length === 0) {
    return (
      <div className={styles.statePage}>
        <p>Your cart is empty.</p>
        <Link to="/books">Browse the bookstore →</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>Book Checkout</h1>
        <p>Secure checkout powered by Razorpay</p>
      </header>

      <div className={styles.layout}>
        {/* ── Left: items + address ── */}
        <div className={styles.left}>
          {error && <div className={styles.errorBox}>{error}</div>}

          <section className={styles.block}>
            <h2>Your books</h2>
            {bookItems.map((item) => (
              <div key={item._id} className={styles.cartRow}>
                {item.image ? (
                  <img src={item.image} alt={item.name} className={styles.thumb} />
                ) : (
                  <div className={styles.thumbPlaceholder}>{item.name.slice(0, 1)}</div>
                )}
                <div className={styles.cartInfo}>
                  <div className={styles.cartName}>{item.name}</div>
                  <div className={styles.cartPrice}>{inr(item.price)} each</div>
                </div>
                <div className={styles.qtyBox}>
                  <button onClick={() => handleQty(item._id, -1)} disabled={(quantities[item._id] || 1) <= 1}>−</button>
                  <span>{quantities[item._id] || 1}</span>
                  <button onClick={() => handleQty(item._id, 1)}>+</button>
                </div>
                <button className={styles.removeBtn} onClick={() => handleRemove(item._id)}>✕</button>
              </div>
            ))}
            {otherItems.length > 0 && (
              <p className={styles.warn}>Note: {otherItems.length} non-book item(s) in your cart are not part of this checkout — finish them separately.</p>
            )}
          </section>

          <section className={styles.block}>
            <h2>Delivery address</h2>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Full name *</span>
                <input id="addr-fullName" className={fieldErrors.fullName ? styles.inputError : ""} value={address.fullName} onChange={set("fullName")} placeholder="e.g. Priya Sharma" />
              </label>
              <label className={styles.field}>
                <span>Mobile number *</span>
                <input id="addr-phone" className={fieldErrors.phone ? styles.inputError : ""} value={address.phone} onChange={set("phone")} maxLength={10} placeholder="10-digit mobile" />
              </label>
              <label className={styles.field} style={{ gridColumn: "1 / -1" }}>
                <span>Email *</span>
                <input id="addr-email" className={fieldErrors.email ? styles.inputError : ""} type="email" value={address.email} onChange={set("email")} placeholder="you@email.com" />
              </label>
              <label className={styles.field} style={{ gridColumn: "1 / -1" }}>
                <span>Address line 1 *</span>
                <input id="addr-line1" className={fieldErrors.line1 ? styles.inputError : ""} value={address.line1} onChange={set("line1")} placeholder="House no, street, locality" />
              </label>
              <label className={styles.field} style={{ gridColumn: "1 / -1" }}>
                <span>Address line 2</span>
                <input value={address.line2} onChange={set("line2")} placeholder="Landmark, apartment (optional)" />
              </label>
              <label className={styles.field}>
                <span>City *</span>
                <input id="addr-city" className={fieldErrors.city ? styles.inputError : ""} value={address.city} onChange={set("city")} />
              </label>
              <label className={styles.field}>
                <span>State *</span>
                <input id="addr-state" className={fieldErrors.state ? styles.inputError : ""} value={address.state} onChange={set("state")} />
              </label>
              <label className={styles.field}>
                <span>PIN code *</span>
                <input id="addr-pincode" className={fieldErrors.pincode ? styles.inputError : ""} value={address.pincode} onChange={set("pincode")} maxLength={6} placeholder="6-digit PIN" inputMode="numeric" />
              </label>
              <label className={styles.field}>
                <span>Country</span>
                <input value={address.country} onChange={set("country")} />
              </label>
            </div>
            <p className={styles.pinHint}>Delivery charges are calculated automatically when you enter your PIN.</p>
            <button className={styles.pinBtn} onClick={handlePinCheck} disabled={pinLoading}>
              <FaTruckFast /> {pinLoading ? "Checking…" : "Check delivery & shipping"}
            </button>
            {pinCheck?.shipping && !pinCheck.shipping.available && (
              <p className={styles.pinNo}>{pinCheck.shipping.reason}</p>
            )}
            {shippingInfo && (
              <div className={styles.pinOk}>
                <div><strong>Delivery available</strong> — {shippingInfo.estimatedDelivery?.minDays}–{shippingInfo.estimatedDelivery?.maxDays} days</div>
                <div>{shippingCharge > 0 ? `Shipping ${inr(shippingCharge)}` : "Free shipping"}{shippingInfo.freeShippingThreshold > 0 && subtotal < shippingInfo.freeShippingThreshold ? ` (free above ${inr(shippingInfo.freeShippingThreshold)})` : ""}</div>
              </div>
            )}
          </section>

          <section className={styles.block}>
            <h2>Coupon</h2>
            <div className={styles.couponRow}>
              <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder="Enter coupon code" />
              <button onClick={() => handleCoupon(true)}>Apply</button>
              {cart?.summary?.couponCode && (
                <button className={styles.removeCouponBtn} onClick={() => handleCoupon(false)}>Remove {cart.summary.couponCode}</button>
              )}
            </div>
            {couponMsg && <p className={styles.couponOk}>{couponMsg}</p>}
            {couponErr && <p className={styles.couponErr}>{couponErr}</p>}
            {cart?.summary?.couponCode && (
              <p className={styles.couponApplied}>Coupon <strong>{cart.summary.couponCode}</strong> applied — discount {inr(cart.summary.couponDiscount)}</p>
            )}
          </section>
        </div>

        {/* ── Right: summary + pay ── */}
        <aside className={styles.summary}>
          <h2>Order summary</h2>
          {subtotal === null ? (
            validateErr ? (
              <div className={styles.summaryNote}>
                <p style={{ color: "var(--color-error)", margin: "0 0 8px" }}>{validateErr}</p>
                <button className={styles.pinBtn} style={{ padding: "8px 14px" }} onClick={() => setValidateTick((t) => t + 1)}>Retry validation</button>
              </div>
            ) : (
              <p className={styles.summaryNote}>Validating prices…</p>
            )
          ) : (
            <>
              <div className={styles.sumRow}><span>Subtotal</span><span>{inr(subtotal)}</span></div>
              {cart?.summary?.couponDiscount > 0 && (
                <div className={styles.sumRow}><span>Coupon discount</span><span>− {inr(cart.summary.couponDiscount)}</span></div>
              )}
              <div className={styles.sumRow}><span>Shipping</span><span>{shippingInfo ? (shippingCharge > 0 ? inr(shippingCharge) : "Free") : <em style={{ opacity: 0.55, fontStyle: "normal" }}>Enter PIN</em>}</span></div>
              <div className={`${styles.sumRow} ${styles.sumTotal}`}><span>Total</span><span>{shippingInfo ? inr(total) : <em style={{ opacity: 0.55, fontStyle: "normal" }}>Awaiting PIN</em>}</span></div>
            </>
          )}

          {!shippingInfo && (
            <p className={styles.summaryNote}>Enter your delivery PIN code above to see the delivery charge and final total.</p>
          )}

          {error && <p className={styles.payErr}>{error}</p>}

          <button className={styles.payBtn} onClick={handlePay} disabled={paying || subtotal === null || !shippingInfo}>
            {paying ? "Processing…" : shippingInfo ? `Pay ${inr(total ?? 0)} securely` : "Enter PIN to continue"}
          </button>
          <p className={styles.secureNote}><FaLock /> Payments via Razorpay (UPI, cards, netbanking, wallets)</p>
          <p className={styles.secureNote}><FaShieldHalved /> Books are reserved for 30 minutes while you pay. If you leave, the reservation is released automatically.</p>
        </aside>
      </div>
    </div>
  );
};

export default BookCheckout;