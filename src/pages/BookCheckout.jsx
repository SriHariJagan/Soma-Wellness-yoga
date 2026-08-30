import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FaTruckFast, FaShieldHalved, FaLock } from "react-icons/fa6";
import { getCart, updateCartItemQty, removeCartItem, applyCouponToCart, removeCouponFromCart, validateBookCart, checkoutBooks, checkShippingAvailability } from "../components/api/BookServices";
import { useScrollToSection } from "../hooks/useScrollToSection";
import styles from "./BookCheckout.module.css";

const formatKES = (n) => `KES ${Number(n || 0).toLocaleString()}`;

const emptyAddress = {
  fullName: "", phone: "", email: "", line1: "", line2: "", city: "", state: "", pincode: "", country: "India",
};

const BookCheckout = () => {
  const { t } = useTranslation();
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
    if (!/^\d{6}$/.test(pin)) { setPinCheck(null); setPinChecked(""); setError(t("bookCheckout.invalidPin")); return; }
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
      setError(t("bookCheckout.fillRequired", { fields: missing.map(([, l]) => l).join(", ") }));
      const first = document.getElementById(`addr-${missing[0][0]}`);
      if (first) first.focus();
      return;
    }
    setFieldErrors({});
    if (!shippingInfo) {
      setError(t("bookCheckout.checkPinFirst"));
      return;
    }
    setPaying(true);
    try {
      const idempotencyKey = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const result = await checkoutBooks({ idempotencyKey, address });

      // M-Pesa payment initiated
      setSuccess({ orderNumber: result.order.orderNumber, email: address.email });
      try { await getCart().then((c) => setCart(c)); } catch {}
    } catch (err) {
      setError(err.message);
    } finally {
      setPaying(false);
    }
  };

  if (success) {
    return (
      <div className={styles.successPage}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <h1>{t("bookCheckout.orderConfirmed")}</h1>
          <p>{t("bookCheckout.thankYouPurchase")}</p>
          <p className={styles.successSub}>A confirmation email is on its way to <strong>{success.email}</strong>. We will pack and dispatch your books soon.</p>
          <div className={styles.successActions}>
            <button className={styles.primaryBtn} onClick={() => navigate("/")}>{t("bookCheckout.backToHome")}</button>
            <Link to={`/order-tracking?order=${success.orderNumber}`} className={styles.secondaryBtn}>{t("bookCheckout.trackYourOrder")}</Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className={styles.statePage}>{t("bookCheckout.loadingCart")}</div>;

  if (bookItems.length === 0 && otherItems.length > 0) {
    return (
      <div className={styles.statePage}>
        <p>{t("bookCheckout.nonBookItems")}</p>
        <Link to="/studentdashboard?tab=cart">{t("bookCheckout.goToCart")}</Link>
      </div>
    );
  }

  if (bookItems.length === 0) {
    return (
      <div className={styles.statePage}>
        <p>{t("bookCheckout.cartEmpty")}</p>
        <Link to="/books">{t("bookCheckout.browseStore")}</Link>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>{t("bookCheckout.title")}</h1>
        <p>{t("bookCheckout.securePowered")}</p>
      </header>

      <div className={styles.layout}>
        {/* ── Left: items + address ── */}
        <div className={styles.left}>
          {error && <div className={styles.errorBox}>{error}</div>}

          <section className={styles.block}>
            <h2>{t("bookCheckout.yourBooks")}</h2>
            {bookItems.map((item) => (
              <div key={item._id} className={styles.cartRow}>
                {item.image ? (
                  <img src={item.image} alt={item.name} className={styles.thumb} />
                ) : (
                  <div className={styles.thumbPlaceholder}>{item.name.slice(0, 1)}</div>
                )}
                <div className={styles.cartInfo}>
                  <div className={styles.cartName}>{item.name}</div>
                  <div className={styles.cartPrice}>{formatKES(item.price)} each</div>
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
            <h2>{t("bookCheckout.deliveryAddress")}</h2>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>{t("bookCheckout.fullName")}</span>
                <input id="addr-fullName" className={fieldErrors.fullName ? styles.inputError : ""} value={address.fullName} onChange={set("fullName")} placeholder={t("bookCheckout.fullNamePlaceholder")} />
              </label>
              <label className={styles.field}>
                <span>{t("bookCheckout.mobile")}</span>
                <input id="addr-phone" className={fieldErrors.phone ? styles.inputError : ""} value={address.phone} onChange={set("phone")} maxLength={10} placeholder={t("bookCheckout.mobilePlaceholder")} />
              </label>
              <label className={styles.field} style={{ gridColumn: "1 / -1" }}>
                <span>{t("bookCheckout.email")}</span>
                <input id="addr-email" className={fieldErrors.email ? styles.inputError : ""} type="email" value={address.email} onChange={set("email")} placeholder={t("bookCheckout.emailPlaceholder")} />
              </label>
              <label className={styles.field} style={{ gridColumn: "1 / -1" }}>
                <span>{t("bookCheckout.address1")}</span>
                <input id="addr-line1" className={fieldErrors.line1 ? styles.inputError : ""} value={address.line1} onChange={set("line1")} placeholder={t("bookCheckout.address1Placeholder")} />
              </label>
              <label className={styles.field} style={{ gridColumn: "1 / -1" }}>
                <span>Address line 2</span>
                <input value={address.line2} onChange={set("line2")} placeholder="Landmark, apartment (optional)" />
              </label>
              <label className={styles.field}>
                <span>{t("bookCheckout.city")}</span>
                <input id="addr-city" className={fieldErrors.city ? styles.inputError : ""} value={address.city} onChange={set("city")} placeholder={t("bookCheckout.cityPlaceholder")} />
              </label>
              <label className={styles.field}>
                <span>{t("bookCheckout.state")}</span>
                <input id="addr-state" className={fieldErrors.state ? styles.inputError : ""} value={address.state} onChange={set("state")} placeholder={t("bookCheckout.statePlaceholder")} />
              </label>
              <label className={styles.field}>
                <span>{t("bookCheckout.pinCode")}</span>
                <input id="addr-pincode" className={fieldErrors.pincode ? styles.inputError : ""} value={address.pincode} onChange={set("pincode")} maxLength={6} placeholder={t("bookCheckout.pinPlaceholder")} inputMode="numeric" />
              </label>
              <label className={styles.field}>
                <span>Country</span>
                <input value={address.country} onChange={set("country")} />
              </label>
            </div>
            <p className={styles.pinHint}>{t("bookCheckout.deliveryNote")}</p>
            <button className={styles.pinBtn} onClick={handlePinCheck} disabled={pinLoading}>
              <FaTruckFast /> {pinLoading ? t("bookCheckout.checking") : t("bookCheckout.checkDelivery")}
            </button>
            {pinCheck?.shipping && !pinCheck.shipping.available && (
              <p className={styles.pinNo}>{pinCheck.shipping.reason}</p>
            )}
            {shippingInfo && (
              <div className={styles.pinOk}>
                <div><strong>{t("bookCheckout.deliveryAvailable")}</strong> — {shippingInfo.estimatedDelivery?.minDays}–{shippingInfo.estimatedDelivery?.maxDays} days</div>
                <div>{shippingCharge > 0 ? `${t("bookCheckout.shipping")} ${formatKES(shippingCharge)}` : t("bookCheckout.freeShipping")}{shippingInfo.freeShippingThreshold > 0 && subtotal < shippingInfo.freeShippingThreshold ? ` (free above ${formatKES(shippingInfo.freeShippingThreshold)})` : ""}</div>
              </div>
            )}
          </section>

          <section className={styles.block}>
            <h2>{t("bookCheckout.coupon")}</h2>
            <div className={styles.couponRow}>
              <input value={couponInput} onChange={(e) => setCouponInput(e.target.value.toUpperCase())} placeholder={t("bookCheckout.couponPlaceholder")} />
              <button onClick={() => handleCoupon(true)}>Apply</button>
              {cart?.summary?.couponCode && (
                <button className={styles.removeCouponBtn} onClick={() => handleCoupon(false)}>Remove {cart.summary.couponCode}</button>
              )}
            </div>
            {couponMsg && <p className={styles.couponOk}>{couponMsg}</p>}
            {couponErr && <p className={styles.couponErr}>{couponErr}</p>}
            {cart?.summary?.couponCode && (
              <p className={styles.couponApplied}>Coupon <strong>{cart.summary.couponCode}</strong> applied — discount {formatKES(cart.summary.couponDiscount)}</p>
            )}
          </section>
        </div>

        {/* ── Right: summary + pay ── */}
        <aside className={styles.summary}>
          <h2>{t("bookCheckout.orderSummary")}</h2>
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
              <div className={styles.sumRow}><span>{t("bookCheckout.subtotal")}</span><span>{formatKES(subtotal)}</span></div>
              {cart?.summary?.couponDiscount > 0 && (
                <div className={styles.sumRow}><span>{t("bookCheckout.couponDiscount")}</span><span>− {formatKES(cart.summary.couponDiscount)}</span></div>
              )}
              <div className={styles.sumRow}><span>{t("bookCheckout.shipping")}</span><span>{shippingInfo ? (shippingCharge > 0 ? formatKES(shippingCharge) : t("bookCheckout.free")) : <em style={{ opacity: 0.55, fontStyle: "normal" }}>{t("bookCheckout.enterPin")}</em>}</span></div>
              <div className={`${styles.sumRow} ${styles.sumTotal}`}><span>{t("bookCheckout.total")}</span><span>{shippingInfo ? formatKES(total) : <em style={{ opacity: 0.55, fontStyle: "normal" }}>{t("bookCheckout.awaitingPin")}</em>}</span></div>
            </>
          )}

          {!shippingInfo && (
            <p className={styles.summaryNote}>{t("bookCheckout.enterPinAbove")}</p>
          )}

          {error && <p className={styles.payErr}>{error}</p>}

          <button className={styles.payBtn} onClick={handlePay} disabled={paying || subtotal === null || !shippingInfo}>
            {paying ? t("bookCheckout.processing") : shippingInfo ? t("bookCheckout.paySecurely", { amount: formatKES(total ?? 0) }) : t("bookCheckout.enterPinToContinue")}
          </button>
          <p className={styles.secureNote}><FaLock /> {t("bookCheckout.paymentsVia")}</p>
          <p className={styles.secureNote}><FaShieldHalved /> Books are reserved for 30 minutes while you pay. If you leave, the reservation is released automatically.</p>
        </aside>
      </div>
    </div>
  );
};

export default BookCheckout;