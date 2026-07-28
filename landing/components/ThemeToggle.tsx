"use client";

import { useEffect, useState } from "react";

/**
 * Sun/moon theme switch. Light is the default; the choice persists in
 * localStorage under `quoril-theme` and is applied pre-paint by the inline
 * script in the root layout (so there's no flash on reload).
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    const root = document.documentElement;
    if (next) {
      root.classList.add("dark");
      localStorage.setItem("quoril-theme", "dark");
    } else {
      root.classList.remove("dark");
      localStorage.setItem("quoril-theme", "light");
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light mode" : "Dark mode"}
      className={`relative grid h-9 w-9 place-items-center rounded-pill border border-line bg-surface text-ink-muted shadow-soft transition hover:border-line-strong hover:text-ink ${className}`}
    >
      {/* Render the icon only after mount to avoid a hydration mismatch
          (server can't know the persisted theme). */}
      {mounted &&
        (dark ? (
          <IconSun className="h-[18px] w-[18px]" />
        ) : (
          <IconMoon className="h-[18px] w-[18px]" />
        ))}
    </button>
  );
}

function IconSun({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M12 2.5v2.2M12 19.3v2.2M21.5 12h-2.2M4.7 12H2.5M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6M18.7 18.7l-1.6-1.6M6.9 6.9 5.3 5.3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}
