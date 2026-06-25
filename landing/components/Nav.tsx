"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const LINKS = [
  { href: "/features", label: "Features" },
  { href: "/insights", label: "Insights" },
  { href: "/canvas", label: "Canvas" },
  { href: "/security", label: "Security" },
  { href: "/download", label: "Download" },
];

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      className={`flex items-center gap-2.5 text-[18px] font-semibold tracking-[-0.02em] text-ink ${className}`}
    >
      <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-ink text-[16px] font-bold text-paper">
        Q
      </span>
      Quoril
    </Link>
  );
}

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <nav className="fixed inset-x-0 top-0 z-50">
      <div
        className={`mx-auto my-3 flex max-w-[1140px] items-center justify-between rounded-pill border px-3 py-2 pl-5 backdrop-blur-xl transition ${
          scrolled
            ? "border-line bg-paper/80 shadow-soft"
            : "border-transparent bg-paper/50"
        }`}
        style={{ width: "calc(100% - 28px)" }}
      >
        <Logo />

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-pill px-3.5 py-2 text-[14px] font-medium transition ${
                  active
                    ? "bg-sunken text-ink"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/waitlist"
            className="rounded-pill bg-ink px-[17px] py-2.5 text-[14px] font-semibold text-paper transition hover:bg-ink/90"
          >
            Join waitlist
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            className="grid h-9 w-9 place-items-center rounded-pill border border-line bg-surface text-ink md:hidden"
            aria-label="Menu"
          >
            <span className="relative block h-3 w-4">
              <span
                className={`absolute left-0 h-[1.6px] w-full bg-ink transition ${open ? "top-1.5 rotate-45" : "top-0"}`}
              />
              <span
                className={`absolute left-0 top-1.5 h-[1.6px] w-full bg-ink transition ${open ? "opacity-0" : ""}`}
              />
              <span
                className={`absolute left-0 h-[1.6px] w-full bg-ink transition ${open ? "top-1.5 -rotate-45" : "top-3"}`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* mobile sheet */}
      {open && (
        <div
          className="mx-auto mt-1 flex max-w-[1140px] flex-col gap-1 rounded-card border border-line bg-surface p-2 shadow-lift md:hidden"
          style={{ width: "calc(100% - 28px)" }}
        >
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-[12px] px-4 py-3 text-[15px] font-medium text-ink-muted hover:bg-sunken hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
