import 'package:flutter/cupertino.dart';
import '../theme/tokens.dart';

/// Domain models shared across all features. Kept plain + immutable-ish.

enum Priority { low, medium, high, critical }

extension PriorityX on Priority {
  String get label => switch (this) {
        Priority.low => 'Low',
        Priority.medium => 'Med',
        Priority.high => 'High',
        Priority.critical => '!',
      };
  Color get color => switch (this) {
        Priority.low => QColors.prioLow,
        Priority.medium => QColors.prioMed,
        Priority.high => QColors.prioHigh,
        Priority.critical => QColors.prioHigh,
      };
}

enum TaskBucket { today, week, backlog, done }

extension TaskBucketX on TaskBucket {
  String get label => switch (this) {
        TaskBucket.today => 'Today',
        TaskBucket.week => 'Week',
        TaskBucket.backlog => 'Backlog',
        TaskBucket.done => 'Done',
      };
}

class Subtask {
  Subtask({required this.id, required this.title, this.done = false});
  final String id;
  String title;
  bool done;

  factory Subtask.fromDb(Map<String, dynamic> r) => Subtask(
        id: '${r['id']}',
        title: '${r['title'] ?? ''}',
        done: r['done'] == true,
      );
}

/// Parse a stored color (hex string like "#RRGGBB" or "RRGGBB"); fall back to
/// a palette swatch chosen by hash so every workspace still gets a stable color.
Color parseColor(String? raw, {int seed = 0}) {
  if (raw != null && raw.trim().isNotEmpty) {
    var h = raw.trim().replaceAll('#', '');
    if (h.length == 6) h = 'FF$h';
    final v = int.tryParse(h, radix: 16);
    if (v != null) return Color(v);
  }
  return QColors.workspacePalette[seed.abs() % QColors.workspacePalette.length];
}

/// A person assigned to a task — rendered as a colored initials avatar in the
/// stacked avatar cluster on task/event cards.
class Assignee {
  const Assignee({required this.name, required this.color});
  final String name;
  final Color color;

  String get initials {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
  }
}

class Task {
  Task({
    required this.id,
    required this.title,
    this.bucket = TaskBucket.today,
    this.priority = Priority.medium,
    this.estimateMinutes,
    this.spentSeconds = 0,
    this.dueAt,
    this.subtasks = const [],
    this.done = false,
    this.workspaceId,
    this.listId,
    this.notes,
    this.startLabel,
    this.finishLabel,
    this.assignees = const [],
  });

  final String id;
  String title;
  TaskBucket bucket;
  Priority priority;
  int? estimateMinutes;
  int spentSeconds;
  DateTime? dueAt;
  List<Subtask> subtasks;
  bool done;
  String? workspaceId;
  String? listId;
  String? notes;

  /// Reference-style scheduled window (e.g. "08:02" / "10:39") + avatar cluster.
  String? startLabel;
  String? finishLabel;
  List<Assignee> assignees;

  int get subtaskDone => subtasks.where((s) => s.done).length;

  /// Derive the display bucket from DB status + due date.
  static TaskBucket bucketFrom(String? status, DateTime? dueAt, {DateTime? now}) {
    if (status == 'done') return TaskBucket.done;
    if (dueAt == null) return TaskBucket.backlog;
    final n = now ?? DateTime.now();
    final today = DateTime(n.year, n.month, n.day);
    final due = DateTime(dueAt.year, dueAt.month, dueAt.day);
    final diff = due.difference(today).inDays;
    if (diff <= 0) return TaskBucket.today;
    if (diff <= 7) return TaskBucket.week;
    return TaskBucket.backlog;
  }

  static Priority priorityFrom(String? p) => switch (p) {
        'low' => Priority.low,
        'high' => Priority.high,
        'critical' => Priority.critical,
        _ => Priority.medium,
      };

  static String priorityToDb(Priority p) => switch (p) {
        Priority.low => 'low',
        Priority.medium => 'medium',
        Priority.high => 'high',
        Priority.critical => 'critical',
      };

  factory Task.fromDb(Map<String, dynamic> r, {List<Subtask> subs = const []}) {
    final due = r['due_at'] != null ? DateTime.tryParse('${r['due_at']}') : null;
    return Task(
      id: '${r['id']}',
      title: '${r['title'] ?? ''}',
      bucket: bucketFrom('${r['status']}', due),
      priority: priorityFrom('${r['priority']}'),
      estimateMinutes: (r['estimate_m'] as num?)?.toInt(),
      spentSeconds: (r['spent_s'] as num?)?.toInt() ?? 0,
      dueAt: due,
      subtasks: subs,
      done: '${r['status']}' == 'done',
      listId: r['list_id']?.toString(),
      notes: r['description']?.toString(),
    );
  }
}

enum SessionType { regular, deepWork, quickSprint, pomodoro }

extension SessionTypeX on SessionType {
  String get label => switch (this) {
        SessionType.regular => 'Regular',
        SessionType.deepWork => 'Deep Work',
        SessionType.quickSprint => 'Quick Sprint',
        SessionType.pomodoro => 'Pomodoro',
      };
  IconData get icon => switch (this) {
        SessionType.regular => CupertinoIcons.timer,
        SessionType.deepWork => CupertinoIcons.circle_grid_hex,
        SessionType.quickSprint => CupertinoIcons.bolt_fill,
        SessionType.pomodoro => CupertinoIcons.stopwatch,
      };
}

class FocusSession {
  FocusSession({
    required this.id,
    required this.type,
    required this.durationSeconds,
    this.taskTitle,
    this.saves = 0,
    this.startedAt,
  });
  final String id;
  final SessionType type;
  final int durationSeconds;
  final String? taskTitle;
  final int saves;
  final DateTime? startedAt;
}

class Workspace {
  Workspace({required this.id, required this.name, required this.color, this.taskCount = 0});
  final String id;
  String name;
  Color color;
  int taskCount;

  /// Two-letter badge shown in the stacked list selector.
  String get badge {
    final t = name.trim();
    if (t.isEmpty) return '?';
    return t.substring(0, 1).toUpperCase();
  }

  factory Workspace.fromDb(Map<String, dynamic> r, {int index = 0, int taskCount = 0}) => Workspace(
        id: '${r['id']}',
        name: '${r['name'] ?? 'Workspace'}',
        color: parseColor(r['color']?.toString(), seed: index),
        taskCount: taskCount,
      );
}

/// A tracked app + its usage.
class AppUsage {
  AppUsage({
    required this.name,
    required this.icon,
    required this.minutes,
    this.distracting = false,
  });
  final String name;
  final IconData icon;
  final int minutes;
  final bool distracting;
}

enum InterventionLevel { nudge, alert, friction }

enum InterventionOutcome { returned, snoozed, ignored }

class Intervention {
  Intervention({
    required this.id,
    required this.app,
    required this.level,
    required this.outcome,
    required this.at,
  });
  final String id;
  final String app;
  final InterventionLevel level;
  final InterventionOutcome outcome;
  final DateTime at;
}

/// A configured watched (distraction) app.
class WatchedApp {
  WatchedApp({
    required this.name,
    required this.icon,
    this.graceSeconds = 120,
  });
  final String name;
  final IconData icon;
  int graceSeconds;
}

enum NudgeIntensity { gentle, firm, toughLove }
