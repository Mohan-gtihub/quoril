import {
  Container,
  SectionHead,
  Tile,
  TileIcon,
  Button,
  Eyebrow,
} from "@/components/ui";
import Reveal from "@/components/Reveal";
import { IconGlobe, IconCheck, IconScreen } from "@/components/icons";

export const metadata = {
  title: "Security & Privacy",
  description:
    "Quoril is offline-first: your data lives in a local SQLite database on your machine, with encrypted, authenticated sync. You own your data.",
};

const PILLARS = [
  {
    icon: <IconGlobe className="h-[22px] w-[22px]" />,
    tint: "#10C49A", // wellbeing — you own your data
    title: "Offline-first by design",
    body: "Every task, list and focus session lives in a local SQLite database on your machine. Quoril works fully offline — and you own your data, always.",
    points: ["Local quoril_v2.sqlite store", "Works with no connection", "You own your data"],
  },
  {
    icon: <IconCheck className="h-[22px] w-[22px]" />,
    tint: "#2B6BF5", // focus — sync & security
    title: "Encrypted, authenticated access",
    body: "Sync runs over authenticated Supabase sessions with Row-Level Security, so a row is only ever readable by the account that owns it.",
    points: ["Supabase auth + OAuth", "Row-Level Security policies", "Per-account isolation"],
  },
  {
    icon: <IconScreen className="h-[22px] w-[22px]" />,
    tint: "#F5A623", // break — recovery & resilience
    title: "Resilient & recoverable",
    body: "Timer state is persisted every second, crashes are recovered on next launch, and deletes are soft so nothing vanishes by accident.",
    points: ["Per-second backup", "Crash recovery", "Soft delete (deleted_at)"],
  },
];

const SYNC_STEPS = [
  {
    title: "Saved instantly",
    body: "Every change is written to your device immediately — no internet connection or loading spinner required.",
  },
  {
    title: "Synced quietly",
    body: "When you are online, Quoril securely updates your account and other devices in the background.",
  },
  {
    title: "Kept consistent",
    body: "If something changes on two devices, Quoril reconciles it automatically so your work stays up to date.",
  },
];

export default function SecurityPage() {
  return (
    <main className="bg-paper text-ink">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="pt-[110px] pb-14 sm:pt-[130px] sm:pb-20">
        <Container>
          <Reveal className="mx-auto flex max-w-[760px] flex-col items-center text-center">
            <div className="mb-5">
              <Eyebrow>Security &amp; Privacy</Eyebrow>
            </div>
            <h1 className="font-heading text-[clamp(34px,6vw,62px)] font-semibold leading-[1.03] tracking-[-0.035em] text-ink">
              Your data lives on your machine first.
            </h1>
            <p className="mt-6 max-w-[600px] text-[18px] leading-relaxed text-ink-muted">
              Quoril is offline-first. Everything you create is written to a
              local SQLite database the moment you make it, then synced over an
              encrypted, authenticated connection. Private by default — and
              yours to keep.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Button href="/waitlist">Get V1 free</Button>
              <Button href="/download" variant="secondary">
                Download Quoril
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── Pillars ──────────────────────────────────────────── */}
      <section className="py-16">
        <Container>
          <div className="grid gap-6 md:grid-cols-3">
            {PILLARS.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.08}>
                <Tile className="h-full">
                  <TileIcon tint={p.tint}>{p.icon}</TileIcon>
                  <h3 className="text-[20px] font-semibold tracking-[-0.01em] text-ink">
                    {p.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
                    {p.body}
                  </p>
                  <ul className="mt-5 space-y-2.5 border-t border-line pt-5">
                    {p.points.map((pt) => (
                      <li
                        key={pt}
                        className="flex items-center gap-2.5 text-[14px] font-medium text-ink"
                      >
                        <span
                          className="grid h-5 w-5 place-items-center rounded-full text-paper"
                          style={{ background: p.tint }}
                        >
                          <IconCheck className="h-3 w-3" />
                        </span>
                        {pt}
                      </li>
                    ))}
                  </ul>
                </Tile>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Sync explainer ───────────────────────────────────── */}
      <section className="py-16">
        <Container>
          <SectionHead
            eyebrow="Offline-first sync"
            title="Fast on your device. Synced when online."
            sub="Every change saves locally first, so Quoril stays fast and works without internet. When you reconnect, it securely syncs to your account."
          />
          <Reveal>
            <Tile hover={false} className="p-6 sm:p-8 md:p-10">
              <ol className="grid gap-5 md:grid-cols-3 md:gap-6">
                {SYNC_STEPS.map((s, i) => (
                  <li
                    key={s.title}
                    className="relative flex flex-col rounded-card border border-line bg-paper p-5 sm:p-6"
                  >
                    <div className="mb-5 flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink text-[15px] font-semibold text-paper">
                        {i + 1}
                      </span>
                      {i < SYNC_STEPS.length - 1 && (
                        <span className="hidden h-px flex-1 bg-line-strong md:block" />
                      )}
                    </div>
                    <h3 className="text-[18px] font-semibold tracking-[-0.01em] text-ink">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">
                      {s.body}
                    </p>
                  </li>
                ))}
              </ol>
            </Tile>
          </Reveal>
        </Container>
      </section>

      {/* ── Data ownership ───────────────────────────────────── */}
      <section className="py-16">
        <Container>
          <Reveal>
            <Tile hover={false} className="p-9 md:p-14">
              <div className="mx-auto max-w-[760px] text-center">
                <Eyebrow>Data ownership</Eyebrow>
                <p className="mt-6 font-heading text-[clamp(22px,3.2vw,34px)] font-medium leading-[1.25] tracking-[-0.02em] text-ink">
                  Your productivity data is yours. It stays local-first on your
                  device, syncs only to your own account, and is{" "}
                  <span className="text-wellbeing">
                    never sold, rented, or mined.
                  </span>{" "}
                  <span className="text-ink-muted">
                    No tracking pipelines, no data brokers — just your work,
                    where you left it.
                  </span>
                </p>
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
              Productivity you can trust.
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-ink-muted">
              Offline-first, encrypted, and built so your data never leaves your
              hands. Join before launch and get V1 free.
            </p>
            <div className="mt-8">
              <Button href="/waitlist">Get V1 free</Button>
            </div>
          </Reveal>
        </Container>
      </section>
    </main>
  );
}
