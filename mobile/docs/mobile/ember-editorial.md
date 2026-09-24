# Quoril — Ember Editorial design contract

The single design language for the whole app. Every surface is built from the
shared kit below so the app reads as one hand. When in doubt, choose **calm +
precise** over decorated. Ember is precious — spend it in ONE place per screen.

## The thesis
Calm, premium, confident (Things 3 × Oura × Apple system apps). Big expressive
editorial type, generous whitespace, soft layered depth + frosted glass, a
single warm **ember** accent used as a glowing focal point. A small categorical
color spectrum (`QPlay`) is reserved ONLY for timeline/insight *data*.

**Signature moment (do not scatter it):** the ember focal point — the primary
CTA, the now-line on the timeline, today's marker, the active focus ring, the
selected chip. Exactly one always-on ember per screen; everything else is quiet.

## Use the shared kit — do NOT hand-roll these
All in `core/theme/tokens.dart`, `core/theme/typography.dart`,
`core/widgets/editorial.dart`, `core/widgets/glass.dart`, `core/widgets/primary_button.dart`.

- **Color:** `QColors.brand` (ember, adaptive) for action/selection/focal only.
  `QColors.surface` for cards, `QColors.bgGrouped` for page/sheet grounds.
  Semantic `wellbeing/danger/warn` unchanged. Categorical data → `QPlay.spectrum`.
- **Type:** `QType.hero` (40, the one marquee), `largeTitle` (34), `title1/2/3`,
  `headline`, `body`, `subhead`, `meta` (trailing values/timestamps),
  `eyebrow` (section labels — pass normal-case). Editorial = big size contrast +
  restrained color. Never hand-roll `letterSpacing`.
- **Cards & rows:** `QCard` (resting surface, tier-1 depth, press-scale),
  `QGroup` + `QRow` (inset grouped rows with hairlines — Apple Settings pattern),
  `QSectionHeader` (quiet eyebrow + optional trailing action).
- **Depth:** `QElevation.card` (resting) / `.raised` (active) / `.floating`
  (sheet/FAB). Three tiers only. No heavy offset drop shadows. Never a border on
  a card — depth comes from the shadow + the ground.
- **Glass:** `GlassSurface` for CHROME ONLY (tab/nav bar, FAB, sheet bg). Never
  on content rows. `QGlass.sigmaOf(context)` if hand-blurring.
- **Buttons:** `PrimaryButton` (ember pill, 50–52pt) for the primary action;
  disabled = neutral fill, no ember.
- **Motion:** `QStagger` for a list's one-time settle-in (fade + 8pt rise, 50ms
  step). `QMotion.sheet`/`sheetDamping` for sheet springs, `QMotion.gentleOvershoot`
  for a single soft overshoot. ALWAYS gate non-essential motion on
  `QMotion.reduced(context)` / wrap durations in `QMotion.duration(context, d)`.

## Radii (vary them — never one radius everywhere)
chips/pills `QRadius.capsule` (stadium) · list rows `QRadius.row` (12) ·
cards `QRadius.card` (16) · grouped sheets `QRadius.glass` (20) · modal sheet
top corners 28 (use a literal 28 for the sheet container only).

## Spacing
4pt scale via `QSpace` (xs 8 · sm 12 · md 16 side margin · lg 20 · xl 24 · xxl 32).
Group gap 20 (`QSpace.lg`). Card inner padding 16. Tap targets ≥ 44pt.

## Screen recipes
- **Bottom sheets:** grabber (36×5) → the title field IS the header (`title2`),
  Cancel (plain, left) / primary (right or pinned pill). Inset grouped cards,
  20pt between groups. Primary pill pinned above keyboard on a blurred hairline
  bar. Sheet top corners 28, ground `bgGrouped`. Prefer detents (`DraggableScrollableSheet`).
- **Day timeline:** 52pt hour gutter (`footnote`, bare "9/10"), ~64pt hour rows.
  Time-block card: radius 14, 3pt left category accent bar, fill = category @
  10–14% over surface, `subhead` semibold title + `caption` time. Now-line: 1.5pt
  ember line + 7pt ember dot at the rail + soft `ember @ 40%, blur 8` glow (the
  screen's one ember focal point).
- **Month grid:** no boxes/borders. Bare numerals, 7-col, cell ~44pt (`body`).
  Today = ember filled 34pt circle. Selected = `onSurface @ 8%` circle. Density
  = 1–3 tiny 4pt category dots under the numeral. Weekend numerals @ 45%.
- **Lists/cards feed:** `QCard`s with `QStagger` entrance; hero header uses
  `QType.hero`/`largeTitle` with lots of air above.

## Empty states & copy (calm, second-person, one line, no exclamation)
Use `EmptyState` (symbol @ tertiary, 40pt). Examples:
- Today done: "Nothing left for today. Enjoy the quiet."
- Inbox empty: "Inbox zero. Capture anything on your mind."
- No focus history: "Your focus sessions will appear here."
- Insights (no data): "A few days of focus and your patterns show up here."
Buttons are verb-first: "Start focus", "Save task", "Add to today", "Delete".

## Guardrails (self-check before done)
1. Exactly one ember focal point on the screen? (CTA / now-line / active state)
2. Real type scale with size contrast, not ad-hoc sizes?
3. Varied radii, no border-on-everything, glass only on chrome?
4. Reduce Motion + visible focus + ≥44pt targets?
5. Would a designer see *intent*, not a template?
