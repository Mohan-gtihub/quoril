import type { Metadata } from "next";
import {
  Container,
  SectionHead,
  Tile,
  TileIcon,
  Badge,
} from "@/components/ui";
import Reveal from "@/components/Reveal";
import Waitlist from "@/components/Waitlist";
import { IconCheck } from "@/components/icons";

export const metadata: Metadata = {
  title: "Download — Quoril for desktop",
  description:
    "Native Quoril apps for macOS, Windows and Linux. Join the waitlist to get your download link at launch.",
};

/* ── monochrome OS glyphs ─────────────────────────────────── */

function GlyphApple() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M16.36 12.78c-.02-2.16 1.76-3.2 1.84-3.25-1-1.47-2.57-1.67-3.13-1.69-1.33-.13-2.6.78-3.27.78-.68 0-1.72-.76-2.83-.74-1.45.02-2.8.85-3.55 2.15-1.52 2.63-.39 6.52 1.09 8.65.72 1.04 1.58 2.21 2.71 2.17 1.09-.04 1.5-.7 2.81-.7 1.31 0 1.68.7 2.83.68 1.17-.02 1.91-1.06 2.62-2.11.83-1.21 1.17-2.38 1.19-2.44-.03-.01-2.28-.88-2.3-3.43zM14.2 6.3c.6-.73 1.01-1.74.9-2.75-.87.04-1.92.58-2.54 1.3-.56.64-1.05 1.67-.92 2.65.97.08 1.96-.49 2.56-1.2z" />
    </svg>
  );
}

function GlyphWindows() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M3 5.6 10.4 4.5v6.9H3V5.6zm0 12.8 7.4 1.1v-6.8H3v5.7zM11.3 4.4 21 3v8.4h-9.7V4.4zm0 8.1H21V21l-9.7-1.4v-7.1z" />
    </svg>
  );
}

function GlyphLinux() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor" aria-hidden>
      <path d="M12 2c-1.9 0-3.2 1.6-3.2 3.7 0 1.2.1 2.4-.5 3.5-.6 1.1-1.7 2-2.3 3.3-.5 1.1-.7 2.4-1.4 3.4-.4.6-1 .9-1.2 1.6-.2.7.3 1.3 1 1.4.9.1 1.8-.4 2.7-.2.7.2 1 1 1.7 1.3 1.5.7 3.3.7 4.9.4 1-.2 2.1-.6 2.7-1.5.5-.7 1.5-.9 2.3-1 .8-.1 1.6-.6 1.5-1.4-.1-.7-.8-1.1-1.2-1.6-.6-.9-.8-2-1.2-3-.5-1.4-1.6-2.4-2.3-3.6-.6-1.1-.5-2.4-.5-3.6C15.2 3.6 13.9 2 12 2zm-1.6 4.2c.4 0 .7.4.7.9s-.3.9-.7.9-.7-.4-.7-.9.3-.9.7-.9zm3.2 0c.4 0 .7.4.7.9s-.3.9-.7.9-.7-.4-.7-.9.3-.9.7-.9zM12 8.8c.8 0 1.7.5 1.7 1 0 .3-.5.5-.9.7-.3.2-.5.4-.8.4s-.5-.2-.8-.4c-.4-.2-.9-.4-.9-.7 0-.5.9-1 1.7-1z" />
    </svg>
  );
}

const PLATFORMS = [
  {
    name: "macOS",
    glyph: <GlyphApple />,
    file: ".dmg",
    req: "Apple Silicon + Intel · macOS 12+",
  },
  {
    name: "Windows",
    glyph: <GlyphWindows />,
    file: ".exe installer",
    req: "Windows 10 / 11 · 64-bit",
  },
  {
    name: "Linux",
    glyph: <GlyphLinux />,
    file: ".AppImage",
    req: "Most modern distros",
  },
];

const REASONS = [
  {
    title: "Native window tracking",
    body: "Quoril sees which app and window you're in — something a browser tab simply can't do. That's how time tracks itself.",
  },
  {
    title: "Always-on-top focus pill",
    body: "A frameless timer that floats over every other window so the session stays in view, wherever you're working.",
  },
  {
    title: "System tray presence",
    body: "Quoril lives in your tray and menu bar — start, pause and check your session without switching windows.",
  },
  {
    title: "Offline-first local SQLite",
    body: "Your tasks, sessions and history live in a fast local database. Works on a plane; syncs when you're back.",
  },
  {
    title: "OS-level notifications",
    body: "Real desktop notifications for session ends, breaks and reminders — native, not a browser pop-up.",
  },
];

const SPECS = [
  { k: "macOS", v: "12 (Monterey) or newer · Apple Silicon & Intel" },
  { k: "Windows", v: "10 or 11 · 64-bit" },
  { k: "Linux", v: "Any modern 64-bit distro with AppImage support" },
  { k: "Disk space", v: "~200 MB" },
  { k: "Permissions", v: "macOS Accessibility access for app tracking" },
];

export default function DownloadPage() {
  return (
    <>
      {/* ── Hero ───────────────────────────────────────────── */}
      <section className="pt-[130px]">
        <Container>
          <Reveal className="mx-auto flex max-w-[760px] flex-col items-center text-center">
            <Badge>Coming Q3 2026</Badge>
            <h1 className="mt-6 font-heading text-[clamp(36px,6vw,64px)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink">
              Quoril for desktop.
            </h1>
            <p className="mt-5 max-w-[560px] text-[18px] leading-relaxed text-ink-muted">
              Native apps for macOS, Windows and Linux. Join the waitlist to get
              your download link at launch.
            </p>
          </Reveal>
        </Container>
      </section>

      {/* ── Platform cards ─────────────────────────────────── */}
      <section className="pt-16">
        <Container>
          <div className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
            {PLATFORMS.map((p, i) => (
              <Reveal key={p.name} delay={i * 0.06}>
                <Tile className="flex h-full flex-col">
                  <div className="grid h-[52px] w-[52px] place-items-center rounded-[15px] border border-line bg-sunken text-ink">
                    {p.glyph}
                  </div>
                  <h2 className="mt-5 font-heading text-[22px] font-semibold tracking-[-0.02em] text-ink">
                    {p.name}
                  </h2>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">
                    <span className="mono font-medium text-ink">{p.file}</span>
                    <br />
                    {p.req}
                  </p>
                  <div className="mt-auto pt-6">
                    <span
                      aria-disabled="true"
                      className="inline-flex select-none items-center gap-2 rounded-pill border border-line-strong bg-sunken px-5 py-3 text-[14.5px] font-semibold text-ink-faint"
                    >
                      Available at launch
                    </span>
                  </div>
                </Tile>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Why desktop ────────────────────────────────────── */}
      <section className="border-t border-line py-16 mt-16 sm:py-24 sm:mt-24">
        <Container>
          <SectionHead
            eyebrow="Why desktop"
            title="Things a browser tab can't do."
            sub="Quoril runs as a real native app so it can reach the parts of your machine that make focus tracking effortless."
          />
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
            {REASONS.map((r, i) => (
              <Reveal key={r.title} delay={i * 0.05}>
                <Tile className="h-full">
                  <TileIcon>
                    <IconCheck className="h-5 w-5" />
                  </TileIcon>
                  <h3 className="font-heading text-[17px] font-semibold text-ink">
                    {r.title}
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">
                    {r.body}
                  </p>
                </Tile>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── System requirements ────────────────────────────── */}
      <section className="pb-8">
        <Container>
          <div className="mx-auto max-w-[760px]">
            <Reveal>
              <Tile hover={false}>
                <div className="mb-6 flex items-center justify-between gap-4">
                  <h3 className="font-heading text-[20px] font-semibold tracking-[-0.02em] text-ink">
                    System requirements
                  </h3>
                  <span className="mono rounded-pill border border-line bg-sunken px-3 py-1.5 text-[12px] text-ink-faint">
                    Electron 28
                  </span>
                </div>
                <dl className="divide-y divide-line">
                  {SPECS.map((s) => (
                    <div
                      key={s.k}
                      className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:gap-6"
                    >
                      <dt className="w-[140px] shrink-0 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                        {s.k}
                      </dt>
                      <dd className="text-[15px] text-ink">{s.v}</dd>
                    </div>
                  ))}
                </dl>
              </Tile>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ── Waitlist ───────────────────────────────────────── */}
      <section className="py-16 sm:py-24">
        <Container>
          <SectionHead
            eyebrow="Almost there"
            title="Get notified at launch"
            sub="We'll email your download link the moment Quoril ships. One message — no spam."
          />
          <div className="mx-auto max-w-[560px]">
            <Reveal>
              <Waitlist />
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
