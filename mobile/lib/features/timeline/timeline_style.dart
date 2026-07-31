import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart' show Icons;

import '../../core/models/models.dart';

/// Shared visual language for the Structured-style planner (timeline, week view,
/// create flow, month picker) so colors + icons stay consistent everywhere.

/// A warm, varied palette (stable per task id).
const kTimelinePalette = <Color>[
  Color(0xFFEF8E80), // coral
  Color(0xFF2E4A6B), // navy
  Color(0xFF8E2E52), // maroon
  Color(0xFF7DB46C), // green
  Color(0xFFE8A13A), // amber
  Color(0xFF4E7CB0), // blue
  Color(0xFF9B6BB0), // purple
  Color(0xFF2F8F8A), // teal
];

Color timelineColorFor(Task t) => kTimelinePalette[t.id.hashCode.abs() % kTimelinePalette.length];

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

String hhmm(int minutesOfDay) {
  final h = (minutesOfDay ~/ 60) % 24;
  final m = minutesOfDay % 60;
  return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';
}
