import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Public health/uptime probe.
 *
 * Reports whether the app can reach Supabase and the current waitlist
 * count (via the public SECURITY DEFINER function — no service role
 * needed). Safe to expose: returns no PII. Use for uptime monitors.
 *
 *   200 { status: "ok",       db: true  }
 *   503 { status: "degraded", db: false }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function GET() {
  const startedAt = Date.now();
  const base = {
    service: "quoril-landing",
    time: new Date().toISOString(),
  };

  if (!URL || !KEY) {
    return NextResponse.json(
      { ...base, status: "degraded", db: false, error: "unconfigured" },
      { status: 503 },
    );
  }

  try {
    const supabase = createClient(URL, KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.rpc("waitlist_count");
    if (error) throw error;

    return NextResponse.json({
      ...base,
      status: "ok",
      db: true,
      waitlistCount: Number(data ?? 0),
      latencyMs: Date.now() - startedAt,
    });
  } catch (err) {
    console.error("health check failed", err);
    return NextResponse.json(
      {
        ...base,
        status: "degraded",
        db: false,
        latencyMs: Date.now() - startedAt,
      },
      { status: 503 },
    );
  }
}
