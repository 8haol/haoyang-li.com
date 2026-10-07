"use client";
import { motion, useReducedMotion } from "motion/react";

/** Clip-reveal for the big name: each line rises from behind its own mask. */
export function HeroReveal({
  children,
  delay = 0.1,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      // Negative insets keep the mask clear of glyph overhang and the rise, so nothing is cropped once open.
      initial={{ clipPath: "inset(-10% -5% 100% -5%)", y: 40, opacity: 0 }}
      // Drop the mask once open: a lingering clip-path cuts the type's soft shadow into a visible rectangle.
      animate={{ clipPath: "inset(-10% -5% -10% -5%)", y: 0, opacity: 1, transitionEnd: { clipPath: "none" } }}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
