import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Waitlist persistence — backed by the Quoril Supabase project.
 *
 * Signups land in the `public.waitlist` table (see
 * supabase/web_waitlist.sql). Inserts use the public anon key, which
 * RLS permits; the collected emails are NOT readable through the
 * public API. Duplicate emails are caught via a UNIQUE index
 * (SQLSTATE 23505) and the social-proof count comes from the
 * `waitlist_count()` SECURITY DEFINER function.
 *
 * The route handler and the client component never touch Supabase
 * directly — they only use the interface below.
 */

export interface Signup {
  email: string;
  role?: string;
  platform?: string;
  createdAt: string;
  referrer?: string;
}

export interface AddResult {
  ok: boolean;
  duplicate?: boolean;
  count: number;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Seed count so the social-proof number never looks empty in early days.
const SEED_COUNT = 1284;

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;

// Prefer the service-role key when present (full access), otherwise fall
// back to the public anon/publishable key, which RLS allows to INSERT.
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY " +
        "(or NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) " +
        "in the landing site environment.",
    );
  }
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

async function rawCount(): Promise<number> {
  const { data, error } = await getClient().rpc("waitlist_count");
  if (error) throw error;
  return typeof data === "number" ? data : Number(data ?? 0);
}

export async function countSignups(): Promise<number> {
  try {
    return SEED_COUNT + (await rawCount());
  } catch {
    // Never let the social-proof number break the page.
    return SEED_COUNT;
  }
}

export async function addSignup(input: Signup): Promise<AddResult> {
  const email = input.email.trim().toLowerCase();

  const { error } = await getClient().from("waitlist").insert({
    email,
    role: input.role || null,
    platform: input.platform || null,
    referrer: input.referrer || null,
    created_at: input.createdAt,
  });

  // 23505 = unique_violation → already on the list.
  if (error && error.code === "23505") {
    return { ok: true, duplicate: true, count: await countSignups() };
  }
  if (error) throw error;

  return { ok: true, count: await countSignups() };
}
