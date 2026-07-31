import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/app_kit.dart';
import '../focus/focus_screen.dart';
import '../home/sheets/task_editor_sheet.dart';
import 'month_picker_sheet.dart';
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

Color _colorFor(Task t) => timelineColorFor(t);
IconData _iconFor(String title) => timelineIconFor(title);

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

  void _focus(Task t) {
    HapticFeedback.mediumImpact();
    Navigator.of(context, rootNavigator: true).push(
      CupertinoPageRoute(fullscreenDialog: true, builder: (_) => FocusScreen(task: t)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final all = ref.watch(tasksProvider).valueOrNull ?? const <Task>[];
    final dayTasks = _tasksOn(all, _selected);
    final scheduled = dayTasks.where((t) => _startMinutes(t) != null).toList()
      ..sort((a, b) => _startMinutes(a)!.compareTo(_startMinutes(b)!));
    final anytime = dayTasks.where((t) => _startMinutes(t) == null).toList();

    // Monday-anchored week containing the selected day.
    final weekStart = _selected.subtract(Duration(days: _selected.weekday - 1));
    final nowMin = DateTime.now().hour * 60 + DateTime.now().minute;

    return CupertinoPageScaffold(
      backgroundColor: QColors.bg.resolveFrom(context),
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
                        densityFor: (d) => _tasksOn(all, d).map(_colorFor).take(4).toList(),
                      );
                      if (picked != null) setState(() => _selected = DateTime(picked.year, picked.month, picked.day));
                    },
                    child: _MonthHeader(day: _selected),
                  ),
                ),
                _ViewToggle(week: _week, onChanged: (w) => setState(() => _week = w)),
                const SizedBox(width: QSpace.md),
              ],
            ),
            const SizedBox(height: QSpace.xs),
            _WeekStrip(
              weekStart: weekStart,
              selected: _selected,
              today: DateTime.now(),
              densityFor: (d) => _tasksOn(all, d).map(_colorFor).take(4).toList(),
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
                      onTapTask: (t) => showTaskEditorSheet(context, ref, task: t),
                    )
                  : dayTasks.isEmpty
                  ? const _EmptyDay()
                  : ListView(
                      physics: const BouncingScrollPhysics(),
                      padding: const EdgeInsets.only(top: QSpace.md, bottom: QSpace.xl),
                      children: [
                        if (anytime.isNotEmpty) _AnytimeRow(tasks: anytime, onTap: (t) => _focus(t), onEdit: (t) => showTaskEditorSheet(context, ref, task: t)),
                        for (var i = 0; i < scheduled.length; i++)
                          _TimelineRow(
                            task: scheduled[i],
                            startText: _hhmm(_startMinutes(scheduled[i])!),
                            endText: _hhmm(_startMinutes(scheduled[i])! + _dur(scheduled[i])),
                            durationMin: _dur(scheduled[i]),
                            active: _isToday(_selected) &&
                                nowMin >= _startMinutes(scheduled[i])! &&
                                nowMin < _startMinutes(scheduled[i])! + _dur(scheduled[i]),
                            remainingMin: _startMinutes(scheduled[i])! + _dur(scheduled[i]) - nowMin,
                            first: i == 0 && anytime.isEmpty,
                            last: i == scheduled.length - 1,
                            onToggle: () => ref.read(tasksProvider.notifier).toggleDone(scheduled[i]),
                            onTap: () => showTaskEditorSheet(context, ref, task: scheduled[i]),
                            onFocus: () => _focus(scheduled[i]),
                          ),
                      ],
                    ),
            ),
          ],
        ),
      ),
    );
  }

  static String _hhmm(int mins) {
    final h = (mins ~/ 60) % 24;
    final m = mins % 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';
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
    return Padding(
      padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.sm, QSpace.md, 0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Text('${day.day}. ${_months[day.month - 1]} ',
              style: QType.title1.copyWith(fontWeight: FontWeight.w800)),
          Text('${day.year}',
              style: QType.title1.copyWith(fontWeight: FontWeight.w800, color: kAccent)),
          const SizedBox(width: 4),
          Icon(CupertinoIcons.chevron_right, size: 20, color: kAccent),
        ],
      ),
    );
  }
}

/// Day / Week segmented toggle.
class _ViewToggle extends StatelessWidget {
  const _ViewToggle({required this.week, required this.onChanged});
  final bool week;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
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
                color: sel ? QColors.label.resolveFrom(context) : QColors.labelSecondary.resolveFrom(context),
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
// Week strip with per-day density pills
// ---------------------------------------------------------------------------

class _WeekStrip extends StatelessWidget {
  const _WeekStrip({
    required this.weekStart,
    required this.selected,
    required this.today,
    required this.densityFor,
    required this.onSelect,
  });

  final DateTime weekStart;
  final DateTime selected;
  final DateTime today;
  final List<Color> Function(DateTime) densityFor;
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
    final density = densityFor(d);
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
              color: isSel ? kAccent : const Color(0x00000000),
              shape: BoxShape.circle,
            ),
            child: Text(
              '${d.day}',
              style: QType.subhead.copyWith(
                fontWeight: FontWeight.w700,
                fontFeatures: const [FontFeature.tabularFigures()],
                color: isSel
                    ? CupertinoColors.white
                    : (isToday ? kAccent : QColors.label.resolveFrom(context)),
              ),
            ),
          ),
          const SizedBox(height: 5),
          SizedBox(
            height: 5,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                for (final c in density)
                  Container(
                    width: 6,
                    height: 5,
                    margin: const EdgeInsets.symmetric(horizontal: 0.8),
                    decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(2)),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// "Anytime" circular icon tiles
// ---------------------------------------------------------------------------

class _AnytimeRow extends StatelessWidget {
  const _AnytimeRow({required this.tasks, required this.onTap, required this.onEdit});
  final List<Task> tasks;
  final void Function(Task) onTap;
  final void Function(Task) onEdit;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: QSpace.md),
      height: 104,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
        itemCount: tasks.length,
        separatorBuilder: (_, _) => const SizedBox(width: QSpace.md),
        itemBuilder: (context, i) {
          final t = tasks[i];
          final c = _colorFor(t);
          return GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => onEdit(t),
            child: SizedBox(
              width: 74,
              child: Column(
                children: [
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () => onTap(t),
                    child: Container(
                      width: 58,
                      height: 58,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(color: c, shape: BoxShape.circle),
                      child: Icon(_iconFor(t.title), size: 26, color: CupertinoColors.white),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    t.title,
                    maxLines: 2,
                    textAlign: TextAlign.center,
                    overflow: TextOverflow.ellipsis,
                    style: QType.caption.copyWith(fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Timeline row
// ---------------------------------------------------------------------------

class _TimelineRow extends StatelessWidget {
  const _TimelineRow({
    required this.task,
    required this.startText,
    required this.endText,
    required this.durationMin,
    required this.active,
    required this.remainingMin,
    required this.first,
    required this.last,
    required this.onToggle,
    required this.onTap,
    required this.onFocus,
  });

  final Task task;
  final String startText;
  final String endText;
  final int durationMin;
  final bool active;
  final int remainingMin;
  final bool first;
  final bool last;
  final VoidCallback onToggle;
  final VoidCallback onTap;
  final VoidCallback onFocus;

  @override
  Widget build(BuildContext context) {
    final c = _colorFor(task);
    final done = task.done;
    final markerH = active ? 92.0 : 46.0;

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Time rail.
          SizedBox(
            width: 46,
            child: Padding(
              padding: const EdgeInsets.only(top: 8, left: QSpace.xs),
              child: Column(
                children: [
                  Text(startText,
                      style: QType.caption.copyWith(
                        color: active ? QColors.label.resolveFrom(context) : QColors.labelTertiary.resolveFrom(context),
                        fontWeight: active ? FontWeight.w800 : FontWeight.w500,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      )),
                ],
              ),
            ),
          ),
          // Marker + colored connector.
          SizedBox(
            width: 58,
            child: Column(
              children: [
                if (!first) SizedBox(height: 0, child: Container(width: 5, color: c)),
                _Marker(color: c, icon: _iconFor(task.title), height: markerH, active: active),
                Expanded(
                  child: Center(
                    child: Container(
                      width: 5,
                      decoration: BoxDecoration(
                        color: last ? const Color(0x00000000) : c.withValues(alpha: done ? 0.35 : 0.9),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: QSpace.sm),
          // Content + completion ring.
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 6, bottom: QSpace.lg, right: QSpace.md),
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: onTap,
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            active
                                ? '${remainingMin.clamp(0, durationMin)}m remaining'
                                : '$startText – $endText  ($durationMin min)',
                            style: QType.caption.copyWith(
                              color: active ? c : QColors.labelSecondary.resolveFrom(context),
                              fontWeight: active ? FontWeight.w700 : FontWeight.w400,
                              fontFeatures: const [FontFeature.tabularFigures()],
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            task.title,
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                            style: QType.headline.copyWith(
                              fontWeight: FontWeight.w700,
                              decoration: done ? TextDecoration.lineThrough : null,
                              color: done
                                  ? QColors.labelTertiary.resolveFrom(context)
                                  : QColors.label.resolveFrom(context),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: QSpace.sm),
                    GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () {
                        HapticFeedback.selectionClick();
                        onToggle();
                      },
                      child: Container(
                        width: 26,
                        height: 26,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: done ? c : const Color(0x00000000),
                          shape: BoxShape.circle,
                          border: Border.all(color: done ? c : c.withValues(alpha: 0.6), width: 2),
                        ),
                        child: done
                            ? const Icon(CupertinoIcons.checkmark_alt, size: 14, color: CupertinoColors.white)
                            : null,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Marker extends StatelessWidget {
  const _Marker({required this.color, required this.icon, required this.height, required this.active});
  final Color color;
  final IconData icon;
  final double height;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 46,
      height: height,
      alignment: active ? Alignment.topCenter : Alignment.center,
      padding: EdgeInsets.only(top: active ? 12 : 0),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(active ? 23 : 999),
      ),
      child: Icon(icon, size: 24, color: CupertinoColors.white),
    );
  }
}

// ---------------------------------------------------------------------------

class _EmptyDay extends StatelessWidget {
  const _EmptyDay();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(CupertinoIcons.calendar_badge_plus, size: 42, color: QColors.labelTertiary.resolveFrom(context)),
          const SizedBox(height: QSpace.sm),
          Text('Nothing planned', style: QType.title3),
          const SizedBox(height: 2),
          Text('Tap + to add a task to this day', style: QType.subhead),
        ],
      ),
    );
  }
}
