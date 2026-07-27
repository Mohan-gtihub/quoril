import { NextResponse } from "next/server";
import {
  adminClient,
  audit,
  envAdminEmails,
  invalidateAllowlistCache,
  verifyAdmin,
} from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SELECT = "id, email, note, added_by, created_at";
const MAX_NOTE = 200;

// Deliberately permissive — real validation is "can they sign in",
// not a regex. This only catches obvious typos and empty input.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdmin(req: Request) {
  const admin = await verifyAdmin(req.headers.get("authorization"));
  if (!admin) {
    return {
      admin: null,
      res: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { admin, res: null as null };
}

// ── GET: list DB allowlist entries + the read-only env admins ──
export async function GET(req: Request) {
  const { admin, res } = await requireAdmin(req);
  if (!admin) return res;

  // The env list never fails and is what actually keeps the user in,
  // so it is returned even when the table read fails.
  const envAdmins = envAdminEmails();

  try {
    const { data, error } = await adminClient()
      .from("admin_allowlist")
      .select(SELECT)
      .order("created_at", { ascending: false });

    if (error) {
      // 42P01 = table missing: the SQL hasn't been applied yet. That's
      // a setup state, not an error — return an empty list plus a
      // notice the UI can surface.
      if (error.code === "42P01") {
        return NextResponse.json({
          rows: [],
          envAdmins,
          setupRequired: true,
        });
      }
      throw error;
    }

    return NextResponse.json({
      rows: data ?? [],
      envAdmins,
      setupRequired: false,
    });
  } catch (err) {
    console.error("admin allowlist list failed", err);
    return NextResponse.json(
      { error: "Failed to load the access list." },
      { status: 500 },
    );
  }
}

// ── POST: add an email to the allowlist ──
export async function POST(req: Request) {
  const { admin, res } = await requireAdmin(req);
  if (!admin) return res;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  const note = String(body.note ?? "").trim().slice(0, MAX_NOTE) || null;

  if (!email)
    return NextResponse.json({ error: "Email is required." }, { status: 422 });
  if (!EMAIL_RE.test(email))
    return NextResponse.json(
      { error: "That doesn't look like a valid email address." },
      { status: 422 },
    );

  // Already covered by the env list — adding a row would be a no-op
  // that shows as a confusing duplicate in the UI.
  if (envAdminEmails().includes(email))
    return NextResponse.json(
      {
        error:
          "That email already has access via the ADMIN_EMAILS environment variable.",
      },
      { status: 409 },
    );

  try {
    const { data, error } = await adminClient()
      .from("admin_allowlist")
      .insert({ email, note, added_by: admin.email })
      .select(SELECT)
      .single();

    if (error) {
      // 23505 = unique_violation on the lower(email) index.
      if (error.code === "23505")
        return NextResponse.json(
          { error: "That email is already an admin." },
          { status: 409 },
        );
      if (error.code === "42P01")
        return NextResponse.json(
          {
            error:
              "The admin_allowlist table doesn't exist yet — apply supabase/admin_allowlist.sql in the Supabase SQL editor.",
          },
          { status: 503 },
        );
      throw error;
    }

    invalidateAllowlistCache();
    await audit(admin.email, "allowlist.add", email);
    return NextResponse.json({ row: data });
  } catch (err) {
    console.error("admin allowlist add failed", err);
    return NextResponse.json({ error: "Failed to add admin." }, { status: 500 });
  }
}

// ── DELETE: remove an entry by id (never your own) ──
export async function DELETE(req: Request) {
  const { admin, res } = await requireAdmin(req);
  if (!admin) return res;

  let body: { id?: string };
  try {
    body = (await req.json()) as { id?: string };
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Missing id." }, { status: 422 });

  try {
    const supa = adminClient();

    // Read the target first so we can both block self-removal and log
    // the email (the row is gone by the time we audit).
    const { data: row, error: readErr } = await supa
      .from("admin_allowlist")
      .select("id, email")
      .eq("id", id)
      .maybeSingle();

    if (readErr) {
      if (readErr.code === "42P01")
        return NextResponse.json(
          { error: "The admin_allowlist table doesn't exist yet." },
          { status: 503 },
        );
      throw readErr;
    }
    if (!row)
      return NextResponse.json(
        { error: "That entry no longer exists." },
        { status: 404 },
      );

    const target = String(row.email ?? "").trim().toLowerCase();
    if (target === admin.email)
      return NextResponse.json(
        { error: "You cannot remove your own access." },
        { status: 400 },
      );

    const { error } = await supa.from("admin_allowlist").delete().eq("id", id);
    if (error) throw error;

    invalidateAllowlistCache();
    await audit(admin.email, "allowlist.remove", target);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin allowlist remove failed", err);
    return NextResponse.json(
      { error: "Failed to remove admin." },
      { status: 500 },
    );
  }
}
