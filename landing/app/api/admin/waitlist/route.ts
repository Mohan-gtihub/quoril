import { NextResponse } from "next/server";
import { adminClient, audit, verifyAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SORTABLE = new Set(["created_at", "email", "role", "platform"]);
const MAX_LIMIT = 200;

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

export async function GET(req: Request) {
  const { admin, res } = await requireAdmin(req);
  if (!admin) return res;

  const url = new URL(req.url);
  const sp = url.searchParams;

  const limit = Math.min(
    Math.max(Number(sp.get("limit")) || 50, 1),
    MAX_LIMIT,
  );
  const page = Math.max(Number(sp.get("page")) || 1, 1);
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const sort = SORTABLE.has(sp.get("sort") ?? "")
    ? (sp.get("sort") as string)
    : "created_at";
  const ascending = sp.get("dir") === "asc";

  const q = sp.get("q")?.trim();
  const role = sp.get("role")?.trim();
  const platform = sp.get("platform")?.trim();

  try {
    let query = adminClient()
      .from("waitlist")
      .select("id, email, role, platform, referrer, created_at", {
        count: "exact",
      });

    if (q) query = query.ilike("email", `%${q}%`);
    if (role) query = query.eq("role", role);
    if (platform) query = query.eq("platform", platform);

    const { data, error, count } = await query
      .order(sort, { ascending })
      .range(from, to);

    if (error) throw error;
    return NextResponse.json({
      rows: data ?? [],
      count: count ?? 0,
      page,
      limit,
      pages: Math.max(1, Math.ceil((count ?? 0) / limit)),
    });
  } catch (err) {
    console.error("admin waitlist list failed", err);
    return NextResponse.json(
      { error: "Failed to load waitlist." },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const { admin, res } = await requireAdmin(req);
  if (!admin) return res;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  // Accept either a single { id } or a bulk { ids: [...] }.
  const single = (body as { id?: string })?.id;
  const many = (body as { ids?: unknown })?.ids;
  const ids: string[] = Array.isArray(many)
    ? many.filter((x): x is string => typeof x === "string" && !!x)
    : typeof single === "string" && single
      ? [single]
      : [];

  if (ids.length === 0) {
    return NextResponse.json({ error: "Missing id(s)." }, { status: 422 });
  }

  try {
    const { error } = await adminClient()
      .from("waitlist")
      .delete()
      .in("id", ids);
    if (error) throw error;

    await audit(admin.email, "waitlist.delete", ids[0], {
      ids,
      count: ids.length,
    });
    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch (err) {
    console.error("admin waitlist delete failed", err);
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }
}
