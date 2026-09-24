import 'package:flutter/cupertino.dart';

/// Resolve any color (dynamic or plain) against the current context.
/// Lets call sites use `color.resolveFrom(context)` even after a `??` where
/// the static type collapses to `Color`.
extension ColorResolve on Color {
  Color resolveFrom(BuildContext context) =>
      CupertinoDynamicColor.resolve(this, context);
}

/// Quoril design tokens — "Pure Apple System" (iOS 26 Liquid Glass).
///
/// Colors bind to iOS system semantic colors so light/dark, increased-contrast,
/// and future OS shifts are automatic. Functional accents use Apple system colors.
class QColors {
  QColors._();

  // Semantic surfaces
  static const bg = CupertinoColors.systemBackground;
  static const bgGrouped = CupertinoColors.systemGroupedBackground;
  static const surface = CupertinoColors.secondarySystemGroupedBackground;
  static const surface2 = CupertinoColors.tertiarySystemBackground;
  static const fill = CupertinoColors.systemFill;
  static const secondaryFill = CupertinoColors.secondarySystemFill;
  static const tertiaryFill = CupertinoColors.tertiarySystemFill;

  // Text
  static const label = CupertinoColors.label;
  static const labelSecondary = CupertinoColors.secondaryLabel;
  static const labelTertiary = CupertinoColors.tertiaryLabel;
  static const separator = CupertinoColors.separator;

  // ---------------------------------------------------------------------------
  // THE ONE BRAND SIGNAL — "Warm Ember".
  // A single ember accent is the *only* chromatic brand color in the app. Every
  // CTA, selection, tab, ring, focus surface, and gradient is this hue or a
  // tint/shade of it. It is a CupertinoDynamicColor so it lifts for contrast in
  // dark mode automatically. Spend it on action + selection, never decoration.
  // Semantic state colors (green/red/yellow) stay meaning-specific below.
  // ---------------------------------------------------------------------------
  static const brand = CupertinoDynamicColor.withBrightness(
    color: Color(0xFFF2751B), // ember (light)
    darkColor: Color(0xFFFF8A3D), // lifted ember (dark)
  );
  static const brandDeep = CupertinoDynamicColor.withBrightness(
    color: Color(0xFFB23405), // deep ember for gradient roots / shadows
    darkColor: Color(0xFFD9531A),
  );
  static const brandBright = CupertinoDynamicColor.withBrightness(
    color: Color(0xFFFFB661), // warm amber highlight
    darkColor: Color(0xFFFFC680),
  );

  /// Interactive tint == the brand. One edit re-tints every default button,
  /// link, row chevron, chart, and segmented control to ember.
  static const tint = brand;

  /// Neutral system link color, for incidental / low-emphasis links only where
  /// ember would over-emphasize (kept available, used sparingly).
  static const link = CupertinoColors.systemBlue;

  // Functional / state accents (semantic, not brand)
  static const focus = brand; // active session == the brand
  static const breakColor = CupertinoColors.systemTeal; // pomodoro break — a cool "rest" hue, distinct from ember
  static const wellbeing = CupertinoColors.systemGreen; // done / saves
  static const danger = CupertinoColors.systemRed; // distraction / delete
  static const warn = CupertinoColors.systemYellow; // level-1 nudge

  // Priority traffic-light
  static const prioLow = CupertinoColors.systemGreen;
  static const prioMed = CupertinoColors.systemOrange;
  static const prioHigh = CupertinoColors.systemRed;
  static Color prioCritical(BuildContext c) =>
      CupertinoColors.systemRed.resolveFrom(c).withValues(alpha: 1.0);

  /// Workspace color palette (10 swatches) — mirrors desktop.
  static const workspacePalette = <Color>[
    CupertinoColors.systemBlue,
    CupertinoColors.systemGreen,
    CupertinoColors.systemIndigo,
    CupertinoColors.systemOrange,
    CupertinoColors.systemPink,
    CupertinoColors.systemPurple,
    CupertinoColors.systemRed,
    CupertinoColors.systemTeal,
    CupertinoColors.systemYellow,
    CupertinoColors.systemBrown,
  ];
}

/// SECTION ACCENTS — one deliberate hue per top-level section of the app. Each
/// screen may spend its section accent on: the active tab/selection, section
/// eyebrow labels, the primary CTA, activity rings, progress bars, the focal
/// "today" circle, and switches. Body text/icons always stay neutral system ink
/// (QColors.label / labelSecondary / labelTertiary) — the accent is a *signal*,
/// never the paragraph color.
///
/// Every accent is a [CupertinoDynamicColor] whose dark variant is lifted
/// ~12–18% for contrast on a dark ground, so `.resolveFrom(context)` gives the
/// right value in both modes for free. Resolve at the call site.
class QSection {
  QSection._();

  /// Home — ember (the brand hue). The one section that shares the brand accent.
  static const home = CupertinoDynamicColor.withBrightness(
    color: Color(0xFFF2751B),
    darkColor: Color(0xFFFF8A3D), // lifted ember
  );

  /// Calendar — grape (plan / schedule).
  static const calendar = CupertinoDynamicColor.withBrightness(
    color: Color(0xFF7C5CFF),
    darkColor: Color(0xFF9D84FF), // lifted grape
  );

  /// Focus — flame (the deep, urgent focus hue; hotter than ember).
  static const focus = CupertinoDynamicColor.withBrightness(
    color: Color(0xFFF5482B),
    darkColor: Color(0xFFFF6A4F), // lifted flame
  );

  /// Insights — sky (data / analytics).
  static const insights = CupertinoDynamicColor.withBrightness(
    color: Color(0xFF2E9BFF),
    darkColor: Color(0xFF5CB4FF), // lifted sky
  );

  /// Workspaces — mint (done / wellbeing / organization).
  static const workspaces = CupertinoDynamicColor.withBrightness(
    color: Color(0xFF2ED47A),
    darkColor: Color(0xFF4FE295), // lifted mint
  );

  /// Settings — graphite (neutral system grey; settings stays chromeless).
  static const settings = CupertinoColors.systemGrey;

  /// All section accents in canonical tab order.
  static const List<Color> all = <Color>[
    home,
    calendar,
    focus,
    insights,
    workspaces,
    settings,
  ];
}

/// "Playful Spectrum" — a coordinated, vibrant multi-hue palette layered on top
/// of the ember brand. These are used for *categorical* color: each surface type
/// (plan, focus, break, insights, streak, distraction) owns one hue so the app
/// reads as colorful and energetic while staying legible. Ember stays the single
/// primary action color; these accents carry sections, tiles, and charts.
class QPlay {
  QPlay._();

  static const ember = Color(0xFFF2751B); // focus / primary
  static const grape = Color(0xFF7C5CFF); // plan / schedule
  static const aqua = Color(0xFF12C2C2); // break / calm
  static const sky = Color(0xFF2E9BFF); // insights / data
  static const gold = Color(0xFFFFB020); // streak / reward
  static const rose = Color(0xFFFF5C8A); // distraction / alert
  static const mint = Color(0xFF2ED47A); // done / wellbeing

  /// The full spectrum in a fixed order — cycle through for categorical tiles,
  /// chart series, or workspace swatches so colors feel deliberate, not random.
  static const spectrum = <Color>[ember, grape, aqua, sky, gold, rose, mint];

  /// A soft tinted fill for a colored tile background (light, airy).
  static Color soft(Color c, {double alpha = 0.14}) =>
      c.withValues(alpha: alpha);

  /// A vivid two-stop gradient for any accent hue — lighter top-left to the
  /// saturated hue bottom-right. The signature "playful tile" fill.
  static LinearGradient grad(Color c) => LinearGradient(
        begin: Alignment.topLeft,
        end: Alignment.bottomRight,
        colors: [
          Color.lerp(c, const Color(0xFFFFFFFF), 0.22)!,
          c,
          Color.lerp(c, const Color(0xFF000000), 0.18)!,
        ],
        stops: const [0.0, 0.55, 1.0],
      );
}

/// 4pt base spacing scale.
class QSpace {
  QSpace._();
  static const xxs = 4.0;
  static const xs = 8.0;
  static const sm = 12.0;
  static const md = 16.0; // default side margin
  static const lg = 20.0; // hero side margin
  static const xl = 24.0;
  static const xxl = 32.0;
}

/// Corner radii — Apple mobile radii (tighter than desktop bento).
class QRadius {
  QRadius._();
  static const iconTile = 7.0; // 28pt settings icon tile (continuous-corner feel)
  static const chip = 8.0;
  static const row = 12.0;
  static const card = 12.0;
  static const taskCard = 16.0; // Blitzit-style elevated task card
  static const glass = 20.0;
  static const capsule = 999.0;
}

/// EMBER EDITORIAL depth system. Three composite, low-opacity shadow tiers
/// (never a heavy offset drop). Depth is spent deliberately: resting content
/// uses tier 1, active/raised uses tier 2, sheets & the FAB use tier 3. In dark
/// mode the shadow alphas halve and a faint top hairline stands in for lift.
class QElevation {
  QElevation._();
  static const fab = 56.0;
  static const listBadge = 22.0;

  /// True in dark mode — callers add a `white @ 6%` top hairline instead of
  /// leaning on shadow (which barely reads on a dark ground).
  static bool _dark(BuildContext c) =>
      CupertinoTheme.of(c).brightness == Brightness.dark ||
      (MediaQuery.maybeOf(c)?.platformBrightness == Brightness.dark);

  /// Tier 1 — resting card on a grouped background.
  static List<BoxShadow> card(BuildContext c) => [
        BoxShadow(
          color: CupertinoColors.black.withValues(alpha: _dark(c) ? 0.025 : 0.05),
          blurRadius: 12,
          offset: const Offset(0, 4),
        ),
      ];

  /// Tier 2 — raised / active card, hover-lift, selected surface.
  static List<BoxShadow> raised(BuildContext c) => [
        BoxShadow(
          color: CupertinoColors.black.withValues(alpha: _dark(c) ? 0.035 : 0.07),
          blurRadius: 24,
          offset: const Offset(0, 8),
        ),
      ];

  /// Tier 3 — modal sheets and the floating FAB.
  static List<BoxShadow> floating(BuildContext c) => [
        BoxShadow(
          color: CupertinoColors.black.withValues(alpha: _dark(c) ? 0.05 : 0.10),
          blurRadius: 40,
          offset: const Offset(0, 16),
        ),
      ];

  /// Colored bloom under any playful tile — the vivid glow that makes the
  /// spectrum tiles feel like they're lit from within. Spend on hero/CTA tiles.
  static List<BoxShadow> glow(Color color, {double alpha = 0.34, double blur = 22, double y = 12}) => [
        BoxShadow(
          color: color.withValues(alpha: alpha),
          blurRadius: blur,
          offset: Offset(0, y),
        ),
      ];

  /// Colored glow for the brand hero surface (ember bloom).
  static List<BoxShadow> brandGlow(BuildContext c) => [
        BoxShadow(
          color: QColors.brand.resolveFrom(c).withValues(alpha: 0.30),
          blurRadius: 24,
          offset: const Offset(0, 12),
        ),
      ];
}

/// Frosted-glass material tuning. Glass is reserved for CHROME (nav/tab bars,
/// sheets, the floating FAB) — never on list rows or content, per Apple's
/// Liquid Glass guidance. Heavier blur than the old default for a real material.
class QGlass {
  QGlass._();
  static const sigmaLight = 20.0;
  static const sigmaDark = 30.0;

  /// Tint alpha laid over the blur so the material has body, per mode.
  static const tintLight = 0.70;
  static const tintDark = 0.55;

  /// The "refraction" hairline along the top edge of a glass panel.
  static const edgeHighlight = 0.25;

  static double sigmaOf(BuildContext c) =>
      (MediaQuery.maybeOf(c)?.platformBrightness == Brightness.dark) ? sigmaDark : sigmaLight;
}

/// Motion — spring physics, honor Reduce Motion at call sites.
class QMotion {
  QMotion._();
  static const fast = Duration(milliseconds: 200);
  static const base = Duration(milliseconds: 320);
  static const slow = Duration(milliseconds: 480);
  static const breath = Duration(milliseconds: 5500); // ambient breathing loop

  /// Sheet / hero spring — SwiftUI `spring(response: 0.42, dampingFraction: 0.82)`:
  /// settles with a single gentle overshoot, no bounce.
  static const sheet = Duration(milliseconds: 420);
  static const sheetDamping = 0.82;

  /// List entrance stagger — fade + 8pt rise, this delay per item, cap ~8 items.
  static const stagger = Duration(milliseconds: 50);

  static const springCurve = Curves.easeOutBack;
  static const standard = Curves.easeInOutCubic;
  static const gentleOvershoot = Cubic(0.2, 0.9, 0.3, 1.06); // one soft overshoot

  /// True when the user has enabled Reduce Motion. Gate every non-essential
  /// animation on this so the whole app honors a11y for free.
  static bool reduced(BuildContext c) =>
      MediaQuery.maybeOf(c)?.disableAnimations ?? false;

  /// Collapse a duration to zero when Reduce Motion is on.
  static Duration duration(BuildContext c, Duration d) =>
      reduced(c) ? Duration.zero : d;
}
