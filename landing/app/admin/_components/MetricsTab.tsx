"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useChartPalette } from "./palette";
import {
  ActivationFunnel,
  ActiveUsersChart,
  AppOpensChart,
  FeatureUsageChart,
  RetentionHeatmap,
  SessionLengthChart,
  type ActivationRow,
  type DailyActiveRow,
  type FeatureRow,
  type RetentionRow,
  type SessionRow,
} from "./MetricsCharts";
import {
  ChartCard,
  CollectingState,
  DerivedTag,
  Kpi,
  MeasuredTag,
  SetupNotice,
  fmtDateLong,
  fmtNum,
  fmtPct,
  fmtSeconds,
} from "./MetricsPrimitives";

/* ───────────────────────── types ───────────────────────── */

type Overview = {
  total_users: number;
  new_users_in_period: number;
  dau: number;
  wau: number;
  mau: number;
  total_events: number;
  app_opens_in_period: number;
};

/**
 * Field names follow the actual /api/admin/metrics response (verified against
 * app/api/admin/metrics/route.ts), which differs from the original spec sketch.
 * Nullable counts mean "could not be read", and render as "—", never as 0.
 */
type Derived = {
  source?: string;
  note?: string;
  totalTasks: number | null;
  totalCanvases: number | null;
  focusSessions: number | null;
  focusTotalSeconds: number | null;
  focusExcludedRows: number | null;
  usersByTier: Record<string, number> | null;
};

type MetricsResponse = {
  overview: Overview | null;
  dailyActive: DailyActiveRow[] | null;
  sessions: SessionRow[] | null;
  activation: ActivationRow[] | null;
  featureUsage: FeatureRow[] | null;
  retention: RetentionRow[] | null;
  derived: Derived | null;
  warnings: string[];
  meta: {
    days: number;
    generatedAt: string;
    /** null + no warnings = table exists but is empty; null + warnings = SQL not applied. */
    earliestEventAt: string | null;
    eventsAvailable?: boolean;
  };
};

const RANGES = [7, 30, 90] as const;
const REFRESH_MS = 30_000;

/* ───────────────────────── data hook ───────────────────────── */

function useMetrics(token: string, days: number) {
  const [data, setData] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);

  // `quiet` skips the loading flash so the 30s auto-refresh does not blank
  // the charts out from under the reader.
  const load = useCallback(
    async (quiet = false) => {
      if (!quiet) setLoading(true);
      try {
        const res = await fetch(`/api/admin/metrics?days=${days}`, {
          headers: { authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load metrics");
        setData(json);
        setErr("");
        setFetchedAt(Date.now());
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load metrics");
      } finally {
        setLoading(false);
      }
    },
    [token, days],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => load(true), REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  return { data, loading, err, fetchedAt, reload: load };
}

/** Ticking "updated Xs ago" label. */
function useAgo(fetchedAt: number | null): string {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  if (!fetchedAt) return "";
  const s = Math.max(0, Math.round((Date.now() - fetchedAt) / 1000));
  if (s < 5) return "updated just now";
  if (s < 60) return `updated ${s}s ago`;
  return `updated ${Math.floor(s / 60)}m ago`;
}

/* ───────────────────────── tab ───────────────────────── */

export default function MetricsTab({ token }: { token: string }) {
  const [days, setDays] = useState<number>(30);
  const { data, loading, err, fetchedAt, reload } = useMetrics(token, days);
  const ago = useAgo(fetchedAt);
  const p = useChartPalette();
  const firstLoad = useRef(true);

  useEffect(() => {
    if (data) firstLoad.current = false;
  }, [data]);

  if (loading && firstLoad.current) {
    return (
      <div className="flex items-center gap-2 py-10 text-ink-faint">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="h-4 w-4 animate-spin"
          aria-hidden
        >
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
        <span className="text-[14px]">Loading metrics…</span>
      </div>
    );
  }

  if (err && !data) {
    return (
      <p className="rounded-card bg-state-error/8 px-4 py-3 text-[13px] text-state-error">
        {err}
      </p>
    );
  }
  if (!data) return null;

  const o = data.overview;
  const daily = data.dailyActive ?? [];
  const sessions = data.sessions ?? [];
  const activation = data.activation ?? [];
  const features = data.featureUsage ?? [];
  const retention = data.retention ?? [];
  const d = data.derived;

  // "No events at all" — distinct from "warnings", which means the table is
  // missing entirely. Both must avoid showing zeros as if they were measured.
  // meta.eventsAvailable is the API's own signal and wins when present.
  const noEvents =
    data.meta.eventsAvailable === false || !o || o.total_events === 0;

  const stickiness = o && o.mau > 0 ? (o.dau / o.mau) * 100 : null;
  const avgSession =
    sessions.length > 0
      ? sessions.reduce((a, r) => a + (r.avg_duration_seconds || 0), 0) /
        sessions.length
      : null;
  const signups = activation.reduce((a, r) => a + r.signups, 0);
  const activated = activation.reduce((a, r) => a + r.activated, 0);
  const activationRate = signups > 0 ? (activated / signups) * 100 : null;

  return (
    <div className="space-y-6">
      {/* ── control row ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Time range"
          className="inline-flex rounded-pill border border-line-strong bg-surface p-1"
        >
          {RANGES.map((r) => {
            const on = r === days;
            return (
              <button
                key={r}
                onClick={() => setDays(r)}
                aria-pressed={on}
                className={`rounded-pill px-3.5 py-1.5 text-[13px] font-semibold transition ${
                  on
                    ? "bg-ink text-paper"
                    : "text-ink-faint hover:bg-sunken hover:text-ink"
                }`}
              >
                {r}d
              </button>
            );
          })}
        </div>

        {data.meta.earliestEventAt && (
          <span className="rounded-pill border border-line bg-sunken px-3 py-1.5 text-[12.5px] text-ink-muted">
            Collecting since{" "}
            <span className="font-semibold text-ink">
              {fmtDateLong(data.meta.earliestEventAt)}
            </span>
          </span>
        )}

        <div className="ml-auto flex items-center gap-3">
          {ago && (
            <span className="flex items-center gap-1.5 text-[12px] text-ink-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-wellbeing animate-pulse2" />
              {ago}
            </span>
          )}
          <button
            onClick={() => reload()}
            className="rounded-pill border border-line-strong bg-surface px-4 py-2 text-[13px] font-semibold text-ink transition hover:bg-sunken"
          >
            Refresh
          </button>
        </div>
      </div>

      {data.warnings.length > 0 && <SetupNotice warnings={data.warnings} />}

      {err && data && (
        <p className="rounded-card border border-line bg-sunken px-4 py-2.5 text-[12.5px] text-ink-muted">
          Last refresh failed ({err}). Showing the previous successful load.
        </p>
      )}

      {/* ── measured KPIs ── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
            Product usage
          </h2>
          <MeasuredTag />
        </div>

        {noEvents ? (
          <div className="rounded-card border border-dashed border-line-strong bg-surface px-6 py-10 text-center">
            <p className="text-[14px] font-medium text-ink">
              No events recorded yet
            </p>
            <p className="mx-auto mt-2 max-w-[460px] text-[13px] leading-relaxed text-ink-faint">
              Usage metrics stay blank until the instrumented build reaches
              users. These figures are deliberately not shown as zero — zero
              would imply a measurement, and nothing has been measured yet.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <Kpi label="DAU" value={fmtNum(o!.dau)} hint="Active today" tone="focus" />
            <Kpi label="WAU" value={fmtNum(o!.wau)} hint="Last 7 days" tone="focus" />
            <Kpi label="MAU" value={fmtNum(o!.mau)} hint="Last 30 days" tone="focus" />
            <Kpi
              label="Stickiness"
              value={stickiness == null ? "—" : fmtPct(stickiness)}
              hint="DAU / MAU"
              tone="wellbeing"
              pending={stickiness == null}
            />
            <Kpi
              label="App opens"
              value={fmtNum(o!.app_opens_in_period)}
              hint={`Last ${days} days`}
              tone="break"
            />
            <Kpi
              label="Avg session"
              value={avgSession == null ? "—" : fmtSeconds(avgSession)}
              hint={`Mean over ${days}d`}
              tone="break"
              pending={avgSession == null}
            />
            <Kpi
              label="Activation"
              value={activationRate == null ? "—" : fmtPct(activationRate, 1)}
              hint={
                activationRate == null
                  ? undefined
                  : `${fmtNum(activated)} of ${fmtNum(signups)}`
              }
              tone="wellbeing"
              pending={activationRate == null}
            />
          </div>
        )}
      </section>

      {/* ── charts ── */}
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Active users"
          subtitle="Daily active users, with a trailing 7-day active count on the same scale."
        >
          <ActiveUsersChart rows={daily} p={p} />
        </ChartCard>

        <ChartCard title="App opens per day">
          <AppOpensChart rows={daily} p={p} />
        </ChartCard>

        <ChartCard
          title="Session length"
          subtitle="Average and median duration per day."
        >
          <SessionLengthChart rows={sessions} p={p} />
        </ChartCard>

        <ChartCard
          title="Feature usage"
          subtitle={`Top events by volume over the last ${days} days.`}
        >
          <FeatureUsageChart rows={features} p={p} />
        </ChartCard>

        <ChartCard
          title="Activation funnel"
          subtitle="Signups that went on to take a meaningful first action."
        >
          <ActivationFunnel rows={activation} p={p} />
        </ChartCard>

        <ChartCard
          title="Weekly retention"
          subtitle="Share of each signup cohort still active in later weeks."
        >
          <RetentionHeatmap rows={retention} p={p} />
        </ChartCard>
      </div>

      {/* ── derived section — real history, entity-sourced ── */}
      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
            Content &amp; accounts
          </h2>
          <DerivedTag />
          <span className="text-[12px] text-ink-faint">
            Counted directly from entity tables — full history, independent of
            event instrumentation.
          </span>
        </div>

        {!d ? (
          <CollectingState
            height={140}
            note="Entity counts are unavailable right now."
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Kpi
                label="Tasks"
                value={fmtNum(d.totalTasks)}
                hint="All time"
                pending={d.totalTasks == null}
              />
              <Kpi
                label="Canvases"
                value={fmtNum(d.totalCanvases)}
                hint="All time"
                pending={d.totalCanvases == null}
              />
              <Kpi
                label="Focus sessions"
                value={fmtNum(d.focusSessions)}
                hint="All time"
                pending={d.focusSessions == null}
              />
              <Kpi
                label="Focus time"
                value={fmtSeconds(d.focusTotalSeconds)}
                hint="All time"
                pending={d.focusTotalSeconds == null}
              />
            </div>

            {d.focusExcludedRows != null && d.focusExcludedRows > 0 && (
              <p className="mt-2 text-[12px] text-ink-faint">
                {fmtNum(d.focusExcludedRows)} focus row
                {d.focusExcludedRows === 1 ? "" : "s"} excluded as out-of-range
                (negative, or longer than 24h) — a data-quality signal worth
                checking.
              </p>
            )}

            {d.usersByTier && Object.keys(d.usersByTier).length > 0 && (
              <div className="mt-3 rounded-card border border-dashed border-line-strong bg-surface p-5 shadow-soft">
                <div className="mb-3 flex items-center gap-2">
                  <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                    Users by tier
                  </h3>
                  <DerivedTag />
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {Object.entries(d.usersByTier).map(([tier, n]) => (
                    <span key={tier} className="text-[13px] text-ink-muted">
                      {tier}
                      <span className="mono ml-2 font-semibold text-ink">
                        {fmtNum(n)}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      <p className="text-[12px] leading-relaxed text-ink-faint">
        Usage metrics are measured from the <code>product_events</code> stream
        and only cover the period since instrumentation shipped
        {data.meta.earliestEventAt
          ? ` (${fmtDateLong(data.meta.earliestEventAt)})`
          : ""}
        . Content and account figures are derived from entity tables and carry
        full history. Auto-refreshes every 30 seconds.
      </p>
    </div>
  );
}
