import {
  Container,
  SectionHead,
  Tile,
  TileIcon,
  Button,
  Eyebrow,
} from "@/components/ui";
import Reveal from "@/components/Reveal";
import { Ring } from "@/components/Charts";
import FocusPill from "@/components/FocusPill";
import {
  IconClock,
  IconPlay,
  IconPause,
  IconCheck,
  IconArrow,
  IconBolt,
} from "@/components/icons";

export const metadata = {
  title: "Focus Engine — Quoril",
  description:
    "Three ways to focus, one honest timer: full-screen Deep Focus, a floating always-on-top pill and a quick popup window — with Pomodoro, session types and interval alerts built in.",
};

const sessionTypes = [
  "regular",
  "deep_work",
  "quick_sprint",
  "pomodoro",
  "break",
  "long_break",
];

const alerts = [
  {
    title: "Timed interval alerts",
    desc: "Gentle nudges on a cadence you choose — every 10 minutes by default — so long sessions stay honest without breaking flow.",
  },
  {
    title: "Sound notifications",
    desc: "A soft chime marks the end of a work block, a break, or a completed task. Mute it per-session whenever you need silence.",
  },
  {
    title: "On-screen flash",
    desc: "A brief, full-window pulse for moments you can't hear audio — clear, calm, and impossible to miss at a glance.",
  },
  {
    title: "Native OS notifications",
    desc: "System-level toasts on Windows, macOS and Linux reach you even when Quoril is tucked away in the tray.",
  },
];

export default function FocusPage() {
  return (
    <main className="bg-paper">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="pt-[130px] pb-20">
        <Container>
          <Reveal className="mx-auto flex max-w-[800px] flex-col items-center text-center">
            <div className="mb-5">
              <Eyebrow>Focus Engine</Eyebrow>
            </div>
            <h1 className="font-heading text-[clamp(34px,5.6vw,60px)] font-semibold leading-[1.04] tracking-[-0.035em] text-ink">
              Three ways to focus. One timer that never lies.
            </h1>
            <p className="mt-6 max-w-[620px] text-[18px] leading-relaxed text-ink-muted">
              Quoril tracks real effort, not wishful thinking. Every deep work
              session records the time you actually spent in flow — across a
              full-screen mode, a floating pill and a quick popup — so the
              numbers you plan with are the numbers you earned.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button href="/waitlist">Join the waitlist</Button>
              <Button href="/features" variant="secondary">
                All features
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── Three surfaces ───────────────────────────────── */}
      <section className="pb-24">
        <Container>
          <SectionHead
            eyebrow="One engine, three surfaces"
            title="Pick the surface that fits the moment"
            sub="The same honest timer, shaped for the way you're working right now — heads-down, multitasking, or somewhere in between."
          />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* a) Deep Focus Mode */}
            <Reveal>
              <Tile className="flex h-full flex-col">
                <TileIcon>
                  <IconBolt className="h-[22px] w-[22px]" />
                </TileIcon>
                <h3 className="text-[19px] font-semibold tracking-[-0.01em] text-ink">
                  Deep Focus Mode
                </h3>
                <p className="mt-1 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                  Full-screen
                </p>
                <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">
                  A distraction-free canvas: an oversized timer, your active
                  task with its description, the queue waiting behind it, and a
                  pause / break / complete grid within reach. A Pomodoro overlay
                  keeps the rhythm, and finishing a task earns a quiet burst of
                  confetti.
                </p>
                <div className="mt-7 grid place-items-center rounded-card border border-line bg-sunken py-7">
                  <Ring pct={0.65} value="17:23" label="remaining" />
                </div>
              </Tile>
            </Reveal>

            {/* b) Super Focus Pill */}
            <Reveal delay={0.06}>
              <Tile className="flex h-full flex-col">
                <TileIcon>
                  <IconClock className="h-[22px] w-[22px]" />
                </TileIcon>
                <h3 className="text-[19px] font-semibold tracking-[-0.01em] text-ink">
                  Super Focus Pill
                </h3>
                <p className="mt-1 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                  Floating · always-on-top
                </p>
                <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">
                  A compact glass pill that floats over any app. Hover to reveal
                  controls, expand it to check off subtasks, and drag it
                  anywhere on screen. It stays with you while you work
                  elsewhere — try it below.
                </p>
                <div className="mt-7">
                  <FocusPill />
                </div>
              </Tile>
            </Reveal>

            {/* c) Focus Popup */}
            <Reveal delay={0.12}>
              <Tile className="flex h-full flex-col">
                <TileIcon>
                  <IconPlay className="h-[22px] w-[22px]" />
                </TileIcon>
                <h3 className="text-[19px] font-semibold tracking-[-0.01em] text-ink">
                  Focus Popup
                </h3>
                <p className="mt-1 text-[12.5px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                  Separate window
                </p>
                <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">
                  A tidy little window with just the essentials: the timer,
                  play / pause, skip, and complete-and-close. Pop it onto a
                  second monitor and forget the rest of the interface exists.
                </p>
                <div className="mt-7 flex flex-1 items-center justify-center rounded-card border border-line bg-sunken p-6">
                  {/* static popup mockup */}
                  <div className="w-full max-w-[230px] rounded-card border border-line bg-surface p-5 shadow-soft">
                    <div className="flex items-center justify-between">
                      <span className="rounded-pill border border-line bg-sunken px-2 py-0.5 text-[10px] font-semibold tracking-wide text-ink-muted">
                        DEEP WORK
                      </span>
                      <span className="text-[11px] font-medium text-ink-faint">
                        Session 2
                      </span>
                    </div>
                    <p className="mono mt-4 text-center text-[34px] font-bold tracking-tight text-ink">
                      24:10
                    </p>
                    <div className="mt-5 flex items-center justify-center gap-3">
                      <button className="grid h-9 w-9 place-items-center rounded-full bg-ink text-paper">
                        <IconPlay className="h-4 w-4" />
                      </button>
                      <span className="rounded-pill border border-line bg-sunken px-3 py-1.5 text-[12px] font-medium text-ink-muted">
                        Skip
                      </span>
                      <span className="rounded-pill border border-line bg-sunken px-3 py-1.5 text-[12px] font-medium text-ink-muted">
                        Complete
                      </span>
                    </div>
                  </div>
                </div>
              </Tile>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ── Pomodoro ─────────────────────────────────────── */}
      <section className="pb-24">
        <Container>
          <SectionHead
            eyebrow="Rhythm"
            title="Pomodoro, built in"
            sub="No second app, no browser tab — a configurable work-and-break cycle lives inside every focus surface."
          />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
            <Reveal>
              <Tile className="flex h-full flex-col justify-center">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {[
                    {
                      n: "25m",
                      label: "Work block",
                      d: "Configurable, defaults to a classic 25-minute sprint.",
                    },
                    {
                      n: "10m",
                      label: "Break",
                      d: "Set your own length — Quoril prompts you automatically.",
                    },
                    {
                      n: "Live",
                      label: "Visual countdown",
                      d: "A ring drains as the block elapses, so progress is obvious.",
                    },
                    {
                      n: "×N",
                      label: "Session count",
                      d: "Completed cycles are tallied toward your daily effort.",
                    },
                  ].map((c) => (
                    <div key={c.label}>
                      <b className="mono block text-[clamp(26px,4vw,36px)] font-semibold tracking-[-0.03em] text-ink">
                        {c.n}
                      </b>
                      <span className="mt-1 block text-[14px] font-semibold text-ink">
                        {c.label}
                      </span>
                      <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                        {c.d}
                      </p>
                    </div>
                  ))}
                </div>
              </Tile>
            </Reveal>

            {/* pomodoro card mockup */}
            <Reveal delay={0.06}>
              <Tile className="flex h-full flex-col items-center justify-center">
                <div className="w-full max-w-[280px] rounded-card border border-line bg-sunken p-7 text-center shadow-soft">
                  <span className="rounded-pill border border-line bg-surface px-3 py-1 text-[11px] font-semibold tracking-wide text-ink-muted">
                    POMODORO · 3 / 4
                  </span>
                  <div className="mt-6 grid place-items-center">
                    <Ring pct={0.42} value="10:32" label="work block" />
                  </div>
                  <div className="mt-6 flex items-center justify-center gap-3">
                    <button className="grid h-9 w-9 place-items-center rounded-full bg-ink text-paper">
                      <IconPause className="h-4 w-4" />
                    </button>
                    <span className="inline-flex items-center gap-1.5 rounded-pill border border-line bg-surface px-3 py-1.5 text-[12px] font-medium text-ink-muted">
                      <IconCheck className="h-3.5 w-3.5 text-ink" /> Break next
                    </span>
                  </div>
                </div>
              </Tile>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ── Session types ────────────────────────────────── */}
      <section className="pb-24">
        <Container>
          <SectionHead
            eyebrow="Session types"
            title="Name the kind of work"
            sub="Every session is tagged, so your insights can tell a sprint from a slow grind."
          />
          <Reveal className="flex flex-wrap items-center justify-center gap-2.5">
            {sessionTypes.map((t) => (
              <span
                key={t}
                className="mono rounded-pill border border-line bg-sunken px-3 py-1.5 text-[13px] text-ink-muted"
              >
                {t}
              </span>
            ))}
          </Reveal>
          <p className="mx-auto mt-5 max-w-[560px] text-center text-[14px] leading-relaxed text-ink-faint">
            Pick a type when you start — or let Quoril infer it from your
            Pomodoro rhythm — and each one is colour-free, counted, and rolled
            into your daily report.
          </p>
        </Container>
      </section>

      {/* ── Alerts ───────────────────────────────────────── */}
      <section className="pb-24">
        <Container>
          <SectionHead
            eyebrow="Alerts"
            title="Stay aware without staring"
            sub="Quoril keeps you honest about elapsed time through whichever channel reaches you best."
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {alerts.map((a, i) => (
              <Reveal key={a.title} delay={(i % 2) * 0.06}>
                <Tile className="flex h-full items-start gap-4">
                  <div className="grid h-[40px] w-[40px] flex-shrink-0 place-items-center rounded-[12px] border border-line bg-sunken text-ink">
                    <IconClock className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-semibold tracking-[-0.01em] text-ink">
                      {a.title}
                    </h3>
                    <p className="mt-1.5 text-[14px] leading-relaxed text-ink-muted">
                      {a.desc}
                    </p>
                  </div>
                </Tile>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── CTA band ─────────────────────────────────────── */}
      <section className="pb-28">
        <Container>
          <Reveal>
            <div className="mx-auto flex max-w-[820px] flex-col items-center rounded-tile border border-line bg-surface px-8 py-16 text-center shadow-soft">
              <h2 className="font-heading text-[clamp(28px,4.4vw,44px)] font-semibold leading-[1.08] tracking-[-0.03em] text-ink">
                Start your first deep work session.
              </h2>
              <p className="mt-4 max-w-[480px] text-[17px] leading-relaxed text-ink-muted">
                Pick a surface, name the work, and let an honest timer do the
                counting. The flow is yours to keep.
              </p>
              <div className="mt-8">
                <Button href="/waitlist">
                  Join the waitlist
                  <IconArrow className="h-[18px] w-[18px]" />
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </main>
  );
}
