import Link from "next/link";
import { Container, Tile, Badge, Eyebrow } from "@/components/ui";
import Reveal from "@/components/Reveal";
import Waitlist from "@/components/Waitlist";
import {
  IconCheck,
  IconBoard,
  IconClock,
  IconChart,
  IconCanvas,
  IconGlobe,
  IconLayers,
} from "@/components/icons";

export const metadata = {
  title: "Join the waitlist — Quoril",
  description:
    "Be first to turn your desktop into a focus machine. One launch email, early-access pricing, and a say in the roadmap.",
};

const REASSURANCE = [
  "No spam — one launch email",
  "Early-access pricing",
  "Help shape the roadmap",
];

const JOINING = [
  {
    icon: <IconBoard className="h-[20px] w-[20px]" />,
    title: "Kanban Planner",
    body: "Local-first boards that load the instant you open them.",
    href: "/features/planner",
  },
  {
    icon: <IconClock className="h-[20px] w-[20px]" />,
    title: "Focus Engine",
    body: "Deep focus, the super-focus pill and a built-in pomodoro.",
    href: "/features/focus",
  },
  {
    icon: <IconChart className="h-[20px] w-[20px]" />,
    title: "Insights",
    body: "Reports, heatmaps and a productivity score from real signal.",
    href: "/insights",
  },
  {
    icon: <IconCanvas className="h-[20px] w-[20px]" />,
    title: "Visual Canvas",
    body: "An infinite board of blocks and pipelines for thinking in space.",
    href: "/canvas",
  },
  {
    icon: <IconGlobe className="h-[20px] w-[20px]" />,
    title: "Offline-first",
    body: "Everything lives on your device and works with no connection.",
    href: "/security",
  },
  {
    icon: <IconLayers className="h-[20px] w-[20px]" />,
    title: "Cross-platform",
    body: "Native builds for macOS, Windows and Linux.",
    href: null,
  },
];

export default function WaitlistPage() {
  return (
    <main className="bg-paper text-ink">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="pt-[130px] pb-12">
        <Container>
          <Reveal className="mx-auto flex max-w-[640px] flex-col items-center text-center">
            <Badge>Early access · Q3 2026</Badge>
            <h1 className="mt-6 font-heading text-[clamp(34px,6vw,62px)] font-semibold leading-[1.03] tracking-[-0.035em] text-ink">
              Join the Quoril waitlist.
            </h1>
            <p className="mt-6 max-w-[540px] text-[18px] leading-relaxed text-ink-muted">
              Be first to turn your desktop into a focus machine. One launch
              email, no spam — and early-access pricing when we go live.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* ── Form ─────────────────────────────────────────────── */}
      <section className="pb-8">
        <Container>
          <Reveal className="mx-auto max-w-[560px]">
            <Waitlist />
          </Reveal>
        </Container>
      </section>

      {/* ── Reassurance row ──────────────────────────────────── */}
      <section className="py-10">
        <Container>
          <Reveal className="mx-auto flex max-w-[720px] flex-wrap items-center justify-center gap-x-8 gap-y-4">
            {REASSURANCE.map((r) => (
              <div key={r} className="flex items-center gap-2.5">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-paper">
                  <IconCheck className="h-3.5 w-3.5" />
                </span>
                <span className="text-[14px] font-medium text-ink">{r}</span>
              </div>
            ))}
          </Reveal>
        </Container>
      </section>

      {/* ── What you're joining ──────────────────────────────── */}
      <section className="py-16">
        <Container>
          <Reveal className="mx-auto mb-12 max-w-[680px] text-center">
            <div className="mb-4 flex justify-center">
              <Eyebrow>What you&apos;re joining</Eyebrow>
            </div>
            <h2 className="font-heading text-[clamp(28px,4.2vw,46px)] font-semibold leading-[1.06] tracking-[-0.03em] text-ink">
              One native command center.
            </h2>
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {JOINING.map((j, i) => (
              <Reveal key={j.title} style={{ transitionDelay: `${i * 60}ms` }}>
                <Tile className="h-full">
                  <div className="mb-4 grid h-[40px] w-[40px] place-items-center rounded-[12px] border border-line bg-sunken text-ink">
                    {j.icon}
                  </div>
                  <h3 className="text-[17px] font-semibold tracking-[-0.01em] text-ink">
                    {j.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
                    {j.body}
                  </p>
                  {j.href && (
                    <Link
                      href={j.href}
                      className="mt-4 inline-block text-[13px] font-semibold text-ink underline-offset-4 hover:underline"
                    >
                      Learn more
                    </Link>
                  )}
                </Tile>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>
    </main>
  );
}
