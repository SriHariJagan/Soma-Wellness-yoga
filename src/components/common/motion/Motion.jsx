/* ─────────────────────────────────────────────────────────
   Motion.jsx — reusable Framer Motion primitives for the
   dashboards. These are pure presentation wrappers: they add
   entrance/hover/count animations around existing markup
   WITHOUT changing any content, text, or logic.
───────────────────────────────────────────────────────── */
import { useEffect, useRef } from "react";
import {
  motion,
  useMotionValue,
  useTransform,
  useInView,
  animate,
} from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

/* Entrance variant shared by Reveal items + stagger children. */
export const revealVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 260, damping: 26, mass: 0.7 },
  },
};

/* Page-transition variants used by the dashboard shells. */
export const pageVariants = {
  initial: { opacity: 0, y: 14, scale: 0.985 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.42, ease: EASE, when: "beforeChildren" },
  },
  exit: { opacity: 0, y: -10, scale: 0.99, transition: { duration: 0.22, ease: EASE } },
};

/* Stagger container — animates its <Reveal> children in sequence on mount. */
export function Stagger({ children, className, style, delay = 0, gap = 0.07 }) {
  return (
    <motion.div
      className={className}
      style={style}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
    >
      {children}
    </motion.div>
  );
}

/* Reveal item — fades + springs into view. Works as a Stagger child
   (inherits the parent's orchestration) or standalone. */
export function Reveal({ children, className, style, as = "div", standalone = false }) {
  const MotionTag = motion[as] || motion.div;
  const orchestration = standalone
    ? { initial: "hidden", animate: "show" }
    : {};
  return (
    <MotionTag className={className} style={style} variants={revealVariants} {...orchestration}>
      {children}
    </MotionTag>
  );
}

/* MotionCard — entrance + premium hover lift in one wrapper. */
export function MotionCard({ children, className, style, lift = -5, ...rest }) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={revealVariants}
      whileHover={{ y: lift }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/* CountUp — animates a number from 0 → value the first time it scrolls
   into view. Wrap ONLY the numeric part; keep prefixes/suffixes (₹, %)
   in the surrounding JSX so no text is altered.
   `format` receives the rounded integer and returns a string. */
export function CountUp({ value, format, duration = 1.3, className }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-10% 0px" });
  const target = Number(value) || 0;
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => {
    const n = Math.round(v);
    return format ? format(n) : n.toLocaleString("en-IN");
  });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, target, { duration, ease: EASE });
    return controls.stop;
  }, [inView, target, duration, mv]);

  return <motion.span ref={ref} className={className}>{text}</motion.span>;
}
