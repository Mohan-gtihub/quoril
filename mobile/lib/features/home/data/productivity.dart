import 'dart:math';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/data/providers.dart';

/// A single day's productivity roll-up (focus time + tasks completed).
class DayStat {
  final DateTime date;
  final int focusSeconds;
  final int tasksDone;
  const DayStat({required this.date, required this.focusSeconds, required this.tasksDone});
}

/// User-configurable productivity targets, persisted via shared_preferences.
class ProductivityGoals {
  final int focusHoursGoal;
  final int dailyTaskGoal;
  const ProductivityGoals({this.focusHoursGoal = 4, this.dailyTaskGoal = 5});

  ProductivityGoals copyWith({int? focusHoursGoal, int? dailyTaskGoal}) => ProductivityGoals(
        focusHoursGoal: focusHoursGoal ?? this.focusHoursGoal,
        dailyTaskGoal: dailyTaskGoal ?? this.dailyTaskGoal,
      );
}

const _kFocusHoursKey = 'q_goal_focus_hours';
const _kDailyTasksKey = 'q_goal_daily_tasks';

/// Persisted productivity goals. Loads stored values on build; writes back on set.
final goalsProvider = NotifierProvider<GoalsNotifier, ProductivityGoals>(GoalsNotifier.new);

class GoalsNotifier extends Notifier<ProductivityGoals> {
  @override
  ProductivityGoals build() {
    _load();
    return const ProductivityGoals();
  }

  Future<void> _load() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final focus = prefs.getInt(_kFocusHoursKey);
      final tasks = prefs.getInt(_kDailyTasksKey);
      if (focus != null || tasks != null) {
        state = state.copyWith(focusHoursGoal: focus, dailyTaskGoal: tasks);
      }
    } catch (_) {}
  }

  Future<void> setFocusHours(int h) async {
    state = state.copyWith(focusHoursGoal: h);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_kFocusHoursKey, h);
    } catch (_) {}
  }

  Future<void> setDailyTasks(int n) async {
    state = state.copyWith(dailyTaskGoal: n);
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_kDailyTasksKey, n);
    } catch (_) {}
  }
}

/// Last 21 days of productivity stats — real when signed in, mock otherwise/on error.
/// Exactly 21 entries, ascending, last element = today.
final dailyStatsProvider = FutureProvider<List<DayStat>>((ref) async {
  ref.watch(authStateProvider);
  final api = ref.watch(apiProvider);
  if (!api.signedIn) return mockDailyStats();
  try {
    final stats = await api.fetchDailyStats(days: 21);
    return stats.isEmpty ? mockDailyStats() : stats;
  } catch (_) {
    return mockDailyStats();
  }
});

/// 21 plausible days ending today, with varied focus (0..5h) and tasks (0..7).
List<DayStat> mockDailyStats() {
  final today = DateTime.now();
  final base = DateTime(today.year, today.month, today.day);
  final rng = Random(base.millisecondsSinceEpoch ~/ 86400000);
  return [
    for (var i = 20; i >= 0; i--)
      () {
        final day = base.subtract(Duration(days: i));
        final weekend = day.weekday == DateTime.saturday || day.weekday == DateTime.sunday;
        // Weekends lean lighter; weekdays fuller.
        final maxFocus = weekend ? 2 * 3600 : 5 * 3600;
        final focus = rng.nextInt(maxFocus + 1);
        final tasks = weekend ? rng.nextInt(4) : rng.nextInt(8);
        return DayStat(date: day, focusSeconds: focus, tasksDone: tasks);
      }(),
  ];
}
