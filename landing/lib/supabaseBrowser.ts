"use client";

import { createClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client — used ONLY for admin login on /admin.
 * Talks to the same Quoril project with the public anon key; the
 * resulting access token is sent to the admin API, which re-verifies
 * it server-side before touching any data.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;

export const supabaseBrowser = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storageKey: "quoril-admin-auth",
  },
});
