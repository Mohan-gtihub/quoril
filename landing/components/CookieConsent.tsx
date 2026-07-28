"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { siteConfig } from "@/lib/site-config";

const STORAGE_KEY = "quoril:cookie-consent";

/**
 * GDPR / ePrivacy cookie-consent banner — DORMANT by default.
 *
 * It only renders when `siteConfig.analyticsEnabled` is `true`. Until you
 * actually load analytics or other non-essential cookies, no consent is
 * legally required and this component stays invisible. When you flip the flag,
 * gate your analytics loader on `getCookieConsent() === "accepted"`.
 */
export default function CookieConsent() {
  const [choice, setChoice] = useState<"accepted" | "declined" | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "accepted" || stored === "declined") setChoice(stored);
    } catch {
      /* ignore */
    }
  }, []);

  function decide(value: "accepted" | "declined") {
    setChoice(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    // Hook point: when accepted, this is where you'd initialise analytics.
    window.dispatchEvent(
      new CustomEvent("quoril:consent", { detail: value }),
    );
  }

  // Dormant unless analytics is on, the user hasn't chosen yet, and we're client-side.
  if (!siteConfig.analyticsEnabled || !mounted || choice) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4 sm:px-6 sm:pb-6">
      <div className="mx-auto flex max-w-[680px] flex-col gap-4 rounded-card border border-line bg-surface p-5 shadow-lift sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13.5px] leading-relaxed text-ink-muted">
          We use cookies to understand how Quoril is used and improve it. See our{" "}
          <Link
            href="/privacy"
            className="font-medium text-ink underline-offset-2 hover:underline"
          >
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => decide("declined")}
            className="rounded-pill border border-line-strong bg-surface px-4 py-2 text-[13.5px] font-semibold text-ink-muted transition hover:border-ink/30 hover:text-ink"
          >
            Decline
          </button>
          <button
            onClick={() => decide("accepted")}
            className="rounded-pill bg-ink px-4 py-2 text-[13.5px] font-semibold text-paper transition hover:bg-ink/90"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

/** Read the stored consent choice — gate analytics loaders on this. */
export function getCookieConsent(): "accepted" | "declined" | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "accepted" || v === "declined" ? v : null;
}
