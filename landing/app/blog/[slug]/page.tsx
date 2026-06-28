import { notFound } from "next/navigation";
import Link from "next/link";
import { Container, Button } from "@/components/ui";
import Reveal from "@/components/Reveal";
import PostCard, { fmtPostDate } from "@/components/PostCard";
import { IconArrow } from "@/components/icons";
import { getPostBySlug, getPublishedPosts, getPublishedSlugs } from "@/lib/blog";

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getPublishedSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPostBySlug(params.slug);
  if (!post) return { title: "Post not found · Quoril" };
  return {
    title: `${post.title} · Quoril Blog`,
    description: post.excerpt ?? undefined,
    openGraph: {
      title: post.title,
      description: post.excerpt ?? undefined,
      type: "article",
      images: post.cover_image ? [{ url: post.cover_image }] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  const date = fmtPostDate(post.published_at ?? post.created_at);
  const related = (await getPublishedPosts(4))
    .filter((p) => p.id !== post.id)
    .slice(0, 3);

  return (
    <>
      <article className="pt-[120px]">
        <Container className="max-w-[760px]">
          {/* ── Header ── */}
          <Reveal>
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink-faint transition hover:text-ink"
            >
              <IconArrow className="h-3.5 w-3.5 rotate-180" />
              All posts
            </Link>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {post.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-pill border border-line bg-surface px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-muted"
                >
                  {t}
                </span>
              ))}
            </div>

            <h1 className="mt-5 font-heading text-[clamp(30px,5vw,52px)] font-semibold leading-[1.05] tracking-[-0.035em] text-ink">
              {post.title}
            </h1>

            {post.excerpt && (
              <p className="mt-5 text-[19px] leading-relaxed text-ink-muted">
                {post.excerpt}
              </p>
            )}

            <div className="mt-7 flex items-center gap-2 border-b border-line pb-7 text-[13.5px] text-ink-faint">
              {post.author && (
                <>
                  <span className="font-medium text-ink">{post.author}</span>
                  <span>·</span>
                </>
              )}
              <span>{date}</span>
              <span>·</span>
              <span>{post.read_minutes} min read</span>
            </div>
          </Reveal>

          {/* ── Cover ── */}
          {post.cover_image && (
            <Reveal>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.cover_image}
                alt=""
                className="mt-8 w-full rounded-tile border border-line object-cover shadow-soft"
              />
            </Reveal>
          )}

          {/* ── HTML body (authored freely in the admin) ── */}
          <Reveal>
            <div
              className="blog-content mt-10"
              dangerouslySetInnerHTML={{ __html: post.content_html }}
            />
          </Reveal>

          {/* ── Footer CTA ── */}
          <div className="mt-14 rounded-tile border border-line bg-surface p-7 text-center shadow-soft">
            <h3 className="font-heading text-[22px] font-semibold tracking-[-0.02em] text-ink">
              Build your most focused workday.
            </h3>
            <p className="mx-auto mt-2 max-w-[420px] text-[15px] text-ink-muted">
              Join the Quoril waitlist and turn your desktop into a focus machine.
            </p>
            <div className="mt-6 flex justify-center">
              <Button href="/waitlist">
                Join the waitlist <IconArrow className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Container>
      </article>

      {/* ── Related ── */}
      {related.length > 0 && (
        <section className="py-24">
          <Container>
            <h2 className="mb-8 font-heading text-[24px] font-semibold tracking-[-0.02em] text-ink">
              Keep reading
            </h2>
            <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p, i) => (
                <Reveal key={p.id} delay={i * 0.05}>
                  <PostCard post={p} />
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
