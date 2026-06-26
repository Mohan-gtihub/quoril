"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconArrow } from "./icons";
import { siteConfig } from "@/lib/site-config";

const BAR_HEIGHT = 40; // px — kept in sync with the --banner-h var below

/**
 * Dismissible top bar for launch / early-access messaging.
 *
 * On mount it sets a `--banner-h` CSS variable on <html> so the floating Nav
 * can drop below it; dismissal is remembered in localStorage (keyed on the
 * announcement version, so updated copy re-shows for everyone).
 */
export default function AnnouncementBar() {
  const { announcement } = siteConfig;
  const storageKey = `quoril:announcement:${announcement.version}`;

  // Start hidden to avoid a flash before we've read localStorage.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!announcement.enabled) return;
    const dismissed =
      typeof window !== "undefined" &&
      window.localStorage.getItem(storageKey) === "1";
    if (!dismissed) {
      setVisible(true);
      document.documentElement.style.setProperty(
        "--banner-h",
        `${BAR_HEIGHT}px`,
      );
    }
    return () => {
      document.documentElement.style.removeProperty("--banner-h");
    };
  }, [announcement.enabled, storageKey]);

  function dismiss() {
    setVisible(false);
    document.documentElement.style.removeProperty("--banner-h");
    try {
      window.localStorage.setItem(storageKey, "1");
    } catch {
      /* private mode — fine, bar just reappears next visit */
    }
  }

  if (!announcement.enabled || !visible) return null;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] flex items-center justify-center bg-ink text-paper"
      style={{ height: BAR_HEIGHT }}
      role="region"
      aria-label="Site announcement"
    >
      <div className="relative flex w-full max-w-[1180px] items-center gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2.5 text-[13px] sm:gap-3 sm:text-[13.5px]">
          <span
            className="hidden shrink-0 rounded-pill px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-paper shadow-soft sm:inline-block"
            style={{ background: "#2B6BF5" }}
          >
            {announcement.tag}
          </span>
          <span className="truncate text-paper/90">{announcement.message}</span>
          <Link
            href={announcement.cta.href}
            className="group inline-flex shrink-0 items-center gap-1 font-semibold text-paper underline-offset-4 hover:underline"
          >
            {announcement.cta.label}
            <IconArrow className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </Link>
        </div>
        <button
          onClick={dismiss}
          aria-label="Dismiss announcement"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-paper/70 transition hover:bg-paper/15 hover:text-paper"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="h-3.5 w-3.5"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
