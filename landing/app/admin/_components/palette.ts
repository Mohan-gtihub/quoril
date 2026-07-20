"use client";

import { useEffect, useState } from "react";

/**
 * Chart palette — literal hex, per theme.
 *
 * WHY LITERALS: SVG presentation attributes (stroke/fill) cannot resolve
 * `var(--c-focus)`, so Recharts must be handed real hex strings. The same
 * constraint is documented in components/Charts.tsx. Tailwind token classes
 * are still used for all *text* and *container* chrome — only the marks
 * themselves take these values.
 *
 * SELECTION: these are the Quoril brand hues (focus / break / wellbeing, plus
 * a violet fourth) re-stepped into the OKLCH lightness band each surface
 * requires. The dark column is SELECTED for the dark surface — same hues,
 * different steps — not an automatic lighten of the light column.
 *
 * Validated with the dataviz validate_palette.js script; both modes report
 * ALL CHECKS PASS (lightness band, chroma floor, CVD separation,
 * normal-vision floor, contrast vs surface).
 */

/** Categorical hues. Assigned by FIXED slot index — never cycled. */
const CATEGORICAL = {
  light: ["#417dfc", "#cb6a00", "#00a278", "#9b61ea"],
  dark: ["#4481ff", "#cf6d00", "#00a57b", "#9e64ee"],
} as const;

/**
 * Sequential ramp for the retention heatmap — ONE hue (the brand blue),
 * light -> dark. Never a rainbow. Index 0 is the "no data" step.
 */
const SEQUENTIAL = {
  light: ["#eef3fe", "#c9d9fd", "#9dbcfb", "#6d9afa", "#417dfc", "#2159c9"],
  dark: ["#16202f", "#1d3355", "#25497f", "#2f5fa9", "#3a72d6", "#4481ff"],
} as const;

/** Recessive chrome — grid lines, axis lines, tick text. Matches the line/ink tokens. */
const CHROME = {
  light: { grid: "#EBEAE6", axis: "#DEDDD7", tick: "#9C9B92", tooltipBg: "#FFFFFF", tooltipLine: "#DEDDD7", ink: "#16160F" },
  dark: { grid: "#262930", axis: "#383C44", tick: "#646B78", tooltipBg: "#0E1014", tooltipLine: "#383C44", ink: "#F4F5F7" },
} as const;

export type Mode = "light" | "dark";

export type ChartPalette = {
  mode: Mode;
  /** Fixed-order categorical slots. */
  series: readonly string[];
  /** Sequential ramp, low -> high. */
  ramp: readonly string[];
  grid: string;
  axis: string;
  tick: string;
  tooltipBg: string;
  tooltipLine: string;
  ink: string;
};

export function paletteFor(mode: Mode): ChartPalette {
  return {
    mode,
    series: CATEGORICAL[mode],
    ramp: SEQUENTIAL[mode],
    ...CHROME[mode],
  };
}

/**
 * Reads the current theme from the `.dark` class on <html> and stays in sync
 * with the ThemeToggle via a MutationObserver.
 *
 * Starts in "light" so server and first client render agree (the toggle sets
 * the class before paint, and the observer corrects on mount).
 */
export function useChartPalette(): ChartPalette {
  const [mode, setMode] = useState<Mode>("light");

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setMode(root.classList.contains("dark") ? "dark" : "light");
    read();
    const obs = new MutationObserver(read);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return paletteFor(mode);
}
