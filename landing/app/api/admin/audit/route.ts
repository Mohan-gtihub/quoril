import { NextResponse } from "next/server";
import { adminClient, verifyAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const admin = await verifyAdmin(req.headers.get("authorization"));
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = Math.min(
    Math.max(Number(new URL(req.url).searchParams.get("limit")) || 100, 1),
    500,
  );

  try {
    const { data, error } = await adminClient()
      .from("audit_log")
      .select("id, admin_email, action, target_id, meta, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return NextResponse.json({ rows: data ?? [] });
  } catch (err) {
    console.error("admin audit list failed", err);
    return NextResponse.json(
      { error: "Failed to load audit log." },
      { status: 500 },
    );
  }
}
