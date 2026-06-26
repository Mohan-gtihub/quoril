"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconArrow, IconCheck } from "./icons";

const ROLES = ["Engineer", "Designer", "Founder", "PM", "Student", "Other"];
const PLATFORMS = ["macOS", "Windows", "Linux"];

type Status = "idle" | "loading" | "success" | "duplicate" | "error";

export default function Waitlist({ id }: { id?: string }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("");
  const [platform, setPlatform] = useState<string>("macOS");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/waitlist")
      .then((r) => r.json())
      .then((d) => alive && typeof d.count === "number" && setCount(d.count))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, platform }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong.");
        return;
      }
      if (typeof data.count === "number") setCount(data.count);
      if (data.duplicate) {
        setStatus("duplicate");
        setMessage("You're already on the list — we'll be in touch soon.");
      } else {
        setStatus("success");
        setMessage("You're in. Welcome to the Quoril early crew.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
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
              <div className="mb-2 flex items-center gap-2">
                {/* <span className="h-2 w-2 rounded-full bg-ink animate-pulse2" />
                <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-faint">
                  Early access · Q3 2026
                </span> */}
              </div>
              <h3 className="text-2xl font-semibold tracking-[-0.02em] text-ink">
                Join the waitlist
              </h3>
              <p className="mb-5 mt-1.5 text-[15px] text-ink-muted">
                Be first to turn your desktop into a focus machine. No spam — one
                launch email.
              </p>

              <form onSubmit={submit} className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    ref={inputRef}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === "error") setStatus("idle");
                    }}
                    placeholder="you@example.com"
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
                        Get early access
                        <IconArrow className="h-4 w-4 transition group-hover:translate-x-0.5" />
                      </>
                    )}
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="I'm a…">
                    <div className="flex flex-wrap gap-1.5">
                      {ROLES.map((r) => (
                        <Pill
                          key={r}
                          active={role === r}
                          onClick={() => setRole(role === r ? "" : r)}
                        >
                          {r}
                        </Pill>
                      ))}
                    </div>
                  </Field>
                  <Field label="Platform">
                    <div className="flex flex-wrap gap-1.5">
                      {PLATFORMS.map((p) => (
                        <Pill key={p} active={platform === p} onClick={() => setPlatform(p)}>
                          {p}
                        </Pill>
                      ))}
                    </div>
                  </Field>
                </div>

                {status === "error" && (
                  <p className="text-sm text-state-error">{message}</p>
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
                {status === "duplicate" ? "Already on the list" : "You're in 🎉"}
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!done && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm text-ink-muted">
          <div className="flex -space-x-2">
            {[12, 32, 45, 65].map((n, i) => (
              <img
                key={i}
                src={`https://i.pravatar.cc/48?img=${n}`}
                alt=""
                loading="lazy"
                className="h-6 w-6 rounded-full border-2 border-paper object-cover"
              />
            ))}
          </div>
          <span>
            {count !== null ? (
              <>
                <span className="mono font-semibold text-ink">
                  {count.toLocaleString()}
                </span>{" "}
                builders already waiting
              </>
            ) : (
              "Loading early crew…"
            )}
          </span>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
        {label}
      </span>
      {children}
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-pill border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-ink bg-ink text-paper"
          : "border-line-strong text-ink-muted hover:border-ink/40 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
