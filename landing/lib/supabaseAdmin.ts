import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase helpers for the admin panel.
 *
 * - `adminClient()` uses the service-role key, which bypasses RLS so the
 *   panel can read/delete waitlist rows the public can't see.
 * - `verifyAdmin()` validates the caller's access token with the anon
 *   client and checks the email against the ADMIN_EMAILS allowlist.
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
 * Returns the verified admin for a Bearer token, or null if the token
 * is invalid or the email is not on the allowlist.
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

  const email = data.user.email.toLowerCase();
  const allow = adminEmails();
  // If no allowlist is configured, deny by default — fail closed.
  if (allow.length === 0 || !allow.includes(email)) return null;

  return { id: data.user.id, email };
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
