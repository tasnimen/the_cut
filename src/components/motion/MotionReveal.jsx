"use client";

import { motion, useReducedMotion } from "motion/react";
import { revealVariants, motionTransition } from "@/lib/motion/config";

export function MotionReveal({ as = "div", className = "", children }) {
  const reduceMotion = useReducedMotion();
  const Element = motion[as] ?? motion.div;

  return (
    <Element
      className={className}
      variants={revealVariants}
      initial={reduceMotion ? false : "hidden"}
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      transition={motionTransition}
    >
      {children}
    </Element>
  );
}
