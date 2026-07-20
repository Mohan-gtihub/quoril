import { NextResponse } from "next/server";
import { adminClient, verifyAdmin } from "@/lib/supabaseAdmin";

/**
 * Product metrics for the admin Metrics tab.
 *
 * Two independent sources, deliberately kept apart in the payload:
 *
 *  1. `overview`/`dailyActive`/`sessions`/`activation`/`featureUsage`/
 *     `retention` come from `public.product_events` via SECURITY DEFINER
 *     RPCs that aggregate in SQL (see `supabase/product_events.sql`).
 *     That SQL is applied by hand in the Supabase SQL editor, so it may
 *     not exist yet. Each RPC is wrapped individually: a missing
 *     function/table yields `null` for that section plus a line in
 *     `warnings`, never a 500. The dashboard shows "SQL not applied yet"
 *     instead of a broken page or fake zeros.
 *
 *  2. `derived` is computed from the entity tables (tasks, canvases,
 *     focus_sessions, subscriptions) which exist today. These are
 *     *current-state counts*, not event-derived behaviour — they answer
 *     "how much stuff exists" and cannot answer "what did users do".
 *
 * `?days=N` bounds the event window (1-365, default 30).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// focus_sessions has known-bad rows (clock skew / crashed timers writing
// garbage). Anything outside this range is excluded from totals.
const MAX_SANE_SESSION_SECONDS = 86_400;

type Warn = (msg: string) => void;

/**
 * Run one RPC in isolation. Any failure — missing function, missing
 * table, permission error — degrades to `null` + a warning rather than
 * failing the whole request.
 */
async function safeRpc<T>(
  db: ReturnType<typeof adminClient>,
  fn: string,
  args: Record<string, unknown>,
  warn: Warn,
): Promise<T | null> {
  try {
    let { data, error } = await db.rpc(fn, args);

    // 42883 = undefined_function. PostgREST resolves overloads by matching
    // the JSON body keys to a signature, so this fires not only when the
    // function is genuinely absent but also when it exists under a
    // *different* signature than we called. metrics_retention_cohorts has
    // shipped both as ()  and as (days INT); a database that applied an
    // older revision of product_events.sql still has the zero-arg form.
    // Retrying argument-less makes this route work against either.
    if (error?.code === "42883" && Object.keys(args).length > 0) {
      const retry = await db.rpc(fn, {});
      if (!retry.error) {
        return (retry.data ?? null) as T | null;
      }
      // Prefer the retry's error only if it is not itself a resolution
      // failure — otherwise the original message is the more useful one.
      if (retry.error.code !== "42883") error = retry.error;
    }

    if (error) {
      // Only a genuine 42883 after the retry, or 42P01 (undefined_table),
      // means "the SQL was never applied". Anything else means the objects
      // exist but the call failed — permissions, bad argument, an error
      // inside the function. Reporting those as "not installed" sends
      // people to re-run SQL that is already correct. Always include the
      // real message and code so a wrong guess is self-correcting.
      const missing = error.code === "42883" || error.code === "42P01";
      const detail = `${error.message}${error.code ? ` (${error.code})` : ""}`;
      warn(
        missing
          ? `${fn}: not found in the database — apply supabase/product_events.sql in the Supabase SQL editor, then run NOTIFY pgrst, 'reload schema'. [${detail}]`
          : `${fn}: ${detail}`,
      );
      return null;
    }
    return (data ?? null) as T | null;
  } catch (err) {
    warn(`${fn}: ${err instanceof Error ? err.message : "unknown error"}`);
    return null;
  }
}

/** Earliest product_events row, so the UI can say "collecting since X". */
async function earliestEventAt(
  db: ReturnType<typeof adminClient>,
  warn: Warn,
): Promise<string | null> {
  try {
    const { data, error } = await db
      .from("product_events")
      .select("created_at")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) {
      const missing = error.code === "42P01";
      warn(
        missing
          ? "product_events: table not created — apply supabase/product_events.sql in the Supabase SQL editor."
          : `product_events: ${error.message}`,
      );
      return null;
    }
    return (data?.created_at as string) ?? null; // null = table exists but empty
  } catch (err) {
    warn(
      `product_events: ${err instanceof Error ? err.message : "unknown error"}`,
    );
    return null;
  }
}

/** Exact row count for a table, or null if it isn't reachable. */
async function safeCount(
  db: ReturnType<typeof adminClient>,
  table: string,
  warn: Warn,
): Promise<number | null> {
  try {
    const { count, error } = await db
      .from(table)
      .select("id", { count: "exact", head: true });
    if (error) {
      warn(`${table} count: ${error.message}`);
      return null;
    }
    return count ?? 0;
  } catch (err) {
    warn(`${table} count: ${err instanceof Error ? err.message : "unknown"}`);
    return null;
  }
}

/**
 * Focus totals with corrupt rows excluded at the query level, so the bad
 * rows never enter the sum. Also reports how many were dropped — a
 * spiking `excludedRows` is itself a bug signal worth surfacing.
 */
async function focusTotals(
  db: ReturnType<typeof adminClient>,
  warn: Warn,
): Promise<{
  sessions: number;
  totalSeconds: number;
  excludedRows: number;
} | null> {
  try {
    const [valid, all] = await Promise.all([
      db
        .from("focus_sessions")
        .select("seconds")
        .gte("seconds", 0)
        .lte("seconds", MAX_SANE_SESSION_SECONDS)
        .limit(200_000),
      db
        .from("focus_sessions")
        .select("id", { count: "exact", head: true }),
    ]);

    if (valid.error) {
      warn(`focus_sessions: ${valid.error.message}`);
      return null;
    }

    const rows = valid.data ?? [];
    const totalSeconds = rows.reduce(
      (sum, r) => sum + (Number(r.seconds) || 0),
      0,
    );
    const totalRows = all.count ?? rows.length;

    return {
      sessions: rows.length,
      totalSeconds,
      excludedRows: Math.max(totalRows - rows.length, 0),
    };
  } catch (err) {
    warn(
      `focus_sessions: ${err instanceof Error ? err.message : "unknown error"}`,
    );
    return null;
  }
}

/** User counts grouped by subscription tier. Users with no row are 'free'. */
async function usersByTier(
  db: ReturnType<typeof adminClient>,
  warn: Warn,
): Promise<Record<string, number> | null> {
  try {
    const { data, error } = await db
      .from("subscriptions")
      .select("tier")
      .limit(100_000);
    if (error) {
      warn(`subscriptions: ${error.message}`);
      return null;
    }
    const out: Record<string, number> = {};
    for (const r of data ?? []) {
      const t = (r.tier as string) || "free";
      out[t] = (out[t] ?? 0) + 1;
    }
    return out;
  } catch (err) {
    warn(
      `subscriptions: ${err instanceof Error ? err.message : "unknown error"}`,
    );
    return null;
  }
}

export async function GET(req: Request) {
  const admin = await verifyAdmin(req.headers.get("authorization"));
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const days = Math.min(
    Math.max(Number(url.searchParams.get("days")) || 30, 1),
    365,
  );

  const warnings: string[] = [];
  const warn: Warn = (m) => {
    warnings.push(m);
  };

  try {
    const db = adminClient();
    const args = { days };

    const [
      overview,
      dailyActive,
      sessions,
      activation,
      featureUsage,
      retention,
      firstEventAt,
      taskCount,
      canvasCount,
      focus,
      byTier,
    ] = await Promise.all([
      safeRpc<unknown>(db, "metrics_overview", args, warn),
      safeRpc<unknown[]>(db, "metrics_daily_active", args, warn),
      safeRpc<unknown[]>(db, "metrics_sessions", args, warn),
      safeRpc<unknown[]>(db, "metrics_activation", args, warn),
      safeRpc<unknown[]>(db, "metrics_feature_usage", args, warn),
      // Passes `days` like every other metrics RPC. An empty body ({}) made
      // PostgREST fail to resolve the old zero-arg overload and return
      // 42883, which surfaced as a bogus "SQL not applied" warning.
      // Retention needs a longer window than the tiles, so it floors at 90d.
      safeRpc<unknown[]>(
        db,
        "metrics_retention_cohorts",
        { days: Math.max(days, 90) },
        warn,
      ),
      earliestEventAt(db, warn),
      safeCount(db, "tasks", warn),
      safeCount(db, "canvases", warn),
      focusTotals(db, warn),
      usersByTier(db, warn),
    ]);

    // metrics_overview returns a single row; RPCs returning TABLE come
    // back as an array even when there's exactly one row.
    const overviewRow = Array.isArray(overview)
      ? (overview[0] ?? null)
      : overview;

    const eventsAvailable =
      overviewRow !== null ||
      dailyActive !== null ||
      sessions !== null ||
      activation !== null ||
      featureUsage !== null ||
      retention !== null;

    return NextResponse.json({
      // ── Event-derived (needs supabase/product_events.sql) ──
      overview: overviewRow,
      dailyActive,
      sessions,
      activation,
      featureUsage,
      retention,

      // ── Entity-table derived (works today, no events needed) ──
      derived: {
        source: "entity_tables",
        note:
          "Current-state counts from the tasks / canvases / focus_sessions / " +
          "subscriptions tables — not event data. Lifetime totals, unaffected " +
          "by the ?days window.",
        totalTasks: taskCount,
        totalCanvases: canvasCount,
        focusSessions: focus?.sessions ?? null,
        focusTotalSeconds: focus?.totalSeconds ?? null,
        // Rows dropped for seconds < 0 or > 24h. Non-zero is a data-quality signal.
        focusExcludedRows: focus?.excludedRows ?? null,
        usersByTier: byTier,
      },

      meta: {
        days,
        generatedAt: new Date().toISOString(),
        // null with no warnings = table exists but is empty (no data yet).
        // null with warnings = the SQL hasn't been applied.
        earliestEventAt: firstEventAt,
        eventsAvailable,
      },

      warnings,
    });
  } catch (err) {
    console.error("admin metrics failed", err);
    return NextResponse.json(
      { error: "Failed to load metrics." },
      { status: 500 },
    );
  }
}
