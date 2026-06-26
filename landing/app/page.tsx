import Link from "next/link";
import Reveal from "@/components/Reveal";
import Waitlist from "@/components/Waitlist";
import AppMockup from "@/components/AppMockup";
import FocusPill from "@/components/FocusPill";
import { Heatmap, Ring, Donut, CategoryBars, FOCUS, BREAK, WELLBEING } from "@/components/Charts";

const SLATE = "#3D3D3D"; // deep slate accent
import {
  Container,
  SectionHead,
  Tile,
  TileIcon,
  Badge,
  Button,
  Stat,
  Eyebrow,
} from "@/components/ui";
import {
  IconBoard,
  IconClock,
  IconScreen,
  IconLayers,
  IconGlobe,
  IconBolt,
  IconCanvas,
  IconArrow,
} from "@/components/icons";

export default function Home() {
  return (
    <>
      {/* ───────── HERO ───────── */}
      <header className="dotgrid relative overflow-hidden px-5 pb-14 pt-[120px] text-center sm:px-6 sm:pb-16 sm:pt-[150px]">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-paper to-transparent" />
        {/* <Reveal>
          <Badge>Offline-first · Local + cloud sync · Coming Q3 2026</Badge>
        </Reveal> */}

        <Reveal delay={0.05}>
          <h1 className="mx-auto mt-7 max-w-[15ch] font-heading text-[clamp(40px,6.6vw,80px)] font-semibold leading-[1.02] tracking-[-0.04em] text-ink">
            The productivity OS for deep work.
          </h1>
        </Reveal>

        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-[600px] text-[clamp(16px,2vw,20px)] leading-relaxed text-ink-muted">
            Quoril unifies tasks, focus tracking, app analytics and digital
            wellbeing into one native desktop command center. Built for people
            who ship.
          </p>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mt-5 font-hand text-[clamp(20px,2.6vw,26px)] text-ink-faint">
            one quiet window for your whole day
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <div className="mx-auto mt-9 max-w-[760px]">
            <Waitlist id="waitlist" />
          </div>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="mt-10 sm:mt-16">
            <AppMockup />
          </div>
        </Reveal>
      </header>

      {/* ───────── STATS ───────── */}
      <Container>
        <Reveal>
          <div className="my-14 grid grid-cols-2 gap-6 border-y border-line py-9 text-center sm:my-20 sm:py-11 md:grid-cols-4">
            {[
              ["5", "Surfaces in one app"],
              ["20+", "Auto-classified categories"],
              ["100%", "Offline-first, local SQLite"],
              ["10s", "Background cloud sync"],
            ].map(([n, l]) => (
              <Stat key={l} n={n} label={l} />
            ))}
          </div>
        </Reveal>
      </Container>

      {/* ───────── FEATURES ───────── */}
      <section id="features" className="py-14 sm:py-20">
        <Container>
          <SectionHead
            eyebrow="Everything in one place"
            title={
              <>
                Your entire workflow,
                <br />
                natively integrated.
              </>
            }
            sub="No more juggling a to-do app, a timer and three analytics dashboards. Quoril is one tool."
          />

          <div className="grid grid-cols-1 gap-[18px] md:grid-cols-6">
            <Reveal className="md:col-span-3">
              <Tile className="h-full">
                <TileIcon tint={FOCUS}><IconBoard className="h-[22px] w-[22px]" /></TileIcon>
                <h3 className="text-[19px] font-semibold tracking-[-0.01em] text-ink">
                  Kanban that thinks in time
                </h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">
                  Four-column flow — Backlog, This Week, Today, Done. Drag to
                  move, auto-parse{" "}
                  <code className="rounded bg-sunken px-1 py-0.5 text-[13px] text-ink">[25m]</code>{" "}
                  estimates, track actual time and nest subtasks.
                </p>
                <FeatureLink href="/features/planner">Explore the planner</FeatureLink>
              </Tile>
            </Reveal>

            <Reveal className="md:col-span-3" delay={0.05}>
              <Tile className="h-full" id="focus">
                <TileIcon tint={BREAK}><IconClock className="h-[22px] w-[22px]" /></TileIcon>
                <h3 className="text-[19px] font-semibold tracking-[-0.01em] text-ink">
                  A focus pill that follows you
                </h3>
                <p className="mb-4 mt-2 text-[14.5px] leading-relaxed text-ink-muted">
                  An always-on-top glass widget hovers over any app. Pause,
                  break, skip &amp; complete — Pomodoro built in.
                </p>
                <FocusPill />
              </Tile>
            </Reveal>

            <Reveal className="md:col-span-2" delay={0.1}>
              <Tile className="h-full">
                <TileIcon tint={WELLBEING}><IconBolt className="h-[20px] w-[20px]" /></TileIcon>
                <h3 className="text-[19px] font-semibold tracking-[-0.01em] text-ink">
                  Deep Focus Mode
                </h3>
                <p className="mb-5 mt-2 text-[14.5px] leading-relaxed text-ink-muted">
                  Full-screen sessions with a live ring &amp; confetti on
                  completion.
                </p>
                <div className="flex justify-center">
                  <Ring pct={0.65} value="17:23" label="remaining" color={FOCUS} />
                </div>
              </Tile>
            </Reveal>

            <Reveal className="md:col-span-4" delay={0.15}>
              <Tile className="h-full">
                <TileIcon tint={SLATE}><IconScreen className="h-[22px] w-[22px]" /></TileIcon>
                <h3 className="text-[19px] font-semibold tracking-[-0.01em] text-ink">
                  Automatic app &amp; website tracking
                </h3>
                <p className="mb-4 mt-2 text-[14.5px] leading-relaxed text-ink-muted">
                  A native engine watches your foreground window every 5 seconds,
                  classifies it across 20+ categories and links every minute back
                  to the task you were focused on.
                </p>
                <CategoryBars
                  rows={[
                    { name: "Development", color: FOCUS, pct: 72, value: "3h 12m" },
                    { name: "Work", color: WELLBEING, pct: 48, value: "2h 04m" },
                    { name: "Communication", color: BREAK, pct: 26, value: "1h 06m" },
                    { name: "Entertainment", color: SLATE, pct: 14, value: "34m" },
                  ]}
                />
              </Tile>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ───────── ANALYTICS ───────── */}
      <section id="analytics" className="border-y border-line bg-surface py-16 sm:py-24">
        <Container>
          <SectionHead
            eyebrow="Reports & Screen Time"
            title={
              <>
                See exactly where
                <br />
                your hours go.
              </>
            }
            sub="Productivity scores, focus quality, hourly heatmaps and category breakdowns — updated live."
          />

          <Reveal>
            <div className="mb-[18px] grid grid-cols-1 gap-[14px] sm:grid-cols-3">
              {[
                ["Focus Time", "5h 16m", "▲ 18% · 7 sessions"],
                ["Productivity Score", "86%", "▲ Deep Work day"],
                ["Tasks Done", "12 / 15", "80% completion"],
              ].map(([lbl, val, sub]) => (
                <div
                  key={lbl}
                  className="rounded-card border border-line bg-paper p-4 shadow-soft"
                >
                  <div className="text-[11.5px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                    {lbl}
                  </div>
                  <div className="mono mt-2 text-[26px] font-semibold tracking-[-0.02em] text-ink">
                    {val}
                  </div>
                  <div className="mt-1 text-[11.5px] text-ink-muted">{sub}</div>
                </div>
              ))}
            </div>
          </Reveal>

          <div className="grid grid-cols-1 gap-[18px] md:grid-cols-6">
            <Reveal className="md:col-span-4">
              <Tile className="h-full" hover={false}>
                <h3 className="text-[19px] font-semibold text-ink">Hourly usage heatmap</h3>
                <p className="mb-3 mt-1 text-[14px] text-ink-muted">
                  Peak at <b className="text-ink">2–4 PM</b>. Hover any bar for
                  the breakdown.
                </p>
                <Heatmap />
                <p className="mt-3 font-hand text-[16px] text-ink-faint">
                  your afternoons are gold ✦
                </p>
              </Tile>
            </Reveal>

            <Reveal className="md:col-span-2" delay={0.05}>
              <Tile className="h-full" hover={false}>
                <h3 className="mb-4 text-[19px] font-semibold text-ink">By category</h3>
                <div className="flex flex-wrap items-center gap-6">
                  <Donut
                    segments={[
                      [FOCUS, 0.46],
                      [WELLBEING, 0.28],
                      [BREAK, 0.16],
                      [SLATE, 0.1],
                    ]}
                    center="6h 56m"
                    sub="total"
                  />
                  <div className="flex flex-col gap-2.5 text-[12.5px] text-ink-muted">
                    {[
                      [FOCUS, "Dev · 46%"],
                      [WELLBEING, "Work · 28%"],
                      [BREAK, "Comms · 16%"],
                      [SLATE, "Other · 10%"],
                    ].map(([c, l]) => (
                      <div key={l} className="flex items-center gap-2.5">
                        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: c }} />
                        {l}
                      </div>
                    ))}
                  </div>
                </div>
              </Tile>
            </Reveal>

            <Reveal className="md:col-span-2" delay={0.1}>
              <Tile className="h-full" hover={false}>
                <h3 className="mb-4 text-[19px] font-semibold text-ink">Productivity</h3>
                <div className="flex justify-center">
                  <Ring size={120} pct={0.86} value="86" label="score" color={WELLBEING} />
                </div>
              </Tile>
            </Reveal>

            <Reveal className="md:col-span-4" delay={0.15}>
              <Tile className="h-full" hover={false}>
                <h3 className="mb-2.5 text-[19px] font-semibold text-ink">Activity timeline</h3>
                <div className="flex flex-col">
                  {[
                    ["14:02", FOCUS, "VS Code — quoril/landing", "42m"],
                    ["13:48", SLATE, "Chrome — github.com", "14m"],
                    ["13:20", WELLBEING, "Figma — Onboarding", "28m"],
                    ["13:05", BREAK, "Slack — #engineering", "15m"],
                    ["12:30", FOCUS, "Terminal — npm run dev", "35m"],
                  ].map(([ts, c, app, dur], i, arr) => (
                    <div
                      key={ts}
                      className={`flex items-center gap-3 py-2 ${
                        i < arr.length - 1 ? "border-b border-line" : ""
                      }`}
                    >
                      <span className="mono w-[54px] text-[11.5px] text-ink-faint">{ts}</span>
                      <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: c }} />
                      <span className="flex-1 text-[13px] font-medium text-ink">{app}</span>
                      <span className="mono text-[11.5px] text-ink-muted">{dur}</span>
                    </div>
                  ))}
                </div>
              </Tile>
            </Reveal>
          </div>

          <Reveal>
            <div className="mt-10 text-center">
              <Button href="/insights" variant="secondary">
                See all insights <IconArrow className="h-4 w-4" />
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ───────── CANVAS + WORKSPACES + SYNC ───────── */}
      <section className="py-16 sm:py-24">
        <Container>
          <SectionHead
            eyebrow="More than a to-do list"
            title="An operating system, not an app."
            sub="A visual canvas to think, color-coded workspaces to organize, and offline-first sync to keep it all safe."
          />
          <div className="grid grid-cols-1 gap-[18px] md:grid-cols-3">
            <Reveal>
              <Tile className="h-full">
                <TileIcon tint={FOCUS}><IconCanvas className="h-[22px] w-[22px]" /></TileIcon>
                <h3 className="text-[19px] font-semibold text-ink">Visual Canvas</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">
                  An infinite board for ideas, checklists, links and media — wire
                  blocks into pipelines that reference your tasks.
                </p>
                <FeatureLink href="/canvas">Open the canvas</FeatureLink>
              </Tile>
            </Reveal>
            <Reveal delay={0.05}>
              <Tile className="h-full">
                <TileIcon tint={WELLBEING}><IconLayers className="h-[22px] w-[22px]" /></TileIcon>
                <h3 className="text-[19px] font-semibold text-ink">Workspaces &amp; lists</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">
                  Group lists into color-coded workspaces. Archive, reorder and
                  move freely — a built-in &ldquo;Unassigned&rdquo; home keeps
                  nothing lost.
                </p>
                <FeatureLink href="/features">All features</FeatureLink>
              </Tile>
            </Reveal>
            <Reveal delay={0.1}>
              <Tile className="h-full">
                <TileIcon tint={BREAK}><IconGlobe className="h-[22px] w-[22px]" /></TileIcon>
                <h3 className="text-[19px] font-semibold text-ink">Offline-first sync</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-ink-muted">
                  Every write hits local SQLite first, then syncs to the cloud in
                  foreign-key-safe order every 10 seconds. Work on a plane; merge
                  on landing.
                </p>
                <FeatureLink href="/security">Security &amp; privacy</FeatureLink>
              </Tile>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ───────── FINAL CTA ───────── */}
      <Container>
        <Reveal>
          <div className="dotgrid relative my-14 overflow-hidden rounded-tile border border-line bg-surface px-5 py-14 text-center shadow-soft sm:my-20 sm:px-6 sm:py-20">
            <div className="mb-5 flex justify-center">
              <Eyebrow>Q3 2026</Eyebrow>
            </div>
            <h2 className="text-[clamp(30px,5vw,52px)] font-semibold leading-tight tracking-[-0.03em] text-ink">
              Stop switching apps.
              <br />
              Start shipping.
            </h2>
            <p className="mx-auto mt-4 max-w-[520px] text-[18px] text-ink-muted">
              Join the waitlist and be first to turn your desktop into a focus
              machine.
            </p>
            <p className="mt-4 font-hand text-[20px] text-ink-faint">
              made for people who'd rather be making things
            </p>
            <div className="mx-auto mt-8 max-w-[760px]">
              <Waitlist />
            </div>
          </div>
        </Reveal>
      </Container>
    </>
  );
}

function FeatureLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-ink transition hover:gap-2.5"
    >
      {children}
      <IconArrow className="h-3.5 w-3.5" />
    </Link>
  );
}
