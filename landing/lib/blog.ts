import { createClient } from "@supabase/supabase-js";

/**
 * Public, server-side blog reads.
 *
 * Uses the anon key, so row-level security applies: only `published`
 * posts are ever returned to the site. Authoring (drafts, writes) goes
 * through the admin API with the service-role key instead.
 *
 * These helpers return `null`/`[]` when Supabase isn't configured so the
 * marketing pages still render during local/preview builds without env.
 */

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content_html: string;
  cover_image: string | null;
  author: string | null;
  tags: string[];
  status: string;
  read_minutes: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BlogCard = Omit<BlogPost, "content_html">;

const CARD_COLS =
  "id, slug, title, excerpt, cover_image, author, tags, status, read_minutes, published_at, created_at, updated_at";

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Latest published posts (cards — no heavy HTML body). */
export async function getPublishedPosts(limit?: number): Promise<BlogCard[]> {
  const supa = publicClient();
  if (!supa) return [];
  let query = supa
    .from("blog_posts")
    .select(CARD_COLS)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) {
    console.error("getPublishedPosts failed", error);
    return [];
  }
  return (data ?? []) as BlogCard[];
}

/** A single published post by slug, including its HTML body. */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const supa = publicClient();
  if (!supa) return null;
  const { data, error } = await supa
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) {
    console.error("getPostBySlug failed", error);
    return null;
  }
  return (data as BlogPost) ?? null;
}

/** All published slugs — for static params / sitemap. */
export async function getPublishedSlugs(): Promise<string[]> {
  const supa = publicClient();
  if (!supa) return [];
  const { data, error } = await supa
    .from("blog_posts")
    .select("slug")
    .eq("status", "published");
  if (error) return [];
  return (data ?? []).map((r) => (r as { slug: string }).slug);
}
