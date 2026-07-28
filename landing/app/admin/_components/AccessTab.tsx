"use client";

import { useCallback, useEffect, useState } from "react";

/* ───────────────────────── types ───────────────────────── */

type AllowRow = {
  id: string;
  email: string;
  note: string | null;
  added_by: string;
  created_at: string;
};

type AllowlistResponse = {
  rows: AllowRow[];
  envAdmins: string[];
  setupRequired: boolean;
};

/** A DB row and an env-derived entry, unified for one table. */
type Entry =
  | { kind: "db"; row: AllowRow }
  | { kind: "env"; email: string };

/* ───────────────────────── helpers ───────────────────────── */

function authFetch(token: string, url: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    headers: { ...(init?.headers ?? {}), authorization: `Bearer ${token}` },
    cache: "no-store",
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.2" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/* ───────────────────────── tab ───────────────────────── */

export default function AccessTab({
  token,
  adminEmail,
}: {
  token: string;
  adminEmail: string | null;
}) {
  const [rows, setRows] = useState<AllowRow[]>([]);
  const [envAdmins, setEnvAdmins] = useState<string[]>([]);
  const [setupRequired, setSetupRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // add form
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [adding, setAdding] = useState(false);
  const [addErr, setAddErr] = useState("");

  // per-row confirm + busy state
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const me = (adminEmail ?? "").trim().toLowerCase();

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await authFetch(token, "/api/admin/allowlist");
      const data = (await res.json()) as AllowlistResponse & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setRows(data.rows ?? []);
      setEnvAdmins(data.envAdmins ?? []);
      setSetupRequired(Boolean(data.setupRequired));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) {
      setAddErr("Enter an email address.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setAddErr("That doesn't look like a valid email address.");
      return;
    }

    setAdding(true);
    setAddErr("");
    try {
      const res = await authFetch(token, "/api/admin/allowlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value, note: note.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to add admin");
      setEmail("");
      setNote("");
      await load();
    } catch (e) {
      setAddErr(e instanceof Error ? e.message : "Failed to add admin");
    } finally {
      setAdding(false);
    }
  }

  async function remove(row: AllowRow) {
    setBusyId(row.id);
    try {
      const res = await authFetch(token, "/api/admin/allowlist", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to remove admin");
      setConfirmId(null);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to remove admin");
    } finally {
      setBusyId(null);
    }
  }

  // Env admins first — they're the ones that survive a database outage.
  const entries: Entry[] = [
    ...envAdmins.map((e): Entry => ({ kind: "env", email: e })),
    ...rows.map((row): Entry => ({ kind: "db", row })),
  ];

  const inputCls =
    "w-full rounded-card border border-line-strong bg-paper px-3.5 py-2.5 text-[14px] text-ink outline-none transition focus:border-focus/50 focus:ring-4 focus:ring-focus/10";
  const labelCls =
    "mb-1.5 block text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-faint";

  return (
    <div className="space-y-5">
      {/* ── The #1 point of confusion: this is not an invite. ── */}
      <div className="rounded-card border border-focus/30 bg-focus/5 px-4 py-3.5">
        <p className="text-[13.5px] font-semibold text-ink">
          Adding an email here does not create an account.
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
          The person must already have — or go and create — a Quoril account
          using that exact email address. Once their email is on this list they
          sign in at <span className="mono">/admin</span> with their normal
          Quoril password and the panel opens. No invite email is sent from
          here.
        </p>
      </div>

      {setupRequired && (
        <div className="rounded-card border border-line-strong bg-sunken px-4 py-3.5">
          <p className="text-[13.5px] font-semibold text-ink">
            Database access list not installed yet
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
            Paste <span className="mono">supabase/admin_allowlist.sql</span>{" "}
            into the Supabase SQL editor and run it. Until then only the
            environment admins below have access, and adding new ones here will
            fail.
          </p>
        </div>
      )}

      {/* ── Add admin ── */}
      <form
        onSubmit={add}
        className="rounded-card border border-line bg-surface p-5 shadow-soft"
      >
        <h3 className="mb-4 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
          Add admin
        </h3>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label className={labelCls} htmlFor="allow-email">
              Email
            </label>
            <input
              id="allow-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (addErr) setAddErr("");
              }}
              placeholder="teammate@example.com"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls} htmlFor="allow-note">
              Note <span className="normal-case tracking-normal">(optional)</span>
            </label>
            <input
              id="allow-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Designer, contract ends Sep"
              className={inputCls}
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="flex items-center justify-center gap-2 rounded-pill bg-ink px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-ink/90 disabled:opacity-60"
          >
            {adding && <Spinner />}
            {adding ? "Adding…" : "Add"}
          </button>
        </div>

        {addErr && (
          <p className="mt-3 rounded-card bg-state-error/8 px-3 py-2 text-[13px] text-state-error">
            {addErr}
          </p>
        )}
      </form>

      {err && (
        <p className="rounded-card bg-state-error/8 px-4 py-3 text-[13px] text-state-error">
          {err}
        </p>
      )}

      {/* ── Current access list ── */}
      {loading ? (
        <div className="flex items-center gap-2 py-10 text-ink-faint">
          <Spinner />
          <span className="text-[14px]">Loading…</span>
        </div>
      ) : entries.length === 0 ? (
        <div className="grid place-items-center rounded-card border border-dashed border-line-strong bg-surface px-6 py-16 text-center text-[14px] text-ink-faint">
          Nobody has panel access — check ADMIN_EMAILS.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-soft">
          <table className="w-full min-w-[760px] text-left text-[14px]">
            <thead className="border-b border-line text-[11.5px] uppercase tracking-[0.05em] text-ink-faint">
              <tr>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Note</th>
                <th className="px-4 py-3 font-semibold">Added by</th>
                <th className="px-4 py-3 font-semibold">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const isEnv = entry.kind === "env";
                const rowEmail = isEnv ? entry.email : entry.row.email;
                const isMe = rowEmail.trim().toLowerCase() === me;
                const key = isEnv ? `env:${entry.email}` : entry.row.id;
                const busy = !isEnv && busyId === entry.row.id;
                const confirming = !isEnv && confirmId === entry.row.id;

                return (
                  <tr
                    key={key}
                    className={`border-b border-line transition last:border-0 hover:bg-sunken/50 ${
                      busy ? "opacity-50" : ""
                    } ${isEnv ? "bg-sunken/30" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink">{rowEmail}</span>
                        {isMe && (
                          <span className="rounded-pill bg-ink/8 px-2 py-0.5 text-[11.5px] font-semibold text-ink">
                            you
                          </span>
                        )}
                        {isEnv && (
                          <span
                            title="Configured via the ADMIN_EMAILS environment variable. To change this list you must edit the env var and redeploy the site."
                            className="cursor-help rounded-pill bg-break/12 px-2 py-0.5 text-[11.5px] font-semibold text-break"
                          >
                            from environment
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {isEnv ? (
                        <span className="text-ink-faint">
                          Break-glass access
                        </span>
                      ) : (
                        entry.row.note || <span className="text-ink-faint">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {isEnv ? (
                        <span className="mono text-[13px] text-ink-faint">
                          ADMIN_EMAILS
                        </span>
                      ) : (
                        entry.row.added_by
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-ink-muted">
                      {isEnv ? (
                        <span className="text-ink-faint">—</span>
                      ) : (
                        fmtDate(entry.row.created_at)
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEnv ? (
                        <span
                          title="Env-var admins can only be removed by editing ADMIN_EMAILS and redeploying."
                          className="cursor-help text-[13px] text-ink-faint"
                        >
                          Locked
                        </span>
                      ) : isMe ? (
                        <span className="text-[13px] text-ink-faint">—</span>
                      ) : confirming ? (
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => remove(entry.row)}
                            disabled={busy}
                            className="text-[13px] font-semibold text-state-error transition hover:underline disabled:opacity-60"
                          >
                            {busy ? "Removing…" : "Confirm"}
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            disabled={busy}
                            className="text-[13px] font-medium text-ink-faint transition hover:text-ink"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmId(entry.row.id)}
                          className="text-[13px] font-semibold text-ink-faint transition hover:text-state-error"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[12px] leading-relaxed text-ink-faint">
        Access comes from two places. Emails in the{" "}
        <span className="mono">ADMIN_EMAILS</span> environment variable are the
        break-glass list — they always work, even if the database is
        unreachable, and can only be changed by editing the env var and
        redeploying. Everyone else is stored in the database and can be added or
        removed here instantly. You cannot remove your own access.
      </p>
    </div>
  );
}
