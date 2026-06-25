import { Container, Button, Eyebrow } from "@/components/ui";
import Reveal from "@/components/Reveal";

export const metadata = {
  title: "Roadmap — Quoril",
  description:
    "Where Quoril is headed: from the offline-first Kanban foundation to focus, reports, canvas, workspaces and public launch.",
};

type Status = "Shipped" | "In progress" | "Planned";

const ENTRIES: {
  date: string;
  title: string;
  body: string;
  status: Status;
}[] = [
  {
    date: "Q3 2026",
    title: "Public launch",
    body: "Native macOS, Windows and Linux builds, generally available.",
    status: "Planned",
  },
  {
    date: "Q2 2026",
    title: "Workspaces & member invites",
    body: "Shared workspaces, email invites and Row-Level Security policies.",
    status: "In progress",
  },
  {
    date: "Q2 2026",
    title: "Visual Canvas",
    body: "Infinite board with blocks and pipelines for thinking in space.",
    status: "Shipped",
  },
  {
    date: "Q1 2026",
    title: "Reports & Screen Time",
    body: "Analytics, heatmaps and a productivity score across 20+ categories.",
    status: "Shipped",
  },
  {
    date: "Q1 2026",
    title: "Focus Engine",
    body: "Deep focus sessions, the super-focus pill and a built-in pomodoro.",
    status: "Shipped",
  },
  {
    date: "2025",
    title: "Kanban Planner & offline-first sync",
    body: "The foundation: local-first boards with quiet background sync.",
    status: "Shipped",
  },
];

function StatusPill({ status }: { status: Status }) {
  const styles =
    status === "Shipped"
      ? "bg-ink text-paper"
      : status === "In progress"
        ? "border border-line text-ink-muted"
        : "bg-sunken text-ink-faint";
  return (
    <span
      className={`inline-flex items-center rounded-pill px-3 py-1 text-[12px] font-semibold tracking-[0.01em] ${styles}`}
    >
      {status}
    </span>
  );
}

export default function ChangelogPage() {
  return (
    <main className="bg-paper text-ink">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="pt-[130px] pb-20">
        <Container>
          <Reveal className="flex max-w-[760px] flex-col items-start">
            <div className="mb-5">
              <Eyebrow>Roadmap</Eyebrow>
            </div>
            <h1 className="font-heading text-[clamp(34px,6vw,62px)] font-semibold leading-[1.03] tracking-[-0.035em] text-ink">
              Where Quoril is headed.
            </h1>
            <p className="mt-6 max-w-[620px] text-[18px] leading-relaxed text-ink-muted">
              A look at what&apos;s shipped, what&apos;s in flight, and
              what&apos;s next on the way to launch. Built one focused release at
              a time.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* ── Timeline ─────────────────────────────────────────── */}
      <section className="py-16">
        <Container>
          <div className="mx-auto max-w-[720px]">
            <div className="relative border-l border-line pl-8 md:pl-10">
              {ENTRIES.map((e, i) => (
                <Reveal
                  key={`${e.date}-${e.title}`}
                  style={{ transitionDelay: `${i * 70}ms` }}
                  className={i === ENTRIES.length - 1 ? "" : "pb-12"}
                >
                  <div className="relative">
                    {/* dot on the line */}
                    <span className="absolute -left-[33px] top-1.5 grid h-3.5 w-3.5 place-items-center rounded-full border border-line-strong bg-paper md:-left-[41px]">
                      <span className="h-1.5 w-1.5 rounded-full bg-ink" />
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
                        {e.date}
                      </span>
                      <StatusPill status={e.status} />
                    </div>
                    <h3 className="mt-2 text-[20px] font-semibold tracking-[-0.01em] text-ink">
                      {e.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">
                      {e.body}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ── CTA band ─────────────────────────────────────────── */}
      <section className="py-24">
        <Container>
          <Reveal className="mx-auto flex max-w-[620px] flex-col items-center text-center">
            <h2 className="font-heading text-[clamp(30px,5vw,52px)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink">
              Be there at launch.
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-muted">
              Join the waitlist and get one email the day Quoril goes live —
              plus early-access pricing.
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
