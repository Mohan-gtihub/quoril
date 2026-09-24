"use client";

import { useId } from "react";

export interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  /** sheen sweep duration in seconds (default 5) */
  speed?: number;
  className?: string;
}

export default function ShinyText({
  text,
  disabled = false,
  speed = 5,
  className,
}: ShinyTextProps) {
  const rawId = useId();
  // Sanitize the generated id so it forms a valid CSS animation name.
  const animName = `shiny-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const style: React.CSSProperties = {
    display: "inline-block",
    color: "currentColor",
    backgroundImage:
      "linear-gradient(120deg, currentColor 40%, rgba(255,255,255,0.95) 50%, currentColor 60%)",
    backgroundSize: "200% 100%",
    backgroundClip: "text",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "100% 0",
    animation: disabled
      ? "none"
      : `${animName} ${speed}s linear infinite`,
  };

  return (
    <span className={className} style={style}>
      <style>{`
        @keyframes ${animName} {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
      `}</style>
      {text}
    </span>
  );
}
