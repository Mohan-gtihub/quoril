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

  static const _team = [
    Assignee(name: 'Olivia Reed', color: Color(0xFFE8A13A)),
    Assignee(name: 'Marcus Kane', color: Color(0xFFDD4B39)),
    Assignee(name: 'Priya Shah', color: Color(0xFF7B61FF)),
  ];

  /// Seed calendar events anchored to *today* so the Calendar screen always has
  /// live-looking data regardless of the real date. Times are on the local day.
  static List<CalendarEvent> events() {
    final now = DateTime.now();
    DateTime at(int dayOffset, int h, int m) {
      final d = DateTime(now.year, now.month, now.day + dayOffset);
      return DateTime(d.year, d.month, d.day, h, m);
    }

    return [
      CalendarEvent(
        id: 'e1',
        title: 'Campaign Strategy Call',
        start: at(0, 9, 24),
        finish: at(0, 12, 41),
        color: const Color(0xFFF37A1E),
        assignees: const [
          Assignee(name: 'Ava Reyes', color: Color(0xFFF37A1E)),
          Assignee(name: 'Noah Kim', color: Color(0xFF2E86D8)),
          Assignee(name: 'Mia Chen', color: Color(0xFF37E6C4)),
        ],
      ),
      CalendarEvent(
        id: 'e2',
        title: 'Client Presentation',
        start: at(0, 14, 0),
        finish: at(0, 15, 30),
        color: const Color(0xFFFF5E8A),
        assignees: const [
          Assignee(name: 'Liam Ford', color: Color(0xFFFF5E8A)),
          Assignee(name: 'Zoe Park', color: Color(0xFF7E57C2)),
        ],
      ),
      CalendarEvent(
        id: 'e3',
        title: 'Design Review',
        start: at(1, 10, 0),
        finish: at(1, 11, 0),
        color: const Color(0xFF7B61FF),
        assignees: _team,
      ),
      CalendarEvent(
        id: 'e4',
        title: 'Sprint Planning',
        start: at(2, 9, 0),
        finish: at(2, 10, 30),
        color: const Color(0xFF2E86D8),
        assignees: const [
          Assignee(name: 'Marcus Kane', color: Color(0xFFDD4B39)),
          Assignee(name: 'Priya Shah', color: Color(0xFF7B61FF)),
        ],
      ),
      CalendarEvent(
        id: 'e5',
        title: '1:1 with Manager',
        start: at(-1, 16, 0),
        finish: at(-1, 16, 30),
        color: const Color(0xFF37E6C4),
        assignees: const [
          Assignee(name: 'Olivia Reed', color: Color(0xFFE8A13A)),
        ],
      ),
      CalendarEvent(
        id: 'e6',
        title: 'Quarterly Roadmap',
        start: at(4, 13, 0),
        finish: at(4, 14, 30),
        color: const Color(0xFFF37A1E),
        assignees: _team,
      ),
    ];
  }

  static List<Task> tasks() => [
        Task(
          id: 't1',
          title: 'Meeting with the team',
          bucket: TaskBucket.today,
          priority: Priority.high,
          estimateMinutes: 25,
          spentSeconds: 18 * 60,
          startLabel: '08:02',
          finishLabel: '10:39',
          assignees: _team,
          subtasks: [
            Subtask(id: 's1', title: 'Draft outline', done: true),
            Subtask(id: 's2', title: 'Add wireframes'),
          ],
        ),
        Task(
          id: 't2',
          title: 'First Screen Design',
          bucket: TaskBucket.today,
          priority: Priority.critical,
          startLabel: '11:00',
          finishLabel: '13:30',
          assignees: [_team[0], _team[1]],
        ),
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
