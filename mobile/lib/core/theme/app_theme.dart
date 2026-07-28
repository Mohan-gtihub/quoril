import 'package:flutter/cupertino.dart';
import 'tokens.dart';
import 'typography.dart';

/// Root Cupertino theme for Quoril.
class QTheme {
  QTheme._();

  static CupertinoThemeData light = const CupertinoThemeData(
    brightness: Brightness.light,
    primaryColor: QColors.tint,
    scaffoldBackgroundColor: QColors.bg,
    barBackgroundColor: Color(0xF2F9F9F9),
    textTheme: CupertinoTextThemeData(
      primaryColor: QColors.tint,
      textStyle: QType.body,
      navLargeTitleTextStyle: QType.largeTitle,
      navTitleTextStyle: QType.headline,
      tabLabelTextStyle: QType.caption,
    ),
  );

  static CupertinoThemeData dark = const CupertinoThemeData(
    brightness: Brightness.dark,
    primaryColor: QColors.tint,
    scaffoldBackgroundColor: QColors.bg,
    barBackgroundColor: Color(0xF21D1D1D),
    textTheme: CupertinoTextThemeData(
      primaryColor: QColors.tint,
      textStyle: QType.body,
      navLargeTitleTextStyle: QType.largeTitle,
      navTitleTextStyle: QType.headline,
      tabLabelTextStyle: QType.caption,
    ),
  );

  /// Resolve theme for the current platform brightness.
  static CupertinoThemeData of(BuildContext context) {
    final b = MediaQuery.maybeOf(context)?.platformBrightness ?? Brightness.light;
    return b == Brightness.dark ? dark : light;
  }
}
