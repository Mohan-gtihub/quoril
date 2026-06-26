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
  IconPlay,
} from "./icons";

// Small subtask/checklist glyph (matches the real app's ListTodo icon).
function IconList({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 5h2M3 12h2M3 19h2M9 5h12M9 12h12M9 19h12" />
    </svg>
  );
}

type Task = {
  id: string;
  title: string;
  est?: string; // estimated time, e.g. "45m" / "2h" / "unlimited"
  done_time?: string; // actual time when completed
  sub?: [number, number]; // [done, total] subtasks
  active?: boolean;
};

// Quoril accent palette
const FOCUS = "#2B6BF5";
const BREAK = "#F5A623";
const WELLBEING = "#10C49A";
const SLATE = "#3D3D3D";

const COLS: { name: string; dot: string; tasks: Task[] }[] = [
  {
    name: "Backlog",
    dot: SLATE,
    tasks: [
      { id: "b1", title: "Research auth providers", est: "45m" },
      { id: "b2", title: "Sketch onboarding flow", est: "30m" },
    ],
  },
  {
    name: "This Week",
    dot: FOCUS,
    tasks: [
      { id: "w1", title: "Wire up sync engine", est: "2h" },
      { id: "w2", title: "Review PR #214", est: "20m" },
    ],
  },
  {
    name: "Today",
    dot: BREAK,
    tasks: [
      { id: "t1", title: "Write launch post", est: "25m", active: true },
      { id: "t2", title: "Fix heatmap tooltip", est: "40m", sub: [1, 3] },
    ],
  },
  {
    name: "Done",
    dot: WELLBEING,
    tasks: [
      { id: "d1", title: "Ship onboarding", done_time: "38m" },
      { id: "d2", title: "Update README", done_time: "12m" },
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
  { name: "Product", color: FOCUS },
  { name: "Personal", color: BREAK },
  { name: "Side Project", color: WELLBEING },
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
            <span className="text-[13px] font-semibold text-ink">Erik</span>
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
        <main className="overflow-hidden bg-paper p-4 sm:p-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {COLS.map((col) => (
              <div key={col.name} className="rounded-[16px] bg-sunken/40 p-2">
                <div className="mb-2.5 flex items-center gap-2 px-1 pt-1 text-[12px] font-semibold uppercase tracking-[0.04em] text-ink-muted">
                  <span className="h-2 w-2 rounded-full" style={{ background: col.dot }} />
                  {col.name}
                  <span className="ml-auto grid h-[18px] min-w-[18px] place-items-center rounded-pill bg-surface px-1 text-[11px] font-semibold text-ink-faint shadow-ring">
                    {col.tasks.length}
                  </span>
                </div>

                {col.tasks.map((task) => {
                  const isDone = col.name === "Done" || checked[task.id];
                  const isActive = !!task.active && !isDone;
                  return (
                    <motion.div
                      key={task.id}
                      layout
                      whileHover={{ y: -1 }}
                      className={`group mb-2 cursor-grab rounded-[12px] border p-3 transition ${
                        isDone
                          ? "border-line bg-sunken/50 opacity-60"
                          : isActive
                          ? "border-[#2B6BF5]/40 bg-surface shadow-soft"
                          : "border-line bg-surface shadow-soft hover:border-line-strong"
                      }`}
                    >
                      {/* row 1 — checkbox + title */}
                      <div className="flex items-start gap-2.5">
                        <button
                          onClick={() =>
                            setChecked((c) => ({ ...c, [task.id]: !c[task.id] }))
                          }
                          className={`mt-px grid h-[15px] w-[15px] flex-shrink-0 place-items-center rounded-[5px] border transition ${
                            isDone
                              ? "border-[#10C49A] bg-[#10C49A] text-white"
                              : "border-line-strong hover:border-[#2B6BF5]"
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
                                <IconCheck className="h-2.5 w-2.5" strokeWidth={3} />
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </button>

                        <span
                          className={`text-[12px] font-semibold leading-snug text-ink ${
                            isDone ? "text-ink-faint line-through" : ""
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>

                      {/* row 2 — meta left, timer/start right */}
                      <div className="mt-2.5 flex items-center justify-between pl-[25px]">
                        <div className="flex items-center gap-3 text-[10.5px] font-semibold text-ink-faint">
                          {isDone ? (
                            <span className="lowercase">{task.done_time}</span>
                          ) : (
                            <>
                              {task.est && <span className="lowercase">{task.est}</span>}
                              {task.sub && (
                                <span className="inline-flex items-center gap-1">
                                  <IconList className="h-3 w-3" />
                                  {task.sub[0]}/{task.sub[1]}
                                </span>
                              )}
                            </>
                          )}
                        </div>

                        {!isDone && (
                          <div className="flex items-center gap-1.5">
                            {isActive ? (
                              <span className="mono rounded-md bg-[#2B6BF5]/12 px-1.5 py-0.5 text-[10.5px] font-bold tracking-tight text-[#2B6BF5]">
                                {timer}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-pill bg-ink px-2.5 py-1 text-[10px] font-semibold text-paper opacity-0 transition group-hover:opacity-100">
                                <IconPlay className="h-2.5 w-2.5" />
                                Start
                              </span>
                            )}
                          </div>
                        )}
                      </div>
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
