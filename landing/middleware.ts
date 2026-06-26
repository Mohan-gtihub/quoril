import { NextResponse, type NextRequest } from "next/server";

/**
 * Secret admin path.
 *
 * The admin UI physically lives at `app/admin`, but we never expose
 * `/admin` publicly. Instead the panel is reachable only at
 * `/<ADMIN_PATH>`, an unguessable slug stored in an env var. Requests to
 * the secret path are *internally rewritten* to `/admin` (URL stays
 * secret in the browser); requests to the literal `/admin` return 404 so
 * the panel's existence is not revealed.
 *
 * NOTE: this is obscurity, not authentication. The real lock is the
 * Supabase JWT + ADMIN_EMAILS allowlist enforced in /api/admin/* routes
 * (see lib/supabaseAdmin.ts). A secret path only keeps the page out of
 * casual sight and scanners.
 */

const ADMIN_PATH = (process.env.ADMIN_PATH ?? "").trim().replace(/^\/+|\/+$/g, "");

function notFound() {
  // Render the app's 404 with a real 404 status.
  return new NextResponse(null, { status: 404 });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Hide the literal /admin entirely.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return notFound();
  }

  // If a secret path is configured, map it to the admin page.
  if (ADMIN_PATH) {
    const secret = `/${ADMIN_PATH}`;
    if (pathname === secret || pathname === `${secret}/`) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      const res = NextResponse.rewrite(url);
      // Flag the rewrite so the root layout strips the public nav/footer.
      // The browser URL stays the secret slug (it does not start with
      // /admin), so the layout can't detect admin from the path alone.
      // Server-only cookie — the client never needs to read it.
      res.cookies.set("qadmin", "1", {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      });
      return res;
    }
  }

  // Any other page: make sure the admin flag is not lingering, so the
  // public nav/footer reliably return after leaving the panel.
  const res = NextResponse.next();
  if (req.cookies.has("qadmin")) {
    res.cookies.set("qadmin", "", { path: "/", maxAge: 0 });
  }
  return res;
}

export const config = {
  // Run on every top-level path so we can both (a) 404 the literal
  // /admin and (b) match the secret slug. Static assets and /api are
  // excluded for performance. API routes under /api/admin keep their own
  // JWT auth, so the panel's fetches still work.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
