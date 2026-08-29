import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MpesaCheckout from './MpesaCheckout';
import { parsePrice, openRazorpayCheckout, createRazorpayOrder, isLoggedIn } from '../../utils/payment';
import CheckoutGate from '../checkout/CheckoutGate.jsx';
import './PaymentPage.css';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function PaymentPage() {
  const { t } = useTranslation();
  const { state } = useLocation();
  const navigate = useNavigate();

  const course = state || { name: '', price: '', time: '' };
  const amount = parsePrice(course.price);
  const payable = amount > 0;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('razorpay');

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const saveBooking = async ({ paymentMethod, transactionId, status }) => {
    const res = await fetch(`${API_URL}/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        courseName: course.name,
        coursePrice: course.price,
        courseTime: course.time,
        paymentMethod,
        transactionId,
        status,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || t('payment.bookingFailed'));
  };

  const doPay = async () => {
    setError('');
    if (!form.name || !form.email || !form.phone) {
      setError(t('payment.nameEmailRequired'));
      return;
    }
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
      const order = await createRazorpayOrder({
        items: [{ itemType: 'booking', itemId: 'booking', quantity: 1, unitPrice: Math.round(amount * 100) }],
        label: course.name,
        description: `Booking for ${course.name}`,
      });
      await openRazorpayCheckout({
        amount: order.amount,
        currency: order.currency,
        orderId: order.order_id,
        name: 'Soma Wellness',
        description: course.name,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        onSuccess: async (response) => {
          try {
            await saveBooking({ paymentMethod: 'Card', transactionId: response.razorpay_payment_id, status: 'Confirmed' });
            setSuccess(true);
          } catch (err) {
            setError(err.message || t('payment.paymentFailed'));
          }
          setLoading(false);
        },
        onDismiss: () => { setLoading(false); setError(t('payment.paymentCancelled')); },
        onError: (err) => { setLoading(false); setError(err.description || err.message || t('payment.paymentFailed')); },
      });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handlePay = async () => {
    if (!isLoggedIn()) {
      // will be handled by CheckoutGate wrapper — this is fallback for programmatic calls
      return doPay();
    }
    return doPay();
  };

  /* ── Success ── */
  if (success) {
    const isStudent = JSON.parse(localStorage.getItem('user') || '{}')?.role === 'student';
    const dashboardPath = isStudent ? '/studentdashboard' : '/yogaadmin';
    return (
      <div className="pay-shell">
        <div className="pay-success">
          <div className="pay-success-icon">✓</div>
          <h2>{payable ? t('payment.paymentSuccessful') : t('payment.bookingReceived')}</h2>
          <p>{t('payment.thankYou', { name: form.name })}</p>
          <p className="pay-success-sub">
            {payable ? t('payment.bookingConfirmed', { course: course.name }) : t('payment.bookingReceivedMsg', { course: course.name })}
          </p>
          {course.founding && (
            <div style={{ background:'rgba(24,61,45,0.06)', border:'1px solid rgba(46,125,91,0.15)', borderRadius:12, padding:'12px 16px', margin:'12px 0', fontSize:13, color:'var(--soma-forest)', fontWeight:600, textAlign:'center' }}>
              ◈ Your founding rate of <strong>{course.price}</strong> is locked for {course.time}
            </div>
          )}
          <button className="pay-btn" onClick={() => navigate(dashboardPath)} style={{ marginBottom:8 }}>
            Go to Dashboard →
          </button>
          <button className="pay-btn-ghost" onClick={() => navigate('/')}>
            {t('payment.backToHome')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pay-shell">
      <div className="pay-card">

        {/* ── Header ── */}
        <div className="pay-header">
          <div className="pay-logo">
            <img src="/images/soma/logo.png" alt="Soma Wellness" width="24" height="24" style={{ objectFit: "contain" }} />
            <span>Soma Wellness</span>
          </div>
          <button className="pay-close" onClick={() => navigate(-1)}>✕</button>
        </div>

        {/* ── Progress Steps ── */}
        <div className="pay-steps">
          {['Method', 'Details', 'Pay'].map((label, i) => {
            const num = i + 1;
            const active = step === num;
            const done = step > num;
            return (
              <React.Fragment key={label}>
                <div className={`pay-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
                  <span className="pay-step-num">{done ? '✓' : num}</span>
                  <span className="pay-step-label">{label}</span>
                </div>
                {i < 2 && <div className={`pay-step-line ${step > num ? 'done' : ''}`} />}
              </React.Fragment>
            );
          })}
        </div>

        {error && <div className="pay-error">{error}</div>}

        {/* ═══════════ STEP 1: Payment Method ═══════════ */}
        {step === 1 && (
          <div className="pay-step-content">
            <h2 className="pay-step-title">{t('payment.selectPaymentMethod')}</h2>
            <p className="pay-step-sub">{t('payment.secureNote')}</p>

            {payable ? (
              <div className="pay-method-grid">
                <button
                  className={`pay-method-card ${paymentMethod === 'razorpay' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('razorpay')}
                >
                  <div className="pmc-icon">💳</div>
                  <div className="pmc-name">Card / UPI / Net Banking</div>
                  <div className="pmc-desc">Visa · Mastercard · UPI</div>
                  <span className="pmc-check">{paymentMethod === 'razorpay' ? '✓' : ''}</span>
                </button>
                <button
                  className={`pay-method-card ${paymentMethod === 'mpesa' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('mpesa')}
                >
                  <div className="pmc-icon">📱</div>
                  <div className="pmc-name">M-PESA</div>
                  <div className="pmc-desc">Safaricom · Lipa Na M-PESA</div>
                  <span className="pmc-check">{paymentMethod === 'mpesa' ? '✓' : ''}</span>
                </button>
              </div>
            ) : (
              <div className="pay-free-badge">
                <span className="pay-free-icon">✓</span>
                <div>
                  <div className="pay-free-title">{t('payment.freeItem')}</div>
                  <div className="pay-free-desc">No payment required — just confirm your details</div>
                </div>
              </div>
            )}

            <div className="pay-summary-strip">
              <div className="pay-summary-item">
                <span className="psi-label">{course.name || '—'}</span>
                <span className="psi-price">{course.price || 'Free'}</span>
              </div>
              {course.time && <div className="pay-summary-meta">{course.time}</div>}
            </div>

            <div className="pay-nav">
              <button className="pay-btn-ghost" onClick={() => navigate(-1)}>{t('payment.backToCourses')}</button>
              <button className="pay-btn" onClick={() => setStep(2)}>
                {payable ? 'Continue' : 'Continue'} →
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 2: Details ═══════════ */}
        {step === 2 && (
          <div className="pay-step-content">
            <h2 className="pay-step-title">{t('payment.yourDetails')}</h2>
            <p className="pay-step-sub">{payable ? t('payment.fillInfo') : t('payment.fillInfoEnquiry')}</p>

            <div className="pay-form">
              <div className="pay-field-group">
                <label>{t('payment.fullName')} *</label>
                <input type="text" placeholder={t('payment.fullNamePlaceholder')} value={form.name} onChange={set('name')} />
              </div>
              <div className="pay-row">
                <div className="pay-field-group">
                  <label>{t('payment.emailAddress')} *</label>
                  <input type="email" placeholder={t('payment.emailPlaceholder')} value={form.email} onChange={set('email')} />
                </div>
                <div className="pay-field-group">
                  <label>{t('payment.phoneNumber')} *</label>
                  <input type="tel" placeholder={t('payment.phonePlaceholder')} value={form.phone} onChange={set('phone')} />
                </div>
              </div>
              <div className="pay-field-group">
                <label>{t('payment.city')}</label>
                <input type="text" placeholder={t('payment.cityPlaceholder')} value={form.city} onChange={set('city')} />
              </div>
              <div className="pay-field-group">
                <label>{t('payment.messageOptional')}</label>
                <textarea placeholder={t('payment.messagePlaceholder')} value={form.message} onChange={set('message')} rows={2} />
              </div>
            </div>

            <div className="pay-nav">
              <button className="pay-btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button
                className="pay-btn"
                onClick={() => {
                  if (!form.name || !form.email || !form.phone) { setError(t('payment.nameEmailRequired')); return; }
                  setError('');
                  setStep(3);
                }}
              >
                Review & Pay →
              </button>
            </div>
          </div>
        )}

        {/* ═══════════ STEP 3: Pay ═══════════ */}
        {step === 3 && (
          <div className="pay-step-content">
            <h2 className="pay-step-title">Confirm & Pay</h2>
            <p className="pay-step-sub">Review your booking and complete payment</p>

            <div className="pay-review">
              <div className="pay-review-row">
                <span>Booking</span><strong>{course.name}</strong>
              </div>
              {course.time && <div className="pay-review-row"><span>Schedule</span><strong>{course.time}</strong></div>}
              <div className="pay-review-row">
                <span>Name</span><strong>{form.name}</strong>
              </div>
              <div className="pay-review-row">
                <span>Email</span><strong>{form.email}</strong>
              </div>
              <div className="pay-review-row">
                <span>Phone</span><strong>{form.phone}</strong>
              </div>
              <div className="pay-review-total">
                <span>{t('payment.fee')}</span>
                <strong>{course.price || 'Free'}</strong>
              </div>
            </div>

            {payable && paymentMethod === 'mpesa' ? (
              isLoggedIn() ? (
                <MpesaCheckout
                  amount={amount}
                  accountRef={course.name}
                  description={`Booking: ${course.name}`}
                  onSuccess={() => { setLoading(false); setSuccess(true); }}
                  onError={(err) => { setLoading(false); setError(err.message || t('payment.paymentFailed')); }}
                />
              ) : (
                <CheckoutGate intent={{ name: course.name, price: course.price, sub: course.time, type: 'booking' }} onProceed={doPay}>
                  <button className="pay-btn pay-btn-full" disabled={loading}>
                    {loading ? t('payment.processing') : t('payment.payAmount', { amount: course.price?.split('/')[0]?.trim() || '' })}
                  </button>
                </CheckoutGate>
              )
            ) : isLoggedIn() ? (
              <button className="pay-btn pay-btn-full" onClick={doPay} disabled={loading}>
                {loading
                  ? t('payment.processing')
                  : payable
                    ? t('payment.payAmount', { amount: course.price?.split('/')[0]?.trim() || '' })
                    : t('payment.sendEnquiryConfirm')}
              </button>
            ) : (
              <CheckoutGate intent={{ name: course.name, price: course.price || 'Free', sub: course.time, type: 'booking' }} onProceed={doPay}>
                <button className="pay-btn pay-btn-full" disabled={loading}>
                  {loading
                    ? t('payment.processing')
                    : payable
                      ? t('payment.payAmount', { amount: course.price?.split('/')[0]?.trim() || '' })
                      : t('payment.sendEnquiryConfirm')}
                </button>
              </CheckoutGate>
            )}

            <button className="pay-btn-ghost" onClick={() => setStep(2)}>← Change details</button>
          </div>
        )}
      </div>
    </div>
  );
}
