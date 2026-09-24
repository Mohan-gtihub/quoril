# Quoril — Design Language ("Refined Apple-native")

Clean, airy, systemy iOS 26. **Cupertino only** (no Material). This is a *visual*
language — screens keep every provider read, callback, navigation, and data
wiring exactly. Honor `QMotion.reduced(context)` on **every** animation.

## Core principles

1. **Air first.** Generous whitespace, clear vertical rhythm in multiples of
   `QSpace`. Fewer boxes, more breathing room. Content over chrome.
2. **Neutral surfaces.** Base = `QColors.bgGrouped`; cards = `QColors.surface`
   (secondarySystemGroupedBackground). Hairline separators (`QColors.separator`).
   Depth via `QElevation.card` (tier 1) — restrained, never heavy.
3. **Restrained glass.** Glass ONLY on chrome — the floating tab bar, sheets,
   the FAB. NEVER on content cards or list rows. No full-bleed decorative
   gradients in content bodies.
4. **One color moment per screen.** At most ONE gradient/tinted hero surface per
   screen, tinted by that screen's **section accent**. Everything else is
   neutral system ink + the accent used sparingly (selection, active state, key
   CTA, rings, progress, section eyebrows).
5. **Type hierarchy.** Use `QType` (eyebrow, largeTitle, hero, title2/3 +
   Emphasized, headline, body, callout, subhead, footnote, caption2). Tabular
   figures (`FontFeature.tabularFigures()`) for ALL numerals. Prefer
   `CupertinoSliverNavigationBar` large titles for top-level screens.
6. **Inset grouped lists.** Settings + list content use inset-grouped rows,
   44pt min touch targets, chevrons in accent or tertiary.
7. **Consistency.** Every screen uses the SAME primitives and the SAME header
   pattern. No one-off card styles — use the shared kit in `lib/core/widgets/*`.

## Section accents (`QSection`, tokens.dart)

Each is a `CupertinoDynamicColor` (dark variant lifted ~12–18%). Resolve with
`.resolveFrom(context)`. Spend on: active tab/selection, section eyebrow labels,
primary CTA, activity rings, progress bars, the focal "today" circle, switches.
Body text/icons stay `QColors.label` / `labelSecondary` / `labelTertiary`.

| Section     | Getter                 | Hue      | Light      | Dark (lifted) |
|-------------|------------------------|----------|------------|---------------|
| Home        | `QSection.home`        | ember    | `0xFFF2751B` | `0xFFFF8A3D` |
| Calendar    | `QSection.calendar`    | grape    | `0xFF7C5CFF` | `0xFF9D84FF` |
| Focus       | `QSection.focus`       | flame    | `0xFFF5482B` | `0xFFFF6A4F` |
| Insights    | `QSection.insights`    | sky      | `0xFF2E9BFF` | `0xFF5CB4FF` |
| Workspaces  | `QSection.workspaces`  | mint     | `0xFF2ED47A` | `0xFF4FE295` |
| Settings    | `QSection.settings`    | graphite | `systemGrey` | `systemGrey` |

`QSection.all` = the six in tab order.

## Surface & elevation rules

- **Page ground:** `QColors.bgGrouped`. **Cards:** `QColors.surface` + tier-1
  `QElevation.card(context)`, radius `QRadius.card` (12). Never a border on a card.
- **Elevation tiers:** tier 1 `QElevation.card` = resting card. tier 2
  `QElevation.raised` = active/selected/lift. tier 3 `QElevation.floating` =
  sheets + FAB. Only chrome (glass) and the hero surface may go beyond tier 1.
- **Separators:** 0.5pt `QColors.separator`, inset from the leading edge inside
  grouped rows (handled by `QGroup` / `InsetSection`).
- **Numerals:** always `FontFeature.tabularFigures()`.

## Header pattern

Top-level screens use `AppScaffold` → `CupertinoSliverNavigationBar` large title
over `QColors.bgGrouped`. In-body section headers use `QSectionHeader` (quiet
tracked eyebrow) or `AppSectionHeader` (bold title + optional accent eyebrow +
accent action link). Pushed screens set `transitionBetweenRoutes: true`; tab
roots leave it false.

## Shared primitives (build screens from these — do not reinvent)

**Scaffold / layout** (`app_kit.dart`)
- `AppScaffold` — large-title nav-bar page over grouped bg; `slivers`, optional `trailing`/`leading`/`overlay`.
- `SliverPagePadding` — wraps content in `kPageMargin` + a sliver.
- `kPageMargin`, `kAccent` — standard side margin / legacy ember constant.

**Headers** (`app_kit.dart`, `editorial.dart`)
- `AppSectionHeader(title, eyebrow?, accent?, actionLabel?, onAction?)` — bold in-body header, accent-aware.
- `QSectionHeader(label, trailing?)` — quiet tracked eyebrow label.

**Cards & lists** (`editorial.dart`, `inset_list.dart`, `app_kit.dart`)
- `QCard(child, onTap?, color?, radius?)` — neutral surface card, tier-1 depth, press-scale.
- `QGroup(children)` / `QRow(icon?, label, value?, trailing?, onTap?, chevron)` — inset-grouped card + 44pt row.
- `InsetSection(header?, footer?, children)` / `InsetRow(...)` — Settings-app grouped list + row.
- `InsetCard(child, onTap?, color?, radius?)` — plain inset surface card (no shadow).

**Data & state** (`editorial.dart`, `common.dart`)
- `QMetricCell(value, label?, eyebrow?, icon?, accent?)` — big tabular stat with quiet caption; accent-aware.
- `QSegmentedControl<T>(groupValue, children, onValueChanged, accent?)` — accent-tinted iOS pill selector.
- `EmptyState(icon, title, message?, action?, accent?)` — centered empty state with tinted symbol disc.
- `QChip(icon?, label, color?)` — small pill for stats/metadata.

**Buttons & motion** (`primary_button.dart`, `editorial.dart`)
- `PrimaryButton(label, onPressed, style, color?, icon?, ...)` — capsule CTA (filled/tinted/plain), haptic.
- `QStagger(children, cap, axis)` — one-time fade+rise entrance; reduce-motion aware.

**Chrome / glass** (`glass.dart`, `common.dart`) — glass on chrome ONLY.
- `GlassSurface` / `GlassPanel` — frosted panels for tab bar, sheets, FAB.

## Tokens quick ref (`lib/core/theme`)
`QColors`, `QSection`, `QSpace(xxs4 xs8 sm12 md16 lg20 xl24 xxl32)`,
`QRadius(chip8 row12 card12 taskCard16 glass20 capsule999)`, `QType`,
`QMotion(fast200 base320, standard, reduced())`,
`QElevation(card/raised/floating/glow)`, `QGradients(warm, page(b), ring*)`.
