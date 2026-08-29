import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import s from '../YogaAdmin.module.css';

/* ── Animated counter ───────────────────────────────────────── */
export function Counter({ value = 0, prefix = '', suffix = '', duration = 900 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef();
  const target = Number(value) || 0;

  useEffect(() => {
    const start = performance.now();
    const from = 0;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return <>{prefix}{display.toLocaleString('en-KE')}{suffix}</>;
}

/* ── Sparkline (smooth area) ────────────────────────────────── */
export function Sparkline({ data = [], color = '#F97316', height = 38, width = 120, fill = true }) {
  const pts = data.length ? data : [4, 6, 5, 8, 7, 10, 9, 12];
  const max = Math.max(...pts), min = Math.min(...pts);
  const range = max - min || 1;
  const step = width / (pts.length - 1);
  const coords = pts.map((v, i) => [i * step, height - ((v - min) / range) * (height - 6) - 3]);
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  const id = `sg-${color.replace('#', '')}-${pts.length}`;
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {fill && <path d={area} fill={`url(#${id})`} />}
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Mini bar chart ─────────────────────────────────────────── */
export function MiniBars({ data = [], color = '#81B29A', height = 38 }) {
  const pts = data.length ? data : [5, 8, 6, 9, 7, 11, 10];
  const max = Math.max(...pts) || 1;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
      {pts.map((v, i) => (
        <div key={i} style={{
          flex: 1, height: `${(v / max) * 100}%`, minHeight: 3,
          background: color, opacity: 0.35 + 0.65 * (v / max), borderRadius: 3,
        }} />
      ))}
    </div>
  );
}

/* ── KPI Card ───────────────────────────────────────────────── */
export function KpiCard({ icon, label, value, prefix = '', suffix = '', trend, trendUp = true, accent = 'orange', spark = [] }) {
  const accentMap = {
    orange: [s.statOrange, s.statIcon, '#F97316'],
    amber:  [s.statAmber, s.statIconAmber, '#D97706'],
    blue:   [s.statBlue, s.statIconBlue, '#81B29A'],
    green:  [s.statGreen, s.statIconGreen, '#16A34A'],
  };
  const [cardCls, iconCls, color] = accentMap[accent] || accentMap.orange;
  return (
    <div className={`${s.statCard} ${cardCls}`}>
      <div className={s.statTopRow}>
        <div className={`${s.statIcon} ${iconCls}`}>{icon}</div>
        {trend != null && (
          <span className={`${s.trendPill} ${trendUp ? s.trendUp : s.trendDown}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statVal}><Counter value={value} prefix={prefix} suffix={suffix} /></div>
      <div className={s.spark}><Sparkline data={spark} color={color} /></div>
    </div>
  );
}

/* ── Area chart (multi-series) ──────────────────────────────── */
export function AreaChart({ series = [], labels = [], height = 200 }) {
  const width = 560;
  const pad = { t: 12, r: 8, b: 22, l: 8 };
  const allVals = series.flatMap(sr => sr.data);
  const max = Math.max(...allVals, 1);
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const n = labels.length || (series[0]?.data.length ?? 0);
  const xAt = (i) => pad.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v) => pad.t + innerH - (v / max) * innerH;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {[0.25, 0.5, 0.75, 1].map((g, i) => (
        <line key={i} x1={pad.l} x2={width - pad.r} y1={pad.t + innerH * g} y2={pad.t + innerH * g}
          stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
      ))}
      {series.map((sr, si) => {
        const coords = sr.data.map((v, i) => [xAt(i), yAt(v)]);
        const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(' ');
        const area = `${line} L${xAt(n - 1)},${pad.t + innerH} L${xAt(0)},${pad.t + innerH} Z`;
        const gid = `ac-${si}`;
        return (
          <g key={si}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={sr.color} stopOpacity="0.22" />
                <stop offset="100%" stopColor={sr.color} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={area} fill={`url(#${gid})`} />
            <path d={line} fill="none" stroke={sr.color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })}
      {labels.map((lb, i) => (
        <text key={i} x={xAt(i)} y={height - 6} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.5">{lb}</text>
      ))}
    </svg>
  );
}

/* ── Bar chart ──────────────────────────────────────────────── */
export function BarChart({ data = [], labels = [], color = '#F97316', height = 200 }) {
  const width = 560;
  const pad = { t: 12, r: 8, b: 24, l: 8 };
  const max = Math.max(...data, 1);
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const n = data.length;
  const bw = (innerW / n) * 0.56;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="bar-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((g, i) => (
        <line key={i} x1={pad.l} x2={width - pad.r} y1={pad.t + innerH * g} y2={pad.t + innerH * g}
          stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
      ))}
      {data.map((v, i) => {
        const x = pad.l + (i / n) * innerW + (innerW / n - bw) / 2;
        const h = (v / max) * innerH;
        return <rect key={i} x={x} y={pad.t + innerH - h} width={bw} height={h} rx="4" fill="url(#bar-grad)" />;
      })}
      {labels.map((lb, i) => {
        const x = pad.l + (i / n) * innerW + innerW / n / 2;
        return <text key={i} x={x} y={height - 7} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.5">{lb}</text>;
      })}
    </svg>
  );
}

/* ── Donut chart ────────────────────────────────────────────── */
export function Donut({ segments = [], size = 150, thickness = 20 }) {
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  // Precompute cumulative offsets so we never mutate during render.
  const offsets = segments.reduce((acc, seg, i) => {
    acc.push(i === 0 ? 0 : acc[i - 1] + (segments[i - 1].value / total) * c);
    return acc;
  }, []);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth={thickness} />
        {segments.map((seg, i) => {
          const len = (seg.value / total) * c;
          return (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={seg.color} strokeWidth={thickness} strokeLinecap="round"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offsets[i]} />
          );
        })}
      </g>
    </svg>
  );
}

/* ── Drawer ─────────────────────────────────────────────────── */
export function Drawer({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className={s.drawerOverlay} onClick={onClose}>
      <div className={s.drawer} onClick={(e) => e.stopPropagation()} style={{ animation: 'slideIn 0.3s cubic-bezier(0.22,1,0.36,1)' }}>
        {children}
      </div>
      <style>{`@keyframes slideIn { from { transform: translateX(40px); opacity: 0.4; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>,
    document.body
  );
}

/* ── Page header ────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className={s.pageHeader}>
      <div>
        <h2 className={s.pageTitle}>{title}</h2>
        {subtitle && <p className={s.pageSub}>{subtitle}</p>}
      </div>
      {children && <div className={s.pageHeaderActions}>{children}</div>}
    </div>
  );
}

/* ── Chart card wrapper ─────────────────────────────────────── */
export function ChartCard({ title, subtitle, right, children, legend }) {
  return (
    <div className={s.chartCard}>
      <div className={s.chartHead}>
        <div>
          <div className={s.chartTitle}>{title}</div>
          {subtitle && <div className={s.chartSub}>{subtitle}</div>}
        </div>
        {right}
      </div>
      {children}
      {legend && (
        <div className={s.legend}>
          {legend.map((l, i) => (
            <div key={i} className={s.legendItem}>
              <span className={s.legendDot} style={{ background: l.color }} />{l.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Avatar helper ──────────────────────────────────────────── */
export function Avatar({ name = '?', size = '' }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const cls = s[`av${Math.abs(hash) % 6}`];
  return <div className={`${s.avatar} ${size} ${cls}`}>{initials}</div>;
}

/* deterministic pseudo-trend so visuals are stable without random */
export function trendSeed(key = '', len = 8) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
  const out = [];
  for (let i = 0; i < len; i++) { h = Math.imul(h ^ (h >>> 15), 2246822507); out.push(6 + (Math.abs(h) % 10)); }
  return out;
}
