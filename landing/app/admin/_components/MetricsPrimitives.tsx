"use client";

import type { ChartPalette } from "./palette";

/* ───────────────────────── formatting ───────────────────────── */

export function fmtNum(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString();
}

export function fmtPct(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function fmtSeconds(s: number | null | undefined): string {
  if (s == null || Number.isNaN(s) || s <= 0) return "—";
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  if (m === 0) return `${r}s`;
  if (m < 60) return `${m}m ${r}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function fmtDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function fmtDateLong(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ───────────────────────── surfaces ───────────────────────── */

/**
 * Chart card. `derived` flags panels sourced from entity tables rather than
 * product_events — visually distinct so measured and derived are never blurred.
 */
export function ChartCard({
  title,
  subtitle,
  action,
  derived = false,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  derived?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-card border bg-surface p-5 shadow-soft ${
        derived ? "border-dashed border-line-strong" : "border-line"
      } ${className}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
              {title}
            </h3>
            {derived && <DerivedTag />}
          </div>
          {subtitle && (
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-faint">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}

/** Marks a panel as computed from entity tables, not from instrumented events. */
export function DerivedTag() {
  return (
    <span
      title="Computed from entity tables (tasks, canvases, focus sessions) — has full history, independent of event instrumentation."
      className="rounded-pill border border-line-strong bg-sunken px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint"
    >
      Derived
    </span>
  );
}

/** Marks a panel as measured from the product_events stream. */
export function MeasuredTag() {
  return (
    <span
      title="Measured from the product_events stream — only covers the period since instrumentation shipped."
      className="rounded-pill border border-line bg-surface px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint"
    >
      Events
    </span>
  );
}

/* ───────────────────────── KPI ───────────────────────── */

export function Kpi({
  label,
  value,
  hint,
  tone = "ink",
  pending = false,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "ink" | "focus" | "break" | "wellbeing";
  pending?: boolean;
}) {
  const dot =
    tone === "focus"
      ? "bg-focus"
      : tone === "break"
        ? "bg-break"
        : tone === "wellbeing"
          ? "bg-wellbeing"
          : "bg-ink/40";
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-soft transition hover:shadow-lift">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
        <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
        {label}
      </p>
      <p
        className={`mono mt-2 font-heading text-[26px] font-semibold leading-none tracking-[-0.03em] ${
          pending ? "text-ink-faint" : "text-ink"
        }`}
      >
        {pending ? "—" : value}
      </p>
      <p className="mt-1.5 text-[12px] text-ink-faint">
        {pending ? "Awaiting events" : (hint ?? " ")}
      </p>
    </div>
  );
}

/* ───────────────────────── states ───────────────────────── */

/**
 * Calm setup notice — shown when the API reports warnings, which on day one
 * means the SQL migration has not been applied yet. Deliberately informational,
 * not an error: nothing is broken, the table simply does not exist yet.
 */
export function SetupNotice({ warnings }: { warnings: string[] }) {
  return (
    <section className="rounded-card border border-line-strong bg-sunken p-5">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-card bg-surface text-ink-muted">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M12 8v5"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
            <circle cx="12" cy="16.2" r="1" fill="currentColor" />
          </svg>
        </span>
        <div className="min-w-0">
          <h3 className="text-[14px] font-semibold text-ink">
            Analytics setup incomplete
          </h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-muted">
            Some metrics could not be read yet. Apply{" "}
            <code className="rounded border border-line bg-surface px-1.5 py-0.5 text-[12px] text-ink">
              supabase/product_events.sql
            </code>{" "}
            in the Supabase SQL editor to create the events table and its
            reporting views. Everything below that does not depend on it still
            works.
          </p>
          <ul className="mt-3 space-y-1">
            {warnings.map((w) => (
              <li
                key={w}
                className="flex gap-2 text-[12.5px] leading-relaxed text-ink-faint"
              >
                <span className="select-none">·</span>
                <span className="min-w-0 break-words">{w}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/**
 * Shown in place of a chart when the table exists but holds no rows yet.
 * Never render a zero-line chart here — a flat line at zero reads as a real
 * decline rather than an absence of measurement.
 */
export function CollectingState({
  height = 220,
  note,
}: {
  height?: number;
  note?: string;
}) {
  return (
    <div
      style={{ height }}
      className="grid place-items-center rounded-card border border-dashed border-line-strong bg-paper px-6 text-center"
    >
      <div className="max-w-[320px]">
        <p className="text-[13.5px] font-medium text-ink-muted">
          Collecting data
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-faint">
          {note ??
            "Events will appear here as users open the instrumented build."}
        </p>
      </div>
    </div>
  );
}

/**
 * Shown when there IS data but not enough of it for the chart to mean
 * anything (e.g. a retention grid with a single cohort week).
 */
export function InsufficientState({
  height = 220,
  need,
}: {
  height?: number;
  need: string;
}) {
  return (
    <div
      style={{ height }}
      className="grid place-items-center rounded-card border border-dashed border-line-strong bg-paper px-6 text-center"
    >
      <div className="max-w-[340px]">
        <p className="text-[13.5px] font-medium text-ink-muted">
          Not enough history yet
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-faint">
          {need}
        </p>
      </div>
    </div>
  );
}

/* ───────────────────────── tooltip ───────────────────────── */

type TooltipEntry = {
  name?: string | number;
  value?: unknown;
  color?: string;
  dataKey?: string | number;
};

/**
 * Shared Recharts tooltip. Container chrome uses literal hex (it is rendered
 * inside the SVG foreign context and must match the chart), but all text takes
 * ink tokens — never the series color.
 */
export function makeTooltipContent(
  p: ChartPalette,
  format?: (value: number, name: string) => string,
) {
  // Recharts declares `payload` as a readonly array, so the parameter type
  // must accept one; `any` on the props bag keeps us compatible with the
  // library's generic ContentType without restating its internals.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function TooltipContent(props: any) {
    const active = props.active as boolean | undefined;
    const payload = props.payload as readonly TooltipEntry[] | undefined;
    const label = props.label as string | number | undefined;
    if (!active || !payload || payload.length === 0) return null;
    return (
      <div
        className="rounded-card px-3 py-2 shadow-lift"
        style={{
          background: p.tooltipBg,
          border: `1px solid ${p.tooltipLine}`,
        }}
      >
        {label != null && (
          <p className="mb-1.5 text-[11.5px] font-semibold text-ink">
            {typeof label === "string" && /^\d{4}-\d{2}-\d{2}/.test(label)
              ? fmtDay(label)
              : label}
          </p>
        )}
        {payload.map((e, i) => {
          const name = String(e.name ?? e.dataKey ?? "");
          const raw = typeof e.value === "number" ? e.value : Number(e.value);
          return (
            <p
              key={`${name}-${i}`}
              className="flex items-center gap-2 text-[12px] text-ink-muted"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ background: e.color }}
              />
              <span>{name}</span>
              <span className="mono ml-auto pl-3 font-semibold text-ink">
                {format && !Number.isNaN(raw)
                  ? format(raw, name)
                  : fmtNum(raw)}
              </span>
            </p>
          );
        })}
      </div>
    );
  };
}

/** Legend row. Present for >= 2 series; a single series needs none. */
export function Legend({
  items,
}: {
  items: { label: string; color: string }[];
}) {
  if (items.length < 2) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <span
          key={it.label}
          className="flex items-center gap-1.5 text-[12px] text-ink-muted"
        >
          <span
            className="h-2 w-2 rounded-[2px]"
            style={{ background: it.color }}
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}
