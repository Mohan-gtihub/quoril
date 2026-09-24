"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

export interface BlurTextProps {
  text: string;
  className?: string;
  /** ms between each unit (default 120) */
  delay?: number;
  animateBy?: "words" | "chars";
  direction?: "top" | "bottom";
}

export default function BlurText({
  text,
  className,
  delay = 120,
  animateBy = "words",
  direction = "top",
}: BlurTextProps) {
  const reduceMotion = useReducedMotion();

  const units =
    animateBy === "words" ? text.split(" ") : Array.from(text);

  const yFrom = direction === "top" ? -12 : 12;

  const container: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: delay / 1000 },
    },
  };

  const unitVariants: Variants = {
    hidden: { opacity: 0, y: yFrom, filter: "blur(10px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  if (reduceMotion) {
    return (
      <span className={className} aria-label={text}>
        {text}
      </span>
    );
  }

  return (
    <motion.span
      className={className}
      variants={container}
      initial="hidden"
      animate="visible"
      style={{ display: "inline" }}
      aria-label={text}
    >
      {units.map((unit, index) => (
        <motion.span
          key={index}
          variants={unitVariants}
          style={{
            display: "inline-block",
            whiteSpace: "pre",
            willChange: "transform, opacity, filter",
          }}
          aria-hidden="true"
        >
          {animateBy === "words"
            ? index < units.length - 1
              ? `${unit} `
              : unit
            : unit}
        </motion.span>
      ))}
    </motion.span>
  );
}
