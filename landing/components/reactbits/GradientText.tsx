"use client";

import { useId } from "react";

export interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  /** flow duration in seconds (default 8) */
  animationSpeed?: number;
}

export default function GradientText({
  children,
  className,
  colors = ["#5B8DEF", "#10C49A", "#F5A623", "#5B8DEF"],
  animationSpeed = 8,
}: GradientTextProps) {
  const rawId = useId();
  const animName = `gradient-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const gradient = `linear-gradient(90deg, ${colors.join(", ")})`;

  const style: React.CSSProperties = {
    display: "inline-block",
    backgroundImage: gradient,
    backgroundSize: "300% 100%",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
    animation: `${animName} ${animationSpeed}s linear infinite`,
  };

  return (
    <span className={className} style={style}>
      <style>{`
        @keyframes ${animName} {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      {children}
    </span>
  );
}
