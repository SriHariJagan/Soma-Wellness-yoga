/* ─────────────────────────────────────────────────────────
   DashboardWidgets.jsx
   Premium, reusable presentation widgets for the Student
   Dashboard. These wrap/compose markup with Framer Motion
   and design tokens. They are PURELY presentational — they
   never change content, copy, data, routes, or logic.
───────────────────────────────────────────────────────── */
import { motion } from "framer-motion";
import { CountUp } from "../../common/motion/Motion";
import { usePrefersReducedMotion } from "../../../lib/motion";
import w from "./DashboardWidgets.module.css";

const EASE = [0.22, 1, 0.36, 1];

/* ── Stagger container + item — drop-in entrance orchestration ── */
export const gridStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export const itemUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 260, damping: 26, mass: 0.7 } },
};

export function Stagger({ children, className, style }) {
  return (
    <motion.div className={className} style={style} variants={gridStagger} initial="hidden" animate="show">
      {children}
    </motion.div>
  );
}

export function Item({ children, className, style, as = "div", ...rest }) {
  const Tag = motion[as] || motion.div;
  return (
    <Tag className={className} style={style} variants={itemUp} {...rest}>
      {children}
    </Tag>
  );
}

/* ── PageHeader — eyebrow + title + optional sub + actions slot ── */
export function PageHeader({ eyebrow, title, sub, actions }) {
  return (
    <motion.header
      className={w.pageHeader}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
    >
      <div className={w.pageHeaderText}>
        {eyebrow && <span className={w.eyebrow}>{eyebrow}</span>}
        <h1 className={w.pageTitle}>{title}</h1>
        {sub && <p className={w.pageSub}>{sub}</p>}
      </div>
      {actions && <div className={w.pageHeaderActions}>{actions}</div>}
    </motion.header>
  );
}

/* ── StatCard — premium KPI tile with animated counter ──
   value: number (animated) | string (shown as-is)
   tone: "orange" | "green" | "blue" | "amber" | "danger" | "neutral"
   format: (n) => string  (for the animated count)
   prefix/suffix: rendered around the number, never animated      */
export function StatCard({
  icon,
  label,
  value,
  format,
  prefix = "",
  suffix = "",
  trend,
  trendTone = "up",
  progress,
  tone = "neutral",
  index = 0,
}) {
  const reduced = usePrefersReducedMotion();
  const numeric = typeof value === "number";

  return (
    <motion.div
      className={`${w.stat} ${w[`tone_${tone}`] || ""}`}
      variants={itemUp}
      whileHover={reduced ? undefined : { y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      <div className={w.statGlow} aria-hidden="true" />
      <div className={w.statTop}>
        {icon && (
          <span className={w.statIcon}>
            <i className={`ti ${icon}`} aria-hidden="true" />
          </span>
        )}
        {trend && (
          <span className={`${w.statTrend} ${trendTone === "down" ? w.trendDown : w.trendUp}`}>
            <i className={`ti ${trendTone === "down" ? "ti-trending-down" : "ti-trending-up"}`} aria-hidden="true" />
            {trend}
          </span>
        )}
      </div>

      <div className={w.statValue}>
        {prefix}
        {numeric && !reduced ? (
          <CountUp value={value} format={format} />
        ) : (
          <span>{numeric ? (format ? format(value) : value.toLocaleString("en-IN")) : value}</span>
        )}
        {suffix}
      </div>

      <div className={w.statLabel}>{label}</div>

      {typeof progress === "number" && (
        <div className={w.statBar} aria-hidden="true">
          <motion.span
            className={w.statBarFill}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            transition={{ duration: 1, ease: EASE, delay: 0.2 + index * 0.05 }}
          />
        </div>
      )}
    </motion.div>
  );
}

/* ── ProgressRing — animated SVG donut with centered content ── */
export function ProgressRing({
  value = 0,
  size = 132,
  stroke = 11,
  tone = "orange",
  label,
  caption,
  children,
}) {
  const reduced = usePrefersReducedMotion();
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const gradId = `ring-grad-${tone}`;

  return (
    <div className={w.ringWrap} style={{ width: size, height: size }}>
      <svg width={size} height={size} className={w.ring} role="img" aria-label={label ? `${label}` : undefined}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            {tone === "green" ? (
              <>
                <stop offset="0%" stopColor="#22C55E" />
                <stop offset="100%" stopColor="#4ADE80" />
              </>
            ) : tone === "blue" ? (
              <>
                <stop offset="0%" stopColor="#3B82F6" />
                <stop offset="100%" stopColor="#60A5FA" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#2E7D5B" />
                <stop offset="100%" stopColor="#FF9B3D" />
              </>
            )}
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(34,34,34,0.07)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: reduced ? offset : circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.3, ease: EASE }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className={w.ringCenter}>
        {children ?? (
          <>
            <span className={w.ringValue}>{Math.round(pct)}%</span>
            {caption && <span className={w.ringCaption}>{caption}</span>}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Panel — premium content card with optional header ── */
export function Panel({ title, icon, actions, children, className = "", padded = true, as = "section" }) {
  const reduced = usePrefersReducedMotion();
  const Tag = motion[as] || motion.section;
  return (
    <Tag
      className={`${w.panel} ${padded ? "" : w.panelFlush} ${className}`}
      variants={itemUp}
      whileHover={reduced ? undefined : { y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
    >
      {(title || actions) && (
        <header className={w.panelHead}>
          <h2 className={w.panelTitle}>
            {icon && <i className={`ti ${icon}`} aria-hidden="true" />}
            {title}
          </h2>
          {actions && <div className={w.panelActions}>{actions}</div>}
        </header>
      )}
      {children}
    </Tag>
  );
}

/* ── EmptyState — premium, decorative empty surface ──
   Renders icon + provided text. Text is passed through verbatim. */
export function EmptyState({ icon = "ti-sparkles", title, sub, action, compact = false }) {
  return (
    <div className={`${w.empty} ${compact ? w.emptyCompact : ""}`}>
      <div className={w.emptyDeco} aria-hidden="true">
        <span className={w.emptyOrb} />
        <span className={w.emptyOrb2} />
      </div>
      <motion.span
        className={w.emptyIcon}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
      >
        <i className={`ti ${icon}`} aria-hidden="true" />
      </motion.span>
      {title && <p className={w.emptyTitle}>{title}</p>}
      {sub && <p className={w.emptySub}>{sub}</p>}
      {action && <div className={w.emptyAction}>{action}</div>}
    </div>
  );
}

/* ── Tabs — segmented control with animated active pill ── */
export function Tabs({ tabs, active, onChange, layoutId = "tabPill" }) {
  return (
    <div className={w.tabs} role="tablist">
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`${w.tab} ${isActive ? w.tabActive : ""}`}
            onClick={() => onChange(t.id)}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className={w.tabPill}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                aria-hidden="true"
              />
            )}
            {t.icon && <i className={`ti ${t.icon}`} aria-hidden="true" />}
            <span className={w.tabLabel}>{t.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Pill / status chip ── */
export function Pill({ tone = "neutral", icon, children }) {
  return (
    <span className={`${w.pill} ${w[`pill_${tone}`] || ""}`}>
      {icon && <i className={`ti ${icon}`} aria-hidden="true" />}
      {children}
    </span>
  );
}

/* ── PrimaryButton / GhostButton — animated, icon-aware ── */
export function PrimaryButton({ icon, children, className = "", iconRight, ...rest }) {
  return (
    <motion.button
      className={`${w.btnPrimary} ${className}`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      {...rest}
    >
      {icon && !iconRight && <i className={`ti ${icon}`} aria-hidden="true" />}
      {children}
      {icon && iconRight && <i className={`ti ${icon}`} aria-hidden="true" />}
    </motion.button>
  );
}

export function GhostButton({ icon, children, className = "", iconRight, ...rest }) {
  return (
    <motion.button
      className={`${w.btnGhost} ${className}`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      {...rest}
    >
      {icon && !iconRight && <i className={`ti ${icon}`} aria-hidden="true" />}
      {children}
      {icon && iconRight && <i className={`ti ${icon}`} aria-hidden="true" />}
    </motion.button>
  );
}
