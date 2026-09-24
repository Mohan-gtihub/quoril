import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/editorial.dart';
import '../home/sheets/task_editor_sheet.dart';
import 'create_task_sheet.dart';
import 'month_picker_sheet.dart';
import 'timeline_components.dart';
import 'timeline_style.dart';
import 'week_view.dart';

/// A faithful Structured-style day planner: a week-strip date header, a row of
/// "Anytime" circular icon tiles, and a connected timeline where each task is a
/// big colored icon marker with a title card and a completion ring — the
/// in-progress task expands into a tall pill. Wired to real tasks.
class TimelineScreen extends ConsumerStatefulWidget {
  const TimelineScreen({super.key});

  @override
  ConsumerState<TimelineScreen> createState() => _TimelineScreenState();
}


class _TimelineScreenState extends ConsumerState<TimelineScreen> {
  DateTime _selected = _todayMidnight();
  bool _week = false;

  static DateTime _todayMidnight() {
    final n = DateTime.now();
    return DateTime(n.year, n.month, n.day);
  }

  bool _isToday(DateTime d) {
    final n = DateTime.now();
    return d.year == n.year && d.month == n.month && d.day == n.day;
  }

  bool _sameDay(DateTime? a, DateTime b) =>
      a != null && a.year == b.year && a.month == b.month && a.day == b.day;

  DateTime? _dayOf(Task t) {
    final due = t.dueAt;
    if (due != null) return DateTime(due.year, due.month, due.day);
    final n = DateTime.now();
    return switch (t.bucket) {
      TaskBucket.today => DateTime(n.year, n.month, n.day),
      _ => null,
    };
  }

  int? _startMinutes(Task t) {
    final s = t.startLabel;
    if (s != null) {
      final p = s.split(':');
      if (p.length == 2) {
        final h = int.tryParse(p[0]);
        final m = int.tryParse(p[1]);
        if (h != null && m != null) return h * 60 + m;
      }
    }
    final due = t.dueAt;
    if (due != null) {
      final mins = due.hour * 60 + due.minute;
      if (mins != 0 && mins != 23 * 60 + 59) return mins;
    }
    return null;
  }

  int _dur(Task t) => (t.estimateMinutes ?? 30).clamp(15, 600);

  List<Task> _tasksOn(List<Task> all, DateTime day) =>
      all.where((t) => _sameDay(_dayOf(t), day)).toList();

  @override
  Widget build(BuildContext context) {
    final all = ref.watch(tasksProvider).valueOrNull ?? const <Task>[];
    final dayTasks = _tasksOn(all, _selected);
    final scheduled = dayTasks.where((t) => _startMinutes(t) != null).toList()
      ..sort((a, b) => _startMinutes(a)!.compareTo(_startMinutes(b)!));
    final anytime = dayTasks.where((t) => _startMinutes(t) == null).toList();

    // Monday-anchored week containing the selected day.
    final weekStart = _selected.subtract(Duration(days: _selected.weekday - 1));

    // Faint calendar-tinted ambient wash so the frosted content cards have
    // something to refract over the otherwise-flat page.
    final brightness =
        MediaQuery.maybeOf(context)?.platformBrightness ?? Brightness.light;
    return CupertinoPageScaffold(
      backgroundColor: const Color(0x00000000),
      child: GradientBackground(
        gradient: QGradients.ambient(
          QSection.calendar.resolveFrom(context),
          brightness,
        ),
        child: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () async {
                      final picked = await showMonthPicker(
                        context,
                        initial: _selected,
                        countFor: (d) => _tasksOn(all, d).length,
                      );
                      if (picked != null) setState(() => _selected = DateTime(picked.year, picked.month, picked.day));
                    },
                    child: _MonthHeader(day: _selected),
                  ),
                ),
                _ViewToggle(
                  week: _week,
                  accent: QSection.calendar,
                  onChanged: (w) => setState(() => _week = w),
                ),
                const SizedBox(width: QSpace.md),
              ],
            ),
            const SizedBox(height: QSpace.xs),
            _WeekStrip(
              weekStart: weekStart,
              selected: _selected,
              today: DateTime.now(),
              countFor: (d) => _tasksOn(all, d).length,
              onSelect: (d) {
                HapticFeedback.selectionClick();
                setState(() => _selected = d);
              },
            ),
            Container(height: 0.5, color: QColors.separator.resolveFrom(context)),
            Expanded(
              child: _week
                  ? WeekView(
                      weekStart: weekStart,
                      selectedDay: _selected,
                      tasks: all,
                      startMinutes: _startMinutes,
                      durationMinutes: _dur,
                      accent: QSection.calendar,
                      onTapTask: (t) => showTaskEditorSheet(context, ref, task: t),
                    )
                  : dayTasks.isEmpty
                  ? PlannerEmptyState(
                      icon: CupertinoIcons.calendar_badge_plus,
                      title: 'Nothing planned',
                      subtitle: 'A clear day. Add your first task to get going.',
                      actionLabel: 'Add first task',
                      accent: QSection.calendar,
                      onAction: () => showCreateTask(context, day: _selected),
                    )
                  : Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        if (anytime.isNotEmpty)
                          _AnytimeStrip(
                            tasks: anytime,
                            onTap: (t) => showTaskEditorSheet(context, ref, task: t),
                          ),
                        Expanded(
                          child: DayTimeline(
                            tasks: scheduled,
                            startMinutes: (t) => _startMinutes(t) ?? 0,
                            durationMin: _dur,
                            isToday: _isToday(_selected),
                            accent: QSection.calendar,
                            onTapTask: (t) => showTaskEditorSheet(context, ref, task: t),
                          ),
                        ),
                      ],
                    ),
            ),
          ],
        ),
      ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// "16. October 2025 ›"
// ---------------------------------------------------------------------------

class _MonthHeader extends StatelessWidget {
  const _MonthHeader({required this.day});
  final DateTime day;

  static const _months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  @override
  Widget build(BuildContext context) {
    // Calendar section accent (grape) — the one color moment in the header.
    final accent = QSection.calendar.resolveFrom(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.sm, QSpace.md, 0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Text('${day.day}. ${_months[day.month - 1]} ',
              style: QType.title1.copyWith(
                fontWeight: FontWeight.w800,
                fontFeatures: const [FontFeature.tabularFigures()],
              )),
          Text('${day.year}',
              style: QType.title1.copyWith(
                fontWeight: FontWeight.w800,
                color: accent,
                fontFeatures: const [FontFeature.tabularFigures()],
              )),
          const SizedBox(width: 4),
          Icon(CupertinoIcons.chevron_right, size: 20, color: accent),
        ],
      ),
    );
  }
}

/// Day / Week segmented toggle. The selected segment's label carries the
/// section accent so the active view reads at a glance.
class _ViewToggle extends StatelessWidget {
  const _ViewToggle({required this.week, required this.accent, required this.onChanged});
  final bool week;
  final Color accent;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final tint = accent.resolveFrom(context);
    Widget seg(String label, bool isWeek) {
      final sel = week == isWeek;
      return GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          HapticFeedback.selectionClick();
          onChanged(isWeek);
        },
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: QSpace.sm, vertical: 5),
          decoration: BoxDecoration(
            color: sel ? QColors.bg.resolveFrom(context) : const Color(0x00000000),
            borderRadius: BorderRadius.circular(QRadius.capsule),
          ),
          child: Text(label,
              style: QType.caption.copyWith(
                fontWeight: FontWeight.w700,
                color: sel ? tint : QColors.labelSecondary.resolveFrom(context),
              )),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: QColors.fill.resolveFrom(context),
        borderRadius: BorderRadius.circular(QRadius.capsule),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: [seg('Day', false), seg('Week', true)]),
    );
  }
}

// ---------------------------------------------------------------------------
// Anytime strip — unscheduled-but-placed tasks above the day canvas
// ---------------------------------------------------------------------------

class _AnytimeStrip extends StatelessWidget {
  const _AnytimeStrip({required this.tasks, required this.onTap});
  final List<Task> tasks;
  final void Function(Task) onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.sm, QSpace.md, QSpace.xs),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const QSectionHeader(label: 'Anytime'),
          Wrap(
            spacing: QSpace.xs,
            runSpacing: QSpace.xs,
            children: [
              for (final t in tasks)
                Builder(builder: (context) {
                  final c = timelineColorFor(t).resolveFrom(context);
                  return GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => onTap(t),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: QSpace.sm, vertical: 6),
                      decoration: BoxDecoration(
                        color: c.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(QRadius.capsule),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(timelineIconFor(t.title), size: 13, color: c),
                          const SizedBox(width: 5),
                          Text(
                            t.title,
                            style: QType.footnote.copyWith(
                              color: QColors.label.resolveFrom(context),
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }),
            ],
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Week strip with per-day density pills
// ---------------------------------------------------------------------------

class _WeekStrip extends StatelessWidget {
  const _WeekStrip({
    required this.weekStart,
    required this.selected,
    required this.today,
    required this.countFor,
    required this.onSelect,
  });

  final DateTime weekStart;
  final DateTime selected;
  final DateTime today;
  final int Function(DateTime) countFor;
  final ValueChanged<DateTime> onSelect;

  static const _wd = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  bool _same(DateTime a, DateTime b) => a.year == b.year && a.month == b.month && a.day == b.day;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.xs, vertical: QSpace.xs),
      child: Row(
        children: [
          for (var i = 0; i < 7; i++)
            Expanded(child: _dayCol(context, weekStart.add(Duration(days: i)), i)),
        ],
      ),
    );
  }

  Widget _dayCol(BuildContext context, DateTime d, int i) {
    final isSel = _same(d, selected);
    final isToday = _same(d, today);
    final count = countFor(d);
    final accent = QSection.calendar.resolveFrom(context);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => onSelect(d),
      child: Column(
        children: [
          Text(_wd[i], style: QType.caption.copyWith(color: QColors.labelTertiary.resolveFrom(context))),
          const SizedBox(height: 4),
          Container(
            width: 34,
            height: 34,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: isSel ? accent : const Color(0x00000000),
              shape: BoxShape.circle,
            ),
            child: Text(
              '${d.day}',
              style: QType.subhead.copyWith(
                fontWeight: FontWeight.w700,
                fontFeatures: const [FontFeature.tabularFigures()],
                color: isSel
                    ? CupertinoColors.white
                    : (isToday ? accent : QColors.label.resolveFrom(context)),
              ),
            ),
          ),
          const SizedBox(height: 5),
          SizedBox(height: 10, child: DensityDots(count: count, color: accent)),
        ],
      ),
    );
  }
}
