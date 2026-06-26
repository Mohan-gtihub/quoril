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
      ["Contact", "mailto:hello@quoril.app"],
    ],
  ],
  [
    "Legal",
    [
      ["Privacy Policy", "/privacy"],
      ["Terms of Service", "/terms"],
      ["Security", "/security"],
      ["Delete account", "/account/delete"],
    ],
  ],
];

export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-x-6 gap-y-10 px-5 py-12 sm:px-6 sm:py-16 md:grid-cols-[260px_repeat(4,1fr)] md:gap-10">
        <div className="col-span-2 max-w-[300px] md:col-span-1">
          <Logo />
          <p className="mt-4 text-[14px] leading-relaxed text-ink-muted">
            A desktop productivity operating system for deep work — tasks,
            focus, analytics and digital wellbeing in one native app.
          </p>
          <p className="mt-4 text-[13px] text-ink-faint">
            Built by Erik Vake.
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
        <div className="mx-auto flex max-w-[1180px] flex-col gap-2 px-5 py-6 text-[13px] text-ink-faint sm:flex-row sm:flex-wrap sm:justify-between sm:gap-3 sm:px-6">
          <span>© 2026 Quoril. All rights reserved.</span>
          <span>Offline-first · Local SQLite + cloud sync · Crafted for people who ship.</span>
        </div>
      </div>
    </footer>
  );
}
