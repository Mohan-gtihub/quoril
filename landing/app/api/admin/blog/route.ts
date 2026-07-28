import { NextResponse } from "next/server";
import { adminClient, audit, verifyAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SELECT =
  "id, slug, title, excerpt, content_html, cover_image, author, tags, status, read_minutes, published_at, created_at, updated_at";

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

/** URL-safe slug from a title; falls back to a timestamp-ish token. */
function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "post";
}

/** Estimate read time from HTML body at ~200 wpm (min 1). */
function readMinutes(html: string): number {
  const words = html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function normalizeTags(raw: unknown): string[] {
  if (Array.isArray(raw))
    return raw.map((t) => String(t).trim()).filter(Boolean);
  if (typeof raw === "string")
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  return [];
}

// ── GET: list all posts (drafts included — admin only) ──
export async function GET(req: Request) {
  const { admin, res } = await requireAdmin(req);
  if (!admin) return res;

  try {
    const { data, error } = await adminClient()
      .from("blog_posts")
      .select(SELECT)
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ rows: data ?? [] });
  } catch (err) {
    console.error("admin blog list failed", err);
    return NextResponse.json(
      { error: "Failed to load posts." },
      { status: 500 },
    );
  }
}

// ── POST: create a post ──
export async function POST(req: Request) {
  const { admin, res } = await requireAdmin(req);
  if (!admin) return res;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const title = String(body.title ?? "").trim();
  if (!title)
    return NextResponse.json({ error: "Title is required." }, { status: 422 });

  const status = body.status === "published" ? "published" : "draft";
  const content = String(body.content_html ?? "");
  const slug = slugify(String(body.slug || title));

  const row = {
    title,
    slug,
    excerpt: String(body.excerpt ?? "").trim() || null,
    content_html: content,
    cover_image: String(body.cover_image ?? "").trim() || null,
    author: String(body.author ?? "").trim() || null,
    tags: normalizeTags(body.tags),
    status,
    read_minutes: readMinutes(content),
    published_at: status === "published" ? new Date().toISOString() : null,
  };

  try {
    const { data, error } = await adminClient()
      .from("blog_posts")
      .insert(row)
      .select(SELECT)
      .single();
    if (error) {
      if ((error as { code?: string }).code === "23505")
        return NextResponse.json(
          { error: "A post with that slug already exists." },
          { status: 409 },
        );
      throw error;
    }
    await audit(admin.email, "blog.create", data.id, { slug, status });
    return NextResponse.json({ post: data });
  } catch (err) {
    console.error("admin blog create failed", err);
    return NextResponse.json({ error: "Create failed." }, { status: 500 });
  }
}

// ── PUT: update a post ──
export async function PUT(req: Request) {
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

  const title = String(body.title ?? "").trim();
  if (!title)
    return NextResponse.json({ error: "Title is required." }, { status: 422 });

  const status = body.status === "published" ? "published" : "draft";
  const content = String(body.content_html ?? "");

  try {
    const supa = adminClient();

    // Preserve the original publish time when a post is already published;
    // stamp it the first time it flips to published; clear it on unpublish.
    const { data: existing } = await supa
      .from("blog_posts")
      .select("status, published_at")
      .eq("id", id)
      .single();

    let published_at: string | null = existing?.published_at ?? null;
    if (status === "published" && !published_at)
      published_at = new Date().toISOString();
    if (status !== "published") published_at = null;

    const row = {
      title,
      slug: slugify(String(body.slug || title)),
      excerpt: String(body.excerpt ?? "").trim() || null,
      content_html: content,
      cover_image: String(body.cover_image ?? "").trim() || null,
      author: String(body.author ?? "").trim() || null,
      tags: normalizeTags(body.tags),
      status,
      read_minutes: readMinutes(content),
      published_at,
    };

    const { data, error } = await supa
      .from("blog_posts")
      .update(row)
      .eq("id", id)
      .select(SELECT)
      .single();
    if (error) {
      if ((error as { code?: string }).code === "23505")
        return NextResponse.json(
          { error: "A post with that slug already exists." },
          { status: 409 },
        );
      throw error;
    }
    await audit(admin.email, "blog.update", id, { slug: row.slug, status });
    return NextResponse.json({ post: data });
  } catch (err) {
    console.error("admin blog update failed", err);
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }
}

// ── DELETE: remove a post ──
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
    const { error } = await adminClient()
      .from("blog_posts")
      .delete()
      .eq("id", id);
    if (error) throw error;
    await audit(admin.email, "blog.delete", id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("admin blog delete failed", err);
    return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  }
}
