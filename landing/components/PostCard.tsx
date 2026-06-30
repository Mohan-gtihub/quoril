import Link from "next/link";
import { ACCENTS } from "@/components/ui";
import { IconArrow } from "@/components/icons";
import type { BlogCard } from "@/lib/blog";

/** Friendly date like "Jun 28, 2026". */
export function fmtPostDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Stable accent from the Quoril ramp, keyed by tag — so a topic
 *  always wears the same dot colour across the site. */
export function accentForTag(tag?: string): string {
  if (!tag) return ACCENTS[3];
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

/**
 * Blog teaser card — used on the /blog index and the home page.
 *
 * Editorial, text-forward field note built from the site's own kit:
 * an eyebrow (accent dot + topic) paired with a mono read time, a
 * Poppins title, the excerpt, and a hairline meta footer with the
 * arrow that nudges on hover. The cover image is a framed accent when
 * present — never a stock-photo hero or an empty gradient placeholder.
 */
export default function PostCard({ post }: { post: BlogCard }) {
  const date = fmtPostDate(post.published_at ?? post.created_at);
  const tag = post.tags?.[0];
  const accent = accentForTag(tag);
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col rounded-tile border border-line bg-surface p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift sm:p-6"
    >
      {/* eyebrow: topic · read time */}
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: accent }}
          />
          {tag ?? "Field notes"}
        </span>
        <span className="mono shrink-0 text-[12px] text-ink-faint">
          {post.read_minutes} min
        </span>
      </div>

      {post.cover_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover_image}
          alt=""
          className="mt-4 aspect-[16/9] w-full rounded-card border border-line object-cover"
        />
      )}

      <h3 className="mt-4 font-heading text-[20px] font-semibold leading-snug tracking-[-0.02em] text-ink transition group-hover:text-brand">
        {post.title}
      </h3>
      {post.excerpt && (
        <p className="mt-2.5 line-clamp-3 flex-1 text-[14.5px] leading-relaxed text-ink-muted">
          {post.excerpt}
        </p>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-[12.5px] text-ink-faint">
        <span className="truncate">
          {post.author && (
            <span className="text-ink-muted">{post.author} · </span>
          )}
          <span className="mono">{date}</span>
        </span>
        <IconArrow className="h-4 w-4 shrink-0 text-ink transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
