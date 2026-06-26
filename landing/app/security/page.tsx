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
  title: "Security & Privacy — Quoril",
  description:
    "Quoril is offline-first: your data lives in a local SQLite database on your machine, with encrypted, authenticated sync. You own your data.",
};

const PILLARS = [
  {
    icon: <IconGlobe className="h-[22px] w-[22px]" />,
    title: "Offline-first by design",
    body: "Every task, list and focus session lives in a local SQLite database on your machine. Quoril works fully offline — and you own your data, always.",
    points: ["Local quoril_v2.sqlite store", "Works with no connection", "You own your data"],
  },
  {
    icon: <IconCheck className="h-[22px] w-[22px]" />,
    title: "Encrypted, authenticated access",
    body: "Sync runs over authenticated Supabase sessions with Row-Level Security, so a row is only ever readable by the account that owns it.",
    points: ["Supabase auth + OAuth", "Row-Level Security policies", "Per-account isolation"],
  },
  {
    icon: <IconScreen className="h-[22px] w-[22px]" />,
    title: "Resilient & recoverable",
    body: "Timer state is persisted every second, crashes are recovered on next launch, and deletes are soft so nothing vanishes by accident.",
    points: ["Per-second backup", "Crash recovery", "Soft delete (deleted_at)"],
  },
];

const SYNC_STEPS = [
  {
    title: "Write hits local SQLite",
    body: "Your change is committed to the on-device database instantly — no network round trip, no spinner.",
  },
  {
    title: "Marked pending",
    body: "A per-row synced flag is cleared, queuing the change for the next background pass.",
  },
  {
    title: "Background sync every 10s",
    body: "Pending rows push to Supabase in FK-safe order: workspaces → lists → tasks → subtasks → focus sessions.",
  },
  {
    title: "Real-time subscriptions merge",
    body: "Changes from your other devices stream in over live subscriptions and reconcile against local state.",
  },
  {
    title: "Last-write-wins",
    body: "Conflicts resolve with a deterministic upsert, so every device converges on the same truth.",
  },
];

const AUTH_ITEMS = [
  {
    title: "Email + password",
    body: "Classic sign-in with verified credentials.",
  },
  {
    title: "Google OAuth",
    body: "One-tap sign-in via a quoril:// deep-link callback.",
  },
  {
    title: "Email verification",
    body: "Addresses are confirmed before access is granted.",
  },
  {
    title: "Strong password rules",
    body: "12+ characters with mixed case, a number and a special character.",
  },
  {
    title: "Auto token refresh",
    body: "Tokens renew 5 minutes before expiry — no surprise logouts.",
  },
  {
    title: "Inactivity timeout",
    body: "Sessions end automatically after 30 minutes idle.",
  },
  {
    title: "Maximum session length",
    body: "Every session is capped at 12 hours before re-auth.",
  },
  {
    title: "Browser fingerprinting",
    body: "Session validity is bound to a device fingerprint.",
  },
  {
    title: "Rate limiting",
    body: "5 login attempts per minute, then a 15-minute lockout.",
  },
  {
    title: "Row-Level Security",
    body: "Database policies enforce per-account data access.",
  },
  {
    title: "Single-instance lock",
    body: "Only one app instance runs, keeping deep links safe.",
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
              <Button href="/waitlist">Join the waitlist</Button>
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
                  <TileIcon>{p.icon}</TileIcon>
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
                        <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-paper">
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
            eyebrow="Under the hood"
            title="How sync works"
            sub="No spinners, no lock-in. A write is local-instant, then quietly reconciled everywhere you work."
          />
          <Reveal>
            <Tile hover={false} className="p-8 md:p-10">
              <ol className="grid gap-8 md:grid-cols-5 md:gap-6">
                {SYNC_STEPS.map((s, i) => (
                  <li key={s.title} className="relative flex flex-col">
                    <div className="mb-4 flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-[15px] font-semibold text-paper">
                        {i + 1}
                      </span>
                      {i < SYNC_STEPS.length - 1 && (
                        <span className="hidden h-px flex-1 bg-line md:block" />
                      )}
                    </div>
                    <h4 className="text-[15px] font-semibold leading-snug text-ink">
                      {s.title}
                    </h4>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-ink-muted">
                      {s.body}
                    </p>
                  </li>
                ))}
              </ol>
            </Tile>
          </Reveal>
        </Container>
      </section>

      {/* ── Auth & session ───────────────────────────────────── */}
      <section className="py-16">
        <Container>
          <SectionHead
            eyebrow="Auth & sessions"
            title="Hardened sign-in, end to end"
            sub="Every layer — from password rules to session lifetime — is tuned to keep accounts locked down without getting in your way."
          />
          <div className="grid gap-x-12 gap-y-7 md:grid-cols-2">
            {AUTH_ITEMS.map((item, i) => (
              <Reveal key={item.title} delay={(i % 2) * 0.06}>
                <div className="flex items-start gap-4 border-b border-line pb-6">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-paper">
                    <IconCheck className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <h4 className="text-[15.5px] font-semibold text-ink">
                      {item.title}
                    </h4>
                    <p className="mt-1 text-[14px] leading-relaxed text-ink-muted">
                      {item.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
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
                  device, syncs only to your own account, and is never sold,
                  rented, or mined.{" "}
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
              hands. Be first in line.
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
