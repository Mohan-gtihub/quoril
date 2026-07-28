import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase helpers for the admin panel.
 *
 * - `adminClient()` uses the service-role key, which bypasses RLS so the
 *   panel can read/delete waitlist rows the public can't see.
 * - `verifyAdmin()` validates the caller's access token with the anon
 *   client and checks the email against BOTH the ADMIN_EMAILS env
 *   allowlist (break-glass) and the public.admin_allowlist table.
 *
 * The service-role key must NEVER reach the browser — it is read here
 * from a non-public env var and only used in route handlers.
 */

const URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function adminClient(): SupabaseClient {
  if (!URL || !SERVICE_KEY) {
    throw new Error(
      "Admin panel is not configured: set SUPABASE_SERVICE_ROLE_KEY " +
        "(and SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL).",
    );
  }
  return createClient(URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface AdminUser {
  id: string;
  email: string;
}

/**
 * Cached snapshot of public.admin_allowlist emails (lowercased).
 *
 * TRADEOFF: a 30s TTL saves a DB round-trip on every admin API call
 * (the console fires several per tab switch). The cost is that a
 * newly added admin may see "Unauthorized" for up to 30s before
 * their first successful sign-in. To keep that from biting, the
 * allowlist route calls `invalidateAllowlistCache()` after every
 * add/remove, so in practice changes made through the panel take
 * effect immediately — the TTL only covers rows changed directly in
 * the database, or a second server instance that didn't handle the
 * write.
 */
const ALLOWLIST_TTL_MS = 30_000;
let allowlistCache: { emails: Set<string>; at: number } | null = null;

/** Drop the cached allowlist so the next check re-reads the table. */
export function invalidateAllowlistCache(): void {
  allowlistCache = null;
}

/**
 * Emails from public.admin_allowlist, lowercased.
 *
 * FAILS SOFT TO EMPTY, never throws: if the table is missing
 * (SQLSTATE 42P01 — the SQL hasn't been pasted into the Supabase
 * editor yet), or the query errors for any other reason, this
 * returns an empty set so `verifyAdmin` falls back to env-only.
 * That degrades to today's behaviour rather than locking the user
 * out of their own panel. It can never widen access, because the
 * failure mode is "no extra admins", not "everyone".
 */
async function dbAllowlist(): Promise<Set<string>> {
  const now = Date.now();
  if (allowlistCache && now - allowlistCache.at < ALLOWLIST_TTL_MS) {
    return allowlistCache.emails;
  }

  try {
    const { data, error } = await adminClient()
      .from("admin_allowlist")
      .select("email");

    if (error) {
      // 42P01 = undefined_table. Expected before the SQL is applied;
      // stay quiet so it doesn't spam logs on every request.
      if (error.code !== "42P01") {
        console.error("admin allowlist read failed", error);
      }
      // Cache the empty result too — otherwise a missing table means
      // a failed query on every single admin request.
      allowlistCache = { emails: new Set(), at: now };
      return allowlistCache.emails;
    }

    const emails = new Set(
      (data ?? [])
        .map((r) => String(r.email ?? "").trim().toLowerCase())
        .filter(Boolean),
    );
    allowlistCache = { emails, at: now };
    return emails;
  } catch (err) {
    // adminClient() throws when the service-role key is unset.
    console.error("admin allowlist unavailable", err);
    allowlistCache = { emails: new Set(), at: now };
    return allowlistCache.emails;
  }
}

/** The ADMIN_EMAILS break-glass list, for the UI to display. */
export function envAdminEmails(): string[] {
  return adminEmails();
}

/**
 * Returns the verified admin for a Bearer token, or null if the token
 * is invalid or the email is on neither allowlist.
 *
 * Access is granted if the email is EITHER in ADMIN_EMAILS (the
 * break-glass env list, which always wins) OR in the
 * public.admin_allowlist table. Both comparisons are trimmed and
 * case-insensitive. Fails closed: if neither source names the email,
 * access is denied, and a DB failure degrades to env-only.
 */
export async function verifyAdmin(
  authHeader: string | null,
): Promise<AdminUser | null> {
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token || !URL || !ANON_KEY) return null;

  const anon = createClient(URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await anon.auth.getUser(token);
  if (error || !data.user?.email) return null;

  const email = data.user.email.trim().toLowerCase();

  // 1. Break-glass env list — checked first, no DB round-trip needed.
  if (adminEmails().includes(email)) return { id: data.user.id, email };

  // 2. Database allowlist, managed from the panel's Access tab.
  const fromDb = await dbAllowlist();
  if (fromDb.has(email)) return { id: data.user.id, email };

  // On neither list — deny. An empty ADMIN_EMAILS plus a missing or
  // empty table blocks everyone, which is the intended fail-closed
  // behaviour.
  return null;
}

/**
 * Append an entry to the audit log. Best-effort: a logging failure must
 * not abort the underlying admin action, so errors are swallowed.
 */
export async function audit(
  adminEmail: string,
  action: string,
  targetId?: string | null,
  meta?: Record<string, unknown>,
): Promise<void> {
  try {
    await adminClient()
      .from("audit_log")
      .insert({
        admin_email: adminEmail,
        action,
        target_id: targetId ?? null,
        meta: meta ?? null,
      });
  } catch (err) {
    console.error("audit log write failed", err);
  }
}
