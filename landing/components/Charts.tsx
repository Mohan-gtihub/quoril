"use client";

import { motion } from "framer-motion";

const INK = "#16160f";
const TRACK = "rgb(244, 244, 242)"; // sunken token

/** Hourly screen-time heatmap (peaks mid-afternoon). */
export function Heatmap() {
  const peaks = [3, 2, 1, 1, 1, 2, 5, 9, 14, 18, 16, 15, 22, 28, 40, 38, 30, 26, 20, 15, 12, 8, 5, 3];
  const max = Math.max(...peaks);
  return (
    <>
      <div className="flex h-20 items-end gap-[3px]">
        {peaks.map((v, i) => {
          const isPeak = v === max;
          return (
            <motion.i
              key={i}
              title={`${i}:00 · ${v} min`}
              initial={{ height: 4 }}
              whileInView={{ height: `${(v / max) * 100}%` }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.012, type: "spring", stiffness: 120 }}
              className="flex-1 rounded-t-[3px]"
              style={{
                background: INK,
                opacity: isPeak ? 1 : 0.16 + (v / max) * 0.5,
              }}
            />
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-ink-faint">
        <span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>11p</span>
      </div>
    </>
  );
}

/** Circular progress ring (focus remaining / productivity score). */
export function Ring({
  size = 130,
  stroke = 9,
  pct,
  value,
  label,
}: {
  size?: number;
  stroke?: number;
  pct: number; // 0..1
  value: string;
  label: string;
}) {
  const r = (size - stroke) / 2 - 4;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TRACK} strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={INK}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c * (1 - pct) }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <b className="mono block text-2xl font-semibold text-ink">{value}</b>
          <span className="text-[10px] uppercase tracking-[0.1em] text-ink-faint">
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Category donut. segments: [color, fraction] summing ~1. */
export function Donut({
  segments,
  center,
  sub,
}: {
  segments: [string, number][];
  center: string;
  sub: string;
}) {
  const size = 140;
  const stroke = 18;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={TRACK} strokeWidth={stroke} />
        {segments.map(([color, frac], i) => {
          const len = c * frac;
          const dash = `${len} ${c - len}`;
          const el = (
            <motion.circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeDasharray={dash}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <b className="mono block text-xl font-semibold text-ink">{center}</b>
          <span className="text-[10px] text-ink-faint">{sub}</span>
        </div>
      </div>
    </div>
  );
}

/** Horizontal category usage bars. */
export function CategoryBars({
  rows,
}: {
  rows: { name: string; color: string; pct: number; value: string }[];
}) {
  return (
    <div className="mt-1.5 flex flex-col gap-3">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-3">
          <span className="flex w-28 items-center gap-2 text-[13px] text-ink-muted">
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-[3px]" style={{ background: r.color }} />
            <span className="truncate">{r.name}</span>
          </span>
          <span className="h-2 flex-1 overflow-hidden rounded-pill bg-sunken">
            <motion.i
              className="block h-full rounded-pill"
              style={{ background: r.color }}
              initial={{ width: 0 }}
              whileInView={{ width: `${r.pct}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            />
          </span>
          <span className="mono w-14 text-right text-[12.5px] text-ink-faint">
            {r.value}
          </span>
        </div>
      ))}
    </div>
  );
}
