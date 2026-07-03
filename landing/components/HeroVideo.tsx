"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Ambient background video for the hero. Tuned to stay light:
 *  - a poster paints instantly, so text is legible before a single video
 *    byte arrives (video is `preload="none"` until we opt in);
 *  - the clip only starts downloading/playing after mount and when the hero
 *    is actually on-screen, so it never competes with first paint;
 *  - `prefers-reduced-motion` users get the static poster only.
 * Scrims on top keep the headline readable in both themes.
 */
export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return; // poster only

    // Only load + play while the hero is visible; pause when scrolled away.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          el.play().catch(() => {});
        } else {
          el.pause();
        }
      },
      { threshold: 0.01 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <video
        ref={videoRef}
        className="h-full w-full object-cover opacity-70 dark:opacity-60"
        poster="/hero-poster.jpg"
        preload="none"
        muted
        loop
        playsInline
        autoPlay
        aria-hidden
        {...(active ? { src: "/hero.mp4" } : {})}
      />
      {/* Legibility scrims: veil behind text + fade the bottom into the page
          so the mockup below sits on solid ground. `paper` is theme-aware
          (off-white in light, near-black in dark). */}
      <div className="absolute inset-0 bg-paper/60 dark:bg-paper/55" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-paper via-paper/70 to-transparent" />
    </div>
  );
}
