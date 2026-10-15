import React from 'react';
import s from '../../Admin/YogaAdmin.module.css';
import { METHOD_META } from './paymentMethods.js';

/**
 * Professional counter-sale payment step: amount due, method, then the
 * proof field each method requires (reference ID for electronic payments,
 * nothing for cash), plus an optional note. Used by the Courses sell
 * modal and the Workshop booking modal.
 */
export default function PaymentFields({
  amountText,
  methods,
  method,
  onMethodChange,
  reference,
  onReferenceChange,
  note,
  onNoteChange,
}) {
  const meta = METHOD_META[method] || METHOD_META.Cash;
  return (
    <div>
      {amountText && (
        <div className={s.recPriceBox}>
          <div className={s.recPriceLabel}>Amount due</div>
          <div className={s.recPriceValue}>{amountText}</div>
        </div>
      )}
      <label className={s.fieldLabel} style={{ display: 'block', marginBottom: 10 }}>
        Payment method *
        <select
          value={method}
          onChange={(e) => onMethodChange?.(e.target.value)}
          className={s.searchInput}
          style={{ marginTop: 6, width: '100%' }}
        >
          {methods.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </label>
      {meta.refRequired ? (
        <label className={s.fieldLabel} style={{ display: 'block', marginBottom: 10 }}>
          {meta.refLabel} *
          <input
            value={reference}
            onChange={(e) => {
              const v = meta.uppercase ? e.target.value.toUpperCase() : e.target.value;
              onReferenceChange?.(v);
            }}
            placeholder={meta.refPlaceholder}
            maxLength={40}
            autoComplete="off"
            className={s.searchInput}
            style={{ marginTop: 6, width: '100%' }}
          />
          <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-3)', marginTop: 4, textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>
            {meta.refHint}
          </span>
        </label>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 10px' }}>{meta.refNote}</p>
      )}
      <label className={s.fieldLabel} style={{ display: 'block' }}>
        Note <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
        <input
          value={note}
          onChange={(e) => onNoteChange?.(e.target.value)}
          placeholder="e.g. split payment, till number…"
          maxLength={200}
          autoComplete="off"
          className={s.searchInput}
          style={{ marginTop: 6, width: '100%' }}
        />
      </label>
    </div>
  );
}
