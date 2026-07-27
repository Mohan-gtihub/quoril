import { Container, Eyebrow } from "@/components/ui";
import Reveal from "@/components/Reveal";
import PostCard, { fmtPostDate, accentForTag } from "@/components/PostCard";
import { IconArrow } from "@/components/icons";
import { getPublishedPosts } from "@/lib/blog";
import Link from "next/link";

export const revalidate = 60;

export const metadata = {
  title: "Blog",
  description:
    "Field notes on planning, focus, understanding your time and building Quoril.",
};

export default async function BlogPage() {
  const posts = await getPublishedPosts();
  const [featured, ...rest] = posts;

  return (
    <>
      {/* ── HERO ── */}
      <section className="pt-[130px]">
        <Container>
          <Reveal className="flex max-w-[760px] flex-col">
            <div className="mb-5">
              <Eyebrow>The Quoril Blog</Eyebrow>
            </div>
            <h1 className="font-heading text-[clamp(36px,6vw,64px)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink">
              Notes on focus &amp; deep work.
            </h1>
            <p className="mt-6 max-w-[600px] text-[18px] leading-relaxed text-ink-muted">
              Essays, product updates and field notes on building a calmer,
              more intentional workday — straight from the team building Quoril.
            </p>
            {posts.length > 0 && (
              <div className="mono mt-7 text-[12.5px] uppercase tracking-[0.12em] text-ink-faint">
                {String(posts.length).padStart(2, "0")} notes published
              </div>
            )}
          </Reveal>
        </Container>
      </section>

      {/* ── EMPTY STATE ── */}
      {posts.length === 0 && (
        <section className="py-24">
          <Container>
            <div className="dotgrid grid place-items-center rounded-tile border border-dashed border-line-strong bg-surface px-6 py-20 text-center">
              <div className="flex max-w-[420px] flex-col items-center">
                <Eyebrow>Field notes</Eyebrow>
                <p className="mt-4 text-[15.5px] leading-relaxed text-ink-muted">
                  The first dispatches are being written. Get V1 free and follow
                  what we build next.
                </p>
                <Link
                  href="/waitlist"
                  className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink transition hover:gap-2.5"
                >
                  Get V1 free <IconArrow className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* ── FEATURED ── */}
      {featured && (
        <section className={`pt-16 ${rest.length === 0 ? "pb-28" : ""}`}>
          <Container>
            <Reveal>
              <Link
                href={`/blog/${featured.slug}`}
                className={`group dotgrid grid overflow-hidden rounded-tile border border-line bg-surface shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift ${
                  featured.cover_image ? "md:grid-cols-[1.05fr_1fr]" : ""
                }`}
              >
                <div className="flex flex-col justify-center gap-4 p-7 sm:p-9">
                  <div className="flex items-center gap-3">
                    <Eyebrow>Latest dispatch</Eyebrow>
                    {featured.tags?.[0] && (
                      <span className="inline-flex items-center gap-2 text-[12.5px] text-ink-faint">
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: accentForTag(featured.tags[0]) }}
                        />
                        {featured.tags[0]}
                      </span>
                    )}
                  </div>
                  <h2 className="font-heading text-[clamp(26px,3.4vw,40px)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink transition group-hover:text-brand">
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p className="max-w-[52ch] text-[16.5px] leading-relaxed text-ink-muted">
                      {featured.excerpt}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-[13px] text-ink-faint">
                    {featured.author && (
                      <>
                        <span className="text-ink-muted">{featured.author}</span>
                        <span>·</span>
                      </>
                    )}
                    <span className="mono">
                      {fmtPostDate(featured.published_at ?? featured.created_at)}
                    </span>
                    <span>·</span>
                    <span className="mono">{featured.read_minutes} min read</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-ink transition group-hover:gap-2.5">
                    Read the note
                    <IconArrow className="h-4 w-4" />
                  </span>
                </div>

                {featured.cover_image && (
                  <div className="relative order-first overflow-hidden bg-sunken md:order-none">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={featured.cover_image}
                      alt=""
                      className="h-full max-h-[320px] w-full object-cover transition duration-500 group-hover:scale-[1.03] md:max-h-[420px]"
                    />
                  </div>
                )}
              </Link>
            </Reveal>
          </Container>
        </section>
      )}

      {/* ── GRID ── */}
      {rest.length > 0 && (
        <section className="pb-28 pt-14">
          <Container>
            <div className="mb-7 flex items-center gap-4">
              <Eyebrow>All notes</Eyebrow>
              <span className="h-px flex-1 bg-line" />
            </div>
            <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
              {rest.map((post, i) => (
                <Reveal key={post.id} delay={i * 0.05}>
                  <PostCard post={post} />
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
