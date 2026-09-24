import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart' show Icons;

import '../../core/models/models.dart';

/// Shared visual language for the Structured-style planner (timeline, week view,
/// create flow, month picker) so colors + icons stay consistent everywhere.

/// A warm, varied planner palette — light/dark adaptive pairs so glyphs keep
/// contrast in dark mode. Each swatch is dark enough in *both* modes that a
/// white glyph clears WCAG-AA on it; the dark-mode value is lifted/desaturated
/// so blocks read on a black canvas without glowing. Stable per task id.
const kTimelinePalette = <CupertinoDynamicColor>[
  CupertinoDynamicColor.withBrightness(
    color: Color(0xFFD9604F), darkColor: Color(0xFFE07567)), // coral
  CupertinoDynamicColor.withBrightness(
    color: Color(0xFF2E4A6B), darkColor: Color(0xFF5E82AE)), // navy
  CupertinoDynamicColor.withBrightness(
    color: Color(0xFF9A2E58), darkColor: Color(0xFFC65C86)), // maroon
  CupertinoDynamicColor.withBrightness(
    color: Color(0xFF3F8F4E), darkColor: Color(0xFF5FB56F)), // green
  CupertinoDynamicColor.withBrightness(
    color: Color(0xFFC77D1A), darkColor: Color(0xFFDDA23F)), // amber
  CupertinoDynamicColor.withBrightness(
    color: Color(0xFF3A6EA8), darkColor: Color(0xFF6197D0)), // blue
  CupertinoDynamicColor.withBrightness(
    color: Color(0xFF7E4F9B), darkColor: Color(0xFFA379C0)), // purple
  CupertinoDynamicColor.withBrightness(
    color: Color(0xFF1F8480), darkColor: Color(0xFF3FADA7)), // teal
];

/// The dynamic swatch for a task (resolve against context before painting).
CupertinoDynamicColor timelineColorFor(Task t) =>
    kTimelinePalette[t.id.hashCode.abs() % kTimelinePalette.length];

/// Convenience: the resolved (mode-correct) color for a task.
Color timelineColorResolved(Task t, BuildContext context) =>
    timelineColorFor(t).resolveFrom(context);

/// Pick a glyph from the title keywords (Structured-style category icons).
IconData timelineIconFor(String title) {
  final s = title.toLowerCase();
  bool has(List<String> k) => k.any(s.contains);
  if (has(['call', 'mum', 'mom', 'phone', 'ring'])) return Icons.call;
  if (has(['rise', 'wake', 'morning', 'alarm'])) return Icons.alarm;
  if (has(['yoga', 'workout', 'gym', 'exercise', 'stretch', 'meditate'])) return Icons.self_improvement;
  if (has(['shower', 'bath', 'wash'])) return Icons.shower;
  if (has(['coffee', 'tea', 'breakfast', 'brunch'])) return Icons.local_cafe;
  if (has(['lunch', 'dinner', 'eat', 'meal', 'food'])) return Icons.restaurant;
  if (has(['bike', 'cycle', 'commute', 'ride'])) return Icons.directions_bike;
  if (has(['walk'])) return Icons.directions_walk;
  if (has(['office', 'work', 'standup'])) return Icons.work;
  if (has(['meeting', 'sync', 'team', 'client'])) return Icons.groups;
  if (has(['dentist', 'doctor', 'clinic', 'health'])) return Icons.medical_services;
  if (has(['vacation', 'travel', 'trip', 'flight', 'book va'])) return Icons.beach_access;
  if (has(['read', 'book'])) return Icons.menu_book;
  if (has(['write', 'design', 'draft', 'sketch'])) return Icons.edit;
  if (has(['review', 'pr'])) return Icons.rate_review;
  if (has(['email', 'mail', 'inbox'])) return Icons.mail;
  if (has(['code', 'build', 'ship', 'deploy', 'ci', 'dev'])) return Icons.code;
  if (has(['clean', 'chore', 'tidy'])) return Icons.cleaning_services;
  if (has(['chart', 'report', 'stats', 'analytics'])) return Icons.bar_chart;
  if (has(['structure', 'plan', 'schedule'])) return Icons.check_circle;
  return Icons.event_note;
}

/// Format a minute-of-day respecting the user's 12/24h setting.
/// Never forces 24h; uses the platform's `alwaysUse24HourFormat`.
String clockLabel(BuildContext context, int minutesOfDay) {
  final use24 = MediaQuery.maybeOf(context)?.alwaysUse24HourFormat ?? false;
  final h24 = (minutesOfDay ~/ 60) % 24;
  final m = minutesOfDay % 60;
  final mm = m.toString().padLeft(2, '0');
  if (use24) return '${h24.toString().padLeft(2, '0')}:$mm';
  final period = h24 < 12 ? 'AM' : 'PM';
  var h12 = h24 % 12;
  if (h12 == 0) h12 = 12;
  return '$h12:$mm $period';
}

/// 24h `HH:MM` for cases where a compact fixed-width string is needed.
String hhmm(int minutesOfDay) {
  final h = (minutesOfDay ~/ 60) % 24;
  final m = minutesOfDay % 60;
  return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';
}

/// A short human duration ("45m", "1h", "1h 30m").
String durationLabel(int minutes) {
  final h = minutes ~/ 60, mm = minutes % 60;
  if (h > 0) return mm > 0 ? '${h}h ${mm}m' : '${h}h';
  return '${minutes}m';
}

/// Shared rail / marker geometry so Home and the Timeline feel like one surface.
class TimelineMetrics {
  TimelineMetrics._();
  static const double railWidth = 52; // time-label gutter
  static const double markerColumn = 46; // marker + spine column
  static const double markerSize = 44; // resting marker diameter
  static const double markerActive = 88; // in-progress expanded height
  static const double spineWidth = 5;

  // ---- Ember Editorial hour-grid geometry (day + week time canvases) --------
  /// Height of one hour row in the day/week grid (~64pt, contract spec).
  static const double hourRow = 64;

  /// Pixels per minute derived from [hourRow]. Blocks and the now-line all
  /// position off this so the whole canvas stays coherent.
  static const double pxPerMin = hourRow / 60;

  /// Time-block card radius (contract: 14).
  static const double blockRadius = 14;

  /// Left category accent bar width on a time-block (contract: 3pt).
  static const double accentBar = 3;
}
