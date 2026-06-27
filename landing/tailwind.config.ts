import type { Config } from "tailwindcss";

/**
 * Quoril marketing — dual-theme system.
 *
 * The original "Daylight" light system is the DEFAULT (warm paper, near-black
 * ink, no chromatic brand accent — Linear / Vercel / donethat school). A dark
 * "Midnight" variant is available via the `.dark` class on <html>, toggled by
 * the sun/moon switch in the nav.
 *
 * Every semantic token resolves to a CSS variable defined in globals.css, so
 * the same `bg-surface` / `text-ink` classes work in both themes — only the
 * variable values flip. `<alpha-value>` keeps Tailwind opacity modifiers
 * (e.g. text-ink/70) working with the rgb channel triples.
 */
const v = (name: string) => `rgb(var(${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // surfaces
        paper: v("--c-paper"),
        surface: v("--c-surface"),
        sunken: v("--c-sunken"),
        line: v("--c-line"),
        "line-strong": v("--c-line-strong"),
        // text
        ink: {
          DEFAULT: v("--c-ink"),
          muted: v("--c-ink-muted"),
          faint: v("--c-ink-faint"),
        },
        // priority dots — ink ramp
        prio: {
          critical: v("--c-prio-critical"),
          high: v("--c-prio-high"),
          medium: v("--c-prio-medium"),
          low: v("--c-prio-low"),
        },
        state: {
          success: v("--c-success"),
          warning: v("--c-warning"),
          error: v("--c-error"),
        },
        // Quoril accent palette
        focus: v("--c-focus"),
        break: v("--c-break"),
        wellbeing: v("--c-wellbeing"),
        deepslate: v("--c-deepslate"),
        // single brand accent for CTAs / highlights
        brand: {
          DEFAULT: v("--c-brand"),
          soft: "rgb(var(--c-brand) / 0.14)",
        },
      },
      borderRadius: {
        tile: "24px",
        card: "16px",
        pill: "999px",
      },
      boxShadow: {
        soft: "var(--shadow-soft)",
        lift: "var(--shadow-lift)",
        inset: "var(--shadow-inset)",
        ring: "0 0 0 1px rgb(var(--c-line))",
        glow: "0 0 0 1px rgb(var(--c-brand) / 0.4), 0 8px 40px -8px rgb(var(--c-brand) / 0.45)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-poppins)", "var(--font-inter)", "sans-serif"],
        // handwriting accent kept for the light theme's character
        hand: ["var(--font-handwriting)", "cursive"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulse2: { "0%,100%": { opacity: "1" }, "50%": { opacity: ".4" } },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-up": "fade-up .7s cubic-bezier(.16,1,.3,1) both",
        pulse2: "pulse2 2.4s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
