import { NextResponse } from "next/server";
import { adminClient, audit, verifyAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Mirrors public.app_role / public.subscription_tier.
const ROLES = [
  "admin",
  "alpha_tester",
  "beta_tester",
  "blog_publisher",
  "end_user",
] as const;
const TIERS = ["free", "monthly", "annual", "lifetime"] as const;
type Role = (typeof ROLES)[number];
type Tier = (typeof TIERS)[number];

const PAGE_SIZE = 100;

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

// ── GET: list users with their roles + subscription tier ──
export async function GET(req: Request) {
  const { admin, res } = await requireAdmin(req);
  if (!admin) return res;

  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);

  try {
    const supa = adminClient();

    const { data: list, error: listErr } = await supa.auth.admin.listUsers({
      page,
      perPage: PAGE_SIZE,
    });
    if (listErr) throw listErr;

    const users = list.users;
    const ids = users.map((u) => u.id);

    // Batch-fetch roles + subscriptions for just this page of users.
    const [{ data: roleRows }, { data: subRows }] = await Promise.all([
      supa.from("user_roles").select("user_id, role").in("user_id", ids),
      supa
        .from("subscriptions")
        .select("user_id, tier, status, override_until")
        .in("user_id", ids),
    ]);

    const rolesByUser = new Map<string, Role[]>();
    for (const r of roleRows ?? []) {
      const arr = rolesByUser.get(r.user_id) ?? [];
      arr.push(r.role as Role);
      rolesByUser.set(r.user_id, arr);
    }
    const subByUser = new Map(
      (subRows ?? []).map((s) => [s.user_id, s]),
    );

    let rows = users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      roles: rolesByUser.get(u.id) ?? [],
      tier: (subByUser.get(u.id)?.tier as Tier) ?? "free",
      sub_status: subByUser.get(u.id)?.status ?? "active",
    }));

    if (q) rows = rows.filter((r) => r.email.toLowerCase().includes(q));

    return NextResponse.json({
      rows,
      page,
      hasMore: users.length === PAGE_SIZE,
      allRoles: ROLES,
      allTiers: TIERS,
    });
  } catch (err) {
    console.error("admin users list failed", err);
    return NextResponse.json(
      { error: "Failed to load users." },
      { status: 500 },
    );
  }
}

// ── PATCH: grant/revoke a role, or set the subscription tier ──
export async function PATCH(req: Request) {
  const { admin, res } = await requireAdmin(req);
  if (!admin) return res;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const userId = String(body.user_id ?? "");
  const action = String(body.action ?? "");
  if (!userId)
    return NextResponse.json({ error: "Missing user_id." }, { status: 422 });

  const supa = adminClient();

  try {
    if (action === "grant_role" || action === "revoke_role") {
      const role = String(body.role ?? "") as Role;
      if (!ROLES.includes(role))
        return NextResponse.json({ error: "Invalid role." }, { status: 422 });

      if (action === "grant_role") {
        const { error } = await supa
          .from("user_roles")
          .upsert(
            { user_id: userId, role, granted_by: admin.id },
            { onConflict: "user_id,role" },
          );
        if (error) throw error;
      } else {
        const { error } = await supa
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);
        if (error) throw error;
      }
      await audit(admin.email, `user.${action}`, userId, { role });
      return NextResponse.json({ ok: true });
    }

    if (action === "set_tier") {
      const tier = String(body.tier ?? "") as Tier;
      if (!TIERS.includes(tier))
        return NextResponse.json({ error: "Invalid tier." }, { status: 422 });

      const { error } = await supa
        .from("subscriptions")
        .upsert(
          { user_id: userId, tier, status: "active" },
          { onConflict: "user_id" },
        );
      if (error) throw error;
      await audit(admin.email, "user.set_tier", userId, { tier });
      return NextResponse.json({ ok: true });
    }

    // Cut off a tester's free-premium access immediately.
    if (action === "revoke_access") {
      const { error } = await supa
        .from("subscriptions")
        .upsert(
          { user_id: userId, override_until: new Date().toISOString() },
          { onConflict: "user_id" },
        );
      if (error) throw error;
      await audit(admin.email, "user.revoke_access", userId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 422 });
  } catch (err) {
    console.error("admin users patch failed", err);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}
