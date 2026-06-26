import { NextResponse } from "next/server";
import { adminClient, verifyAdmin } from "@/lib/supabaseAdmin";

/**
 * Aggregated dashboard stats for the admin Overview + Visitors tabs.
 *
 * Combines waitlist signups with first-party visitor analytics. All
 * aggregation happens here (service role) so raw rows never reach the
 * browser. `?days=N` bounds the visitor window (default 30).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Counter = Record<string, number>;

function tally(rows: { [k: string]: unknown }[], key: string): Counter {
  const out: Counter = {};
  for (const r of rows) {
    const v = (r[key] as string) || "—";
    out[v] = (out[v] ?? 0) + 1;
  }
  return out;
}

function topN(c: Counter, n = 8): { name: string; count: number }[] {
  return Object.entries(c)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

function dayKey(iso: string): string {
  return iso.slice(0, 10); // YYYY-MM-DD
}

export async function GET(req: Request) {
  const admin = await verifyAdmin(req.headers.get("authorization"));
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const days = Math.min(Math.max(Number(url.searchParams.get("days")) || 30, 1), 365);
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const since7 = new Date(Date.now() - 7 * 86_400_000).toISOString();

  try {
    const db = adminClient();

    // ── Waitlist ───────────────────────────────────────────
    const { data: signups, count: total } = await db
      .from("waitlist")
      .select("role, platform, created_at", { count: "exact" })
      .order("created_at", { ascending: false });

    const rows = signups ?? [];
    const last7 = rows.filter((r) => (r.created_at as string) >= since7).length;
    const last30 = rows.filter((r) => (r.created_at as string) >= since).length;

    const signupSeries: Counter = {};
    for (const r of rows) {
      if ((r.created_at as string) >= since) {
        const k = dayKey(r.created_at as string);
        signupSeries[k] = (signupSeries[k] ?? 0) + 1;
      }
    }

    // ── Visitor analytics ──────────────────────────────────
    const { data: events } = await db
      .from("analytics_events")
      .select("type, path, source, country, device, visitor_id, session_id, duration_ms, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50_000);

    const ev = events ?? [];
    const pageviews = ev.filter((e) => e.type === "pageview");
    const exits = ev.filter((e) => e.type === "exit");

    const uniqueVisitors = new Set(ev.map((e) => e.visitor_id)).size;
    const sessions = new Set(ev.map((e) => e.session_id)).size;

    // Bounce: sessions with exactly one pageview.
    const pvPerSession: Counter = {};
    for (const e of pageviews) {
      pvPerSession[e.session_id as string] =
        (pvPerSession[e.session_id as string] ?? 0) + 1;
    }
    const sessionsWithPv = Object.keys(pvPerSession).length;
    const bounced = Object.values(pvPerSession).filter((n) => n === 1).length;
    const bounceRate = sessionsWithPv ? bounced / sessionsWithPv : 0;

    const durations = exits
      .map((e) => e.duration_ms as number)
      .filter((d) => typeof d === "number" && d > 0);
    const avgDuration = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    const visitorSeries: Counter = {};
    for (const e of pageviews) {
      const k = dayKey(e.created_at as string);
      visitorSeries[k] = (visitorSeries[k] ?? 0) + 1;
    }

    return NextResponse.json({
      waitlist: {
        total: total ?? 0,
        last7,
        last30,
        byRole: topN(tally(rows, "role")),
        byPlatform: topN(tally(rows, "platform")),
        series: signupSeries,
      },
      visitors: {
        days,
        pageviews: pageviews.length,
        uniqueVisitors,
        sessions,
        bounceRate,
        avgDurationMs: avgDuration,
        topPages: topN(tally(pageviews, "path")),
        topSources: topN(tally(pageviews, "source")),
        topCountries: topN(tally(pageviews, "country")),
        byDevice: topN(tally(pageviews, "device")),
        series: visitorSeries,
      },
    });
  } catch (err) {
    console.error("admin stats failed", err);
    return NextResponse.json(
      { error: "Failed to load stats." },
      { status: 500 },
    );
  }
}
