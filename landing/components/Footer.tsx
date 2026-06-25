import Link from "next/link";
import { Logo } from "./Nav";

const COLS: [string, [string, string][]][] = [
  [
    "Product",
    [
      ["Features", "/features"],
      ["Planner", "/features/planner"],
      ["Focus Engine", "/features/focus"],
      ["Insights", "/insights"],
      ["Canvas", "/canvas"],
    ],
  ],
  [
    "Platform",
    [
      ["Download", "/download"],
      ["Security", "/security"],
      ["Changelog", "/changelog"],
      ["Waitlist", "/waitlist"],
    ],
  ],
  [
    "Company",
    [
      ["About", "/about"],
      ["Privacy", "/security"],
      ["Contact", "mailto:hello@quoril.app"],
    ],
  ],
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[1180px] flex-wrap justify-between gap-10 px-6 py-16">
        <div className="max-w-[300px]">
          <Logo />
          <p className="mt-4 text-[14px] leading-relaxed text-ink-muted">
            A desktop productivity operating system for deep work — tasks,
            focus, analytics and digital wellbeing in one native app.
          </p>
          <p className="mt-4 text-[13px] text-ink-faint">
            Built by Mohan Kilari.
          </p>
        </div>

        {COLS.map(([heading, items]) => (
          <div key={heading}>
            <h5 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
              {heading}
            </h5>
            {items.map(([label, href]) =>
              href.startsWith("/") ? (
                <Link
                  key={label}
                  href={href}
                  className="mb-2.5 block text-[14px] text-ink-muted transition hover:text-ink"
                >
                  {label}
                </Link>
              ) : (
                <a
                  key={label}
                  href={href}
                  className="mb-2.5 block text-[14px] text-ink-muted transition hover:text-ink"
                >
                  {label}
                </a>
              )
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[1180px] flex-wrap justify-between gap-3 px-6 py-6 text-[13px] text-ink-faint">
          <span>© 2026 Quoril. All rights reserved.</span>
          <span>Offline-first · Local SQLite + cloud sync · Crafted for people who ship.</span>
        </div>
      </div>
    </footer>
  );
}
