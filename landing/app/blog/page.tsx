import { Container, Eyebrow } from "@/components/ui";
import Reveal from "@/components/Reveal";
import PostCard, { fmtPostDate } from "@/components/PostCard";
import { getPublishedPosts } from "@/lib/blog";
import Link from "next/link";

export const revalidate = 60;

export const metadata = {
  title: "Blog · Quoril",
  description:
    "Field notes on deep work, focus, productivity systems and building Quoril — the productivity OS for people who ship.",
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
          </Reveal>
        </Container>
      </section>

      {/* ── EMPTY STATE ── */}
      {posts.length === 0 && (
        <section className="py-24">
          <Container>
            <div className="grid place-items-center rounded-tile border border-dashed border-line-strong bg-surface px-6 py-20 text-center">
              <p className="text-[15px] text-ink-faint">
                No posts published yet — check back soon.
              </p>
            </div>
          </Container>
        </section>
      )}

      {/* ── FEATURED ── */}
      {featured && (
        <section className="pt-16">
          <Container>
            <Reveal>
              <Link
                href={`/blog/${featured.slug}`}
                className="group grid overflow-hidden rounded-tile border border-line bg-surface shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift md:grid-cols-2"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-sunken md:aspect-auto">
                  {featured.cover_image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={featured.cover_image}
                      alt=""
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="dotgrid h-full min-h-[260px] w-full bg-gradient-to-br from-sunken to-surface" />
                  )}
                </div>
                <div className="flex flex-col justify-center p-7 sm:p-10">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="rounded-pill bg-brand/10 px-3 py-1 text-[11.5px] font-semibold uppercase tracking-[0.08em] text-brand">
                      Latest
                    </span>
                    {featured.tags?.[0] && (
                      <span className="text-[12.5px] text-ink-faint">
                        {featured.tags[0]}
                      </span>
                    )}
                  </div>
                  <h2 className="font-heading text-[clamp(24px,3vw,34px)] font-semibold leading-tight tracking-[-0.03em] text-ink transition group-hover:text-brand">
                    {featured.title}
                  </h2>
                  {featured.excerpt && (
                    <p className="mt-3 text-[16px] leading-relaxed text-ink-muted">
                      {featured.excerpt}
                    </p>
                  )}
                  <div className="mt-6 flex items-center gap-2 text-[13px] text-ink-faint">
                    {featured.author && (
                      <>
                        <span className="text-ink-muted">{featured.author}</span>
                        <span>·</span>
                      </>
                    )}
                    <span>
                      {fmtPostDate(featured.published_at ?? featured.created_at)}
                    </span>
                    <span>·</span>
                    <span>{featured.read_minutes} min read</span>
                  </div>
                </div>
              </Link>
            </Reveal>
          </Container>
        </section>
      )}

      {/* ── GRID ── */}
      {rest.length > 0 && (
        <section className="pb-28 pt-12">
          <Container>
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
