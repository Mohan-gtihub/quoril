import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Public visitor-analytics ingest endpoint ("pixel").
 *
 * The landing site posts pageview / exit / custom events here. We
 * insert them with the anon key (RLS permits INSERT only), enrich
 * with the request's country/IP-derived hints, and never read them
 * back through this route — the admin panel does that via the
 * service role. Failures are swallowed so tracking can never break
 * a visitor's experience.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const ALLOWED_TYPES = new Set(["pageview", "exit", "click", "event"]);

function deviceFromUA(ua: string): string {
  const s = ua.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(s)) return "tablet";
  if (/mobi|android|iphone|ipod/.test(s)) return "mobile";
  return "desktop";
}

function str(v: unknown, max = 512): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

export async function POST(req: Request) {
  if (!URL || !KEY) {
    // Tracking is best-effort; act as a no-op when unconfigured.
    return NextResponse.json({ ok: true });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const type = str(body.type, 32) ?? "pageview";
  const visitorId = str(body.visitorId, 64);
  const sessionId = str(body.sessionId, 64);
  if (!ALLOWED_TYPES.has(type) || !visitorId || !sessionId) {
    return NextResponse.json({ error: "Invalid event." }, { status: 422 });
  }

  const ua = req.headers.get("user-agent") ?? "";
  const country =
    req.headers.get("x-vercel-ip-country") ??
    req.headers.get("cf-ipcountry") ??
    null;

  const durationRaw = body.durationMs;
  const durationMs =
    typeof durationRaw === "number" && durationRaw >= 0 && durationRaw < 6e6
      ? Math.round(durationRaw)
      : null;

  try {
    const supabase = createClient(URL, KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await supabase.from("analytics_events").insert({
      visitor_id: visitorId,
      session_id: sessionId,
      type,
      path: str(body.path, 1024),
      referrer: str(body.referrer, 1024),
      source: str(body.source, 256),
      country,
      device: deviceFromUA(ua),
      user_agent: ua.slice(0, 512),
      duration_ms: durationMs,
      meta: (body.meta as Record<string, unknown>) ?? null,
    });
  } catch (err) {
    console.error("track insert failed", err);
    // Still report ok — analytics must never surface errors to visitors.
  }

  return NextResponse.json({ ok: true });
}
