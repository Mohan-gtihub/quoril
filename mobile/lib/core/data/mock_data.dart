import 'package:flutter/cupertino.dart';
import '../models/models.dart';
import '../theme/tokens.dart';

/// Static mock data powering the v1 UI (backend wiring is a later phase).
class Mock {
  Mock._();

  static final workspaces = <Workspace>[
    Workspace(id: 'w1', name: 'Design Sprint', color: QColors.workspacePalette[0], taskCount: 6),
    Workspace(id: 'w2', name: 'Personal', color: QColors.workspacePalette[3], taskCount: 3),
    Workspace(id: 'w3', name: 'Quoril App', color: QColors.workspacePalette[5], taskCount: 9),
  ];

  static List<Task> tasks() => [
        Task(
          id: 't1',
          title: 'Ship the design spec',
          bucket: TaskBucket.today,
          priority: Priority.high,
          estimateMinutes: 25,
          spentSeconds: 18 * 60,
          subtasks: [
            Subtask(id: 's1', title: 'Draft outline', done: true),
            Subtask(id: 's2', title: 'Add wireframes'),
          ],
        ),
        Task(id: 't2', title: 'Review the PR', bucket: TaskBucket.today, priority: Priority.critical),
        Task(
          id: 't3',
          title: 'Wire Supabase auth',
          bucket: TaskBucket.week,
          priority: Priority.medium,
          estimateMinutes: 45,
          subtasks: [Subtask(id: 's3', title: 'Deep link callback'), Subtask(id: 's4', title: 'Token refresh')],
        ),
        Task(id: 't4', title: 'Sketch the icon set', bucket: TaskBucket.week, priority: Priority.low),
        Task(id: 't5', title: 'Research Screen Time API', bucket: TaskBucket.backlog, priority: Priority.medium),
        Task(id: 't6', title: 'Set up CI', bucket: TaskBucket.backlog, priority: Priority.low),
        Task(id: 't7', title: 'Finalize color tokens', bucket: TaskBucket.done, priority: Priority.medium, done: true),
      ];

  static final recentSessions = <FocusSession>[
    FocusSession(id: 'f1', type: SessionType.deepWork, durationSeconds: 52 * 60, taskTitle: 'Design spec', saves: 3),
    FocusSession(id: 'f2', type: SessionType.pomodoro, durationSeconds: 25 * 60, taskTitle: 'Review PR', saves: 1),
  ];

  static final topApps = <AppUsage>[
    AppUsage(name: 'Instagram', icon: CupertinoIcons.camera, minutes: 54, distracting: true),
    AppUsage(name: 'YouTube', icon: CupertinoIcons.play_rectangle, minutes: 38, distracting: true),
    AppUsage(name: 'TikTok', icon: CupertinoIcons.music_note, minutes: 15, distracting: true),
    AppUsage(name: 'Xcode', icon: CupertinoIcons.hammer, minutes: 132),
    AppUsage(name: 'Figma', icon: CupertinoIcons.pencil_outline, minutes: 88),
  ];

  static final watchedApps = <WatchedApp>[
    WatchedApp(name: 'Instagram', icon: CupertinoIcons.camera, graceSeconds: 120),
    WatchedApp(name: 'TikTok', icon: CupertinoIcons.music_note, graceSeconds: 60),
    WatchedApp(name: 'YouTube', icon: CupertinoIcons.play_rectangle, graceSeconds: 300),
  ];

  static List<Intervention> interventions() {
    final now = DateTime(2026, 7, 29, 15, 30);
    return [
      Intervention(id: 'i1', app: 'Instagram', level: InterventionLevel.nudge, outcome: InterventionOutcome.returned, at: now.subtract(const Duration(minutes: 20))),
      Intervention(id: 'i2', app: 'YouTube', level: InterventionLevel.alert, outcome: InterventionOutcome.snoozed, at: now.subtract(const Duration(hours: 1))),
      Intervention(id: 'i3', app: 'TikTok', level: InterventionLevel.friction, outcome: InterventionOutcome.returned, at: now.subtract(const Duration(hours: 2))),
      Intervention(id: 'i4', app: 'Instagram', level: InterventionLevel.nudge, outcome: InterventionOutcome.ignored, at: now.subtract(const Duration(hours: 3))),
    ];
  }

  // Headline stats
  static const streakDays = 6;
  static const savesToday = 5;
  static const focusTodaySeconds = 2 * 3600 + 10 * 60;
  static const lostToDistractionSeconds = 1 * 3600 + 47 * 60;
  static const savedSeconds = 31 * 60;
  static const productivityScore = 78;

  /// 24-hour usage heatmap (minutes active per hour).
  static const hourly = <int>[0, 0, 0, 0, 0, 0, 5, 12, 34, 48, 52, 40, 30, 45, 50, 38, 42, 28, 20, 33, 25, 15, 8, 2];

  /// 7-day focus trend (minutes).
  static const weekTrend = <int>[120, 180, 90, 240, 200, 160, 252];
}
