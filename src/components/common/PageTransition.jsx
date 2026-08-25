import React from "react";
import { motion } from "framer-motion";
import { EASE, usePrefersReducedMotion } from "../../lib/motion";

/**
 * PageTransition — wraps a route's content so it gracefully enters and exits
 * during navigation. Used inside an AnimatePresence keyed by pathname.
 *
 * Purely presentational; renders children unchanged.
 */
const PageTransition = ({ children }) => {
  const reduced = usePrefersReducedMotion();

  if (reduced) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28, ease: EASE }}
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
