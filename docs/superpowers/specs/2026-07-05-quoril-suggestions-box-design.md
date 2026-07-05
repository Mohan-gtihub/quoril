# Quoril Suggestions Box — persistence, rate-limit, visuals, logo

Date: 2026-07-05
Component: `src/components/reports/components/InsightsModal.tsx`

## Goal

Improve the "Quoril Suggestions" modal (AI report insights): persist the first
generated result so it shows continuously without re-calling the model, rate-limit
regeneration to once per 6 hours, add data visualizations, and use the Quoril
brand mark as the header icon.

## Requirements

### 1. Persistent cache + 6h regenerate lock
- Replace the in-memory `sessionCache` Map with a `localStorage`-backed store.
- Key: `quoril.insights.<cacheKey>` (cacheKey is the report range label).
- Value: `{ result: InsightsResult; model: string; generatedAt: number }` (JSON).
- On open: if a cached entry exists, show it immediately with no model call.
- First open with no cache auto-generates once (existing behavior).
- Regenerate button enabled only when `Date.now() - generatedAt >= 6h`.
  - While locked: disabled, shows countdown label ("Regenerate in Xh Ym").
- Error-state "Try again" is NOT rate-limited (nothing was cached on failure).
- Cooldown is per report range (each range has its own cached entry + timer).
- Cache/timer logic lives in a small helper `insightsCache.ts`
  (load / save / isRegenEligible / msUntilEligible) for focus + testability.

### 2. Visualizations — new `InsightsVisuals.tsx`
Built purely from the `ReportInsightSummary` already passed to the modal
(no extra data, no extra model calls). Rendered above the text summary.
- Stat tiles: deep-work minutes, focus sessions, completion rate, distraction %.
- Completion ring: SVG donut for `completion_rate`, `focus_linked_percent` label.
- Focus/distraction bars: top 3 `top_categories` and top 3 `top_attention_leaks`,
  scaled to max value.
- Best/worst focus window: two badges (best = focus color, worst = amber/error),
  hidden when null.
- Colors use existing CSS vars; light/dark safe; consistent color roles (dataviz).

### 3. Header logo
Replace the `Lightbulb` header badge icon with the Quoril brand mark:
`<img src={`${import.meta.env.BASE_URL}brand-mark.png`} alt="Quoril" />`
(same asset used in `Sidebar.tsx`), inside the existing rounded badge container.

### 4. UI polish
Order in body: visuals → summary → insight cards → tomorrow plan. Insight cards
keep the lightbulb accent. Footer keeps privacy note + Regenerate/Copy with the
Regenerate lock state.

## Non-goals (YAGNI)
- No Supabase / backend changes.
- No new model calls for visuals.
- No global cooldown (per-range only).

## Files
- `src/services/insights/insightsCache.ts` (new) — persistence + cooldown helpers.
- `src/components/reports/components/InsightsVisuals.tsx` (new) — visualizations.
- `src/components/reports/components/InsightsModal.tsx` (edit) — wire cache, lock,
  visuals, logo.
