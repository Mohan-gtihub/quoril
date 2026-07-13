import Reveal from "@/components/Reveal";
import Waitlist from "@/components/Waitlist";
import AppMockup from "@/components/AppMockup";
import FocusPill from "@/components/FocusPill";
import { Heatmap, FOCUS, BREAK, WELLBEING } from "@/components/Charts";
import {
  Container,
  SectionHead,
  Tile,
  TileIcon,
  Button,
} from "@/components/ui";
import {
  IconArrow,
  IconBoard,
  IconChart,
  IconCheck,
  IconClock,
  IconGlobe,
} from "@/components/icons";

const COMPARISON = [
  {
    need: "Plan a realistic day",
    quoril: "Tasks, time estimates and daily capacity live in one view.",
    stack: "A task list shows what is due, but not whether it fits today.",
  },
  {
    need: "Start focused work",
    quoril: "Start a focus session directly from the task you chose.",
    stack: "Move to a separate timer and recreate the context yourself.",
  },
  {
    need: "Understand where time went",
    quoril: "See focused time, finished tasks and app activity together.",
    stack: "Review disconnected totals across a timer, tasks and tracker.",
  },
  {
    need: "Improve tomorrow's plan",
    quoril: "Compare estimates with actual focus time while the context is intact.",
    stack: "Reconcile exports or remember which tracked time belonged to what.",
  },
  {
    need: "Keep work private and available",
    quoril: "Your core workflow works offline and writes to your device first.",
    stack: "Privacy and offline access depend on every tool in the stack.",
  },
];

export default function Home() {
  return (
    <>
      {/* ───────── HERO ───────── */}
      <header className="dotgrid relative overflow-hidden px-5 pb-14 pt-[120px] text-center sm:px-6 sm:pb-20 sm:pt-[150px]">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[440px] bg-gradient-to-b from-paper to-transparent dark:hidden" />
        <div className="aurora pointer-events-none absolute inset-x-0 top-0 -z-10 hidden h-[660px] dark:block" />

        <Reveal delay={0.05}>
          {/* <div className="mx-auto inline-flex items-center gap-2 rounded-pill border border-line-strong bg-surface px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink shadow-soft">
            <span className="h-2 w-2 rounded-full bg-[var(--brand-accent,#a3e635)]" />
            V1 is free before launch
          </div> */}
          <h1 className="mx-auto mt-6 max-w-[18ch] font-heading text-[clamp(40px,6.4vw,78px)] font-semibold leading-[1.02] tracking-[-0.045em] text-ink">
            Plan your day. Stay focused. See where your time went.
          </h1>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-[650px] text-[clamp(16px,2vw,20px)] leading-relaxed text-ink-muted">
            Quoril combines tasks, focus sessions and private time insights in
            one native desktop app—so you can do the work without managing four
            different tools.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mt-8 flex flex-col items-center">
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button href="/waitlist" className="px-7 py-3.5 text-[15.5px]">
                Get V1 free <IconArrow className="h-4 w-4" />
              </Button>
              <Button
                href="#how-it-works"
                variant="secondary"
                className="px-7 py-3.5 text-[15.5px]"
              >
                See how it works
              </Button>
            </div>
            <p className="mt-4 text-[13.5px] text-ink-faint">
              No card. No trial. One email when V1 is ready.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="mt-10 sm:mt-14">
            <AppMockup />
          </div>
        </Reveal>
      </header>

      {/* ───────── OUTCOME STRIP ───────── */}
      <Container>
        <Reveal>
          <div className="my-14 grid gap-7 border-y border-line py-9 text-center sm:my-20 sm:grid-cols-3 sm:py-11">
            {[
              ["Plan without app-hopping", "Tasks and time estimates live together."],
              ["Focus without losing context", "Start a session directly from the work."],
              ["Learn without surveillance", "Local-first data, synced only to your account."],
            ].map(([title, body]) => (
              <div key={title} className="mx-auto max-w-[290px]">
                <h2 className="text-[16px] font-semibold text-ink">{title}</h2>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-muted">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </Container>

      {/* ───────── PRODUCT STORY ───────── */}
      <section id="how-it-works" className="scroll-mt-24 py-14 sm:py-20">
        <Container>
          <SectionHead
            eyebrow="One simple loop"
            title="Plan. Focus. Understand."
            sub="Quoril follows the work from intention to insight, so every screen answers the next useful question."
          />

          <div className="grid gap-[18px] lg:grid-cols-3">
            <Reveal>
              <Tile className="h-full" hover={false}>
                <Step number="01" />
                <TileIcon tint={FOCUS}>
                  <IconBoard className="h-[22px] w-[22px]" />
                </TileIcon>
                <h3 className="text-[21px] font-semibold tracking-[-0.02em] text-ink">
                  Plan what matters
                </h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">
                  Put work into Today, estimate it in minutes, and know what a
                  realistic day actually looks like.
                </p>
                <div className="mt-6 space-y-2.5 rounded-card border border-line bg-paper p-3.5">
                  {[
                    ["Finish onboarding copy", "25m", true],
                    ["Review launch checklist", "40m", false],
                    ["Reply to beta feedback", "20m", false],
                  ].map(([task, time, active]) => (
                    <div
                      key={String(task)}
                      className={`flex items-center gap-3 rounded-[11px] border px-3 py-2.5 text-left ${
                        active
                          ? "border-ink/20 bg-surface shadow-soft"
                          : "border-line bg-sunken/40"
                      }`}
                    >
                      <span
                        className={`h-3.5 w-3.5 shrink-0 rounded-[4px] border ${
                          active ? "border-ink bg-ink" : "border-line-strong"
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink">
                        {task}
                      </span>
                      <span className="mono text-[11.5px] text-ink-faint">{time}</span>
                    </div>
                  ))}
                </div>
              </Tile>
            </Reveal>

            <Reveal delay={0.05}>
              <Tile className="h-full" hover={false}>
                <Step number="02" />
                <TileIcon tint={BREAK}>
                  <IconClock className="h-[22px] w-[22px]" />
                </TileIcon>
                <h3 className="text-[21px] font-semibold tracking-[-0.02em] text-ink">
                  Protect the focus
                </h3>
                <p className="mb-6 mt-2 text-[14.5px] leading-relaxed text-ink-muted">
                  Start the timer from your task. The focus pill stays visible
                  across apps without pulling you back into a dashboard.
                </p>
                <div className="flex min-h-[176px] items-center justify-center rounded-card border border-line bg-paper p-4">
                  <FocusPill />
                </div>
              </Tile>
            </Reveal>

            <Reveal delay={0.1}>
              <Tile className="h-full" hover={false}>
                <Step number="03" />
                <TileIcon tint={WELLBEING}>
                  <IconChart className="h-[22px] w-[22px]" />
                </TileIcon>
                <h3 className="text-[21px] font-semibold tracking-[-0.02em] text-ink">
                  Understand the day
                </h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">
                  See focus time, completed work and app usage together—then use
                  the pattern to plan tomorrow better.
                </p>
                <div className="mt-5 rounded-card border border-line bg-paper p-4">
                  <div className="mb-4 grid grid-cols-2 gap-3 text-left">
                    <MiniMetric label="Focus time" value="5h 16m" />
                    <MiniMetric label="Tasks done" value="12 / 15" />
                  </div>
                  <Heatmap />
                </div>
              </Tile>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ───────── PRIVACY ───────── */}
      <section className="border-y border-line bg-surface py-16 sm:py-24">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <Reveal>
              <div className="inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                <IconGlobe className="h-4 w-4" />
                Private by design
              </div>
              <h2 className="mt-5 font-heading text-[clamp(30px,4.8vw,52px)] font-semibold leading-[1.06] tracking-[-0.035em] text-ink">
                Useful tracking without turning you into the product.
              </h2>
              <p className="mt-5 max-w-[560px] text-[17px] leading-relaxed text-ink-muted">
                Your productivity data is written to local SQLite first, works
                offline, and syncs only to your own account. Quoril never sells
                your data.
              </p>
              <div className="mt-7">
                <Button href="/security" variant="secondary">
                  Read how privacy works <IconArrow className="h-4 w-4" />
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.08}>
              <div className="rounded-tile border border-line bg-paper p-5 shadow-soft sm:p-7">
                {[
                  ["Local-first", "Every task, list and focus session is written to your device first."],
                  ["Encrypted sync", "Authenticated sync keeps your account available across devices."],
                  ["No data business", "No advertising cookies, data brokers or selling personal data."],
                ].map(([title, body], index) => (
                  <div
                    key={title}
                    className={`flex gap-4 py-4 ${index > 0 ? "border-t border-line" : ""}`}
                  >
                    <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-paper">
                      <IconCheck className="h-4 w-4" />
                    </span>
                    <div>
                      <h3 className="text-[16px] font-semibold text-ink">{title}</h3>
                      <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ───────── COMPARISON ───────── */}
      <section className="py-16 sm:py-24">
        <Container>
          <SectionHead
            eyebrow="Why Quoril"
            title="Keep the context. Lose the app-hopping."
            sub="Quoril connects the decisions before, during and after focused work. A typical productivity stack leaves those connections to you."
          />
          <Reveal>
            <div className="mx-auto max-w-[1040px] overflow-hidden rounded-tile border border-line bg-surface shadow-lift">
              <div className="hidden grid-cols-[.72fr_1fr_1fr] border-b border-line bg-sunken text-left sm:grid">
                <div className="flex items-end px-6 py-5">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                    Workflow moment
                  </span>
                </div>
                <div className="border-x border-line bg-surface px-6 py-5">
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-paper">
                      <IconCheck className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-[15px] font-semibold text-ink">Quoril</div>
                      <div className="mt-0.5 text-[12px] text-ink-muted">Connected by design</div>
                    </div>
                  </div>
                </div>
                <div className="px-6 py-5">
                  <div className="text-[15px] font-semibold text-ink">Typical app stack</div>
                  <div className="mt-0.5 text-[12px] text-ink-muted">Connected by you</div>
                </div>
              </div>

              <div className="divide-y divide-line">
                {COMPARISON.map(({ need, quoril, stack }, index) => (
                <div
                  key={need}
                  className="grid text-left sm:grid-cols-[.72fr_1fr_1fr]"
                >
                  <div className="bg-sunken/60 px-5 pb-3 pt-5 sm:flex sm:items-center sm:bg-transparent sm:px-6 sm:py-6">
                    <span className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint sm:hidden">
                      {String(index + 1).padStart(2, "0")} · Workflow moment
                    </span>
                    <h3 className="text-[15px] font-semibold leading-snug text-ink">{need}</h3>
                  </div>

                  <div className="border-line bg-surface px-5 py-4 sm:border-x sm:px-6 sm:py-6">
                    <span className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink sm:hidden">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-paper">
                        <IconCheck className="h-3 w-3" />
                      </span>
                      With Quoril
                    </span>
                    <p className="text-[13.5px] font-medium leading-relaxed text-ink sm:text-[14px]">
                      {quoril}
                    </p>
                  </div>

                  <div className="bg-sunken/35 px-5 pb-5 pt-3 sm:bg-transparent sm:px-6 sm:py-6">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-faint sm:hidden">
                      With separate apps
                    </span>
                    <p className="text-[13.5px] leading-relaxed text-ink-muted sm:text-[14px]">
                      {stack}
                    </p>
                  </div>
                </div>
                ))}
              </div>

              <div className="flex flex-col gap-4 border-t border-line bg-sunken px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="max-w-[650px] text-[13.5px] leading-relaxed text-ink-muted">
                  <strong className="font-semibold text-ink">The practical difference:</strong>{" "}
                  less setup, fewer handoffs and a clearer feedback loop between the work you planned and the time you actually spent.
                </p>
                <Button href="/features" variant="secondary" className="shrink-0">
                  Explore features <IconArrow className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ───────── FINAL CTA ───────── */}
      <Container>
        <Reveal>
          <div className="dotgrid relative my-14 overflow-hidden rounded-tile border border-line bg-surface px-5 py-14 text-center shadow-lift sm:my-20 sm:px-8 sm:py-20">
            <div className="aurora pointer-events-none absolute inset-x-0 top-0 h-full opacity-70" />
            <div className="relative mx-auto max-w-[720px]">
              <span className="text-[12px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                Free before launch
              </span>
              <h2 className="mt-4 font-heading text-[clamp(32px,5vw,54px)] font-semibold leading-tight tracking-[-0.035em] text-ink">
                Your first version is on us.
              </h2>
              <p className="mx-auto mt-4 max-w-[520px] text-[17px] leading-relaxed text-ink-muted">
                Enter your email and we will send your V1 access when it is ready.
                No card and no trial.
              </p>
              <div className="mx-auto mt-8 rounded-tile border border-line bg-paper/80 p-4 shadow-soft sm:p-6">
                <Waitlist showIntro={false} />
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </>
  );
}

function Step({ number }: { number: string }) {
  return (
    <span className="mono absolute right-5 top-5 text-[12px] font-semibold tracking-[0.12em] text-ink-faint">
      {number}
    </span>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[11px] bg-sunken p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </div>
      <div className="mono mt-1.5 text-[18px] font-semibold text-ink">{value}</div>
    </div>
  );
}
