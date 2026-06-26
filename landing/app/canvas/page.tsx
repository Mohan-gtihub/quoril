import {
  Container,
  SectionHead,
  Tile,
  TileIcon,
  ACCENTS,
  Button,
  Eyebrow,
} from "@/components/ui";
import Reveal from "@/components/Reveal";
import {
  IconCanvas,
  IconCheck,
  IconArrow,
  IconBolt,
  IconBoard,
} from "@/components/icons";

export const metadata = {
  title: "Canvas — Quoril",
  description:
    "An infinite visual workspace wired to your tasks. Drop text, ideas, checklists, links and media on a board — then wire blocks into pipelines with edges and conditions.",
};

/* ── block types ─────────────────────────────────────────── */

const blocks: { label: string; body: string }[] = [
  {
    label: "Text",
    body: "Rich text blocks for notes, briefs, and long-form thinking — formatted inline as you type.",
  },
  {
    label: "Idea",
    body: "Capture a spark before it fades. Loose, lightweight, and ready to grow into something real.",
  },
  {
    label: "Checklist",
    body: "Track small steps right on the board, with completion that reads at a glance.",
  },
  {
    label: "Link",
    body: "Drop any URL and it becomes a clean card with favicon, title, and source.",
  },
  {
    label: "Image",
    body: "Reference shots, screenshots, and moodboards — placed exactly where the thinking happens.",
  },
  {
    label: "Video",
    body: "Embed clips and walkthroughs inline so context lives next to the work.",
  },
  {
    label: "Task Reference",
    body: "Link a block to a real task in your planner — status and estimate stay in sync.",
  },
  {
    label: "Placeholder",
    body: "Hold space for the not-yet-decided. Sketch the shape now, fill it in later.",
  },
];

/* ── pipelines ───────────────────────────────────────────── */

const pipelines: { icon: React.ReactNode; title: string; body: string }[] = [
  {
    icon: <IconArrow className="h-5 w-5" />,
    title: "Edges & connections",
    body: "Draw an edge from one block to another and outputs flow along the wire — a visual graph of how your thinking connects.",
  },
  {
    icon: <IconBolt className="h-5 w-5" />,
    title: "Conditions",
    body: "Attach lightweight conditions to an edge so flow only continues when the rules are met. Branch, gate, and route without code.",
  },
  {
    icon: <IconBoard className="h-5 w-5" />,
    title: "Task-aware automation",
    body: "Reference a real task in a pipeline and the execution loop reacts to its state — wiring a board into the work it represents.",
  },
];

/* ── power features ──────────────────────────────────────── */

const power: { title: string; body: string }[] = [
  { title: "Slash menu", body: "Type / to drop any block in place." },
  { title: "Smart paste", body: "Paste a URL or image — it becomes a block." },
  { title: "Zones & layers", body: "Group, stack, and organize the board." },
  { title: "Selection toolbar", body: "Act on many blocks at once." },
  { title: "Keyboard shortcuts", body: "Fly across the canvas hands-on-keys." },
  { title: "Rich text", body: "Format inline without leaving the flow." },
];

/* ── page ────────────────────────────────────────────────── */

export default function CanvasPage() {
  return (
    <main className="bg-paper">
      {/* 1 — hero */}
      <section className="pt-[130px]">
        <Container>
          <Reveal className="mx-auto flex max-w-[760px] flex-col items-center text-center">
            <div className="mb-4">
              <Eyebrow>Canvas</Eyebrow>
            </div>
            <h1 className="font-heading text-[clamp(34px,5.6vw,60px)] font-semibold leading-[1.04] tracking-[-0.035em] text-ink">
              An infinite board to think — wired to your tasks.
            </h1>
            <p className="mt-5 max-w-[600px] text-[17px] leading-relaxed text-ink-muted">
              Quoril&apos;s canvas is a visual workspace where ideas, notes,
              links, and media live on one endless board. Drop blocks anywhere,
              then wire them into pipelines that pass outputs along — and connect
              straight to the real tasks you&apos;re shipping.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button href="/waitlist">Join the waitlist</Button>
              <Button href="/features" variant="secondary">
                All features
              </Button>
            </div>
          </Reveal>

          {/* 2 — canvas mockup */}
          <Reveal delay={0.12} className="mt-16">
            <div className="overflow-hidden rounded-tile border border-line bg-surface shadow-lift">
              {/* window chrome */}
              <div className="flex items-center gap-2 border-b border-line bg-sunken/60 px-4 py-3">
                <span className="h-3 w-3 rounded-full border border-line bg-surface" />
                <span className="h-3 w-3 rounded-full border border-line bg-surface" />
                <span className="h-3 w-3 rounded-full border border-line bg-surface" />
                <span className="ml-3 text-[12px] font-medium text-ink-faint">
                  Canvas — Launch board
                </span>
              </div>

              {/* infinite board */}
              <div className="dotgrid relative min-h-[420px] bg-paper p-4 sm:min-h-[480px]">
                {/* connector lines */}
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M 27 33 C 40 38, 46 52, 60 56"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.4"
                    className="text-ink-faint"
                  />
                  <path
                    d="M 30 70 C 42 66, 50 62, 60 60"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.4"
                    strokeDasharray="1.2 1.2"
                    className="text-ink-faint"
                  />
                  <circle cx="27" cy="33" r="0.9" className="fill-ink" />
                  <circle cx="30" cy="70" r="0.9" className="fill-ink" />
                  <circle cx="60" cy="58" r="0.9" className="fill-ink" />
                </svg>

                {/* Idea block */}
                <div className="absolute left-[4%] top-[10%] w-[210px] max-w-[60%] rounded-card border border-line bg-surface p-3 shadow-soft">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                    Idea
                  </span>
                  <p className="mt-1.5 text-[13px] leading-snug text-ink">
                    Launch the canvas as the centerpiece of the v1 story.
                  </p>
                </div>

                {/* Checklist block */}
                <div className="absolute left-[3%] top-[52%] hidden w-[230px] max-w-[60%] rounded-card border border-line bg-surface p-3 shadow-soft sm:block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                    Checklist
                  </span>
                  <ul className="mt-2 flex flex-col gap-2">
                    {[
                      { t: "Draft block types", done: true },
                      { t: "Wire first pipeline", done: true },
                      { t: "Record demo clip", done: false },
                    ].map((it) => (
                      <li key={it.t} className="flex items-center gap-2.5">
                        {it.done ? (
                          <span className="grid h-4 w-4 flex-none place-items-center rounded-[5px] bg-ink text-paper">
                            <IconCheck className="h-3 w-3" />
                          </span>
                        ) : (
                          <span className="h-4 w-4 flex-none rounded-[5px] border border-line-strong" />
                        )}
                        <span
                          className={`text-[12.5px] ${
                            it.done
                              ? "text-ink-faint line-through"
                              : "text-ink"
                          }`}
                        >
                          {it.t}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Link block */}
                <div className="absolute right-[4%] top-[12%] hidden w-[240px] max-w-[60%] rounded-card border border-line bg-surface p-3 shadow-soft sm:block">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                    Link
                  </span>
                  <div className="mt-2 flex items-center gap-2.5">
                    <span className="grid h-7 w-7 flex-none place-items-center rounded-[7px] border border-line bg-sunken text-[11px] font-semibold text-ink-muted">
                      gh
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">
                        github.com/quoril
                      </p>
                      <p className="truncate text-[11px] text-ink-faint">
                        https://github.com/quoril
                      </p>
                    </div>
                  </div>
                </div>

                {/* Task Reference block */}
                <div className="absolute bottom-[10%] right-[5%] w-[250px] max-w-[70%] rounded-card border border-line bg-surface p-3 shadow-soft">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                    Task reference
                  </span>
                  <div className="mt-2 flex items-center gap-2.5">
                    <IconBoard className="h-4 w-4 flex-none text-ink-muted" />
                    <p className="flex-1 truncate text-[13px] font-medium text-ink">
                      [25m] Write launch post
                    </p>
                    <span className="mono flex-none rounded-pill bg-ink px-2 py-0.5 text-[10px] text-paper">
                      active
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* 3 — block types */}
      <section className="py-16 sm:py-24">
        <Container>
          <SectionHead
            eyebrow="Blocks"
            title="Blocks for every kind of thought"
            sub="Eight block types, one board. Mix structured work with loose ideas and the media that gives them context."
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {blocks.map((b, i) => (
              <Reveal key={b.label} delay={i * 0.06}>
                <Tile className="h-full">
                  <TileIcon tint={ACCENTS[i % ACCENTS.length]}>
                    <IconCanvas className="h-5 w-5" />
                  </TileIcon>
                  <h3 className="font-heading text-[18px] font-semibold tracking-[-0.01em] text-ink">
                    {b.label}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
                    {b.body}
                  </p>
                </Tile>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* 4 — pipelines */}
      <section className="pb-16 sm:pb-24">
        <Container>
          <SectionHead
            eyebrow="Pipelines"
            title="Wire blocks into pipelines"
            sub="The canvas isn't just a place to arrange thoughts — it's a lightweight flow engine. Connect blocks with edges, gate them with conditions, and let the execution loop pass outputs along, all the way down to the tasks you're tracking."
          />
          <div className="grid gap-5 md:grid-cols-3">
            {pipelines.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <Tile className="h-full">
                  <TileIcon tint={ACCENTS[i % ACCENTS.length]}>{p.icon}</TileIcon>
                  <h3 className="font-heading text-[18px] font-semibold tracking-[-0.01em] text-ink">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
                    {p.body}
                  </p>
                </Tile>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* 5 — power features */}
      <section className="pb-16 sm:pb-24">
        <Container>
          <SectionHead
            eyebrow="Power features"
            title="Built for speed and flow"
            sub="The small details that keep you in motion, never reaching for a menu when a keystroke will do."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {power.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.05}>
                <div className="flex h-full items-start gap-3 rounded-tile border border-line bg-surface p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <span className="mt-0.5 grid h-8 w-8 flex-none place-items-center rounded-[10px] border border-line bg-sunken text-ink">
                    <IconBolt className="h-4 w-4" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-ink">
                      {f.title}
                    </h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                      {f.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* 6 — CTA band */}
      <section className="pb-28">
        <Container>
          <Reveal>
            <div className="rounded-tile border border-line bg-surface px-6 py-16 text-center shadow-soft">
              <p className="font-hand text-[18px] text-ink-faint">
                one endless board
              </p>
              <h2 className="mt-3 font-heading text-[clamp(26px,4vw,42px)] font-semibold tracking-[-0.03em] text-ink">
                Think it. Wire it. Ship it.
              </h2>
              <p className="mx-auto mt-4 max-w-[460px] text-[16px] leading-relaxed text-ink-muted">
                Join the waitlist and be first on the infinite canvas that
                connects straight to your work.
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
