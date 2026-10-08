"use client";
import { useRef, type PointerEvent, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";

/**
 * A control that leans toward the pointer while it is near (a few pixels, on a spring) and settles back when it
 * leaves. Mouse and trackpad only; touch and reduced motion get the plain child.
 */
export function Magnetic({ children, strength = 0.28, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });
  if (reduce) return <div className={className}>{children}</div>;
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };
  return (
    <motion.div ref={ref} className={`inline-block ${className}`} style={{ x: sx, y: sy }} onPointerMove={onMove} onPointerLeave={onLeave}>
      {children}
    </motion.div>
  );
}
