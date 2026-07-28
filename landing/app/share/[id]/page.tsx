import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { SITE_URL } from "@/lib/site-config";

export const dynamic = "force-dynamic";

/* ── tiny date helpers (no date-fns dependency in the landing app) ── */

const DAY_MS = 86_400_000;

/** Local "YYYY-MM-DD" key for a date. */
function ymd(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Sunday-based start of the week containing `d` (matches date-fns default). */
function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}

/** Saturday end of the week containing `d`. */
function endOfWeek(d: Date): Date {
  const x = startOfWeek(d);
  x.setDate(x.getDate() + 6);
  x.setHours(23, 59, 59, 999);
  return x;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "Jun 29, 2026" */
function prettyDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

interface SharePayload {
  activity: Record<string, number>;
  stats: {
    monthStr: string;
    totalStr: string;
    activeDays: number;
    streak: number;
    bestStr: string;
  };
  generatedAt: string;
}

async function getShare(id: string): Promise<SharePayload | null> {
  const url =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return null;

  // UUID guard so we don't round-trip on obviously bad ids.
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) return null;

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("shared_focus_maps")
    .select("payload")
    .eq("id", id)
    .single();

  if (error || !data?.payload) return null;
  return data.payload as SharePayload;
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}) {
  const share = await getShare(params.id);
  const title = share
    ? `${share.stats.streak}-day focus streak — Quoril`
    : "Shared focus map — Quoril";
  return {
    title,
    description: share
      ? `${share.stats.totalStr} of deep work across ${share.stats.activeDays} active days. Track yours with Quoril.`
      : "A shared Quoril focus map.",
    openGraph: { title, url: `${SITE_URL}/share/${params.id}`, type: "website" },
    robots: { index: false },
  };
}

const GH = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];

function colorFor(minutes: number) {
  if (minutes === 0) return GH[0];
  if (minutes < 30) return GH[1];
  if (minutes < 60) return GH[2];
  if (minutes < 120) return GH[3];
  return GH[4];
}

export default async function SharePage({
  params,
}: {
  params: { id: string };
}) {
  const share = await getShare(params.id);
  if (!share) notFound();

  const generatedAt = new Date(share.generatedAt);
  const endDate = endOfWeek(generatedAt);
  const sixMonthsBack = new Date(endDate);
  sixMonthsBack.setMonth(sixMonthsBack.getMonth() - 6);
  const startDate = startOfWeek(sixMonthsBack);

  const allDays: Date[] = [];
  for (let t = startDate.getTime(); t <= endDate.getTime(); t += DAY_MS) {
    allDays.push(new Date(t));
  }
  const weeks: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7));

  const { stats } = share;

  return (
    <main className="min-h-screen bg-[#0b0d12] text-white flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-[760px]">
        <div className="rounded-2xl border border-white/10 bg-[#11141b] p-6 sm:p-8 shadow-2xl">
          <div className="flex items-start justify-between mb-8 gap-4">
            <div>
              <h1 className="text-lg font-semibold">Focus map</h1>
              <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
                Daily deep work
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-extrabold tabular-nums">
                {stats.streak}{" "}
                <span className="text-sm font-bold text-white/40">
                  day streak 🔥
                </span>
              </div>
              <div className="mt-1 text-[12px] text-white/50">
                {stats.totalStr} total · {stats.activeDays} active days
              </div>
            </div>
          </div>

          {/* Heatmap */}
          <div className="overflow-x-auto">
            <div className="flex gap-[3px] w-max">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3px]">
                  {week.map((day, dIdx) => {
                    const dateStr = ymd(day);
                    const mins = share.activity[dateStr] || 0;
                    const isFuture = day > generatedAt;
                    return (
                      <div
                        key={dIdx}
                        title={`${prettyDate(day)}: ${Math.round(mins)} mins`}
                        className="w-[13px] h-[13px] rounded-[2px]"
                        style={{
                          backgroundColor: isFuture ? "#161b22" : colorFor(mins),
                          opacity: isFuture ? 0.3 : 1,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
            <span className="text-[12px] text-white/40">
              Best day · {stats.bestStr}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/40">
              <span className="mr-1">Less</span>
              {GH.map((c) => (
                <span
                  key={c}
                  className="inline-block w-[10px] h-[10px] rounded-[2px]"
                  style={{ backgroundColor: c }}
                />
              ))}
              <span className="ml-1">More</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <a
            href={`${SITE_URL}/download`}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-[#0b0d12] transition hover:opacity-90"
          >
            Track your focus with Quoril →
          </a>
        </div>
      </div>
    </main>
  );
}
