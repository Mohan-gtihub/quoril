import Link from "next/link";
import {
  Container,
  SectionHead,
  Tile,
  TileIcon,
  Button,
  Eyebrow,
} from "@/components/ui";
import Reveal from "@/components/Reveal";
import {
  IconBoard,
  IconClock,
  IconChart,
  IconScreen,
  IconCanvas,
  IconLayers,
  IconGlobe,
  IconBolt,
  IconCheck,
  IconArrow,
} from "@/components/icons";

export const metadata = {
  title: "Features — Quoril",
  description:
    "Everything Quoril does: a Kanban planner, a focus engine, native app & website tracking, screen-time insights, a visual canvas, offline-first sync and more — in one window.",
};

type Feature = {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href?: string;
  learn?: string;
};

const features: Feature[] = [
  {
    icon: <IconBoard className="h-[22px] w-[22px]" />,
    title: "Kanban Planner",
    desc: "Four columns — Backlog, This Week, Today, Done — with drag & drop. Auto-parses [25m] estimates from titles, plus subtasks, priorities, due dates and recurring tasks.",
    href: "/features/planner",
    learn: "Explore the planner",
  },
  {
    icon: <IconClock className="h-[22px] w-[22px]" />,
    title: "Focus Engine",
    desc: "Three surfaces to stay in flow: full-screen Deep Focus, a floating Super Focus Pill and a quick Focus Popup. Pomodoro, session types and interval alerts built in.",
    href: "/features/focus",
    learn: "Explore focus modes",
  },
  {
    icon: <IconScreen className="h-[22px] w-[22px]" />,
    title: "App & Website Tracking",
    desc: "A native engine samples the active window every 5 seconds across 20+ categories, with browser domain detection, idle detection and per-task context linking.",
  },
  {
    icon: <IconChart className="h-[22px] w-[22px]" />,
    title: "Screen Time & Wellbeing",
    desc: "An hourly heatmap, productive-vs-distracting split, category donut, 7-day trend, ranked app & website lists and a full activity timeline.",
    href: "/insights",
    learn: "See your insights",
  },
  {
    icon: <IconChart className="h-[22px] w-[22px]" />,
    title: "Reports & Analytics",
    desc: "A six-KPI daily snapshot with focus quality, a 0–100 productivity score, estimation accuracy, habit consistency and flexible date ranges.",
    href: "/insights",
    learn: "View reports",
  },
  {
    icon: <IconCanvas className="h-[22px] w-[22px]" />,
    title: "Visual Canvas",
    desc: "An infinite board for ideas, checklists, links, images, video and task references — wired together with pipelines and conditions.",
    href: "/canvas",
    learn: "Open the canvas",
  },
  {
    icon: <IconLayers className="h-[22px] w-[22px]" />,
    title: "Workspaces & Lists",
    desc: "Color-coded workspaces with archive and restore, freely movable lists, and Unassigned & Archived system folders to keep everything tidy.",
  },
  {
    icon: <IconCanvas className="h-[22px] w-[22px]" />,
    title: "Themes",
    desc: "Four hand-tuned app themes — Onyx Dark, Arcade Blue, Sunset Red and Cosmic Nebula — powered by CSS-variable theming for instant switching.",
  },
  {
    icon: <IconBolt className="h-[22px] w-[22px]" />,
    title: "Offline-first Sync",
    desc: "Local SQLite first, with background sync every 10 seconds in FK-safe order, real-time subscriptions and last-write-wins conflict resolution.",
    href: "/security",
    learn: "How sync works",
  },
  {
    icon: <IconCheck className="h-[22px] w-[22px]" />,
    title: "Auth & Security",
    desc: "Email + password and Google OAuth, email verification, strong password rules, token refresh, inactivity timeout and rate limiting.",
    href: "/security",
    learn: "Security details",
  },
  {
    icon: <IconGlobe className="h-[22px] w-[22px]" />,
    title: "Cross-platform",
    desc: "Native builds for Windows (.exe), macOS (.dmg) and Linux (.AppImage), with a system tray and an always-on-top widget.",
    href: "/download",
    learn: "See platforms",
  },
  {
    icon: <IconBolt className="h-[22px] w-[22px]" />,
    title: "Data Safety",
    desc: "Crash recovery, soft-delete for everything you remove, and per-second focus-state backup so a session is never lost.",
  },
];

function LearnMore({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink transition hover:gap-2.5"
    >
      {label}
      <IconArrow className="h-[16px] w-[16px]" />
    </Link>
  );
}

export default function FeaturesPage() {
  return (
    <main className="bg-paper">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="pt-[110px] pb-14 sm:pt-[130px] sm:pb-20">
        <Container>
          <Reveal className="mx-auto flex max-w-[760px] flex-col items-center text-center">
            <div className="mb-5">
              <Eyebrow>Features</Eyebrow>
            </div>
            <h1 className="font-heading text-[clamp(34px,5.6vw,60px)] font-semibold leading-[1.04] tracking-[-0.035em] text-ink">
              Everything you need to do deep work — in one window.
            </h1>
            <p className="mt-6 max-w-[600px] text-[18px] leading-relaxed text-ink-muted">
              Quoril folds planning, focus, automatic time tracking and honest
              insights into a single desktop app — so you spend less time
              managing tools and more time doing the work that matters.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button href="/waitlist">Join the waitlist</Button>
              <Button href="/download" variant="secondary">
                See platforms
              </Button>
            </div>
            <p className="mt-6 font-hand text-[17px] text-ink-faint">
              one quiet window for your whole day
            </p>
          </Reveal>
        </Container>
      </section>

      {/* ── Feature grid ─────────────────────────────────── */}
      <section className="pb-16 sm:pb-24">
        <Container>
          <SectionHead
            eyebrow="The full picture"
            title="Twelve capabilities, one calm surface"
            sub="Each piece is built to work on its own — and to feel inevitable when used together."
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 0.06}>
                <Tile className="flex h-full flex-col">
                  <TileIcon>{f.icon}</TileIcon>
                  <h3 className="text-[19px] font-semibold tracking-[-0.01em] text-ink">
                    {f.title}
                  </h3>
                  <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-muted">
                    {f.desc}
                  </p>
                  <div className="mt-auto">
                    {f.href && f.learn && (
                      <LearnMore href={f.href} label={f.learn} />
                    )}
                  </div>
                </Tile>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Closing CTA ──────────────────────────────────── */}
      <section className="pb-28">
        <Container>
          <Reveal>
            <div className="mx-auto flex max-w-[820px] flex-col items-center rounded-tile border border-line bg-surface px-8 py-16 text-center shadow-soft">
              <h2 className="font-heading text-[clamp(28px,4.4vw,44px)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink">
                One tool. Your whole workflow.
              </h2>
              <p className="mt-4 max-w-[480px] text-[17px] leading-relaxed text-ink-muted">
                Stop stitching together a planner, a timer and three dashboards.
                Quoril does the lot — and stays out of your way.
              </p>
              <div className="mt-8">
                <Button href="/waitlist">Join the waitlist</Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </main>
  );
}
