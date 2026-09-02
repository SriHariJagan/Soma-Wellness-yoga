import React, { useState, useEffect, useRef } from 'react';

const FIELD_ERR = {
  name: 'Please enter your full name (at least 2 characters).',
  email: 'Please enter a valid email address.',
  phone: 'Please enter a valid phone number.',
  message: 'Please enter a message of at least 10 characters.',
};

function validate({ name, email, phone, message }) {
  const e = {};
  if (!name || name.trim().length < 2) e.name = FIELD_ERR.name;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = FIELD_ERR.email;
  if (!phone || !/^[+\d][\d\s\-()]{6,19}$/.test(phone.trim())) e.phone = FIELD_ERR.phone;
  if (!message || message.trim().length < 10) e.message = FIELD_ERR.message;
  return e;
}

const ChatbotEnquiryForm = ({
  initialInterestedType = 'general',
  initialInterestedItem = '',
  initialInterestedItemId = '',
  onSubmit,
  onCancel,
  loading = false,
  serverError = '',
}) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    interestedType: initialInterestedType,
    interestedItem: initialInterestedItem,
    message: '',
  });
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const firstRef = useRef(null);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      interestedType: initialInterestedType,
      interestedItem: initialInterestedItem,
    }));
  }, [initialInterestedType, initialInterestedItem]);

  useEffect(() => {
    firstRef.current?.focus();
  }, []);

  useEffect(() => {
    setErrors(validate(form));
  }, [form]);

  const hasErrors = Object.keys(validate(form)).length > 0;
  const show = (k) => touched[k] && errors[k];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleBlur = (e) => setTouched((t) => ({ ...t, [e.target.name]: true }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    setTouched({ name: true, email: true, phone: true, message: true });
    if (Object.keys(v).length > 0) return;
    onSubmit?.({
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      phone: form.phone.trim(),
      interestedType: form.interestedType || 'general',
      interestedItem: form.interestedItem?.trim() || '',
      interestedItemId: initialInterestedItemId || '',
      message: form.message.trim(),
    });
  };

  return (
    <form className="soma-cb-form" onSubmit={handleSubmit} noValidate aria-label="Enquiry form">
      {form.interestedItem && (
        <div className="soma-cb-form-context" role="note" aria-label="Enquiry context">
          <span className="soma-cb-form-context-dot" aria-hidden="true" />
          Enquiring about <strong>{form.interestedItem}</strong>
          <span className="soma-cb-form-context-type">· {form.interestedType}</span>
        </div>
      )}

      <div className="soma-cb-field">
        <label htmlFor="soma-cb-name">Name *</label>
        <input
          ref={firstRef}
          id="soma-cb-name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Your full name"
          value={form.name}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={!!show('name')}
          aria-describedby={show('name') ? 'soma-cb-err-name' : undefined}
          required
        />
        {show('name') && <p id="soma-cb-err-name" className="soma-cb-field-err" role="alert">{errors.name}</p>}
      </div>

      <div className="soma-cb-field">
        <label htmlFor="soma-cb-email">Email *</label>
        <input
          id="soma-cb-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={!!show('email')}
          aria-describedby={show('email') ? 'soma-cb-err-email' : undefined}
          required
        />
        {show('email') && <p id="soma-cb-err-email" className="soma-cb-field-err" role="alert">{errors.email}</p>}
      </div>

      <div className="soma-cb-field">
        <label htmlFor="soma-cb-phone">Phone *</label>
        <input
          id="soma-cb-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+254 7XX XXX XXX"
          value={form.phone}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={!!show('phone')}
          aria-describedby={show('phone') ? 'soma-cb-err-phone' : undefined}
          required
        />
        {show('phone') && <p id="soma-cb-err-phone" className="soma-cb-field-err" role="alert">{errors.phone}</p>}
      </div>

      <div className="soma-cb-field">
        <label htmlFor="soma-cb-interest">Interested in</label>
        <select
          id="soma-cb-interest"
          name="interestedType"
          value={form.interestedType}
          onChange={handleChange}
          aria-label="Interested in"
        >
          <option value="general">General enquiry</option>
          <option value="course">Course</option>
          <option value="program">Program</option>
          <option value="package">Package / Membership</option>
        </select>
      </div>

      {form.interestedType !== 'general' && !form.interestedItem && (
        <div className="soma-cb-field">
          <label htmlFor="soma-cb-item">Course / Program name</label>
          <input
            id="soma-cb-item"
            name="interestedItem"
            type="text"
            placeholder="e.g. SOMA 200 — Yoga Teacher Training"
            value={form.interestedItem}
            onChange={handleChange}
          />
        </div>
      )}

      <div className="soma-cb-field">
        <label htmlFor="soma-cb-message">Message *</label>
        <textarea
          id="soma-cb-message"
          name="message"
          rows={3}
          placeholder="How can we help you?"
          value={form.message}
          onChange={handleChange}
          onBlur={handleBlur}
          aria-invalid={!!show('message')}
          aria-describedby={show('message') ? 'soma-cb-err-message' : undefined}
          required
        />
        {show('message') && <p id="soma-cb-err-message" className="soma-cb-field-err" role="alert">{errors.message}</p>}
        <span className="soma-cb-field-hint">{form.message.length}/2000</span>
      </div>

      {serverError && (
        <div className="soma-cb-form-server-err" role="alert">
          {serverError}
        </div>
      )}

      <div className="soma-cb-form-actions">
        <button
          type="submit"
          className="soma-cb-btn-primary"
          disabled={loading || hasErrors}
          aria-busy={loading}
        >
          {loading ? 'Sending…' : 'Send enquiry'}
        </button>
        <button type="button" className="soma-cb-btn-ghost" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
      </div>

      <p className="soma-cb-form-footnote">
        By submitting, you agree to be contacted by Soma Wellness about your enquiry.
      </p>
    </form>
  );
};

export default ChatbotEnquiryForm;
