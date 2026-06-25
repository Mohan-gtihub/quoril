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
  IconCheck,
  IconArrow,
  IconGrip,
} from "@/components/icons";

export const metadata = {
  title: "Planner — Quoril",
  description:
    "A Kanban board that thinks in time. Turn intentions into shipped work with auto-parsed estimates, drag & drop, subtasks, and real time tracking.",
};

/* ── kanban data ─────────────────────────────────────────── */

type Card = {
  title: string;
  done?: boolean;
  prio?: string;
  chip?: string;
};

const columns: {
  name: string;
  dot: string;
  count: number;
  cards: Card[];
}[] = [
  {
    name: "Backlog",
    dot: "#cfcec7",
    count: 8,
    cards: [
      { title: "Research onboarding flows", prio: "#cfcec7", chip: "~2h" },
      { title: "Collect customer quotes", prio: "#a8a8a1", chip: "5 subtasks" },
    ],
  },
  {
    name: "This Week",
    dot: "#a8a8a1",
    count: 5,
    cards: [
      { title: "Draft pricing page copy", prio: "#6b6b66", chip: "~90m" },
      { title: "Review Q3 roadmap", prio: "#a8a8a1", chip: "3 subtasks" },
    ],
  },
  {
    name: "Today",
    dot: "#6b6b66",
    count: 3,
    cards: [
      { title: "[25m] Write launch post", prio: "#16160f" }, // active — handled inline
      { title: "Reply to design feedback", prio: "#6b6b66", chip: "~20m" },
    ],
  },
  {
    name: "Done",
    dot: "#16160f",
    count: 6,
    cards: [
      { title: "Ship changelog email", done: true, prio: "#cfcec7", chip: "32m" },
      { title: "Fix board drag jitter", done: true, prio: "#a8a8a1", chip: "1h 04m" },
    ],
  },
];

/* ── small board pieces ──────────────────────────────────── */

function Checkbox({ done = false }: { done?: boolean }) {
  return done ? (
    <span className="mt-0.5 grid h-4 w-4 flex-none place-items-center rounded-[5px] bg-ink text-paper">
      <IconCheck className="h-3 w-3" />
    </span>
  ) : (
    <span className="mt-0.5 h-4 w-4 flex-none rounded-[5px] border border-line-strong" />
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-pill bg-sunken px-2 py-0.5 text-[10.5px] text-ink-muted">
      {children}
    </span>
  );
}

function TaskCard({ card }: { card: Card }) {
  return (
    <div className="rounded-[14px] border border-line bg-surface p-3.5 shadow-soft">
      <div className="flex items-start gap-2.5">
        <Checkbox done={card.done} />
        <p
          className={`text-[13px] font-medium leading-snug ${
            card.done ? "text-ink-faint line-through" : "text-ink/90"
          }`}
        >
          {card.title}
        </p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {card.prio && (
          <span
            className="h-2 w-2 flex-none rounded-full"
            style={{ background: card.prio }}
          />
        )}
        {card.chip && <Chip>{card.chip}</Chip>}
      </div>
    </div>
  );
}

function ActiveCard() {
  return (
    <div className="rounded-[14px] border border-line-strong bg-surface p-3.5 shadow-soft ring-1 ring-ink/5">
      <div className="flex items-start gap-2.5">
        <Checkbox />
        <p className="text-[13px] font-medium leading-snug text-ink">
          [25m] Write launch post
        </p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <span className="h-2 w-2 flex-none rounded-full bg-ink" />
        <span className="mono rounded-pill bg-ink/90 px-2 py-0.5 text-[10.5px] text-paper">
          ⏱ active 12:04
        </span>
      </div>
      <div className="mt-3 h-1 overflow-hidden rounded-pill bg-sunken">
        <div className="h-full rounded-pill bg-ink/80" style={{ width: "65%" }} />
      </div>
    </div>
  );
}

/* ── feature + reference data ────────────────────────────── */

const features: {
  icon: React.ReactNode;
  title: string;
  body: string;
}[] = [
  {
    icon: <IconClock className="h-5 w-5" />,
    title: "Auto-parsed time estimates",
    body: "Type [25m] Write report and the estimate is captured the moment you hit enter — no extra fields.",
  },
  {
    icon: <IconGrip className="h-5 w-5" />,
    title: "Drag & drop",
    body: "Reorder within a column or move between columns. Crossing a column auto-changes the task status.",
  },
  {
    icon: <IconCheck className="h-5 w-5" />,
    title: "Subtasks",
    body: "Break work down without limits. Completion tracking rolls up so you always see real progress.",
  },
  {
    icon: <IconBoard className="h-5 w-5" />,
    title: "Priorities",
    body: "Low, medium, high, and critical — a quiet ink scale, darker for higher priority, so the board reads at a glance.",
  },
  {
    icon: <IconClock className="h-5 w-5" />,
    title: "Due dates & recurring",
    body: "Set due dates or recurring tasks that auto-reset daily, so routines never clog your backlog.",
  },
  {
    icon: <IconClock className="h-5 w-5" />,
    title: "Actual time tracking",
    body: "Seconds are auto-tracked while a task is focused, so estimates meet reality over time.",
  },
  {
    icon: <IconBoard className="h-5 w-5" />,
    title: "Task details panel",
    body: "Open any task in a side panel and edit everything inline — title, notes, priority, subtasks.",
  },
  {
    icon: <IconArrow className="h-5 w-5" />,
    title: "Soft-delete & sort order",
    body: "Nothing is lost. Deleted tasks are recoverable, and a precise sort order keeps the board intentional.",
  },
];

const properties: { label: string; value: string }[] = [
  { label: "Status", value: "todo, planned, active, paused, done" },
  { label: "Priority", value: "low → medium → high → critical" },
  { label: "Estimated time", value: "Parsed from [25m] syntax or set manually" },
  { label: "Actual time", value: "Auto-tracked in seconds while focused" },
  { label: "Due date", value: "Optional calendar date with reminders" },
  { label: "Recurring", value: "Daily auto-reset for routine work" },
  { label: "Subtasks", value: "Unlimited, with completion rollup" },
  { label: "Sort order", value: "Precise manual ordering per column" },
];

/* ── page ────────────────────────────────────────────────── */

export default function PlannerPage() {
  return (
    <main className="bg-paper">
      {/* 1 — hero + kanban mockup */}
      <section className="pt-[130px]">
        <Container>
          <Reveal className="mx-auto flex max-w-[760px] flex-col items-center text-center">
            <div className="mb-4">
              <Eyebrow>Planner</Eyebrow>
            </div>
            <h1 className="font-heading text-[clamp(34px,5.6vw,60px)] font-semibold leading-[1.04] tracking-[-0.035em] text-ink">
              A Kanban board that thinks in time.
            </h1>
            <p className="mt-5 max-w-[600px] text-[17px] leading-relaxed text-ink-muted">
              Quoril&apos;s planner turns loose intentions into shipped work.
              Capture estimates as you type, watch time tracked while you focus,
              and move tasks across the board until they&apos;re done.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button href="/waitlist">Join the waitlist</Button>
              <Button href="/features" variant="secondary">
                All features
              </Button>
            </div>
          </Reveal>

          {/* static kanban mockup */}
          <Reveal delay={0.12} className="mt-16">
            <div className="overflow-hidden rounded-tile border border-line bg-surface shadow-lift">
              {/* window chrome */}
              <div className="flex items-center gap-2 border-b border-line bg-sunken/60 px-4 py-3">
                <span className="h-3 w-3 rounded-full border border-line bg-surface" />
                <span className="h-3 w-3 rounded-full border border-line bg-surface" />
                <span className="h-3 w-3 rounded-full border border-line bg-surface" />
                <span className="ml-3 text-[12px] font-medium text-ink-faint">
                  Planner — This week
                </span>
              </div>

              {/* board */}
              <div className="grid grid-cols-2 gap-5 p-5 sm:p-7 lg:grid-cols-4">
                {columns.map((col) => (
                  <div key={col.name} className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 px-0.5">
                      <span
                        className="h-2.5 w-2.5 flex-none rounded-full"
                        style={{ background: col.dot }}
                      />
                      <span className="text-[13px] font-semibold text-ink">
                        {col.name}
                      </span>
                      <span className="ml-auto rounded-pill bg-sunken px-2 py-0.5 text-[11px] text-ink-faint">
                        {col.count}
                      </span>
                    </div>

                    {col.name === "Today" ? (
                      <>
                        <ActiveCard />
                        <TaskCard card={col.cards[1]} />
                      </>
                    ) : (
                      col.cards.map((card) => (
                        <TaskCard key={card.title} card={card} />
                      ))
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* 2 — feature detail grid */}
      <section className="py-24">
        <Container>
          <SectionHead
            eyebrow="Built for execution"
            title="Every detail tuned for finishing"
            sub="The planner is opinionated about one thing: helping you turn a plan into completed work."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.06}>
                <Tile className="h-full">
                  <TileIcon>{f.icon}</TileIcon>
                  <h3 className="font-heading text-[18px] font-semibold tracking-[-0.01em] text-ink">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
                    {f.body}
                  </p>
                </Tile>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* 3 — task properties reference */}
      <section className="pb-24">
        <Container className="max-w-[860px]">
          <SectionHead
            eyebrow="Reference"
            title="Task properties"
            sub="Everything a task can hold. Nothing you have to fill in."
          />
          <Reveal>
            <Tile hover={false} className="p-0">
              <dl className="divide-y divide-line">
                {properties.map((p) => (
                  <div
                    key={p.label}
                    className="grid grid-cols-1 gap-1 px-6 py-5 sm:grid-cols-[200px_1fr] sm:items-baseline sm:gap-6"
                  >
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                      {p.label}
                    </dt>
                    <dd className="text-[15px] text-ink">{p.value}</dd>
                  </div>
                ))}
              </dl>
            </Tile>
          </Reveal>
        </Container>
      </section>

      {/* 4 — CTA band */}
      <section className="pb-28">
        <Container>
          <Reveal>
            <div className="rounded-tile border border-line bg-surface px-6 py-16 text-center shadow-soft">
              <p className="font-hand text-[18px] text-ink-faint">
                stop planning, start shipping
              </p>
              <h2 className="mt-3 font-heading text-[clamp(26px,4vw,42px)] font-semibold tracking-[-0.03em] text-ink">
                Plan your day in minutes.
              </h2>
              <p className="mx-auto mt-4 max-w-[460px] text-[16px] leading-relaxed text-ink-muted">
                Join the waitlist and be first to plan in time, not just lists.
              </p>
              <div className="mt-8 flex justify-center">
                <Button href="/waitlist">Join the waitlist</Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </main>
  );
}
