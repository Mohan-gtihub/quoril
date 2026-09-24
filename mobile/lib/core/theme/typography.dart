import 'package:flutter/cupertino.dart';
import 'tokens.dart';

/// SF Pro type scale. On iOS the default family resolves to San Francisco.
/// We reference '.SF Pro Text' / '.SF Pro Display' which the OS maps to SF;
/// on non-iOS (Android/dev preview) it gracefully falls back to the platform font.
class QType {
  QType._();

  static const _display = '.SF Pro Display';
  static const _text = '.SF Pro Text';

  /// EMBER EDITORIAL type system. The signature is *size contrast* + tightening
  /// tracking as size grows (editorial feel), and loosening it on small caps.
  /// SF Pro Display ≥20pt with negative tracking; SF Pro Text <20pt at default.

  /// Marquee hero — the one oversized editorial moment per screen (greeting,
  /// "Today", a section a screen is *about*). Use once; never for a row label.
  static const hero = TextStyle(
    fontFamily: _display,
    fontSize: 40,
    fontWeight: FontWeight.w800,
    letterSpacing: -0.8,
    height: 1.05,
    color: QColors.label,
  );

  static const largeTitle = TextStyle(
    fontFamily: _display,
    fontSize: 34,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.6,
    height: 1.08,
    color: QColors.label,
  );

  static const title1 = TextStyle(
    fontFamily: _display,
    fontSize: 28,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.4,
    height: 1.1,
    color: QColors.label,
  );

  static const title2 = TextStyle(
    fontFamily: _display,
    fontSize: 22,
    fontWeight: FontWeight.w700,
    letterSpacing: -0.3,
    height: 1.12,
    color: QColors.label,
  );

  static const title3 = TextStyle(
    fontFamily: _display,
    fontSize: 20,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
    height: 1.15,
    color: QColors.label,
  );

  static const headline = TextStyle(
    fontFamily: _text,
    fontSize: 17,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.2,
    color: QColors.label,
  );

  static const body = TextStyle(
    fontFamily: _text,
    fontSize: 17,
    fontWeight: FontWeight.w400,
    color: QColors.label,
  );

  static const callout = TextStyle(
    fontFamily: _text,
    fontSize: 16,
    fontWeight: FontWeight.w400,
    color: QColors.label,
  );

  static const subhead = TextStyle(
    fontFamily: _text,
    fontSize: 15,
    fontWeight: FontWeight.w400,
    color: QColors.labelSecondary,
  );

  static const footnote = TextStyle(
    fontFamily: _text,
    fontSize: 13,
    fontWeight: FontWeight.w400,
    color: QColors.labelSecondary,
  );

  static const caption = TextStyle(
    fontFamily: _text,
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: QColors.labelSecondary,
  );

  /// Big monospaced timer numerals — no layout jitter between frames.
  static const timer = TextStyle(
    fontFamily: _display,
    fontSize: 76,
    fontWeight: FontWeight.w600,
    fontFeatures: [FontFeature.tabularFigures()],
    color: QColors.label,
  );

  /// Uppercase inset-group section header. Positive tracking so all-caps text
  /// breathes (negative tracking on caps reads cramped / "not quite Apple").
  static const sectionHeader = TextStyle(
    fontFamily: _text,
    fontSize: 13,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.4,
    color: QColors.labelSecondary,
  );

  /// The one canonical uppercase eyebrow label (hero "TODAY'S FOCUS", editor
  /// group titles, greeting kicker). Feed it normal-case strings — callers must
  /// not hand-roll their own letterSpacing anymore.
  static const eyebrow = TextStyle(
    fontFamily: _text,
    fontSize: 12,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.8,
    color: QColors.labelSecondary,
  );

  /// Emphasized variants (fill the gaps that call sites used to hand-roll with
  /// .copyWith(fontWeight: …)).
  static const title2Emphasized = TextStyle(
    fontFamily: _display,
    fontSize: 22,
    fontWeight: FontWeight.w800,
    color: QColors.label,
  );

  static const title3Emphasized = TextStyle(
    fontFamily: _display,
    fontSize: 20,
    fontWeight: FontWeight.w700,
    color: QColors.label,
  );

  static const footnoteEmphasized = TextStyle(
    fontFamily: _text,
    fontSize: 13,
    fontWeight: FontWeight.w600,
    color: QColors.labelSecondary,
  );

  static const caption2 = TextStyle(
    fontFamily: _text,
    fontSize: 11,
    fontWeight: FontWeight.w400,
    color: QColors.labelSecondary,
  );

  /// Metadata / value label — small text needs *positive* tracking + medium
  /// weight to stay legible (trailing row values, chip counts, time stamps).
  static const meta = TextStyle(
    fontFamily: _text,
    fontSize: 13,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.2,
    color: QColors.labelSecondary,
  );
}
