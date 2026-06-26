import Link from "next/link";
import { Container, Eyebrow } from "./ui";
import Reveal from "./Reveal";

export interface LegalSection {
  id: string;
  heading: string;
  /** Rendered as the section body. Use the Legal* helpers below. */
  body: React.ReactNode;
}

/**
 * Shared chrome for long-form legal pages (Privacy, Terms).
 * Renders a hero, a sticky table of contents and the numbered sections,
 * all using the marketing-site design tokens so legal pages feel native.
 */
export default function LegalLayout({
  eyebrow,
  title,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}) {
  return (
    <main className="bg-paper text-ink">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <header className="dotgrid border-b border-line">
        <Container className="pb-14 pt-[140px]">
          <Reveal className="mx-auto max-w-[760px]">
            <div className="mb-5">
              <Eyebrow>{eyebrow}</Eyebrow>
            </div>
            <h1 className="font-heading text-[clamp(34px,5.4vw,58px)] font-semibold leading-[1.04] tracking-[-0.035em] text-ink">
              {title}
            </h1>
            <p className="mt-5 text-[13px] font-medium uppercase tracking-[0.1em] text-ink-faint">
              Last updated · {updated}
            </p>
            <div className="mt-6 text-[16px] leading-relaxed text-ink-muted">
              {intro}
            </div>
          </Reveal>
        </Container>
      </header>

      <Container className="py-14 sm:py-20">
        <div className="mx-auto grid max-w-[980px] gap-12 md:grid-cols-[220px_1fr] md:gap-14">
          {/* ── Table of contents ──────────────────────────────── */}
          <nav className="hidden md:block">
            <div className="sticky top-[110px]">
              <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                On this page
              </p>
              <ul className="space-y-2.5">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="block text-[13.5px] leading-snug text-ink-muted transition hover:text-ink"
                    >
                      {i + 1}. {s.heading}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          {/* ── Sections ───────────────────────────────────────── */}
          <div className="min-w-0">
            {sections.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                className="mb-12 scroll-mt-[110px] border-b border-line pb-12 last:border-b-0"
              >
                <Reveal>
                  <h2 className="font-heading text-[clamp(20px,2.6vw,26px)] font-semibold tracking-[-0.02em] text-ink">
                    <span className="mr-2 text-ink-faint">{i + 1}.</span>
                    {s.heading}
                  </h2>
                  <div className="mt-4 space-y-4">{s.body}</div>
                </Reveal>
              </section>
            ))}

            <p className="text-[13px] leading-relaxed text-ink-faint">
              Questions about this document? Email{" "}
              <a
                href="mailto:hello@quoril.in"
                className="font-medium text-ink underline-offset-2 hover:underline"
              >
                hello@quoril.in
              </a>
              . See also our{" "}
              <Link
                href="/security"
                className="font-medium text-ink underline-offset-2 hover:underline"
              >
                Security &amp; Privacy
              </Link>{" "}
              overview.
            </p>
          </div>
        </div>
      </Container>
    </main>
  );
}

/* ── Prose helpers ──────────────────────────────────────────── */

export function P({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-[15.5px] leading-relaxed text-ink-muted ${className}`}>
      {children}
    </p>
  );
}

export function UL({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it, i) => (
        <li
          key={i}
          className="flex gap-3 text-[15px] leading-relaxed text-ink-muted"
        >
          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="pt-2 text-[16px] font-semibold text-ink">{children}</h3>
  );
}

export function Mail() {
  return (
    <a
      href="mailto:hello@quoril.in"
      className="font-medium text-ink underline-offset-2 hover:underline"
    >
      hello@quoril.in
    </a>
  );
}
