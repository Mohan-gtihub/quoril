"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconHome,
  IconBoard,
  IconFolders,
  IconChart,
  IconPhone,
  IconCanvas,
  IconSettings,
  IconCheck,
} from "./icons";

// Monochrome priority ramp — darker ink = higher priority. Keeps the
// mockup calm and consistent with the rest of the (near-monochrome) page.
const PRIO = {
  critical: "#16160f",
  high: "#6b6b66",
  medium: "#a8a8a1",
  low: "#cfcec7",
} as const;

type Task = {
  id: string;
  title: string;
  prio?: keyof typeof PRIO;
  chip?: string;
  active?: boolean;
  progress?: number;
};

const COLS: { name: string; dot: string; tasks: Task[] }[] = [
  {
    name: "Backlog",
    dot: "#cfcec7",
    tasks: [
      { id: "b1", title: "Research auth providers", prio: "low", chip: "~45m" },
      { id: "b2", title: "Sketch onboarding flow", prio: "medium", chip: "~30m" },
    ],
  },
  {
    name: "This Week",
    dot: "#a8a8a1",
    tasks: [
      { id: "w1", title: "Wire up sync engine", prio: "high", chip: "~2h", progress: 40 },
      { id: "w2", title: "Review PR #214", prio: "medium", chip: "~20m" },
    ],
  },
  {
    name: "Today",
    dot: "#6b6b66",
    tasks: [
      {
        id: "t1",
        title: "[25m] Write launch post",
        prio: "critical",
        active: true,
        progress: 65,
      },
      { id: "t2", title: "Fix heatmap tooltip", prio: "high", chip: "3 subtasks" },
    ],
  },
  {
    name: "Done",
    dot: "#16160f",
    tasks: [
      { id: "d1", title: "Ship onboarding", chip: "✓ 38m" },
      { id: "d2", title: "Update README", chip: "✓ 12m" },
    ],
  },
];

const NAV = [
  { label: "Home", Icon: IconHome },
  { label: "Planner", Icon: IconBoard, active: true },
  { label: "Workspaces", Icon: IconFolders },
  { label: "Reports", Icon: IconChart },
  { label: "Screen Time", Icon: IconPhone },
  { label: "Canvas", Icon: IconCanvas },
];

// real app workspace accent colors
const WORKSPACES = [
  { name: "Product", color: "#16160f" },
  { name: "Personal", color: "#6b6b66" },
  { name: "Side Project", color: "#a8a8a1" },
];

export default function AppMockup() {
  const [seconds, setSeconds] = useState(12 * 60 + 4);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const timer =
    String(Math.floor(seconds / 60)).padStart(2, "0") +
    ":" +
    String(seconds % 60).padStart(2, "0");

  return (
    <div className="relative mx-auto max-w-[1080px] overflow-hidden rounded-[22px] border border-line bg-surface shadow-lift">
      {/* title bar */}
      <div className="flex items-center gap-2 border-b border-line bg-sunken px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ec6a5e]" />
        <span className="h-3 w-3 rounded-full bg-[#f4be4f]" />
        <span className="h-3 w-3 rounded-full bg-[#61c554]" />
        <span className="ml-3 text-[12.5px] font-medium text-ink-faint">
          Quoril — Planner
        </span>
        <div className="ml-auto flex items-center gap-2 rounded-pill border border-line bg-surface px-2.5 py-1 text-[11px] text-ink-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-state-success animate-pulse2" />
          Synced
        </div>
      </div>

      <div className="grid min-h-[460px] grid-cols-1 sm:grid-cols-[224px_1fr]">
        {/* sidebar */}
        <aside className="hidden flex-col border-r border-line bg-paper p-3 sm:flex">
          {/* brand */}
          <div className="flex items-center gap-2.5 px-1.5 pb-3 pt-1">
            <span className="grid h-[26px] w-[26px] place-items-center rounded-[8px] bg-ink text-[14px] font-bold text-paper">
              Q
            </span>
            <span className="text-[15px] font-bold tracking-[-0.01em] text-ink">
              Quoril<span className="text-ink-faint">.</span>
            </span>
          </div>

          {/* user row */}
          <div className="mb-2 flex items-center gap-2 rounded-[11px] px-1.5 py-1.5">
            <span className="grid h-5 w-5 place-items-center rounded-[6px] bg-ink text-[10px] font-semibold text-paper">
              M
            </span>
            <span className="text-[13px] font-semibold text-ink">mohan</span>
            <svg className="ml-auto h-3 w-3 text-ink-faint" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </div>

          <div className="flex flex-col gap-1">
            {NAV.map(({ label, Icon, active }) => (
              <div
                key={label}
                className={`flex cursor-pointer items-center gap-2.5 rounded-[11px] px-3 py-2 text-[13px] font-medium transition ${
                  active
                    ? "bg-ink text-paper"
                    : "text-ink-muted hover:bg-sunken hover:text-ink"
                }`}
              >
                <Icon className="h-[16px] w-[16px]" />
                {label}
              </div>
            ))}
          </div>

          <div className="mb-1.5 mt-4 px-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
            Workspaces
          </div>
          <div className="flex flex-col gap-0.5">
            {WORKSPACES.map((w) => (
              <div
                key={w.name}
                className="flex cursor-pointer items-center gap-2.5 rounded-[11px] px-3 py-1.5 text-[13px] font-medium text-ink-muted transition hover:bg-sunken hover:text-ink"
              >
                <span className="h-2 w-2 rounded-[3px]" style={{ background: w.color }} />
                {w.name}
              </div>
            ))}
          </div>

          {/* settings footer */}
          <div className="mt-auto border-t border-line pt-2">
            <div className="flex cursor-pointer items-center gap-2.5 rounded-[11px] px-3 py-2 text-[13px] font-medium text-ink-muted transition hover:bg-sunken hover:text-ink">
              <IconSettings className="h-[16px] w-[16px]" />
              Settings
            </div>
          </div>
        </aside>

        {/* board */}
        <main className="overflow-hidden bg-surface p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {COLS.map((col) => (
              <div key={col.name}>
                <div className="mb-2.5 flex items-center gap-2 text-[12.5px] font-semibold text-ink-muted">
                  <span className="h-2 w-2 rounded-full" style={{ background: col.dot }} />
                  {col.name}
                  <span className="ml-auto rounded-pill bg-sunken px-1.5 text-[11px] text-ink-faint">
                    {col.tasks.length}
                  </span>
                </div>

                {col.tasks.map((task) => {
                  const isDone = col.name === "Done" || checked[task.id];
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      whileHover={{ y: -2 }}
                      className={`group mb-2 cursor-grab rounded-[14px] border bg-surface p-3 shadow-soft transition ${
                        task.active
                          ? "border-ink/25"
                          : "border-line hover:border-line-strong"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() =>
                            setChecked((c) => ({ ...c, [task.id]: !c[task.id] }))
                          }
                          className={`mt-0.5 grid h-4 w-4 flex-shrink-0 place-items-center rounded-[5px] border transition ${
                            isDone
                              ? "border-ink bg-ink text-paper"
                              : "border-line-strong hover:border-ink"
                          }`}
                          aria-label="Toggle complete"
                        >
                          <AnimatePresence>
                            {isDone && (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                              >
                                <IconCheck className="h-3 w-3" strokeWidth={3} />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </button>

                        <span
                          className={`text-[13px] font-medium leading-snug text-ink ${
                            isDone ? "text-ink-faint line-through" : ""
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
                        {task.prio && !isDone && (
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: PRIO[task.prio] }}
                          />
                        )}
                        {task.active ? (
                          <span className="mono inline-flex items-center gap-1 rounded-pill bg-ink px-2 py-0.5 text-[10.5px] font-medium text-paper">
                            ⏱ active {timer}
                          </span>
                        ) : (
                          task.chip && (
                            <span className="rounded-pill bg-sunken px-2 py-0.5 text-[10.5px] text-ink-muted">
                              {task.chip}
                            </span>
                          )
                        )}
                      </div>

                      {typeof task.progress === "number" && !isDone && (
                        <div className="ml-6 mt-2.5 h-1 overflow-hidden rounded-pill bg-sunken">
                          <div
                            className="h-full rounded-pill bg-ink"
                            style={{ width: `${task.progress}%` }}
                          />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
