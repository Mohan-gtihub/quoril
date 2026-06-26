import {
  Container,
  Tile,
  TileIcon,
  Button,
  Stat,
  Eyebrow,
} from "@/components/ui";
import Reveal from "@/components/Reveal";
import { IconGlobe, IconLayers, IconChart, IconCheck } from "@/components/icons";

export const metadata = {
  title: "About — Quoril",
  description:
    "Quoril is a native command center for deep work — built by Mohan Kilari for people who ship. Local-first, private, and focused.",
};

const PRINCIPLES = [
  {
    icon: <IconGlobe className="h-[22px] w-[22px]" />,
    title: "Local-first, always",
    body: "Your work is written to an on-device database the instant you create it. It loads instantly, works offline, and stays yours.",
  },
  {
    icon: <IconLayers className="h-[22px] w-[22px]" />,
    title: "One tool, not ten",
    body: "Planner, focus timer, analytics and canvas live under one roof — so you stop paying the tax of stitching apps together.",
  },
  {
    icon: <IconChart className="h-[22px] w-[22px]" />,
    title: "Measure to improve",
    body: "Honest reports and screen time turn effort into signal. You can only sharpen what you can actually see.",
  },
  {
    icon: <IconCheck className="h-[22px] w-[22px]" />,
    title: "Respect the user",
    body: "No tracking pipelines, no dark patterns, no data brokers. Just a calm tool that gets out of your way.",
  },
];

const STATS = [
  { n: "5", label: "Connected surfaces" },
  { n: "20+", label: "Categories tracked" },
  { n: "100%", label: "Offline-first" },
  { n: "1", label: "Native app" },
];

export default function AboutPage() {
  return (
    <main className="bg-paper text-ink">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="pt-[110px] pb-14 sm:pt-[130px] sm:pb-20">
        <Container>
          <Reveal className="flex max-w-[760px] flex-col items-start">
            <div className="mb-5">
              <Eyebrow>About</Eyebrow>
            </div>
            <h1 className="font-heading text-[clamp(34px,6vw,62px)] font-semibold leading-[1.03] tracking-[-0.035em] text-ink">
              Built for people who ship.
            </h1>
            <p className="mt-6 max-w-[620px] text-[18px] leading-relaxed text-ink-muted">
              Quoril is a native command center for deep work — a single, quiet
              place to plan, focus, measure and think. It&apos;s built by one
              person who got tired of juggling tabs.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* ── The story ────────────────────────────────────────── */}
      <section className="py-16">
        <Container>
          <Reveal className="max-w-[680px]">
            <Eyebrow>The story</Eyebrow>
            <div className="mt-6 space-y-6 text-[17px] leading-relaxed text-ink-muted">
              <p>
                Quoril started with a small, daily frustration. To actually get
                deep work done meant living across a to-do app, a separate
                timer, and an analytics dashboard that never quite agreed with
                either. Three tools, three windows, three sources of truth — and
                the real work waiting somewhere underneath all that switching.
              </p>
              <p>
                The belief behind Quoril is simple: deep work deserves a native
                command center, not a browser tab fighting for attention. One
                place where your plan, your focus sessions and the numbers that
                tell you how it&apos;s going all share the same memory. Built as
                a real desktop app, so it&apos;s fast, calm, and always there.
              </p>
              <p className="font-hand text-[22px] leading-snug text-ink">
                &ldquo;If a tool wants your focus, the least it can do is respect
                it.&rdquo;
              </p>
              <p>
                That&apos;s why Quoril is offline-first and privacy-respecting by
                default. Everything you make is written to a local database the
                moment you make it — it works with no connection, syncs only to
                your own account, and is never sold or mined. Your work stays
                exactly where you left it, and exactly yours.
              </p>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── Principles ───────────────────────────────────────── */}
      <section className="py-16">
        <Container>
          <Reveal className="mb-12 max-w-[680px]">
            <Eyebrow>Principles</Eyebrow>
            <h2 className="mt-5 font-heading text-[clamp(28px,4.2vw,46px)] font-semibold leading-[1.06] tracking-[-0.03em] text-ink">
              The rules we build by.
            </h2>
          </Reveal>
          <div className="grid gap-6 md:grid-cols-2">
            {PRINCIPLES.map((p, i) => (
              <Reveal key={p.title} style={{ transitionDelay: `${i * 80}ms` }}>
                <Tile className="h-full">
                  <TileIcon>{p.icon}</TileIcon>
                  <h3 className="text-[20px] font-semibold tracking-[-0.01em] text-ink">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
                    {p.body}
                  </p>
                </Tile>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── By the numbers ───────────────────────────────────── */}
      <section className="py-16">
        <Container>
          <Reveal>
            <Tile hover={false} className="p-9 md:p-12">
              <div className="mb-8">
                <Eyebrow>By the numbers</Eyebrow>
              </div>
              <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                {STATS.map((s) => (
                  <Stat key={s.label} n={s.n} label={s.label} />
                ))}
              </div>
            </Tile>
          </Reveal>
        </Container>
      </section>

      {/* ── CTA band ─────────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <Container>
          <Reveal className="mx-auto flex max-w-[620px] flex-col items-center text-center">
            <h2 className="font-heading text-[clamp(30px,5vw,52px)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink">
              Join the early crew.
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-muted">
              Quoril is built in the open, one focused release at a time. Come
              help shape what deep work should feel like.
            </p>
            <div className="mt-8">
              <Button href="/waitlist">Join the waitlist</Button>
            </div>
          </Reveal>
        </Container>
      </section>
    </main>
  );
}
