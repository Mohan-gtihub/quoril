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

  // Interactive tint — pure Apple systemBlue
  static const tint = CupertinoColors.systemBlue;

  // Functional / state accents (semantic, not brand)
  static const focus = CupertinoColors.systemBlue; // active session
  static const breakColor = CupertinoColors.systemOrange; // pomodoro break
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
  static const row = 12.0;
  static const card = 12.0;
  static const taskCard = 16.0; // Blitzit-style elevated task card
  static const glass = 20.0;
  static const capsule = 999.0;
}

/// The elevated surface used for task cards on a grouped background —
/// layering (not shadows) provides depth, iOS-native.
class QElevation {
  QElevation._();
  static const fab = 56.0;
  static const listBadge = 22.0;
  /// Single subtle shadow tier for the FAB / floating controls only.
  static List<BoxShadow> floating(BuildContext c) => [
        BoxShadow(
          color: CupertinoColors.black.resolveFrom(c).withValues(alpha: 0.18),
          blurRadius: 16,
          offset: const Offset(0, 6),
        ),
      ];
}

/// Motion — spring physics, honor Reduce Motion at call sites.
class QMotion {
  QMotion._();
  static const fast = Duration(milliseconds: 200);
  static const base = Duration(milliseconds: 320);
  static const slow = Duration(milliseconds: 480);
  static const springCurve = Curves.easeOutBack;
  static const standard = Curves.easeInOutCubic;
}
