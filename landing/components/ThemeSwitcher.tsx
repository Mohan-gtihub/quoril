"use client";

import { motion } from "framer-motion";

/** Static showcase of the desktop app's built-in themes. The marketing
 *  site itself stays monochrome — these are previews of the product. */
const THEMES = [
  { name: "Onyx Dark", sub: "Near-black · default", bg: "#0a0a0a", accent: "#c4f82a" },
  { name: "Arcade Blue", sub: "Deep electric blue", bg: "#050b1a", accent: "#3b82f6" },
  { name: "Sunset Red", sub: "Warm crimson accents", bg: "#1a0505", accent: "#ef4444" },
  { name: "Cosmic Nebula", sub: "Violet space theme", bg: "#050510", accent: "#8b5cf6" },
];

export default function ThemeSwitcher() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {THEMES.map((t, i) => (
        <motion.div
          key={t.name}
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
          whileHover={{ y: -4 }}
          className="overflow-hidden rounded-card border border-line bg-surface text-left shadow-soft transition hover:shadow-lift"
        >
          <div className="flex h-[92px] items-end p-3" style={{ background: t.bg }}>
            <span
              className="h-[34px] w-[34px] rounded-[10px]"
              style={{ background: t.accent, boxShadow: `0 0 20px ${t.accent}66` }}
            />
            <div className="ml-auto flex flex-col gap-1.5">
              <span className="h-1.5 w-12 rounded-full" style={{ background: `${t.accent}` }} />
              <span className="h-1.5 w-8 rounded-full bg-white/25" />
              <span className="h-1.5 w-10 rounded-full bg-white/15" />
            </div>
          </div>
          <div className="px-3.5 py-3">
            <div className="text-[13px] font-semibold text-ink">{t.name}</div>
            <div className="mt-0.5 text-[11px] text-ink-faint">{t.sub}</div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
