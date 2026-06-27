"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client — used ONLY for admin login on /admin.
 * Talks to the same Quoril project with the public anon key; the
 * resulting access token is sent to the admin API, which re-verifies
 * it server-side before touching any data.
 *
 * The client is created lazily so this module can be evaluated during the
 * production build (e.g. when Next.js prerenders /admin) without the public
 * env vars present. createClient() throws "supabaseUrl is required" if called
 * with an undefined URL, which previously broke `next build` on Vercel.
 */
let _client: SupabaseClient | null = null;

function getSupabaseBrowser(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string;

  _client = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: "quoril-admin-auth",
    },
  });
  return _client;
}

/**
 * Proxy that defers client creation until the first property access — at
 * runtime in the browser, never at module-eval time during the build.
 * Existing call sites keep using `supabaseBrowser.auth...` unchanged.
 */
export const supabaseBrowser = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseBrowser();
    return Reflect.get(client, prop, receiver);
  },
});
