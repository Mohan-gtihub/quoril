# Quoril Admin Panel — Setup

The admin panel lives at **`/admin`** on the landing site. It lets you view
the waitlist, visitor analytics, and an audit log. This document explains the
one-time setup: there is **no hardcoded password** — login uses real Supabase
Auth accounts, gated by an email allowlist.

---

## What you need

| Thing | What it is | Where it comes from |
| --- | --- | --- |
| **Service-role key** | A secret Supabase API key that bypasses Row-Level Security so the panel can read/delete private rows. | Supabase Dashboard (you copy it). |
| **Admin login** | A real Supabase Auth user (email + password) that you sign in with. | You create it in the dashboard. |
| **Admin allowlist** | The list of emails permitted to use the panel. | Two sources: the `ADMIN_EMAILS` env var (break-glass) **and** the `admin_allowlist` database table, managed from the panel's **Access** tab. |

---

## Step 1 — Run the SQL migrations

In **Supabase Dashboard → SQL Editor**, run these in order (if not already):

1. `supabase/web_waitlist.sql`
2. `supabase/web_analytics.sql`  ✅ (already done)
3. `supabase/admin_allowlist.sql` — required for the **Access** tab. Until
   you paste and run it, the Access tab shows a "not installed yet" notice and
   only `ADMIN_EMAILS` grants access. Login keeps working either way.

---

## Step 2 — Get the service-role key

1. Supabase Dashboard → your project → **Project Settings → API**
   (newer UI: **Project Settings → API Keys**).
2. Under **Project API keys**, find **`service_role`** marked `secret`.
3. Click **Reveal** and copy the long `eyJ...` string.

> ⚠️ This key has full admin access to your database. **Never** commit it,
> never expose it to the browser, never give it a `NEXT_PUBLIC_` prefix.
> It only belongs in server-side environment variables.

---

## Step 3 — Create your admin login

1. Supabase Dashboard → **Authentication → Users → Add user**.
2. Enter:
   - **Email:** `kilarimohansai@gmail.com` (or whichever you want)
   - **Password:** choose a strong one — **this is your admin password.**
3. (Optional) enable **Auto Confirm User** so you can log in immediately.

This email + password is what you type on the `/admin` sign-in screen.

---

## Step 4 — Set the environment variables

Set these wherever the landing site is deployed (and in `landing/.env` for
local dev):

```bash
# Already present (public, safe to expose):
NEXT_PUBLIC_SUPABASE_URL=https://izxoyfydqsopvaywrtuz.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# New — required for the admin panel (server-side secrets):
SUPABASE_SERVICE_ROLE_KEY=eyJ...            # from Step 2
ADMIN_EMAILS=kilarimohansai@gmail.com   # comma-separated allowlist
```

### On Vercel
1. Project → **Settings → Environment Variables**.
2. Add `SUPABASE_SERVICE_ROLE_KEY` and `ADMIN_EMAILS`.
3. Scope them to **Production** (and Preview if you want).
4. **Redeploy** — env var changes only take effect on a new deploy.

### Local (`landing/.env`)
Add the same two lines, then restart `npm run dev`.

---

## Step 5 — Sign in

1. Go to `https://your-site/admin` (or `http://localhost:3000/admin`).
2. Sign in with the email + password from Step 3.
3. The server checks your email against `ADMIN_EMAILS` **and** the
   `admin_allowlist` table. If it's on neither, access is denied — **access
   fails closed**, so an empty `ADMIN_EMAILS` with an empty/missing table
   blocks everyone.

---

## How access control works

- Login issues a Supabase access token in the browser.
- Every admin API call sends that token; the server (`lib/supabaseAdmin.ts` →
  `verifyAdmin`) re-validates it **and** checks the email against two sources.
- Only then does it use the **service-role key** to read/delete data.
- The service-role key never reaches the browser.

### The two access sources

Access is granted if the signed-in email matches **either** source. Both
comparisons are trimmed and case-insensitive.

| Source | Where | Changed by | Survives DB outage? |
| --- | --- | --- | --- |
| `ADMIN_EMAILS` | Env var, comma-separated | Editing the env var **+ redeploy** | ✅ Yes — this is the break-glass list |
| `public.admin_allowlist` | Database table | The panel's **Access** tab, instantly | ❌ No |

**Break-glass behaviour.** The env list is checked first and always wins. If
the database query fails for any reason — including the table not existing yet
(`SQLSTATE 42P01`, before you've applied the SQL) — `verifyAdmin` silently
falls back to **env-only** rather than erroring. A database problem can never
lock you out of your own panel, and it can never widen access either: the
failure mode is "no extra admins", not "everyone".

Keep at least one real address in `ADMIN_EMAILS` permanently. It's what gets
you back in if the allowlist table is dropped or misconfigured.

**Caching.** The table is cached in memory for 30s to avoid a DB round-trip on
every admin request. Adds and removes made through the panel invalidate the
cache immediately, so changes take effect at once; rows edited directly in the
database can take up to 30s (and won't propagate to other server instances
until their own TTL expires).

## Adding or removing admins

**Normally — use the Access tab.** Type the person's email, optionally a note,
and click Add. No redeploy needed.

> ⚠️ **Adding an email does NOT create an account.** It only grants panel
> access to an email that already has a Quoril Supabase Auth account. The
> person must already have — or go create — an account with that **exact**
> address (Step 3), then sign in at `/admin` with their normal password. No
> invite email is sent.

Removing a row revokes access immediately. **You cannot remove your own
access** — the API rejects self-removal so you can't lock yourself out.

**Break-glass — editing `ADMIN_EMAILS`.** Env admins appear in the Access tab
labelled *"from environment"* and cannot be removed there. To change them, edit
the env var and redeploy.

Both add and remove are written to the audit log as `allowlist.add` /
`allowlist.remove`.

### `admin_allowlist` table

Created by `supabase/admin_allowlist.sql`. Columns: `id`, `email`, `note`,
`added_by` (the admin who added them), `created_at`. A unique index on
`lower(email)` makes emails case-insensitive.

The table is **service_role-only**: RLS is enabled with *no* policies, and all
privileges are revoked from `PUBLIC`, `anon`, and `authenticated`. It is read
exclusively server-side by `verifyAdmin`. A signed-in user can't see who the
admins are, let alone add themselves.

## Access list — `/api/admin/allowlist`

Admin token required, like every other admin route.

| Method | Does | Notes |
| --- | --- | --- |
| `GET` | Lists DB entries (newest first) plus `envAdmins` | `setupRequired: true` means the SQL hasn't been applied |
| `POST` | Adds `{ email, note? }` | Lowercased + trimmed. `409` if already an admin (DB or env), `422` if malformed, `503` if the table is missing |
| `DELETE` | Removes `{ id }` | `400` "You cannot remove your own access." on self-removal, `404` if already gone |

All responses are JSON; raw Postgres errors are never returned to the client.

## Product metrics — `GET /api/admin/metrics`

Returns the product analytics payload for the Metrics tab. Admin token
required (same `Authorization: Bearer` as every other admin route).
`?days=N` bounds the event window (1–365, default 30).

> ⚠️ **You must paste `supabase/product_events.sql` into the Supabase SQL
> editor and run it before any event metrics appear.** It creates the
> `public.product_events` table and the `metrics_*` aggregation functions.
> Until you do, the event sections return `null` — this is expected, not a
> bug.

The response has three parts:

| Key | Source | Needs the SQL? |
| --- | --- | --- |
| `overview`, `dailyActive`, `sessions`, `activation`, `featureUsage`, `retention` | `product_events` + `metrics_*` RPCs | **Yes** |
| `derived` | Entity tables (`tasks`, `canvases`, `focus_sessions`, `subscriptions`) | No — works today |
| `meta`, `warnings` | The route itself | No |

**Graceful degradation.** Each RPC is wrapped individually. If the SQL
hasn't been applied, that section is `null` and `warnings` names it, e.g.
`"metrics_overview: not installed — apply supabase/product_events.sql in
the Supabase SQL editor."` The route still returns **200** with whatever it
could gather, so the dashboard shows a clear "SQL not applied yet" notice
rather than a broken page or misleading zeros. Always render `warnings` if
it is non-empty.

**`meta.earliestEventAt`** is the timestamp of the oldest `product_events`
row (`null` if the table is empty or absent). Show it as *"data collected
since X"* — without it a two-day-old empty chart looks like a product
collapse rather than a fresh install. Distinguish the two `null` cases via
`warnings`: empty with no warnings means the table exists but has no data
yet; `null` with warnings means the SQL is missing.

**`derived`** is deliberately separate: these are lifetime current-state
counts from entity tables, *not* behavioural event data, and they ignore
`?days`. `focusTotalSeconds` excludes corrupt `focus_sessions` rows
(`seconds < 0` or `> 86400`); the count of dropped rows is reported as
`focusExcludedRows` — if that number is large or growing, the timer is
writing bad data.

## Health check

`GET /api/health` returns `{ status: "ok", db: true, waitlistCount }` — point
an uptime monitor at it. No auth required, no PII exposed.
