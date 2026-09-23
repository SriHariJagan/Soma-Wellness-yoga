import React, { useMemo } from 'react';
import { COUNTRIES, DEFAULT_COUNTRY_CODE, getCountryByCode, parsePhone, stripNonDigits, validatePhone } from '../../lib/phone.js';

export default function PhoneInput({
  value = '',
  onChange,
  onCountryChange,
  defaultCountry = DEFAULT_COUNTRY_CODE,
  required = false,
  disabled = false,
  placeholder,
  label,
  error,
  id,
  autoComplete = 'tel',
  style,
}) {
  const parsed = useMemo(() => parsePhone(value, defaultCountry), [value, defaultCountry]);
  const country = getCountryByCode(parsed.countryCode);
  const nationalNumber = parsed.nationalNumber;

  const handleCountry = (e) => {
    const newCode = e.target.value;
    const newFull = `${newCode}${nationalNumber}`;
    onChange?.(newFull);
    onCountryChange?.(newCode);
  };

  const handleNumber = (e) => {
    let raw = e.target.value.replace(/\D/g, '');
    const c = getCountryByCode(country.code);
    const max = c.maxDigits ?? c.digits ?? 9;
    if (raw.length > max) raw = raw.slice(0, max);
    // Strip leading 0 for Kenya automatically
    if (country.code === '+254' && raw.startsWith('0')) raw = raw.slice(1);
    const newFull = `${country.code}${raw}`;
    onChange?.(newFull);
  };

  const validationError = error || (value ? validatePhone(value, country.code) : null);
  const showError = !!validationError && !!value;

  const maxLen = country.maxDigits ?? country.digits ?? 9;

  return (
    <div style={{ width: '100%', ...style }}>
      {label && (
        <label htmlFor={id} style={{ display: 'block', fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#7C6A58', marginBottom: 6 }}>
          {label}{required && <span style={{ color: '#DC2626' }}> *</span>}
        </label>
      )}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          border: `1.5px solid ${showError ? '#DC2626' : 'rgba(45,20,6,0.08)'}`,
          borderRadius: 10,
          background: disabled ? '#F8F4EC' : '#ffffff',
          overflow: 'hidden',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocusCapture={(e) => {
          const el = e.currentTarget;
          el.style.borderColor = showError ? '#DC2626' : '#2E7D5B';
          el.style.boxShadow = showError ? '0 0 0 3px rgba(220,38,38,0.10)' : '0 0 0 3px rgba(46,125,91,0.10)';
        }}
        onBlurCapture={(e) => {
          const el = e.currentTarget;
          el.style.borderColor = showError ? '#DC2626' : 'rgba(45,20,6,0.08)';
          el.style.boxShadow = 'none';
        }}
      >
        <select
          value={country.code}
          onChange={handleCountry}
          disabled={disabled}
          aria-label="Country code"
          style={{
            border: 'none',
            background: '#FFF9F0',
            padding: '10px 8px 10px 10px',
            fontSize: 13,
            fontWeight: 600,
            color: '#2D1406',
            outline: 'none',
            cursor: 'pointer',
            borderRight: '1px solid rgba(45,20,6,0.08)',
            minWidth: 110,
          }}
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.code} {c.iso === 'KE' ? '' : `(${c.name})`}
            </option>
          ))}
        </select>
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete={autoComplete}
          value={nationalNumber}
          onChange={handleNumber}
          placeholder={placeholder || country.placeholder || (country.code === '+254' ? '712 345 678' : '')}
          required={required}
          disabled={disabled}
          maxLength={maxLen}
          aria-label={label || 'Phone number'}
          style={{
            flex: 1,
            border: 'none',
            padding: '10px 12px',
            fontSize: 14,
            fontWeight: 500,
            color: '#2D1406',
            outline: 'none',
            background: 'transparent',
            fontFamily: 'var(--font-body, Manrope, sans-serif)',
          }}
        />
        <span style={{ paddingRight: 10, fontSize: 11, color: nationalNumber.length === maxLen ? '#16A34A' : '#9C8E7C', fontWeight: 600, whiteSpace: 'nowrap' }}>
          {nationalNumber.length}/{maxLen}
        </span>
      </div>
      {showError ? (
        <div style={{ fontSize: 11, color: '#DC2626', marginTop: 6, fontWeight: 500 }}>{validationError}</div>
      ) : (
        <div style={{ fontSize: 11, color: '#9C8E7C', marginTop: 6 }}>
          Default Kenya (+254) — enter exactly {maxLen} digits{memoCountryHint(country)}
        </div>
      )}
    </div>
  );
}

function memoCountryHint(c) {
  if (c.code === '+254') return ' (e.g. 712 345 678)';
  return '';
}
