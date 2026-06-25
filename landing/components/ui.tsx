import Link from "next/link";
import Reveal from "./Reveal";

/* ── layout ───────────────────────────────────────────────── */

export function Container({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`mx-auto w-full max-w-[1180px] px-6 ${className}`}>
      {children}
    </div>
  );
}

/* ── type ─────────────────────────────────────────────────── */

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
      <span className="h-px w-5 bg-line-strong" />
      {children}
    </span>
  );
}

export function SectionHead({
  eyebrow,
  title,
  sub,
  align = "center",
}: {
  eyebrow?: string;
  title: React.ReactNode;
  sub?: string;
  align?: "center" | "left";
}) {
  const a =
    align === "center" ? "mx-auto text-center items-center" : "items-start";
  return (
    <Reveal className={`mb-14 flex max-w-[680px] flex-col ${a}`}>
      {eyebrow && (
        <div className="mb-4">
          <Eyebrow>{eyebrow}</Eyebrow>
        </div>
      )}
      <h2 className="font-heading text-[clamp(28px,4.2vw,46px)] font-semibold leading-[1.06] tracking-[-0.03em] text-ink">
        {title}
      </h2>
      {sub && (
        <p className="mt-4 text-[17px] leading-relaxed text-ink-muted">{sub}</p>
      )}
    </Reveal>
  );
}

/* ── surfaces ─────────────────────────────────────────────── */

export function Tile({
  className = "",
  id,
  children,
  hover = true,
}: {
  className?: string;
  id?: string;
  children: React.ReactNode;
  hover?: boolean;
}) {
  return (
    <div
      id={id}
      className={`group relative overflow-hidden rounded-tile border border-line bg-surface p-6 shadow-soft transition duration-300 ${
        hover ? "hover:-translate-y-1 hover:shadow-lift" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function TileIcon({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 grid h-[44px] w-[44px] place-items-center rounded-[13px] border border-line bg-sunken text-ink">
      {children}
    </div>
  );
}

export function Badge({
  children,
  dot = true,
}: {
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-3.5 py-1.5 text-[13px] font-medium text-ink-muted shadow-soft">
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-ink animate-pulse2" />
      )}
      {children}
    </span>
  );
}

/* ── buttons ──────────────────────────────────────────────── */

type BtnProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
};

export function Button({
  href,
  children,
  variant = "primary",
  className = "",
}: BtnProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-pill px-5 py-3 text-[14.5px] font-semibold transition active:scale-[0.98]";
  const styles =
    variant === "primary"
      ? "bg-ink text-paper hover:bg-ink/90 shadow-soft"
      : "border border-line-strong bg-surface text-ink hover:border-ink/30 hover:bg-sunken";
  const internal = href.startsWith("/") && !href.startsWith("//");
  const cls = `${base} ${styles} ${className}`;
  return internal ? (
    <Link href={href} className={cls}>
      {children}
    </Link>
  ) : (
    <a href={href} className={cls}>
      {children}
    </a>
  );
}

/* ── stat ─────────────────────────────────────────────────── */

export function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <b className="block text-[clamp(30px,5vw,46px)] font-semibold tracking-[-0.03em] text-ink">
        {n}
      </b>
      <span className="text-[13px] font-medium text-ink-faint">{label}</span>
    </div>
  );
}
