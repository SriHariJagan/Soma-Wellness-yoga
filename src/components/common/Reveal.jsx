import React from "react";
import { motion } from "framer-motion";
import {
  fadeUp,
  viewportOnce,
  usePrefersReducedMotion,
  maybe,
} from "../../lib/motion";

/**
 * Reveal — a tiny, reusable scroll-triggered entrance wrapper.
 *
 * Purely presentational: it wraps existing markup and animates it into view on
 * scroll using the shared motion variants. No content is changed.
 *
 * Props:
 *   variants  — a motion variants object (defaults to fadeUp)
 *   as        — element/component to render (default "div")
 *   delay     — optional delay (seconds) for manual orchestration
 *   margin    — viewport root margin override
 *   ...rest   — className, style, etc. forwarded to the motion element
 */
const Reveal = ({
  children,
  variants = fadeUp,
  as = "div",
  delay = 0,
  margin,
  className,
  ...rest
}) => {
  const reduced = usePrefersReducedMotion();
  const MotionTag = motion[as] || motion.div;
  const v = maybe(variants, reduced);

  return (
    <MotionTag
      className={className}
      variants={v}
      initial="hidden"
      whileInView="visible"
      viewport={margin ? { once: true, margin } : viewportOnce}
      transition={delay ? { delay } : undefined}
      {...rest}
    >
      {children}
    </MotionTag>
  );
};

export default Reveal;
