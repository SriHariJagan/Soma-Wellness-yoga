/**
 * Central motion library for Pragya Yoga.
 *
 * A single, reusable source of truth for premium animation across the site:
 * easing curves, spring presets, entrance variants, and stagger orchestration.
 *
 * Everything here is purely presentational — it animates elements that already
 * exist, it never changes content, copy, routes, or data.
 *
 * Respect the user's motion preferences: components should read
 * `usePrefersReducedMotion()` and fall back to `instant`/no-transform variants
 * when the user has asked for reduced motion.
 */

import { useEffect, useState } from "react";

/* ── Easing curves (cubic-bezier) ──
 * `ease` — refined "expo-out" style ease for entrances (calm, premium).
 * `easeInOut` — symmetrical for loops / ambient motion.
 * `easeOutBack` — slight overshoot for tactile follow-through. */
export const EASE = [0.22, 1, 0.36, 1];
export const EASE_IN_OUT = [0.65, 0, 0.35, 1];
export const EASE_OUT_BACK = [0.34, 1.56, 0.64, 1];

/* ── Spring presets ── */
export const spring = {
  soft: { type: "spring", stiffness: 120, damping: 20, mass: 0.9 },
  snappy: { type: "spring", stiffness: 320, damping: 26 },
  gentle: { type: "spring", stiffness: 90, damping: 18, mass: 1 },
  bouncy: { type: "spring", stiffness: 280, damping: 16 },
};

/* ── Entrance variants ──
 * All use only transform + opacity (GPU-friendly, 60fps). */
export const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE },
  },
};

export const fadeDown = {
  hidden: { opacity: 0, y: -24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8, ease: EASE } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, ease: EASE },
  },
};

export const slideInLeft = {
  hidden: { opacity: 0, x: -48 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } },
};

export const slideInRight = {
  hidden: { opacity: 0, x: 48 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: EASE } },
};

export const blurIn = {
  hidden: { opacity: 0, y: 24, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.75, ease: EASE },
  },
};

/* Card entrance with a touch of overshoot for a tactile, alive feel. */
export const popCard = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: EASE },
  },
};

/* ── Stagger containers ── */
export const staggerContainer = (stagger = 0.1, delayChildren = 0) => ({
  hidden: {},
  visible: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

/* Convenience for letter / word reveals. */
export const staggerFast = staggerContainer(0.06);

/* ── Viewport config used for scroll reveals ── */
export const viewportOnce = { once: true, margin: "-80px" };

/* ── Hover / tap interaction presets ── */
export const hoverLift = {
  rest: { y: 0 },
  hover: { y: -6, transition: spring.soft },
};

export const tap = { scale: 0.96 };

/* ── Reduced-motion hook ──
 * Returns true when the user prefers reduced motion. Components use this to
 * disable transforms / ambient loops while keeping content fully visible. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  return reduced;
}

/* Helper: return the given variants, or a no-op (instant, no transform) set
 * when reduced motion is requested. Keeps call sites tidy. */
export const maybe = (variants, reduced) =>
  reduced
    ? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
    : variants;
