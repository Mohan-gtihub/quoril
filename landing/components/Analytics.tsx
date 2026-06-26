"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * First-party visitor analytics ("pixel").
 *
 * Emits a `pageview` on every route change and an `exit` event with the
 * time-on-page when the visitor leaves or backgrounds the tab. Identity
 * is anonymous and first-party only:
 *
 *   visitorId — random id kept in localStorage (≈ a returning browser)
 *   sessionId — random id kept in sessionStorage (one tab/visit)
 *
 * No third-party cookies, no PII. Everything is POSTed to /api/track,
 * which stores it server-side out of reach of the public API. Mounted
 * once in the root layout; renders nothing.
 */

const VISITOR_KEY = "quoril-visitor-id";
const SESSION_KEY = "quoril-session-id";

function rid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  }
}

function getId(storage: Storage, key: string): string {
  let v = storage.getItem(key);
  if (!v) {
    v = rid();
    storage.setItem(key, v);
  }
  return v;
}

function sourceFromReferrer(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = params.get("utm_source");
    if (utm) return utm.slice(0, 256);
    const ref = document.referrer;
    if (!ref) return "direct";
    const host = new URL(ref).hostname.replace(/^www\./, "");
    if (host === window.location.hostname) return null; // internal nav
    return host;
  } catch {
    return null;
  }
}

function send(payload: Record<string, unknown>, beacon = false) {
  const body = JSON.stringify(payload);
  try {
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/track",
        new Blob([body], { type: "application/json" }),
      );
      return;
    }
  } catch {
    /* fall through to fetch */
  }
  fetch("/api/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

export default function Analytics() {
  const pathname = usePathname();
  const ids = useRef<{ visitorId: string; sessionId: string } | null>(null);
  const enteredAt = useRef<number>(0);
  const lastPath = useRef<string>("");

  // Resolve the anonymous ids once on the client.
  if (typeof window !== "undefined" && !ids.current) {
    ids.current = {
      visitorId: getId(window.localStorage, VISITOR_KEY),
      sessionId: getId(window.sessionStorage, SESSION_KEY),
    };
  }

  useEffect(() => {
    if (!ids.current || !pathname) return;
    const { visitorId, sessionId } = ids.current;

    // Flush the previous page's dwell time before recording the new view.
    const flushExit = (beacon = false) => {
      if (!lastPath.current || !enteredAt.current) return;
      send(
        {
          type: "exit",
          visitorId,
          sessionId,
          path: lastPath.current,
          durationMs: Date.now() - enteredAt.current,
        },
        beacon,
      );
    };

    flushExit();

    enteredAt.current = Date.now();
    lastPath.current = pathname;

    send({
      type: "pageview",
      visitorId,
      sessionId,
      path: pathname,
      referrer: document.referrer || null,
      source: sourceFromReferrer(),
    });

    const onHide = () => {
      if (document.visibilityState === "hidden") flushExit(true);
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", () => flushExit(true));

    return () => {
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [pathname]);

  return null;
}
