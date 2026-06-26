import { Container, SectionHead, Tile, TileIcon, ACCENTS, Button, Eyebrow } from "@/components/ui";
import Reveal from "@/components/Reveal";
import { Heatmap, Ring, Donut, CategoryBars, FOCUS, BREAK, WELLBEING } from "@/components/Charts";
import { IconChart, IconScreen, IconArrow } from "@/components/icons";

export const metadata = {
  title: "Insights · Reports & Screen Time — Quoril",
  description:
    "See exactly where your hours go. Quoril turns native screen-time tracking into reports, productivity scores, and digital wellbeing insights.",
};

/* ── accent category palette ───────────────────────────────── */
const INK = FOCUS;       // Dev / primary
const GREY = WELLBEING;  // Work / healthy
const FAINT = BREAK;     // Comms / attention
const FADE = "#3D3D3D";  // Other / deep slate

const kpis = [
  { label: "Focus Time", value: "5h 16m", sub: "▲ 18% · 7 sessions" },
  { label: "Tasks Done", value: "12/15", sub: "80% completion" },
  { label: "Productivity Score", value: "86%", sub: "Deep Work day" },
  { label: "Avg Session", value: "44m", sub: "Per focus block" },
  { label: "App Switches", value: "37", sub: "Balanced" },
  { label: "Top Distraction", value: "YouTube", sub: "41m today" },
];

const timeline = [
  { time: "09:12", color: INK, app: "VS Code — quoril/landing", dur: "1h 04m" },
  { time: "10:28", color: GREY, app: "Linear — Sprint 14", dur: "26m" },
  { time: "11:40", color: FAINT, app: "Slack — #engineering", dur: "18m" },
  { time: "13:55", color: INK, app: "VS Code — quoril/api", dur: "1h 32m" },
  { time: "15:40", color: FADE, app: "YouTube — break", dur: "22m" },
];

const websites = [
  { domain: "github.com", pct: 84, value: "2h 41m", color: INK },
  { domain: "chatgpt.com", pct: 52, value: "1h 18m", color: GREY },
  { domain: "youtube.com", pct: 30, value: "41m", color: FAINT },
  { domain: "linear.app", pct: 22, value: "28m", color: FADE },
];

const week = [
  { d: "Mon", h: 58 },
  { d: "Tue", h: 72 },
  { d: "Wed", h: 44 },
  { d: "Thu", h: 88 },
  { d: "Fri", h: 64 },
  { d: "Sat", h: 30 },
  { d: "Sun", h: 100 },
];

const measured = [
  { t: "Native window tracking", d: "Active window sampled every 5 seconds — no manual timers." },
  { t: "20+ categories", d: "Apps and domains auto-sorted into Development, Work, Comms and more." },
  { t: "Idle detection", d: "Pauses tracking after >3 minutes of inactivity so totals stay honest." },
  { t: "Per-task context linking", d: "Every block ties back to the task you were working on." },
  { t: "Estimation accuracy", d: "Compares your estimates to actuals to sharpen future planning." },
  { t: "Habit & streak consistency", d: "Tracks streaks and daily rhythm to reward the long game." },
];

export default function InsightsPage() {
  return (
    <>
      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="pt-[130px]">
        <Container>
          <Reveal className="flex max-w-[760px] flex-col">
            <div className="mb-5">
              <Eyebrow>Reports &amp; Screen Time</Eyebrow>
            </div>
            <h1 className="font-heading text-[clamp(36px,6vw,64px)] font-semibold leading-[1.02] tracking-[-0.035em] text-ink">
              See exactly where your hours go.
            </h1>
            <p className="mt-6 max-w-[600px] text-[18px] leading-relaxed text-ink-muted">
              Quoril turns quiet, native screen-time tracking into clear reports —
              productivity scores, focus trends, and digital wellbeing — so every
              hour becomes evidence, not a guess.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button href="/waitlist">
                Join the waitlist <IconArrow className="h-4 w-4" />
              </Button>
              <Button href="/features" variant="secondary">
                Explore features
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── DAILY SNAPSHOT ───────────────────────────────────── */}
      <section className="pt-24">
        <Container>
          <Reveal className="mb-8 flex items-center gap-2">
            <Eyebrow>Daily snapshot · Today</Eyebrow>
          </Reveal>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
            {kpis.map((k, i) => (
              <Reveal key={k.label} delay={i * 0.05}>
                <div className="rounded-card border border-line bg-surface p-4 shadow-soft">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
                    {k.label}
                  </div>
                  <div className="mono mt-2 text-[26px] font-semibold leading-none text-ink">
                    {k.value}
                  </div>
                  <div className="mt-2 text-[12.5px] text-ink-muted">{k.sub}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── PERFORMANCE TRENDS ───────────────────────────────── */}
      <section className="pt-28">
        <Container>
          <SectionHead
            align="left"
            eyebrow="Analytics"
            title="Performance trends"
            sub="Your day, rendered. Heatmaps, scores and category splits update as you work — no spreadsheets required."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            {/* Heatmap */}
            <Reveal className="md:col-span-4">
              <Tile className="h-full">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-ink">
                    Hourly usage heatmap
                  </h3>
                  <TileIcon tint={ACCENTS[0]}>
                    <IconChart className="h-5 w-5" />
                  </TileIcon>
                </div>
                <Heatmap />
                <p className="mt-4 text-[13px] text-ink-muted">Peak at 2–4 PM.</p>
              </Tile>
            </Reveal>

            {/* Productivity ring */}
            <Reveal className="md:col-span-2" delay={0.08}>
              <Tile className="flex h-full flex-col">
                <h3 className="mb-4 text-[15px] font-semibold text-ink">
                  Productivity
                </h3>
                <div className="flex flex-1 items-center justify-center">
                  <Ring size={120} pct={0.86} value="86" label="score" color={WELLBEING} />
                </div>
              </Tile>
            </Reveal>

            {/* Category donut */}
            <Reveal className="md:col-span-2" delay={0.12}>
              <Tile className="h-full">
                <h3 className="mb-4 text-[15px] font-semibold text-ink">
                  By category
                </h3>
                <div className="flex items-center gap-5">
                  <Donut
                    segments={[
                      [INK, 0.46],
                      [GREY, 0.28],
                      [FAINT, 0.16],
                      [FADE, 0.1],
                    ]}
                    center="6h 56m"
                    sub="total"
                  />
                  <ul className="flex flex-col gap-2.5 text-[13px]">
                    {[
                      [INK, "Dev", "46%"],
                      [GREY, "Work", "28%"],
                      [FAINT, "Comms", "16%"],
                      [FADE, "Other", "10%"],
                    ].map(([c, n, p]) => (
                      <li key={n} className="flex items-center gap-2 text-ink-muted">
                        <span
                          className="h-2.5 w-2.5 rounded-[3px]"
                          style={{ background: c }}
                        />
                        <span className="text-ink">{n}</span>
                        <span className="mono ml-auto text-ink-faint">{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Tile>
            </Reveal>

            {/* Top apps */}
            <Reveal className="md:col-span-4" delay={0.16}>
              <Tile className="h-full">
                <h3 className="mb-5 text-[15px] font-semibold text-ink">
                  Top apps by active time
                </h3>
                <CategoryBars
                  rows={[
                    { name: "Development", color: INK, pct: 72, value: "3h 12m" },
                    { name: "Work", color: GREY, pct: 48, value: "2h 04m" },
                    { name: "Communication", color: FAINT, pct: 26, value: "1h 06m" },
                    { name: "Entertainment", color: FADE, pct: 14, value: "34m" },
                  ]}
                />
              </Tile>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ── SCREEN TIME / DIGITAL WELLBEING ──────────────────── */}
      <section className="pt-28">
        <Container>
          <SectionHead
            align="left"
            eyebrow="Wellbeing"
            title="Screen Time & digital wellbeing"
            sub="The same data, viewed through a calmer lens — balance, rhythm and where your attention actually went."
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-6">
            {/* Productivity split — stacked bar */}
            <Reveal className="md:col-span-3">
              <Tile className="h-full">
                <div className="mb-5 flex items-center justify-between">
                  <h3 className="text-[15px] font-semibold text-ink">
                    Productivity split
                  </h3>
                  <TileIcon tint={ACCENTS[2]}>
                    <IconScreen className="h-5 w-5" />
                  </TileIcon>
                </div>
                <div className="flex h-3 w-full overflow-hidden rounded-pill">
                  <div style={{ width: "62%", background: WELLBEING }} />
                  <div style={{ width: "26%", background: "#3D3D3D" }} />
                  <div style={{ width: "12%", background: BREAK }} />
                </div>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
                  {[
                    [WELLBEING, "Productive", "62%"],
                    ["#3D3D3D", "Neutral", "26%"],
                    [BREAK, "Distracting", "12%"],
                  ].map(([c, n, p]) => (
                    <span key={n} className="flex items-center gap-2 text-ink-muted">
                      <span
                        className="h-2.5 w-2.5 rounded-[3px]"
                        style={{ background: c }}
                      />
                      <span className="text-ink">{n}</span>
                      <span className="mono text-ink-faint">{p}</span>
                    </span>
                  ))}
                </div>
              </Tile>
            </Reveal>

            {/* 7-day trend bar chart */}
            <Reveal className="md:col-span-3" delay={0.08}>
              <Tile className="h-full">
                <h3 className="mb-5 text-[15px] font-semibold text-ink">
                  7-day trend
                </h3>
                <div className="flex h-28 items-end gap-2.5">
                  {week.map((w, i) => {
                    const current = i === week.length - 1;
                    return (
                      <div key={w.d} className="flex flex-1 flex-col items-center gap-2">
                        <div className="flex h-full w-full items-end">
                          <div
                            className="w-full rounded-t-[4px]"
                            style={{
                              height: `${w.h}%`,
                              background: INK,
                              opacity: current ? 1 : 0.22,
                            }}
                          />
                        </div>
                        <span className="text-[10.5px] text-ink-faint">{w.d}</span>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-4 text-[13px] text-ink-muted">
                  Today is your strongest focus day this week.
                </p>
              </Tile>
            </Reveal>

            {/* Activity timeline */}
            <Reveal className="md:col-span-3" delay={0.12}>
              <Tile className="h-full">
                <h3 className="mb-4 text-[15px] font-semibold text-ink">
                  Activity timeline
                </h3>
                <ul>
                  {timeline.map((r, i) => (
                    <li
                      key={i}
                      className={`flex items-center gap-3 py-3 ${
                        i > 0 ? "border-t border-line" : ""
                      }`}
                    >
                      <span className="mono text-[12.5px] text-ink-faint">
                        {r.time}
                      </span>
                      <span
                        className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                        style={{ background: r.color }}
                      />
                      <span className="truncate text-[13.5px] text-ink">{r.app}</span>
                      <span className="mono ml-auto text-[12.5px] text-ink-muted">
                        {r.dur}
                      </span>
                    </li>
                  ))}
                </ul>
              </Tile>
            </Reveal>

            {/* Website list */}
            <Reveal className="md:col-span-3" delay={0.16}>
              <Tile className="h-full">
                <h3 className="mb-5 text-[15px] font-semibold text-ink">
                  Top websites
                </h3>
                <div className="flex flex-col gap-4">
                  {websites.map((w) => (
                    <div key={w.domain}>
                      <div className="mb-1.5 flex items-baseline justify-between">
                        <span className="text-[13.5px] text-ink">{w.domain}</span>
                        <span className="mono text-[12.5px] text-ink-faint">
                          {w.value}
                        </span>
                      </div>
                      <span className="block h-1.5 w-full overflow-hidden rounded-pill bg-sunken">
                        <span
                          className="block h-full rounded-pill"
                          style={{ width: `${w.pct}%`, background: w.color }}
                        />
                      </span>
                    </div>
                  ))}
                </div>
              </Tile>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ── WHAT GETS MEASURED ───────────────────────────────── */}
      <section className="pt-28">
        <Container>
          <SectionHead
            align="left"
            eyebrow="Under the hood"
            title="What gets measured"
            sub="Accurate by design — Quoril watches the work so you never have to babysit a timer."
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {measured.map((m, i) => (
              <Reveal key={m.t} delay={i * 0.05}>
                <Tile className="h-full" hover={false}>
                  <div className="mono mb-4 text-[13px] text-ink-faint">
                    {String(i + 1).padStart(2, "0")}
                  </div>
                  <h3 className="text-[15.5px] font-semibold text-ink">{m.t}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-ink-muted">
                    {m.d}
                  </p>
                </Tile>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── CTA BAND ─────────────────────────────────────────── */}
      <section className="py-32">
        <Container>
          <Reveal>
            <div className="relative overflow-hidden rounded-tile border border-line bg-sunken px-5 py-14 text-center shadow-soft sm:px-6 sm:py-20">
              <h2 className="font-heading text-[clamp(28px,4.4vw,48px)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink">
                Turn your hours into evidence.
              </h2>
              <p className="mx-auto mt-4 max-w-[460px] text-[16px] leading-relaxed text-ink-muted">
                Start measuring your real workday — and let the numbers do the talking.
              </p>
              <div className="mt-8 flex justify-center">
                <Button href="/waitlist">
                  Join the waitlist <IconArrow className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
