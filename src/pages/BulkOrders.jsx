import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaBuildingColumns, FaTruckFast, FaEnvelopeOpenText } from "react-icons/fa6";
import { submitBulkEnquiry } from "../components/api/BookServices";
import { useScrollToSection } from "../hooks/useScrollToSection";
import { useTranslation } from "react-i18next";
import styles from "./BulkOrders.module.css";

const BulkOrders = () => {
  useScrollToSection();
  const { t } = useTranslation();

  const [form, setForm] = useState({
    organisationName: "", contactPerson: "", email: "", phone: "",
    bookTitle: "", quantity: "", state: "", pincode: "", message: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(null);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await submitBulkEnquiry(form);
      setDone(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className={styles.successPage}>
        <div className={styles.successCard}>
          <div className={styles.successIcon}>✓</div>
          <h1>{t("bulkOrders.successTitle")}</h1>
          <p>{t("bulkOrders.successRef", { ref: done.reference })}</p>
          <p className={styles.successSub}>{t("bulkOrders.successMsg")}</p>
          <button className={styles.primaryBtn} onClick={() => { setDone(null); setForm({ organisationName: "", contactPerson: "", email: "", phone: "", bookTitle: "", quantity: "", state: "", pincode: "", message: "" }); }}>
            {t("bulkOrders.submitAnother")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1>{t("bulkOrders.title")}</h1>
          <p className={styles.heroSub}>
            {t("bulkOrders.subtitle")}
          </p>
        </div>
      </section>

      <section className={styles.perks}>
        <div className={styles.perk}><FaBuildingColumns /><span><strong>{t("bulkOrders.institutionsWelcome")}</strong> — studios, schools, colleges, libraries</span></div>
        <div className={styles.perk}><FaTruckFast /><span><strong>{t("bulkOrders.bulkDispatch")}</strong> — pan-India delivery options</span></div>
        <div className={styles.perk}><FaEnvelopeOpenText /><span><strong>{t("bulkOrders.twoBusinessDays")}</strong> — quote turnaround</span></div>
      </section>

      <section className={styles.formWrap}>
        <h2>{t("bulkOrders.formTitle")}</h2>
        {error && <div className={styles.errorBox}>{error}</div>}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>{t("bulkOrders.orgName")}</span>
              <input value={form.organisationName} onChange={set("organisationName")} required placeholder={t("bulkOrders.orgPlaceholder")} />
            </label>
            <label className={styles.field}>
              <span>{t("bulkOrders.contactPerson")}</span>
              <input value={form.contactPerson} onChange={set("contactPerson")} required placeholder={t("bulkOrders.contactPlaceholder")} />
            </label>
            <label className={styles.field}>
              <span>{t("bulkOrders.email")}</span>
              <input type="email" value={form.email} onChange={set("email")} required placeholder="you@email.com" />
            </label>
            <label className={styles.field}>
              <span>{t("bulkOrders.phone")}</span>
              <input value={form.phone} onChange={set("phone")} maxLength={10} required placeholder="10-digit mobile" />
            </label>
            <label className={styles.field}>
              <span>{t("bulkOrders.bookTitle")}</span>
              <input value={form.bookTitle} onChange={set("bookTitle")} placeholder={t("bulkOrders.booksPlaceholder")} />
            </label>
            <label className={styles.field}>
              <span>{t("bulkOrders.quantity")}</span>
              <input type="number" min="10" value={form.quantity} onChange={set("quantity")} required placeholder={t("bulkOrders.quantityPlaceholder")} />
            </label>
            <label className={styles.field}>
              <span>{t("bulkOrders.deliveryAddress")}</span>
              <input value={form.state} onChange={set("state")} placeholder={t("bulkOrders.addressPlaceholder")} />
            </label>
            <label className={styles.field}>
              <span>{t("bulkOrders.notes")}</span>
              <textarea value={form.message} onChange={set("message")} rows={4} placeholder={t("bulkOrders.notesPlaceholder")} />
            </label>
          </div>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? t("bulkOrders.submitting") : t("bulkOrders.sendEnquiry")}
          </button>
        </form>
        <p className={styles.backLink}><Link to="/books">{t("bulkOrders.backToStore")}</Link></p>
      </section>
    </div>
  );
};

export default BulkOrders;
