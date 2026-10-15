import React from 'react';

/**
 * Shared premium detail view for the reception Events / Workshops
 * registration modals: gradient hero (title, meta chips, status, seats
 * progress) + polished registrations list with avatar rows and a proper
 * empty state. Inline styles keep it self-contained next to the tab code.
 */

export function DetailHero({ eyebrow, title, sub, chips = [], statusBadge, filled = 0, capacity = 0 }) {
  const pct = capacity > 0 ? Math.max(0, Math.min(100, Math.round((filled / capacity) * 100))) : 0;
  const full = capacity > 0 && filled >= capacity;
  return (
    <div
      style={{
        borderRadius: 18, padding: '22px 22px 18px', marginBottom: 18, color: '#fff',
        background: 'linear-gradient(135deg, #1A0F0A 0%, #2D1B10 55%, #5A3A22 100%)',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 12px 32px rgba(45,20,6,0.25)',
      }}
    >
      <div style={{ position: 'absolute', right: -60, top: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(200,149,108,0.35) 0%, transparent 70%)' }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, background: 'linear-gradient(90deg, #C8956C, #F97316, transparent)' }} />
      <div style={{ fontSize: 10.5, letterSpacing: 3, textTransform: 'uppercase', color: '#C8956C', fontWeight: 800 }}>{eyebrow}</div>
      <div style={{ fontFamily: "'Inter',system-ui,sans-serif", fontSize: 26, fontWeight: 700, lineHeight: 1.2, marginTop: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: 12.5, color: 'rgba(232,220,207,0.85)', marginTop: 4 }}>{sub}</div>}
      {chips.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14, alignItems: 'center' }}>
          {chips.map((c, i) => (
            <span
              key={i}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 600,
                color: '#F5EDE4', border: '1.5px solid rgba(200,149,108,0.6)',
                padding: '4px 12px', borderRadius: 999, background: 'rgba(255,255,255,0.06)',
              }}
            >
              {c}
            </span>
          ))}
          {statusBadge}
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 11.5, color: 'rgba(232,220,207,0.85)', marginBottom: 6 }}>
          <span>{capacity > 0 ? `${filled} of ${capacity} seats filled` : `${filled} registered · unlimited seats`}</span>
          {capacity > 0 && <span style={{ fontWeight: 800, color: full ? '#FBBF24' : '#F5EDE4' }}>{full ? 'Full' : `${pct}%`}</span>}
        </div>
        {capacity > 0 && (
          <div style={{ height: 7, borderRadius: 99, background: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', borderRadius: 99, background: 'linear-gradient(90deg, #C8956C, #F97316)', transition: 'width 0.4s' }} />
          </div>
        )}
      </div>
    </div>
  );
}

export function RegAvatar({ name }) {
  const ch = (String(name || '?').trim().charAt(0) || '?').toUpperCase();
  return (
    <span
      style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, #2E7D5B, #81B29A)', color: '#fff',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, fontWeight: 800,
      }}
    >
      {ch}
    </span>
  );
}

export function RegRow({ name, meta, right }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
        border: '1px solid rgba(45,20,6,0.07)', borderRadius: 12, background: '#fff',
      }}
    >
      <RegAvatar name={name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#2D1406', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        {meta && <div style={{ fontSize: 11.5, color: '#7C6A58', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{meta}</div>}
      </div>
      {right && <div style={{ flexShrink: 0, textAlign: 'right' }}>{right}</div>}
    </div>
  );
}

export function EmptyRegs({ icon, title, hint, actionLabel, onAction }) {
  return (
    <div
      style={{
        textAlign: 'center', padding: '30px 20px', borderRadius: 14,
        border: '1px dashed rgba(46,125,91,0.35)',
        background: 'radial-gradient(90% 100% at 50% 0%, rgba(46,125,91,0.06) 0%, transparent 55%), #FFFBF4',
      }}
    >
      <div
        style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 56, height: 56, borderRadius: '50%', background: '#fff', color: '#2E7D5B',
          boxShadow: '0 6px 18px rgba(46,125,91,0.18), inset 0 0 0 1px rgba(46,125,91,0.12)',
          fontSize: 24, marginBottom: 10,
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#2D1406' }}>{title}</div>
      {hint && <div style={{ fontSize: 12, color: '#7C6A58', marginTop: 4 }}>{hint}</div>}
      {onAction && (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: 12, padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #2E7D5B, #F97316)', color: '#fff',
            fontSize: 12.5, fontWeight: 700,
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#7C6A58', margin: '0 0 10px' }}>
      {children}
    </div>
  );
}
