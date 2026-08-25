import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaBuildingColumns, FaTruckFast, FaEnvelopeOpenText } from "react-icons/fa6";
import { submitBulkEnquiry } from "../components/api/BookServices";
import { useScrollToSection } from "../hooks/useScrollToSection";
import styles from "./BulkOrders.module.css";

const BulkOrders = () => {
  useScrollToSection();

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
          <h1>Enquiry received!</h1>
          <p>Your reference number is <strong>{done.reference}</strong>.</p>
          <p className={styles.successSub}>Our team will contact you within 2 business days with pricing and dispatch details.</p>
          <button className={styles.primaryBtn} onClick={() => { setDone(null); setForm({ organisationName: "", contactPerson: "", email: "", phone: "", bookTitle: "", quantity: "", state: "", pincode: "", message: "" }); }}>
            Submit another enquiry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1>Bulk &amp; Institutional Orders</h1>
          <p className={styles.heroSub}>
            Stocking our books for your studio, school, library or organisation?
            Get wholesale pricing on orders of 10+ copies.
          </p>
        </div>
      </section>

      <section className={styles.perks}>
        <div className={styles.perk}><FaBuildingColumns /><span><strong>Institutions welcome</strong> — studios, schools, colleges, libraries</span></div>
        <div className={styles.perk}><FaTruckFast /><span><strong>Bulk dispatch</strong> — pan-India delivery options</span></div>
        <div className={styles.perk}><FaEnvelopeOpenText /><span><strong>2 business days</strong> — quote turnaround</span></div>
      </section>

      <section className={styles.formWrap}>
        <h2>Tell us what you need</h2>
        {error && <div className={styles.errorBox}>{error}</div>}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Organisation / studio name *</span>
              <input value={form.organisationName} onChange={set("organisationName")} required placeholder="e.g. Pragya Yoga Studio" />
            </label>
            <label className={styles.field}>
              <span>Contact person *</span>
              <input value={form.contactPerson} onChange={set("contactPerson")} required placeholder="e.g. Priya Sharma" />
            </label>
            <label className={styles.field}>
              <span>Email *</span>
              <input type="email" value={form.email} onChange={set("email")} required placeholder="you@email.com" />
            </label>
            <label className={styles.field}>
              <span>Mobile number *</span>
              <input value={form.phone} onChange={set("phone")} maxLength={10} required placeholder="10-digit mobile" />
            </label>
            <label className={styles.field}>
              <span>Book(s) of interest</span>
              <input value={form.bookTitle} onChange={set("bookTitle")} placeholder="e.g. The Confident Child" />
            </label>
            <label className={styles.field}>
              <span>Approximate quantity (min 10) *</span>
              <input type="number" min="10" value={form.quantity} onChange={set("quantity")} required placeholder="e.g. 50" />
            </label>
            <label className={styles.field}>
              <span>State</span>
              <input value={form.state} onChange={set("state")} placeholder="e.g. Bihar" />
            </label>
            <label className={styles.field}>
              <span>PIN code</span>
              <input value={form.pincode} onChange={set("pincode")} maxLength={6} placeholder="6-digit PIN" />
            </label>
          </div>
          <label className={styles.field}>
            <span>Message / requirements (optional)</span>
            <textarea value={form.message} onChange={set("message")} rows={4} placeholder="Customisation, delivery timelines, invoice needs…" />
          </label>
          <button type="submit" className={styles.submitBtn} disabled={loading}>
            {loading ? "Submitting…" : "Send enquiry"}
          </button>
        </form>
        <p className={styles.backLink}><Link to="/books">← Back to the bookstore</Link></p>
      </section>
    </div>
  );
};

export default BulkOrders;