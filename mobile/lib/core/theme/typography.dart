import 'package:flutter/cupertino.dart';
import 'tokens.dart';

/// SF Pro type scale. On iOS the default family resolves to San Francisco.
/// We reference '.SF Pro Text' / '.SF Pro Display' which the OS maps to SF;
/// on non-iOS (Android/dev preview) it gracefully falls back to the platform font.
class QType {
  QType._();

  static const _display = '.SF Pro Display';
  static const _text = '.SF Pro Text';

  static const largeTitle = TextStyle(
    fontFamily: _display,
    fontSize: 34,
    fontWeight: FontWeight.w700,
    letterSpacing: 0.37,
    color: QColors.label,
  );

  static const title1 = TextStyle(
    fontFamily: _display,
    fontSize: 28,
    fontWeight: FontWeight.w700,
    color: QColors.label,
  );

  static const title2 = TextStyle(
    fontFamily: _display,
    fontSize: 22,
    fontWeight: FontWeight.w700,
    color: QColors.label,
  );

  static const title3 = TextStyle(
    fontFamily: _display,
    fontSize: 20,
    fontWeight: FontWeight.w600,
    color: QColors.label,
  );

  static const headline = TextStyle(
    fontFamily: _text,
    fontSize: 17,
    fontWeight: FontWeight.w600,
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

  /// Uppercase inset-group section header.
  static const sectionHeader = TextStyle(
    fontFamily: _text,
    fontSize: 13,
    fontWeight: FontWeight.w400,
    letterSpacing: -0.08,
    color: QColors.labelSecondary,
  );
}
