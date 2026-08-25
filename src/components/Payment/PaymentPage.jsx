import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './PaymentPage.css';

// In dev the Vite proxy forwards /api → localhost:5000, so relative URLs work.
// In production, set VITE_RAZORPAY_KEY_ID + VITE_API_URL in your hosting dashboard.
const API_URL = import.meta.env.VITE_API_URL || '';
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID;

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
};

// Pull the first rupee number out of a price label like "₹2,000 / Month".
// Returns 0 when there is no payable amount (e.g. "Contact for pricing").
const parseRupees = (price) => {
  if (!price) return 0;
  const digits = String(price).replace(/[^0-9.]/g, '');
  const value = parseFloat(digits);
  return Number.isFinite(value) ? value : 0;
};

// Inject the Razorpay Standard Checkout script once, on demand.
const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function PaymentPage() {
  const { state } = useLocation();
  const navigate  = useNavigate();

  // Course data passed via router state
  const course = state || { name: '', price: '', time: '' };
  const rupees   = parseRupees(course.price);
  const payable  = rupees > 0; // "Contact for pricing" → enquiry only

  const [form, setForm] = useState({
    name: '', email: '', phone: '', city: '', message: '',
  });

  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState('');

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  // Save the booking to the backend after a verified payment (or as an enquiry).
  const saveBooking = async ({ paymentMethod, transactionId, status }) => {
    const res = await fetch(`${API_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        courseName:  course.name,
        coursePrice: course.price,
        courseTime:  course.time,
        paymentMethod,
        transactionId,
        status,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Booking failed.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name || !form.email || !form.phone) {
      setError('Name, email and phone are required.');
      return;
    }

    // No payable amount → record an enquiry, team confirms manually.
    if (!payable) {
      setLoading(true);
      try {
        await saveBooking({ paymentMethod: 'Cash', transactionId: '', status: 'Pending' });
        setSuccess(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error('Could not load Razorpay. Check your connection and try again.');
      if (!RAZORPAY_KEY_ID) throw new Error('Payment is not configured. Please contact support.');

      // 1) Create an order on the backend (amount in paise).
      const orderRes = await fetch(`${API_URL}/api/create-order`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          items: [{ itemType: 'booking', itemId: 'booking', quantity: 1, unitPrice: Math.round(rupees * 100) }],
          label: course.name,
          description: `Booking for ${course.name}`,
        }),
      });
      const order = await orderRes.json();
      if (!orderRes.ok || !order.order_id) {
        throw new Error(order.message || 'Could not start payment.');
      }

      // 2) Open the Razorpay Standard Checkout modal.
      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'Pragya Yoga',
        description: course.name,
        order_id: order.order_id,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        theme: { color: '#7a5cff' },
        // 3) Verify the signature on the backend before confirming.
        handler: async (response) => {
          try {
            const verifyRes = await fetch(`${API_URL}/api/verify-payment`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
              }),
            });
            const verify = await verifyRes.json();
            if (!verifyRes.ok || !verify.success) {
              throw new Error(verify.message || 'Payment could not be verified.');
            }
            // Booking save is best-effort; payment is already verified.
            try {
              await saveBooking({
                paymentMethod: 'Card',
                transactionId: response.razorpay_payment_id,
                status: 'Confirmed',
              });
            } catch (bookingErr) {
              console.warn('Booking save failed (DB may be offline):', bookingErr.message);
            }
            setSuccess(true);
          } catch (err) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          // User closed the modal without paying.
          ondismiss: () => {
            setLoading(false);
            setError('Payment cancelled. You can try again whenever you are ready.');
          },
        },
      });

      rzp.on('payment.failed', (resp) => {
        setLoading(false);
        setError(resp?.error?.description || 'Payment failed. Please try again.');
      });

      rzp.open();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // ── Success Screen ──
  if (success) {
    return (
      <div className="pay-shell">
        <div className="pay-success">
          <div className="pay-success-icon">🙏</div>
          <h2>{payable ? 'Payment Successful!' : 'Booking Received!'}</h2>
          <p>Thank you, <strong>{form.name}</strong>. Your booking for <strong>{course.name}</strong> has been {payable ? 'confirmed' : 'received'}.</p>
          <p className="pay-success-sub">
            {payable
              ? <>A confirmation will be sent to <strong>{form.email}</strong>.</>
              : <>Our team will contact you at <strong>{form.phone}</strong> to confirm your slot.</>}
          </p>
          <button className="pay-btn" onClick={() => navigate('/')}>← Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pay-shell">
      <div className="pay-container">

        {/* ── Left: Course Summary ── */}
        <div className="pay-summary">
          <div className="pay-logo"><img src="/images/soma/logo.png" alt="Soma Wellness" width="32" height="32" style={{ objectFit: "contain", verticalAlign: "middle", marginRight: 8 }} /> Pragya Yoga</div>
          <h2 className="pay-summary-title">Booking Summary</h2>

          <div className="pay-course-card">
            <div className="pay-course-label">Selected Course</div>
            <div className="pay-course-name">{course.name || 'No course selected'}</div>
            {course.time && <div className="pay-course-meta">🕐 {course.time}</div>}
            <div className="pay-course-price">{course.price}</div>
          </div>

          <div className="pay-info-block">
            <div className="pay-info-row">
              <span>Payment Status</span>
              <span className="pay-badge">{payable ? 'Pay Now' : 'On Enquiry'}</span>
            </div>
            <div className="pay-info-row">
              <span>Confirmation</span>
              <span>{payable ? 'Instant' : 'Via Phone / Email'}</span>
            </div>
          </div>

          {payable && (
            <div className="pay-upi-box">
              <div className="pay-upi-label">Secure Online Payment</div>
              <div className="pay-upi-note">
                Pay securely via UPI, Card, Net Banking or Wallet — powered by Razorpay.
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Student Form ── */}
        <div className="pay-form-wrap">
          <h2 className="pay-form-title">Your Details</h2>
          <p className="pay-form-sub">
            {payable ? 'Fill in your information, then pay to confirm your booking' : 'Fill in your information to send an enquiry'}
          </p>

          {error && (
            <div className="pay-error">⚠️ {error}</div>
          )}

          <form onSubmit={handleSubmit} className="pay-form">
            <div className="pay-field-group">
              <label>Full Name *</label>
              <input type="text" placeholder="e.g. Priya Sharma" value={form.name} onChange={set('name')} required />
            </div>

            <div className="pay-row">
              <div className="pay-field-group">
                <label>Email Address *</label>
                <input type="email" placeholder="you@email.com" value={form.email} onChange={set('email')} required />
              </div>
              <div className="pay-field-group">
                <label>Phone Number *</label>
                <input type="text" placeholder="9XXXXXXXXX" value={form.phone} onChange={set('phone')} required />
              </div>
            </div>

            <div className="pay-field-group">
              <label>City</label>
              <input type="text" placeholder="e.g. Patna" value={form.city} onChange={set('city')} />
            </div>

            <div className="pay-field-group">
              <label>Message / Special Request <span style={{ color: '#888', fontWeight: 400 }}>(optional)</span></label>
              <textarea placeholder="Any health conditions, preferences or questions…" value={form.message} onChange={set('message')} rows={3} />
            </div>

            {/* Read-only course confirmation */}
            <div className="pay-confirm-row">
              <span>Booking for:</span>
              <strong>{course.name}</strong>
            </div>
            <div className="pay-confirm-row">
              <span>Fee:</span>
              <strong className="pay-confirm-price">{course.price}</strong>
            </div>

            <button type="submit" className="pay-btn pay-btn-full" disabled={loading}>
              {loading
                ? 'Processing…'
                : payable
                  ? `Pay ${course.price?.split('/')[0]?.trim() || ''} & Book 🙏`
                  : 'Send Enquiry 🙏'}
            </button>

            <button type="button" className="pay-back-link" onClick={() => navigate(-1)}>
              ← Back to Courses
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
