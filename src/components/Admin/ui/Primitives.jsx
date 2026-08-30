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

/* ── Mini arc gauge ──────────────────────────────────────────── */
export function Sparkline({ data = [], color = '#F97316', height = 48, width = 140, fill = true }) {
  const pts = data.length ? data : [4, 6, 5, 8, 7, 10, 9, 12];
  const size = Math.min(height, 52);
  const r = (size - 8) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;
  const total = pts.reduce((a, b) => a + b, 0) || 1;
  const pct = pts[pts.length - 1] / (Math.max(...pts) || 1);
  const arcLen = circ * 0.75;
  const fillLen = arcLen * pct;
  const rotation = -225;
  const id = `arc-${color.replace('#', '')}`;

  // mini spark dots along the arc
  const sparkR = r - 0;
  const dotAngle = (i) => ((rotation + (i / (pts.length - 1)) * 270) * Math.PI) / 180;
  const dotX = (i) => cx + sparkR * Math.cos(dotAngle(i));
  const dotY = (i) => cy + sparkR * Math.sin(dotAngle(i));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.5" />
        </linearGradient>
        <filter id={`${id}-glow`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feFlood floodColor={color} floodOpacity="0.3" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      {/* Track arc */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="currentColor" strokeOpacity="0.07" strokeWidth="5"
        strokeDasharray={`${arcLen} ${circ - arcLen}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        transform={`rotate(${rotation} ${cx} ${cy})`} />
      {/* Filled arc */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={`url(#${id}-fill)`} strokeWidth="5"
        strokeDasharray={`${fillLen} ${circ - fillLen}`}
        strokeDashoffset={circ * 0.25}
        strokeLinecap="round"
        transform={`rotate(${rotation} ${cx} ${cy})`}
        filter={`url(#${id}-glow)`} />
      {/* Dots along arc */}
      {pts.map((v, i) => {
        const p = v / (Math.max(...pts) || 1);
        return (
          <circle key={i} cx={dotX(i)} cy={dotY(i)}
            r={i === pts.length - 1 ? 3.5 : 2}
            fill={i === pts.length - 1 ? color : color}
            opacity={0.3 + p * 0.7} />
        );
      })}
      {/* Center dot */}
      <circle cx={cx} cy={cy} r="2.5" fill={color} opacity="0.6" />
      <circle cx={cx} cy={cy} r="1.2" fill="white" opacity="0.7" />
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
    orange: { card: s.statOrange, icon: s.statIcon, color: '#F97316', glow: 'rgba(249,115,22,0.15)' },
    amber:  { card: s.statAmber, icon: s.statIconAmber, color: '#D97706', glow: 'rgba(217,119,6,0.15)' },
    blue:   { card: s.statBlue, icon: s.statIconBlue, color: '#81B29A', glow: 'rgba(129,178,154,0.15)' },
    green:  { card: s.statGreen, icon: s.statIconGreen, color: '#16A34A', glow: 'rgba(22,163,74,0.15)' },
  };
  const cfg = accentMap[accent] || accentMap.orange;
  return (
    <div className={`${s.statCard} ${cfg.card}`}>
      {/* Left accent bar */}
      <div className={s.statAccentBar} style={{ background: `linear-gradient(180deg, ${cfg.color}, ${cfg.color}88)` }} />

      <div className={s.statTopRow}>
        <div className={`${s.statIcon} ${cfg.icon}`} style={{ boxShadow: `0 4px 14px ${cfg.glow}` }}>
          {icon}
        </div>
        <div className={s.statArcWrap}>
          <Sparkline data={spark} color={cfg.color} height={48} />
        </div>
      </div>

      <div className={s.statBody}>
        <div className={s.statLabel}>{label}</div>
        <div className={s.statVal} style={{ color: cfg.color }}>
          <Counter value={value} prefix={prefix} suffix={suffix} />
        </div>
      </div>

      {trend != null && (
        <div className={`${s.trendPill} ${trendUp ? s.trendUp : s.trendDown}`} style={{ marginTop: 10, alignSelf: 'flex-start' }}>
          <span className={s.trendArrow}>{trendUp ? '↗' : '↘'}</span> {trend}
        </div>
      )}
    </div>
  );
}

/* ── Lollipop / Stem chart (multi-series) ───────────────────── */
export function AreaChart({ series = [], labels = [], height = 260, formatValue }) {
  const [hover, setHover] = useState(null);
  const svgRef = useRef(null);
  const width = 600;
  const pad = { t: 28, r: 20, b: 40, l: 52 };
  const allVals = series.flatMap(sr => sr.data);
  const max = Math.max(...allVals, 1);
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const n = labels.length || (series[0]?.data.length ?? 0);
  const xAt = (i) => pad.l + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const yAt = (v) => pad.t + innerH - (v / max) * innerH;
  const fmt = formatValue || ((v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v));

  const handleMouse = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * width;
    const ci = Math.max(0, Math.min(n - 1, Math.round(((svgX - pad.l) / innerW) * (n - 1))));
    setHover(ci);
  };

  const yTicks = [0, 0.5, 1].map(g => ({ pos: g, val: Math.round(max * g) }));
  const baseline = pad.t + innerH;

  return (
    <svg ref={svgRef} width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}
      onMouseMove={handleMouse} onMouseLeave={() => setHover(null)}>
      <defs>
        {series.map((sr, si) => (
          <linearGradient key={si} id={`lolli-grad-${si}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={sr.color} stopOpacity="0.7" />
            <stop offset="100%" stopColor={sr.color} stopOpacity="0.15" />
          </linearGradient>
        ))}
        {series.map((sr, si) => (
          <filter key={`f${si}`} id={`lolli-glow-${si}`}>
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor={sr.color} floodOpacity="0.35" result="color" />
            <feComposite in="color" in2="blur" operator="in" result="glow" />
            <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        ))}
      </defs>

      {/* Y-axis + horizontal grid */}
      {yTicks.map((tick, i) => (
        <g key={i}>
          <text x={pad.l - 10} y={pad.t + innerH * tick.pos + 4} textAnchor="end" fontSize="10"
            fill="currentColor" fillOpacity="0.35" fontFamily="var(--font-body, sans-serif)">
            {fmt(tick.val)}
          </text>
          <line x1={pad.l} x2={width - pad.r} y1={pad.t + innerH * tick.pos} y2={pad.t + innerH * tick.pos}
            stroke="currentColor" strokeOpacity="0.05" strokeWidth="1" />
        </g>
      ))}

      {/* Hover column highlight */}
      {hover !== null && (
        <rect x={xAt(hover) - innerW / n / 2} y={pad.t} width={innerW / n} height={innerH}
          fill="currentColor" opacity="0.025" rx="8" />
      )}

      {/* Connecting smooth line + stems + dots for each series */}
      {series.map((sr, si) => {
        const coords = sr.data.map((v, i) => [xAt(i), yAt(v)]);
        // smooth cubic bezier path
        let path = `M${coords[0][0]},${coords[0][1]}`;
        for (let i = 0; i < coords.length - 1; i++) {
          const c = coords[i], next = coords[i + 1];
          const prev = coords[Math.max(0, i - 1)], af = coords[Math.min(coords.length - 1, i + 2)];
          const t = 0.35;
          path += ` C${(c[0] + (next[0] - prev[0]) * t).toFixed(1)},${(c[1] + (next[1] - prev[1]) * t).toFixed(1)} ${(next[0] - (af[0] - c[0]) * t).toFixed(1)},${(next[1] - (af[1] - c[1]) * t).toFixed(1)} ${next[0].toFixed(1)},${next[1].toFixed(1)}`;
        }
        return (
          <g key={si}>
            {/* Connecting curve */}
            <path d={path} fill="none" stroke={sr.color} strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
            {/* Stems (vertical lines from baseline to dot) */}
            {coords.map((c, i) => (
              <line key={i} x1={c[0]} y1={baseline} x2={c[0]} y2={c[1]}
                stroke={`url(#lolli-grad-${si})`} strokeWidth={hover === i ? 3 : 2} strokeLinecap="round"
                style={{ transition: 'stroke-width 0.15s ease' }} />
            ))}
            {/* Glowing dots */}
            {coords.map((c, i) => (
              <g key={i} style={{ cursor: 'pointer' }}>
                {/* Outer glow ring (only on hover) */}
                {hover === i && (
                  <circle cx={c[0]} cy={c[1]} r="14" fill={sr.color} opacity="0.12" />
                )}
                <circle cx={c[0]} cy={c[1]} r={hover === i ? 7 : 5}
                  fill={hover === i ? sr.color : 'var(--surface, #fff)'}
                  stroke={sr.color} strokeWidth="2.5"
                  filter={hover === i ? `url(#lolli-glow-${si})` : undefined}
                  style={{ transition: 'r 0.2s cubic-bezier(0.34,1.56,0.64,1), fill 0.15s ease' }} />
                {/* Inner white highlight dot */}
                <circle cx={c[0] - 1.2} cy={c[1] - 1.2} r={hover === i ? 2 : 1.5}
                  fill="white" opacity={hover === i ? 0.9 : 0.5}
                  style={{ transition: 'r 0.15s ease, opacity 0.15s ease' }} />
              </g>
            ))}
          </g>
        );
      })}

      {/* X-axis month labels */}
      {labels.map((lb, i) => (
        <text key={i} x={xAt(i)} y={height - 12} textAnchor="middle" fontSize="11" fontWeight="600"
          fill="currentColor" fillOpacity={hover === i ? 0.85 : 0.4}
          style={{ transition: 'fill-opacity 0.15s ease' }}>
          {lb}
        </text>
      ))}

      {/* Value tooltip on hover */}
      {hover !== null && series.map((sr, si) => {
        const v = sr.data[hover] || 0;
        const cx = xAt(hover);
        const cy = yAt(v);
        return (
          <g key={si}>
            <rect x={cx - 38} y={cy - 32 - si * 28} width="76" height="22" rx="6"
              fill="var(--surface-1, #1e2433)" stroke={sr.color} strokeWidth="1" strokeOpacity="0.4"
              style={{ filter: 'drop-shadow(0 3px 10px rgba(0,0,0,0.3))' }} />
            <text x={cx} y={cy - 17 - si * 28} textAnchor="middle" fontSize="10.5" fontWeight="700"
              fill={sr.color} fontFamily="var(--font-body, sans-serif)">
              {fmt(v)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Horizontal bar chart ───────────────────────────────────── */
export function BarChart({ data = [], labels = [], color = '#F97316', height = 260, formatValue }) {
  const [hover, setHover] = useState(null);
  const width = 600;
  const pad = { t: 10, r: 60, b: 10, l: 52 };
  const max = Math.max(...data, 1);
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const n = data.length;
  const barH = Math.min(32, (innerH / n) * 0.58);
  const gap = (innerH - barH * n) / (n + 1);
  const fmt = formatValue || ((v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v));

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}
      onMouseLeave={() => setHover(null)}>
      <defs>
        {data.map((_, i) => (
          <linearGradient key={i} id={`hbar-g-${i}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity={hover === i ? 0.95 : 0.8} />
            <stop offset="100%" stopColor={color} stopOpacity={hover === i ? 0.7 : 0.4} />
          </linearGradient>
        ))}
        <filter id="hbar-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feFlood floodColor={color} floodOpacity="0.2" result="color" />
          <feComposite in="color" in2="blur" operator="in" result="glow" />
          <feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {data.map((v, i) => {
        const y = pad.t + gap + i * (barH + gap);
        const barW = Math.max((v / max) * innerW, 4);
        const isHovered = hover === i;
        return (
          <g key={i} onMouseEnter={() => setHover(i)} style={{ cursor: 'pointer' }}>
            {/* Label on left */}
            <text x={pad.l - 10} y={y + barH / 2 + 4} textAnchor="end" fontSize="12" fontWeight="600"
              fill="currentColor" fillOpacity={isHovered ? 0.85 : 0.5}
              style={{ transition: 'fill-opacity 0.15s ease' }}>
              {labels[i]}
            </text>
            {/* Background track */}
            <rect x={pad.l} y={y} width={innerW} height={barH} rx={barH / 2}
              fill="currentColor" opacity="0.04" />
            {/* Filled bar */}
            <rect x={pad.l} y={y} width={barW} height={barH} rx={barH / 2}
              fill={`url(#hbar-g-${i})`}
              filter={isHovered ? 'url(#hbar-glow)' : undefined}
              style={{ transition: 'width 0.4s cubic-bezier(0.22,1,0.36,1), opacity 0.15s ease' }}
              opacity={hover !== null && !isHovered ? 0.45 : 1} />
            {/* Value label on right */}
            <text x={pad.l + barW + 10} y={y + barH / 2 + 4} textAnchor="start"
              fontSize="12" fontWeight="700" fill={color}
              fillOpacity={isHovered ? 1 : 0.7}
              fontFamily="var(--font-body, sans-serif)"
              style={{ transition: 'fill-opacity 0.15s ease' }}>
              {fmt(v)}
            </text>
            {/* Animated dot at end of bar */}
            <circle cx={pad.l + barW} cy={y + barH / 2} r={isHovered ? 5 : 0}
              fill={color} style={{ transition: 'r 0.2s cubic-bezier(0.34,1.56,0.64,1)' }} />
          </g>
        );
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
