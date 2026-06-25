import type { Config } from "tailwindcss";

/**
 * Quoril marketing — "Daylight" light system.
 * Near-monochrome: warm paper surfaces, near-black ink, soft greys.
 * No chromatic brand accent — emphasis comes from ink weight, type
 * scale and whitespace (Linear / Vercel / donethat school).
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // surfaces
        paper: "#FBFBFA", // page background (warm white)
        surface: "#FFFFFF", // cards / elevated
        sunken: "#F4F4F2", // inputs, tracks, chips
        line: "#EBEAE6", // hairline borders
        "line-strong": "#DEDDD7",
        // text
        ink: {
          DEFAULT: "#16160F", // primary (warm near-black)
          muted: "#6B6A63", // secondary
          faint: "#9C9B92", // tertiary / captions
        },
        // priority dots — monochrome ink ramp (darker = higher priority),
        // keeps the board calm and on-palette with the rest of the site
        prio: {
          critical: "#16160f",
          high: "#6b6b66",
          medium: "#a8a8a1",
          low: "#cfcec7",
        },
        state: {
          success: "#15803d",
          warning: "#b45309",
          error: "#dc2626",
        },
      },
      borderRadius: {
        tile: "26px",
        card: "18px",
        pill: "999px",
      },
      boxShadow: {
        // layered, low-contrast elevations — the whole "premium" feel
        soft: "0 1px 2px rgba(22,22,15,0.04), 0 10px 28px -16px rgba(22,22,15,0.14)",
        lift: "0 2px 6px rgba(22,22,15,0.05), 0 24px 56px -28px rgba(22,22,15,0.22)",
        inset: "inset 0 1px 0 rgba(255,255,255,0.7)",
        ring: "0 0 0 1px #EBEAE6",
      },
      fontFamily: {
        // donethat.ai type system: Inter (body/UI), Poppins (headings),
        // Indie Flower (handwritten accents).
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        heading: ["var(--font-poppins)", "var(--font-inter)", "sans-serif"],
        hand: ["var(--font-handwriting)", "cursive"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
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
