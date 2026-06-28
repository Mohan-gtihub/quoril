import Link from "next/link";
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

/**
 * Blog teaser card — used on the /blog index and the home page.
 * Cover image (or a graceful gradient placeholder), tag, title,
 * excerpt and a meta line with author · date · read time.
 */
export default function PostCard({ post }: { post: BlogCard }) {
  const date = fmtPostDate(post.published_at ?? post.created_at);
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-tile border border-line bg-surface shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-sunken">
        {post.cover_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_image}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="dotgrid h-full w-full bg-gradient-to-br from-sunken to-surface" />
        )}
        {post.tags?.[0] && (
          <span className="absolute left-3 top-3 rounded-pill border border-line bg-paper/85 px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted backdrop-blur">
            {post.tags[0]}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-heading text-[19px] font-semibold leading-snug tracking-[-0.02em] text-ink transition group-hover:text-brand">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="mt-2 line-clamp-3 flex-1 text-[14.5px] leading-relaxed text-ink-muted">
            {post.excerpt}
          </p>
        )}
        <div className="mt-4 flex items-center gap-2 text-[12.5px] text-ink-faint">
          {post.author && <span className="text-ink-muted">{post.author}</span>}
          {post.author && <span>·</span>}
          <span>{date}</span>
          <span>·</span>
          <span>{post.read_minutes} min read</span>
        </div>
      </div>
    </Link>
  );
}
