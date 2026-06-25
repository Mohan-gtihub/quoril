"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { IconPause, IconPlay, IconCheck } from "./icons";

/** Draggable "super focus pill" — the desktop app's always-on-top widget. */
export default function FocusPill() {
  const [running, setRunning] = useState(true);
  const [seconds, setSeconds] = useState(12 * 60 + 4);
  const [hint, setHint] = useState(true);
  const constraints = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div
      ref={constraints}
      className="dotgrid relative h-[220px] w-full overflow-hidden rounded-card border border-line bg-paper"
    >
      <motion.div
        drag
        dragConstraints={constraints}
        dragElastic={0.12}
        dragMomentum={false}
        onDragStart={() => setHint(false)}
        whileDrag={{ scale: 1.04, cursor: "grabbing" }}
        initial={{ x: 26, y: 26 }}
        className="absolute z-10 cursor-grab select-none"
      >
        <div className="flex flex-col gap-2 rounded-[18px] border border-line bg-surface/95 p-2.5 pl-3 shadow-lift backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="rounded-pill border border-line bg-sunken px-2 py-0.5 text-[10px] font-semibold tracking-wide text-ink-muted">
              POMODORO
            </span>
            <button
              onClick={() => setRunning((r) => !r)}
              className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full bg-ink text-paper transition active:scale-90"
              aria-label={running ? "Pause" : "Resume"}
            >
              {running ? (
                <IconPause className="h-3.5 w-3.5" />
              ) : (
                <IconPlay className="h-3.5 w-3.5" />
              )}
            </button>
            <span className="max-w-[150px] truncate text-[13px] font-semibold text-ink">
              Write launch post
            </span>
            <span className="mono pl-2 text-sm font-bold text-ink">
              {mm}:{ss}
            </span>
          </div>
          <div className="flex items-center gap-2 border-t border-line pt-2 text-[11px] text-ink-muted">
            <IconCheck className="h-3.5 w-3.5 text-ink" />
            <span>2 / 3 subtasks</span>
            <span className="ml-auto rounded bg-sunken px-1.5 py-0.5">Break</span>
            <span className="rounded bg-sunken px-1.5 py-0.5">Skip</span>
          </div>
        </div>
      </motion.div>

      {hint && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="pointer-events-none absolute bottom-3 right-4 text-xs font-medium text-ink-faint"
        >
          drag me around ↖
        </motion.span>
      )}
    </div>
  );
}
