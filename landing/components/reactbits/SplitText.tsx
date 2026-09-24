"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { createElement } from "react";

type CharState = {
  opacity?: number;
  y?: number;
};

export interface SplitTextProps {
  text: string;
  className?: string;
  /** Per-char stagger in ms (default 40) */
  delay?: number;
  /** Per-char animation duration in seconds (default 0.6) */
  duration?: number;
  from?: CharState;
  to?: CharState;
  as?: keyof JSX.IntrinsicElements;
  /** Initial delay before the whole animation begins, in seconds */
  startDelay?: number;
}

export default function SplitText({
  text,
  className,
  delay = 40,
  duration = 0.6,
  from = { opacity: 0, y: 24 },
  to = { opacity: 1, y: 0 },
  as = "span",
  startDelay = 0,
}: SplitTextProps) {
  const reduceMotion = useReducedMotion();

  const words = text.split(" ");

  const container: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: delay / 1000,
        delayChildren: startDelay,
      },
    },
  };

  const charVariants: Variants = {
    hidden: { opacity: from.opacity ?? 0, y: from.y ?? 0 },
    visible: {
      opacity: to.opacity ?? 1,
      y: to.y ?? 0,
      transition: { duration, ease: [0.22, 1, 0.36, 1] },
    },
  };

  // Reduced motion: render plain final-state text.
  if (reduceMotion) {
    return createElement(
      as,
      { className, "aria-label": text },
      text,
    );
  }

  const content = (
    <motion.span
      variants={container}
      initial="hidden"
      animate="visible"
      style={{ display: "inline" }}
      aria-hidden="true"
    >
      {words.map((word, wIndex) => (
        <span
          key={`w-${wIndex}`}
          style={{ display: "inline-block", whiteSpace: "nowrap" }}
        >
          {Array.from(word).map((char, cIndex) => (
            <motion.span
              key={`c-${wIndex}-${cIndex}`}
              variants={charVariants}
              style={{ display: "inline-block", willChange: "transform, opacity" }}
            >
              {char}
            </motion.span>
          ))}
          {wIndex < words.length - 1 ? " " : null}
        </span>
      ))}
    </motion.span>
  );

  return createElement(
    as,
    { className, "aria-label": text },
    content,
  );
}
