import { NextResponse } from "next/server";
import { adminClient, audit, verifyAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["new", "triaged", "resolved", "wontfix"] as const;
const TYPES = ["bug", "idea", "confusing"] as const;
type Status = (typeof STATUSES)[number];

const SELECT =
  "id, user_id, user_email, type, message, route, app_version, platform, os_version, app_state, console_logs, screenshot_path, status, admin_notes, created_at, updated_at";
const MAX_LIMIT = 100;

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

// ── GET: list feedback (newest first), with signed screenshot URLs ──
export async function GET(req: Request) {
  const { admin, res } = await requireAdmin(req);
  if (!admin) return res;

  const url = new URL(req.url);
  const sp = url.searchParams;
  const limit = Math.min(Math.max(Number(sp.get("limit")) || 50, 1), MAX_LIMIT);
  const page = Math.max(Number(sp.get("page")) || 1, 1);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const status = sp.get("status")?.trim();
  const type = sp.get("type")?.trim();

  try {
    const supa = adminClient();
    let query = supa.from("feedback").select(SELECT, { count: "exact" });

    if (status && STATUSES.includes(status as Status))
      query = query.eq("status", status);
    if (type && TYPES.includes(type as (typeof TYPES)[number]))
      query = query.eq("type", type);

    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);
    if (error) throw error;

    // Sign each screenshot for 1 hour so the private bucket stays private.
    const rows = await Promise.all(
      (data ?? []).map(async (r) => {
        let screenshot_url: string | null = null;
        if (r.screenshot_path) {
          const { data: signed } = await supa.storage
            .from("feedback-screenshots")
            .createSignedUrl(r.screenshot_path, 3600);
          screenshot_url = signed?.signedUrl ?? null;
        }
        return { ...r, screenshot_url };
      }),
    );

    return NextResponse.json({
      rows,
      count: count ?? 0,
      page,
      limit,
      pages: Math.max(1, Math.ceil((count ?? 0) / limit)),
    });
  } catch (err) {
    console.error("admin feedback list failed", err);
    return NextResponse.json(
      { error: "Failed to load feedback." },
      { status: 500 },
    );
  }
}

// ── PATCH: update status / admin notes ──
export async function PATCH(req: Request) {
  const { admin, res } = await requireAdmin(req);
  if (!admin) return res;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const id = String(body.id ?? "");
  if (!id)
    return NextResponse.json({ error: "Missing id." }, { status: 422 });

  const patch: Record<string, unknown> = {};
  if (body.status !== undefined) {
    const status = String(body.status);
    if (!STATUSES.includes(status as Status))
      return NextResponse.json({ error: "Invalid status." }, { status: 422 });
    patch.status = status;
  }
  if (body.admin_notes !== undefined)
    patch.admin_notes = String(body.admin_notes).slice(0, 5000) || null;

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "Nothing to update." }, { status: 422 });

  try {
    const { data, error } = await adminClient()
      .from("feedback")
      .update(patch)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) throw error;
    await audit(admin.email, "feedback.update", id, patch);
    return NextResponse.json({ row: data });
  } catch (err) {
    console.error("admin feedback update failed", err);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}

// ── DELETE: remove a report (and its screenshot) ──
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
  if (!id)
    return NextResponse.json({ error: "Missing id." }, { status: 422 });

  try {
    const supa = adminClient();

    // Best-effort: remove the screenshot object first.
    const { data: row } = await supa
      .from("feedback")
      .select("screenshot_path")
      .eq("id", id)
      .single();
    if (row?.screenshot_path) {
      await supa.storage
        .from("feedback-screenshots")
        .remove([row.screenshot_path]);
    }

    const { error } = await supa.from("feedback").delete().eq("id", id);
    if (error) throw error;
    await audit(admin.email, "feedback.delete", id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin feedback delete failed", err);
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }
}
