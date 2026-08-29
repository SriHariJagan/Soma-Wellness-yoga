import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { addToCart, showToast, notifyCartUpdate } from "../../utils/payment";
import CheckoutGate from "../checkout/CheckoutGate.jsx";
import "./EnrollModal.css";

export default function EnrollModal({ service, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  if (!service) return null;

  const user = isLoggedIn() ? JSON.parse(localStorage.getItem("user") || "{}") : null;
  const price = service.price || 0;
  const isFree = price === 0;

  const doEnroll = async () => {
    setLoading(true);
    try {
      await addToCart("service", service._id);
      setAdded(true);
      showToast(t("cart.itemAdded"), "success");
      notifyCartUpdate();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    // kept for backward compat — now gated via CheckoutGate; direct call assumes authed
    return doEnroll();
  };

  const doPayNow = () => {
    navigate("/payment", {
      state: {
        name: service.name,
        price: `KES ${price.toLocaleString()}`,
        time: service.scheduleTime || "",
        serviceId: service._id,
        type: "service",
      },
    });
  };

  const handlePayNow = () => doPayNow();

  const handleGoToCart = () => {
    navigate("/studentdashboard?tab=cart");
  };

  return (
    <div className="enroll-overlay" onClick={onClose}>
      <div className="enroll-modal" onClick={(e) => e.stopPropagation()}>
        <button className="enroll-close" onClick={onClose}>✕</button>

        <div className="enroll-header">
          <span className={`enroll-badge ${service.mode || "online"}`}>
            {service.mode === "online" ? t("services.online") : service.mode === "center" ? t("services.offline") : t("services.hybrid")}
          </span>
          <h2>{service.name}</h2>
          <p className="enroll-desc">{service.description}</p>
        </div>

        <div className="enroll-details">
          {service.sessionDuration && (
            <div className="enroll-detail">
              <span className="enroll-detail-label">{t("services.duration", { duration: service.sessionDuration })}</span>
            </div>
          )}
          {service.totalSessions > 0 && (
            <div className="enroll-detail">
              <span className="enroll-detail-label">{t("services.sessions", { count: service.totalSessions })}</span>
            </div>
          )}
          {service.instructor && (
            <div className="enroll-detail">
              <span className="enroll-detail-label">{t("services.instructor")}: {service.instructor?.name || service.instructor}</span>
            </div>
          )}
          {service.scheduleTime && (
            <div className="enroll-detail">
              <span className="enroll-detail-label">{t("services.schedule")}: {service.scheduleTime}</span>
            </div>
          )}
        </div>

        <div className="enroll-price">
          {isFree ? (
            <span className="enroll-price-free">{t("payment.freeItem")}</span>
          ) : (
            <>
              <span className="enroll-price-amount">KES {price.toLocaleString()}</span>
              <span className="enroll-price-period">{t("services.perMonth")}</span>
            </>
          )}
        </div>

        {added ? (
          <div className="enroll-actions">
            <div className="enroll-added">✓ {t("cart.itemAdded")}</div>
            <button className="enroll-btn enroll-btn-primary" onClick={handleGoToCart}>
              {t("cart.proceedCheckout")}
            </button>
            <button className="enroll-btn enroll-btn-secondary" onClick={onClose}>
              {t("cart.continueShopping")}
            </button>
          </div>
        ) : (
          <div className="enroll-actions">
            <CheckoutGate
              intent={{ name: service.name, price: `KES ${price.toLocaleString()}`, sub: service.scheduleTime || service.description?.slice(0,80), type: 'service', itemType: 'service', itemId: service._id }}
              onProceed={doEnroll}
            >
              <button className="enroll-btn enroll-btn-primary" disabled={loading}>
                {loading ? t("payment.processing") : t("services.addCart")}
              </button>
            </CheckoutGate>
            {!isFree && (
              <CheckoutGate
                intent={{ name: service.name, price: `KES ${price.toLocaleString()}`, sub: service.scheduleTime || '', type: 'service', itemType: 'service', itemId: service._id }}
                onProceed={doPayNow}
              >
                <button className="enroll-btn enroll-btn-accent">
                  {t("payment.payNow")}
                </button>
              </CheckoutGate>
            )}
            <button className="enroll-btn enroll-btn-ghost" onClick={onClose}>
              {t("common.cancel")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
