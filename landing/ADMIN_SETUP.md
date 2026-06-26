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
| **Admin allowlist** | The list of emails permitted to use the panel. | You set it as an env var. |

---

## Step 1 — Run the SQL migrations

In **Supabase Dashboard → SQL Editor**, run these in order (if not already):

1. `supabase/web_waitlist.sql`
2. `supabase/web_analytics.sql`  ✅ (already done)

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
   - **Email:** `devgraphix.digital@gmail.com` (or whichever you want)
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
ADMIN_EMAILS=devgraphix.digital@gmail.com   # comma-separated allowlist
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
3. The server checks your email against `ADMIN_EMAILS`. If it's not on the
   list, access is denied — **the allowlist fails closed**, so an empty
   `ADMIN_EMAILS` blocks everyone.

---

## How access control works

- Login issues a Supabase access token in the browser.
- Every admin API call sends that token; the server (`lib/supabaseAdmin.ts` →
  `verifyAdmin`) re-validates it **and** checks the email is in
  `ADMIN_EMAILS`.
- Only then does it use the **service-role key** to read/delete data.
- The service-role key never reaches the browser.

## Adding or removing admins

Edit `ADMIN_EMAILS` (comma-separated) and redeploy. To create another admin's
login, repeat Step 3 with their email. To revoke someone, remove their email
from `ADMIN_EMAILS` (and optionally delete their user in Supabase Auth).

## Health check

`GET /api/health` returns `{ status: "ok", db: true, waitlistCount }` — point
an uptime monitor at it. No auth required, no PII exposed.
