"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartPalette } from "./palette";
import {
  CollectingState,
  InsufficientState,
  Legend,
  fmtDay,
  fmtNum,
  fmtPct,
  fmtSeconds,
  makeTooltipContent,
} from "./MetricsPrimitives";

/* Shared axis chrome — recessive, per the line token. */
function axisProps(p: ChartPalette) {
  return {
    stroke: p.axis,
    tick: { fill: p.tick, fontSize: 11 },
    tickLine: false,
    axisLine: { stroke: p.axis },
  } as const;
}

const GRID_H = 240;

/* ─────────── DAU / WAU over time (line, 2 series) ─────────── */

export type DailyActiveRow = {
  day: string;
  dau: number;
  app_opens: number;
  sessions: number;
};

/**
 * DAU with a trailing 7-day active count derived from the same series.
 * Both series are user counts on ONE shared scale — never a second y-axis.
 */
export function ActiveUsersChart({
  rows,
  p,
}: {
  rows: DailyActiveRow[];
  p: ChartPalette;
}) {
  if (rows.length === 0) return <CollectingState height={GRID_H} />;

  // Rolling 7-day unique-active proxy: max DAU in the trailing window. It is a
  // lower bound on true WAU (uniques cannot be fewer than the busiest day) and
  // shares DAU's unit, so both belong on one axis.
  const data = rows.map((r, i) => {
    const window = rows.slice(Math.max(0, i - 6), i + 1);
    return {
      day: r.day,
      dau: r.dau,
      wau: Math.max(...window.map((w) => w.dau)),
    };
  });

  const items = [
    { label: "DAU", color: p.series[0] },
    { label: "WAU (7d)", color: p.series[3] },
  ];

  return (
    <>
      <Legend items={items} />
      <ResponsiveContainer width="100%" height={GRID_H}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid stroke={p.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" tickFormatter={fmtDay} minTickGap={28} {...axisProps(p)} />
          <YAxis allowDecimals={false} width={44} {...axisProps(p)} />
          <Tooltip
            cursor={{ stroke: p.axis, strokeWidth: 1 }}
            content={makeTooltipContent(p)}
          />
          <Line
            type="monotone"
            dataKey="wau"
            name="WAU (7d)"
            stroke={p.series[3]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="dau"
            name="DAU"
            stroke={p.series[0]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}

/* ─────────── App opens per day (bar, single series) ─────────── */

export function AppOpensChart({
  rows,
  p,
}: {
  rows: DailyActiveRow[];
  p: ChartPalette;
}) {
  if (rows.length === 0) return <CollectingState height={GRID_H} />;
  // Single series — the panel title names it, so no legend.
  return (
    <ResponsiveContainer width="100%" height={GRID_H}>
      <BarChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
        <CartesianGrid stroke={p.grid} strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="day" tickFormatter={fmtDay} minTickGap={28} {...axisProps(p)} />
        <YAxis allowDecimals={false} width={44} {...axisProps(p)} />
        <Tooltip
          cursor={{ fill: p.grid, opacity: 0.5 }}
          content={makeTooltipContent(p)}
        />
        <Bar
          dataKey="app_opens"
          name="App opens"
          fill={p.series[0]}
          radius={[4, 4, 0, 0]}
          maxBarSize={26}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ─────────── Session length trend (line, 2 series) ─────────── */

export type SessionRow = {
  day: string;
  session_count: number;
  avg_duration_seconds: number;
  median_duration_seconds: number;
};

/** Avg and median share the unit (seconds) — one axis, two lines. */
export function SessionLengthChart({
  rows,
  p,
}: {
  rows: SessionRow[];
  p: ChartPalette;
}) {
  if (rows.length === 0) return <CollectingState height={GRID_H} />;

  const items = [
    { label: "Average", color: p.series[0] },
    { label: "Median", color: p.series[2] },
  ];

  return (
    <>
      <Legend items={items} />
      <ResponsiveContainer width="100%" height={GRID_H}>
        <LineChart data={rows} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
          <CartesianGrid stroke={p.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" tickFormatter={fmtDay} minTickGap={28} {...axisProps(p)} />
          <YAxis
            width={52}
            tickFormatter={(v: number) => (v >= 60 ? `${Math.round(v / 60)}m` : `${v}s`)}
            {...axisProps(p)}
          />
          <Tooltip
            cursor={{ stroke: p.axis, strokeWidth: 1 }}
            content={makeTooltipContent(p, (v) => fmtSeconds(v))}
          />
          <Line
            type="monotone"
            dataKey="avg_duration_seconds"
            name="Average"
            stroke={p.series[0]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="median_duration_seconds"
            name="Median"
            stroke={p.series[2]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}

/* ─────────── Feature usage (horizontal ranked bars) ─────────── */

export type FeatureRow = {
  event: string;
  event_count: number;
  unique_users: number;
};

function prettyEvent(e: string): string {
  return e.replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function FeatureUsageChart({
  rows,
  p,
}: {
  rows: FeatureRow[];
  p: ChartPalette;
}) {
  if (rows.length === 0) {
    return (
      <CollectingState
        height={GRID_H}
        note="Feature events will rank here once the instrumented build is in use."
      />
    );
  }

  const sorted = [...rows]
    .sort((a, b) => b.event_count - a.event_count)
    .slice(0, 10);
  const max = Math.max(1, ...sorted.map((r) => r.event_count));

  // A ranked list rather than a Recharts bar chart: direct labels read better
  // at this size, and a single measure needs no axis.
  return (
    <ul className="space-y-2.5">
      {sorted.map((r, i) => (
        <li key={r.event} className="group">
          <div className="mb-1 flex items-center gap-2 text-[13px]">
            <span className="mono w-4 shrink-0 text-right text-[11px] font-semibold text-ink-faint">
              {i + 1}
            </span>
            <span
              className="min-w-0 flex-1 truncate text-ink-muted"
              title={r.event}
            >
              {prettyEvent(r.event)}
            </span>
            <span className="mono shrink-0 text-[11px] text-ink-faint">
              {fmtNum(r.unique_users)} users
            </span>
            <span className="mono w-14 shrink-0 text-right font-semibold text-ink">
              {fmtNum(r.event_count)}
            </span>
          </div>
          <div className="ml-6 h-2 overflow-hidden rounded-pill bg-sunken">
            <div
              className="h-full rounded-pill transition-all"
              style={{
                width: `${Math.max(3, (r.event_count / max) * 100)}%`,
                background: p.series[0],
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ─────────── Activation funnel ─────────── */

export type ActivationRow = {
  signup_day: string;
  signups: number;
  activated: number;
  activation_rate: number;
};

export function ActivationFunnel({
  rows,
  p,
}: {
  rows: ActivationRow[];
  p: ChartPalette;
}) {
  if (rows.length === 0) {
    return (
      <CollectingState
        height={GRID_H}
        note="Activation compares signups against their first meaningful action — it needs event data."
      />
    );
  }

  const signups = rows.reduce((a, r) => a + r.signups, 0);
  const activated = rows.reduce((a, r) => a + r.activated, 0);
  const rate = signups > 0 ? (activated / signups) * 100 : 0;

  const steps = [
    { label: "Signed up", value: signups, color: p.series[0] },
    { label: "Activated", value: activated, color: p.series[2] },
  ];
  const max = Math.max(1, signups);

  return (
    <div>
      <div className="space-y-3">
        {steps.map((s) => (
          <div key={s.label}>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-[13px] text-ink-muted">{s.label}</span>
              {/* The count and its share must never render as bare adjacent
                  numbers — "31" beside "100%" reads as "3100%". The middot
                  separator keeps them legible as two distinct figures. */}
              <span className="mono text-[13px] font-semibold text-ink">
                {fmtNum(s.value)}
                <span className="ml-2 font-normal text-ink-faint">
                  · {fmtPct((s.value / max) * 100)}
                </span>
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-pill bg-sunken">
              <div
                className="h-full rounded-pill"
                style={{
                  width: `${Math.max(2, (s.value / max) * 100)}%`,
                  background: s.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-line pt-3 text-[12.5px] text-ink-faint">
        <span className="mono font-semibold text-ink">{fmtPct(rate, 1)}</span> of
        signups in this period took a meaningful first action.
      </p>
    </div>
  );
}

/* ─────────── Retention cohort heatmap ─────────── */

export type RetentionRow = {
  cohort_week: string;
  week_offset: number;
  users_active: number;
  cohort_size: number;
};

/**
 * Sequential heatmap — ONE hue, light to dark. Cells carry their own tooltip
 * via title, plus a visible percentage so color is never the only encoding.
 */
export function RetentionHeatmap({
  rows,
  p,
}: {
  rows: RetentionRow[];
  p: ChartPalette;
}) {
  if (rows.length === 0) {
    return (
      <CollectingState
        height={200}
        note="Retention needs at least two weeks of events before a curve means anything."
      />
    );
  }

  const cohorts = Array.from(new Set(rows.map((r) => r.cohort_week))).sort();
  const maxOffset = Math.max(...rows.map((r) => r.week_offset));

  // A single cohort week, or no week-1 data, cannot show retention at all —
  // say so rather than draw a one-column grid that implies a finding.
  if (cohorts.length < 2 || maxOffset < 1) {
    return (
      <InsufficientState
        height={200}
        need={`Retention needs at least two weekly cohorts with a following week of activity. So far there ${
          cohorts.length === 1 ? "is 1 cohort" : `are ${cohorts.length} cohorts`
        } and ${maxOffset + 1} week${maxOffset === 0 ? "" : "s"} of history.`}
      />
    );
  }

  const byKey = new Map(
    rows.map((r) => [`${r.cohort_week}:${r.week_offset}`, r]),
  );
  const offsets = Array.from({ length: maxOffset + 1 }, (_, i) => i);

  const stepFor = (pct: number | null) => {
    if (pct == null) return null;
    const ramp = p.ramp;
    // index 0 reserved for the lowest band; scale across the remaining steps
    const i = Math.min(ramp.length - 1, Math.floor((pct / 100) * (ramp.length - 1)));
    return ramp[Math.max(0, i)];
  };

  // Above ~55% the sequential ramp is dark enough to need light text.
  const textFor = (pct: number | null) => {
    if (pct == null) return "text-ink-faint";
    if (p.mode === "light") return pct > 55 ? "text-white" : "text-ink";
    return pct > 55 ? "text-white" : "text-ink-muted";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="w-[104px] px-1 pb-1 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
              Cohort
            </th>
            <th className="w-[52px] px-1 pb-1 text-right text-[11px] font-semibold uppercase tracking-[0.05em] text-ink-faint">
              Size
            </th>
            {offsets.map((o) => (
              <th
                key={o}
                className="px-1 pb-1 text-center text-[11px] font-semibold text-ink-faint"
              >
                W{o}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => {
            const size =
              rows.find((r) => r.cohort_week === c)?.cohort_size ?? 0;
            return (
              <tr key={c}>
                <td className="px-1 text-[12px] text-ink-muted">{fmtDay(c)}</td>
                <td className="mono px-1 text-right text-[12px] text-ink-faint">
                  {fmtNum(size)}
                </td>
                {offsets.map((o) => {
                  const cell = byKey.get(`${c}:${o}`);
                  const pct =
                    cell && cell.cohort_size > 0
                      ? (cell.users_active / cell.cohort_size) * 100
                      : null;
                  const bg = stepFor(pct);
                  return (
                    <td key={o} className="p-0">
                      <div
                        title={
                          pct == null
                            ? `${fmtDay(c)} · W${o} — no data`
                            : `${fmtDay(c)} · W${o}: ${cell!.users_active}/${cell!.cohort_size} active (${pct.toFixed(0)}%)`
                        }
                        className={`mono grid h-9 place-items-center rounded-[6px] text-[11.5px] font-semibold transition ${textFor(
                          pct,
                        )} ${bg ? "" : "border border-dashed border-line"}`}
                        style={bg ? { background: bg } : undefined}
                      >
                        {pct == null ? "" : `${pct.toFixed(0)}%`}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
