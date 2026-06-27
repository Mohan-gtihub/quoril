"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import ThemeToggle from "@/components/ThemeToggle";

type Row = {
  id: string;
  email: string;
  role: string | null;
  platform: string | null;
  referrer: string | null;
  created_at: string;
};

type Bar = { name: string; count: number };

type Stats = {
  waitlist: {
    total: number;
    last7: number;
    last30: number;
    byRole: Bar[];
    byPlatform: Bar[];
    series: Record<string, number>;
  };
  visitors: {
    days: number;
    pageviews: number;
    uniqueVisitors: number;
    sessions: number;
    bounceRate: number;
    avgDurationMs: number;
    topPages: Bar[];
    topSources: Bar[];
    topCountries: Bar[];
    byDevice: Bar[];
    series: Record<string, number>;
  };
};

type AuditRow = {
  id: string;
  admin_email: string;
  action: string;
  target_id: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};

type Tab = "overview" | "waitlist" | "visitors" | "audit";

export default function AdminPage() {
  const [ready, setReady] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);

  useEffect(() => {
    supabaseBrowser.auth.getSession().then(({ data }) => {
      setToken(data.session?.access_token ?? null);
      setAdminEmail(data.session?.user.email ?? null);
      setReady(true);
    });
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_e, s) => {
      setToken(s?.access_token ?? null);
      setAdminEmail(s?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper text-ink-faint">
        <Spinner />
      </div>
    );
  }

  if (!token) return <Login />;

  return <Dashboard token={token} adminEmail={adminEmail} />;
}

/* ───────────────────────── Icons ───────────────────────── */

type IconProps = { className?: string };
const ic = "h-[18px] w-[18px]";

function IconOverview({ className = ic }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="3" y="3" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}
function IconList({ className = ic }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M8 6h13M8 12h13M8 18h13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="3.5" cy="6" r="1.3" fill="currentColor" />
      <circle cx="3.5" cy="12" r="1.3" fill="currentColor" />
      <circle cx="3.5" cy="18" r="1.3" fill="currentColor" />
    </svg>
  );
}
function IconUsers({ className = ic }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="9" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.7" />
      <path d="M3.5 19c.7-3 3-4.6 5.5-4.6S13.8 16 14.5 19" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6M18 18.6c-.3-1.7-1-3-2-3.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
function IconShield({ className = ic }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M12 3l7 2.5v5c0 4.3-2.9 7.6-7 9-4.1-1.4-7-4.7-7-9v-5L12 3z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function Spinner({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/* ───────────────────────── Login ───────────────────────── */

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) setErr(error.message);
  }

  return (
    <div className="grid min-h-screen place-items-center bg-paper px-5">
      <form
        onSubmit={submit}
        className="w-full max-w-[380px] rounded-tile border border-line bg-surface p-7 shadow-soft"
      >
        <div className="mb-5 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-card bg-ink text-paper">
            <IconShield className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h1 className="font-heading text-[18px] font-semibold tracking-[-0.02em] text-ink">
              Quoril Admin
            </h1>
            <p className="text-[12.5px] text-ink-faint">Sign in to continue</p>
          </div>
        </div>

        <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded-pill border border-line-strong bg-paper px-4 py-3 text-[15px] text-ink outline-none transition focus:border-focus/50 focus:ring-4 focus:ring-focus/10"
          placeholder="you@quoril.in"
        />

        <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
          Password
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-5 w-full rounded-pill border border-line-strong bg-paper px-4 py-3 text-[15px] text-ink outline-none transition focus:border-focus/50 focus:ring-4 focus:ring-focus/10"
          placeholder="••••••••"
        />

        {err && (
          <p className="mb-4 rounded-card bg-state-error/8 px-3 py-2 text-[13px] text-state-error">
            {err}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-pill bg-ink py-3 text-[15px] font-semibold text-paper transition hover:bg-ink/90 disabled:opacity-60"
        >
          {loading && <Spinner className="h-4 w-4" />}
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}

/* ─────────────────────── Helpers ──────────────────────── */

function authFetch(token: string, url: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    headers: { ...(init?.headers ?? {}), authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

function fmtDuration(ms: number): string {
  if (!ms) return "0s";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

function fmtNum(n: number): string {
  return n.toLocaleString();
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function initials(email: string | null): string {
  if (!email) return "?";
  return email.slice(0, 2).toUpperCase();
}

/* ─────────────────────── Dashboard ─────────────────────── */

const NAV: { id: Tab; label: string; icon: (p: IconProps) => JSX.Element }[] = [
  { id: "overview", label: "Overview", icon: IconOverview },
  { id: "waitlist", label: "Waitlist", icon: IconList },
  { id: "visitors", label: "Visitors", icon: IconUsers },
  { id: "audit", label: "Audit log", icon: IconShield },
];

function Dashboard({
  token,
  adminEmail,
}: {
  token: string;
  adminEmail: string | null;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const active = NAV.find((n) => n.id === tab)!;

  return (
    <div className="min-h-screen bg-paper text-ink lg:grid lg:grid-cols-[244px_1fr]">
      {/* ── Sidebar ── */}
      <aside className="sticky top-0 z-20 flex items-center gap-2 border-b border-line bg-surface px-4 py-3 lg:h-screen lg:flex-col lg:items-stretch lg:gap-0 lg:border-b-0 lg:border-r lg:px-4 lg:py-6">
        <div className="flex items-center gap-2.5 lg:mb-7 lg:px-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-card bg-ink text-paper">
            <IconShield className="h-[18px] w-[18px]" />
          </span>
          <div className="hidden lg:block">
            <p className="font-heading text-[15px] font-semibold leading-tight tracking-[-0.02em]">
              Quoril
            </p>
            <p className="text-[11.5px] text-ink-faint">Admin console</p>
          </div>
        </div>

        <nav className="ml-auto flex gap-1 lg:ml-0 lg:flex-col lg:gap-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const on = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`flex items-center gap-2.5 rounded-pill px-3 py-2 text-[14px] font-medium transition lg:rounded-card lg:px-3 lg:py-2.5 ${
                  on
                    ? "bg-ink text-paper lg:bg-sunken lg:text-ink"
                    : "text-ink-faint hover:bg-sunken hover:text-ink"
                }`}
              >
                <Icon className="h-[18px] w-[18px]" />
                <span className="hidden sm:inline">{n.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="mt-auto hidden items-center gap-2.5 border-t border-line pt-4 lg:flex">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-pill bg-sunken text-[12px] font-semibold text-ink-muted">
            {initials(adminEmail)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12.5px] font-medium text-ink">
              {adminEmail}
            </p>
            <button
              onClick={() => supabaseBrowser.auth.signOut()}
              className="text-[12px] text-ink-faint transition hover:text-state-error"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center gap-3 border-b border-line px-5 py-4 sm:px-8">
          <h1 className="font-heading text-[20px] font-semibold tracking-[-0.02em]">
            {active.label}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => supabaseBrowser.auth.signOut()}
              className="rounded-pill border border-line-strong bg-surface px-4 py-2 text-[13px] font-semibold text-ink-muted transition hover:bg-sunken lg:hidden"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1 px-5 py-6 sm:px-8">
          {tab === "overview" && <OverviewTab token={token} />}
          {tab === "waitlist" && <WaitlistTab token={token} />}
          {tab === "visitors" && <VisitorsTab token={token} />}
          {tab === "audit" && <AuditTab token={token} />}
        </main>
      </div>
    </div>
  );
}

/* ─────────────────────── UI atoms ─────────────────────── */

const ACCENTS: Record<string, string> = {
  ink: "bg-ink/8 text-ink",
  focus: "bg-focus/10 text-focus",
  wellbeing: "bg-wellbeing/12 text-wellbeing",
  break: "bg-break/12 text-break",
};

const DOTS: Record<string, string> = {
  ink: "bg-ink/40",
  focus: "bg-focus",
  wellbeing: "bg-wellbeing",
  break: "bg-break",
};

function StatCard({
  label,
  value,
  hint,
  accent = "ink",
  icon,
  dot,
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: keyof typeof ACCENTS | string;
  icon?: JSX.Element;
  dot?: keyof typeof DOTS | string;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-soft transition hover:shadow-lift">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
          {dot && (
            <span className={`h-1.5 w-1.5 rounded-full ${DOTS[dot] ?? DOTS.ink}`} />
          )}
          {label}
        </p>
        {icon && (
          <span
            className={`grid h-7 w-7 place-items-center rounded-card ${ACCENTS[accent] ?? ACCENTS.ink}`}
          >
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 font-heading text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink">
        {value}
      </p>
      {hint && <p className="mt-1.5 text-[12px] text-ink-faint">{hint}</p>}
    </div>
  );
}

function Panel({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function BarList({ bars }: { bars: Bar[] }) {
  const max = Math.max(1, ...bars.map((b) => b.count));
  if (bars.length === 0)
    return <p className="text-[13px] text-ink-faint">No data yet.</p>;
  return (
    <ul className="space-y-3">
      {bars.map((b) => {
        const name = b.name && b.name !== "—" ? b.name : "Not specified";
        return (
          <li key={b.name} className="text-[13px]">
            <div className="mb-1.5 flex justify-between gap-2">
              <span className="truncate text-ink-muted">{name}</span>
              <span className="font-semibold tabular-nums text-ink">
                {fmtNum(b.count)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-pill bg-sunken">
              <div
                className="h-full rounded-pill bg-focus/70"
                style={{ width: `${Math.max(4, (b.count / max) * 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* Friendly labels for raw analytics values. */
const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", IN: "India", GB: "United Kingdom", CA: "Canada",
  DE: "Germany", FR: "France", AU: "Australia", NL: "Netherlands",
  BR: "Brazil", JP: "Japan", SG: "Singapore", ES: "Spain", IT: "Italy",
};
function flag(cc: string): string {
  if (!/^[A-Za-z]{2}$/.test(cc)) return "🌐";
  return String.fromCodePoint(
    ...cc.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}
function prettyLabel(name: string, format?: string): string {
  if (!name || name === "—") return "Direct / unknown";
  switch (format) {
    case "page":
      return name === "/" ? "Home /" : name;
    case "source":
      return name === "direct" ? "Direct" : name.replace(/^https?:\/\//, "");
    case "country":
      return `${flag(name)}  ${COUNTRY_NAMES[name.toUpperCase()] ?? name}`;
    case "device":
      return name.charAt(0).toUpperCase() + name.slice(1);
    default:
      return name;
  }
}

/**
 * Cleaner bar list: rank, friendly label, count + share %, proportional
 * bar. Bars are scaled to the top item so the leader fills the row.
 */
function RankedBarList({ bars, format }: { bars: Bar[]; format?: string }) {
  if (bars.length === 0)
    return <p className="text-[13px] text-ink-faint">No data yet.</p>;
  const max = Math.max(1, ...bars.map((b) => b.count));
  const total = bars.reduce((a, b) => a + b.count, 0) || 1;

  return (
    <ul className="space-y-2.5">
      {bars.map((b, i) => {
        const pct = Math.round((b.count / total) * 100);
        return (
          <li key={b.name} className="group">
            <div className="mb-1 flex items-center gap-2 text-[13px]">
              <span className="w-4 shrink-0 text-right text-[11px] font-semibold tabular-nums text-ink-faint">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-ink-muted" title={b.name}>
                {prettyLabel(b.name, format)}
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-ink-faint">
                {pct}%
              </span>
              <span className="w-10 shrink-0 text-right font-semibold tabular-nums text-ink">
                {fmtNum(b.count)}
              </span>
            </div>
            <div className="ml-6 h-1.5 overflow-hidden rounded-pill bg-sunken">
              <div
                className="h-full rounded-pill bg-focus/60 transition-all group-hover:bg-focus"
                style={{ width: `${Math.max(4, (b.count / max) * 100)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Trend({ series, label }: { series: Record<string, number>; label: string }) {
  const days = useMemo(() => {
    const out: { day: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
      out.push({ day: d, count: series[d] ?? 0 });
    }
    return out;
  }, [series]);
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((a, b) => a + b.count, 0);

  return (
    <Panel
      title={label}
      action={
        <span className="text-[12px] text-ink-faint">
          {fmtNum(total)} in 30 days
        </span>
      }
    >
      <div className="flex h-28 items-end gap-[3px]">
        {days.map((d) => {
          const has = d.count > 0;
          return (
            <div key={d.day} className="group relative flex-1">
              {/* Empty days render as a faint baseline track so the chart never
                  looks broken; days with data fill with the accent. */}
              <div
                className={`rounded-t transition-colors ${
                  has
                    ? "bg-focus/70 group-hover:bg-focus"
                    : "bg-line group-hover:bg-line-strong"
                }`}
                style={{
                  height: has
                    ? `${Math.max(8, (d.count / max) * 100)}%`
                    : "4px",
                }}
              />
              <span className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-sunken px-1.5 py-1 text-[11px] font-medium text-ink opacity-0 shadow-soft transition group-hover:opacity-100">
                {d.count} · {d.day.slice(5)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-ink-faint">
        <span>{days[0].day.slice(5)}</span>
        <span>{days[days.length - 1].day.slice(5)}</span>
      </div>
    </Panel>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid place-items-center rounded-card border border-dashed border-line-strong bg-surface px-6 py-16 text-center text-[14px] text-ink-faint">
      {children}
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center gap-2 py-10 text-ink-faint">
      <Spinner className="h-4 w-4" />
      <span className="text-[14px]">Loading…</span>
    </div>
  );
}

function ErrorNote({ msg }: { msg: string }) {
  return (
    <p className="rounded-card bg-state-error/8 px-4 py-3 text-[13px] text-state-error">
      {msg}
    </p>
  );
}

/* ─────────────────────── stats hook ─────────────────────── */

function useStats(token: string, days = 30) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await authFetch(token, `/api/admin/stats?days=${days}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load stats");
      setStats(data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }, [token, days]);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, loading, err, reload: load };
}

/* ─────────────────────── Overview ─────────────────────── */

function OverviewTab({ token }: { token: string }) {
  const { stats, loading, err } = useStats(token);

  if (loading) return <Loading />;
  if (err) return <ErrorNote msg={err} />;
  if (!stats) return null;

  const { waitlist, visitors } = stats;

  return (
    <div className="space-y-8">
      <section>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Total signups"
            value={fmtNum(waitlist.total)}
            hint="All time"
            accent="ink"
            icon={<IconList className="h-4 w-4" />}
          />
          <StatCard
            label="Last 7 days"
            value={fmtNum(waitlist.last7)}
            hint="New signups"
            accent="wellbeing"
            icon={<IconList className="h-4 w-4" />}
          />
          <StatCard
            label="Visitors"
            value={fmtNum(visitors.uniqueVisitors)}
            hint="Last 30 days"
            accent="focus"
            icon={<IconUsers className="h-4 w-4" />}
          />
          <StatCard
            label="Bounce rate"
            value={`${Math.round(visitors.bounceRate * 100)}%`}
            hint={`${fmtNum(visitors.sessions)} sessions`}
            accent="break"
            icon={<IconUsers className="h-4 w-4" />}
          />
        </div>
      </section>

      <Trend series={waitlist.series} label="Signups — last 30 days" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Signups by role">
          <BarList bars={waitlist.byRole} />
        </Panel>
        <Panel title="Signups by platform">
          <BarList bars={waitlist.byPlatform} />
        </Panel>
      </div>
    </div>
  );
}

/* ─────────────────────── Visitors ─────────────────────── */

function VisitorsTab({ token }: { token: string }) {
  const { stats, loading, err } = useStats(token);

  if (loading) return <Loading />;
  if (err) return <ErrorNote msg={err} />;
  if (!stats) return null;

  const v = stats.visitors;
  const pagesPerSession = v.sessions ? v.pageviews / v.sessions : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Pageviews" value={fmtNum(v.pageviews)} dot="focus" />
        <StatCard label="Unique visitors" value={fmtNum(v.uniqueVisitors)} dot="wellbeing" />
        <StatCard label="Sessions" value={fmtNum(v.sessions)} dot="ink" />
        <StatCard
          label="Pages / session"
          value={pagesPerSession.toFixed(1)}
          dot="ink"
        />
        <StatCard
          label="Bounce rate"
          value={`${Math.round(v.bounceRate * 100)}%`}
          dot="break"
        />
        <StatCard label="Avg. time" value={fmtDuration(v.avgDurationMs)} dot="ink" />
      </div>

      <Trend series={v.series} label="Pageviews — last 30 days" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Top pages">
          <RankedBarList bars={v.topPages} format="page" />
        </Panel>
        <Panel title="Top sources">
          <RankedBarList bars={v.topSources} format="source" />
        </Panel>
        <Panel title="Top countries">
          <RankedBarList bars={v.topCountries} format="country" />
        </Panel>
        <Panel title="By device">
          <RankedBarList bars={v.byDevice} format="device" />
        </Panel>
      </div>

      <p className="text-[12px] leading-relaxed text-ink-faint">
        First-party, cookieless analytics over the last {v.days} days.
        “Bounce” = sessions with a single pageview. “Avg. time” is measured
        from page-enter to tab-hide/leave. Percentages are share of the
        shown total.
      </p>
    </div>
  );
}

/* ─────────────────────── Waitlist ─────────────────────── */

function WaitlistTab({ token }: { token: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [role, setRole] = useState("");
  const [platform, setPlatform] = useState("");
  const [sel, setSel] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, role, platform]);

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "50" });
      if (debouncedQ) params.set("q", debouncedQ);
      if (role) params.set("role", role);
      if (platform) params.set("platform", platform);

      const res = await authFetch(token, `/api/admin/waitlist?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setRows(data.rows);
      setCount(data.count);
      setPages(data.pages);
      setSel(new Set());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token, page, debouncedQ, role, platform]);

  useEffect(() => {
    load();
  }, [load]);

  const allSelected = rows.length > 0 && sel.size === rows.length;

  function toggleAll() {
    setSel(allSelected ? new Set() : new Set(rows.map((r) => r.id)));
  }
  function toggle(id: string) {
    setSel((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function removeIds(ids: string[], label: string) {
    if (!confirm(`Remove ${label} from the waitlist?`)) return;
    const res = await authFetch(token, "/api/admin/waitlist", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(ids.length === 1 ? { id: ids[0] } : { ids }),
    });
    if (res.ok) load();
    else alert("Delete failed.");
  }

  function exportCsv() {
    const header = ["email", "role", "platform", "referrer", "created_at"];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [r.email, r.role ?? "", r.platform ?? "", r.referrer ?? "", r.created_at]
          .map((v) => esc(String(v)))
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "quoril-waitlist.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const inputCls =
    "rounded-pill border border-line-strong bg-surface px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-focus/50 focus:ring-4 focus:ring-focus/10";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search email…"
          className={`${inputCls} w-full max-w-[260px]`}
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role"
          className={`${inputCls} w-[130px]`}
        />
        <input
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          placeholder="Platform"
          className={`${inputCls} w-[130px]`}
        />
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={load}
            className="rounded-pill border border-line-strong bg-surface px-4 py-2.5 text-[13px] font-semibold text-ink transition hover:bg-sunken"
          >
            Refresh
          </button>
          <button
            onClick={exportCsv}
            disabled={!rows.length}
            className="rounded-pill bg-ink px-4 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-ink/90 disabled:opacity-50"
          >
            Export page
          </button>
        </div>
      </div>

      {sel.size > 0 && (
        <div className="flex items-center gap-3 rounded-card border border-focus/30 bg-focus/5 px-4 py-2.5 text-[13px]">
          <span className="font-semibold text-ink">{sel.size} selected</span>
          <button
            onClick={() => removeIds([...sel], `${sel.size} signups`)}
            className="font-semibold text-state-error transition hover:underline"
          >
            Delete selected
          </button>
          <button
            onClick={() => setSel(new Set())}
            className="ml-auto text-ink-faint transition hover:text-ink-muted"
          >
            Clear
          </button>
        </div>
      )}

      {err && <ErrorNote msg={err} />}

      {loading ? (
        <Loading />
      ) : rows.length === 0 ? (
        <EmptyState>No signups match your filters.</EmptyState>
      ) : (
        <>
          <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-soft">
            <table className="w-full min-w-[680px] text-left text-[14px]">
              <thead className="border-b border-line text-[11.5px] uppercase tracking-[0.05em] text-ink-faint">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all"
                      className="accent-ink"
                    />
                  </th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Platform</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-line transition last:border-0 hover:bg-sunken/50"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={sel.has(r.id)}
                        onChange={() => toggle(r.id)}
                        aria-label={`Select ${r.email}`}
                        className="accent-ink"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-ink">{r.email}</td>
                    <td className="px-4 py-3">
                      {r.role ? (
                        <span className="rounded-pill bg-sunken px-2.5 py-1 text-[12px] font-medium text-ink-muted">
                          {r.role}
                        </span>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {r.platform ? (
                        <span className="rounded-pill bg-sunken px-2.5 py-1 text-[12px] font-medium text-ink-muted">
                          {r.platform}
                        </span>
                      ) : (
                        <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-ink-muted">
                      {fmtDate(r.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => removeIds([r.id], r.email)}
                        className="text-[13px] font-semibold text-ink-faint transition hover:text-state-error"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between text-[13px] text-ink-muted">
            <span className="tabular-nums">
              Page {page} of {pages} · {fmtNum(count)} total
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-pill border border-line-strong bg-surface px-3.5 py-1.5 font-semibold text-ink transition hover:bg-sunken disabled:opacity-40"
              >
                Prev
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="rounded-pill border border-line-strong bg-surface px-3.5 py-1.5 font-semibold text-ink transition hover:bg-sunken disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────── Audit log ─────────────────────── */

function AuditTab({ token }: { token: string }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const res = await authFetch(token, "/api/admin/audit");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Failed to load");
        setRows(data.rows);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) return <Loading />;
  if (err) return <ErrorNote msg={err} />;
  if (rows.length === 0)
    return <EmptyState>No admin actions recorded yet.</EmptyState>;

  return (
    <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-soft">
      <table className="w-full min-w-[640px] text-left text-[14px]">
        <thead className="border-b border-line text-[11.5px] uppercase tracking-[0.05em] text-ink-faint">
          <tr>
            <th className="px-4 py-3 font-semibold">When</th>
            <th className="px-4 py-3 font-semibold">Admin</th>
            <th className="px-4 py-3 font-semibold">Action</th>
            <th className="px-4 py-3 font-semibold">Detail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-b border-line transition last:border-0 hover:bg-sunken/50"
            >
              <td className="px-4 py-3 tabular-nums text-ink-muted">
                {new Date(r.created_at).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-ink-muted">{r.admin_email}</td>
              <td className="px-4 py-3">
                <span className="rounded-pill bg-sunken px-2.5 py-1 text-[12px] font-semibold text-ink">
                  {r.action}
                </span>
              </td>
              <td className="px-4 py-3 text-ink-faint">
                {r.meta?.count
                  ? `${r.meta.count} row(s)`
                  : (r.target_id ?? "—")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
