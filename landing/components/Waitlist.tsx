"use client";

import { useEffect, useId, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconArrow, IconCheck } from "./icons";
import { trackEvent } from "./Analytics";

const DISCORD_INVITE = "https://discord.gg/Dmpsb6Ah3";

type Status = "idle" | "loading" | "success" | "duplicate" | "error";

export default function Waitlist({
  id,
  showCount = true,
  showIntro = true,
}: {
  id?: string;
  showCount?: boolean;
  showIntro?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [shareMessage, setShareMessage] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const startedRef = useRef(false);
  const emailId = useId();
  const errorId = `${emailId}-error`;

  useEffect(() => {
    if (!showCount) return;
    let alive = true;
    fetch("/api/waitlist")
      .then((r) => r.json())
      .then(
        (d) =>
          alive &&
          typeof d.count === "number" &&
          d.count > 0 &&
          setCount(d.count),
      )
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [showCount]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");
    trackEvent("waitlist_submitted");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong.");
        trackEvent("waitlist_failed", { reason: `http_${res.status}` });
        return;
      }
      if (typeof data.count === "number" && data.count > 0) setCount(data.count);
      if (data.duplicate) {
        setStatus("duplicate");
        setMessage("You're already covered — we'll send your V1 access at launch.");
        trackEvent("waitlist_duplicate");
      } else {
        setStatus("success");
        setMessage("We'll send your free V1 access when Quoril launches.");
        trackEvent("waitlist_completed");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
      trackEvent("waitlist_failed", { reason: "network" });
    }
  }

  async function shareInvite() {
    const url = `${window.location.origin}/?ref=friend`;
    const shareData = {
      title: "Quoril — Plan. Focus. Understand.",
      text: "Quoril brings planning, focus and private time insights into one desktop app. V1 is free before launch.",
      url,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareMessage("Invite shared");
        trackEvent("waitlist_referral_shared", { method: "native" });
      } else {
        await navigator.clipboard.writeText(url);
        setShareMessage("Invite link copied");
        trackEvent("waitlist_referral_shared", { method: "clipboard" });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareMessage("Copy this link: quoril.in/?ref=friend");
    }
  }

  const done = status === "success" || status === "duplicate";

  return (
    <div id={id} className="relative">
      <div className="px-1 py-2 sm:px-2">
        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              {showIntro && (
                <div className="mb-5">
                  <h3 className="text-2xl font-semibold tracking-[-0.02em] text-ink">
                    Get Quoril V1 free
                  </h3>
                  <p className="mt-1.5 text-[15px] text-ink-muted">
                    Enter your email and we will send access when V1 launches.
                  </p>
                </div>
              )}

              <form onSubmit={submit}>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label htmlFor={emailId} className="sr-only">
                    Email address
                  </label>
                  <input
                    id={emailId}
                    ref={inputRef}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (!startedRef.current) {
                        startedRef.current = true;
                        trackEvent("waitlist_started");
                      }
                      if (status === "error") setStatus("idle");
                    }}
                    placeholder="you@example.com"
                    aria-describedby={status === "error" ? errorId : undefined}
                    aria-invalid={status === "error"}
                    className="min-w-0 flex-1 rounded-pill border border-line-strong bg-paper px-5 py-3.5 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-ink/40 focus:ring-4 focus:ring-ink/5"
                  />
                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill bg-ink px-6 py-3.5 font-semibold text-paper transition hover:bg-ink/90 disabled:opacity-60"
                  >
                    {status === "loading" ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper/30 border-t-paper" />
                        Joining…
                      </span>
                    ) : (
                      <>
                        Get V1 free
                        <IconArrow className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </div>

                {status === "error" && (
                  <p id={errorId} role="alert" className="mt-3 text-sm text-state-error">
                    {message}
                  </p>
                )}
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="py-6 text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 18 }}
                className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-ink text-paper"
              >
                <IconCheck className="h-8 w-8" />
              </motion.div>
              <h3 className="text-2xl font-semibold tracking-[-0.02em] text-ink">
                {status === "duplicate" ? "Your free V1 is reserved" : "Free V1 claimed"}
              </h3>
              <p className="mx-auto mt-2 max-w-sm text-ink-muted">{message}</p>
              {count !== null && (
                <p className="mt-5 text-sm text-ink-faint">
                  You're one of{" "}
                  <span className="mono font-semibold text-ink">
                    {count.toLocaleString()}
                  </span>{" "}
                  people waiting.
                </p>
              )}

              <div className="mx-auto mt-7 flex max-w-md flex-col justify-center gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={shareInvite}
                  className="inline-flex items-center justify-center rounded-pill bg-ink px-5 py-3 text-sm font-semibold text-paper transition hover:bg-ink/90"
                >
                  Invite a friend
                </button>
                <a
                  href={DISCORD_INVITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackEvent("discord_clicked")}
                  className="inline-flex items-center justify-center rounded-pill border border-line-strong bg-paper px-5 py-3 text-sm font-semibold text-ink transition hover:bg-sunken"
                >
                  Join the community
                </a>
              </div>
              {shareMessage && (
                <p className="mt-3 text-sm text-ink-muted" aria-live="polite">
                  {shareMessage}
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!done && (count !== null || !showCount) && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-ink-muted">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-ink text-paper" aria-hidden="true">
            <IconCheck className="h-3 w-3" />
          </span>
          <span>
            {count !== null ? (
              <>
                <span className="mono font-semibold text-ink">
                  {count.toLocaleString()}
                </span>{" "}
                people have claimed free V1
              </>
            ) : (
              "No card required"
            )}
          </span>
        </div>
      )}
    </div>
  );
}
