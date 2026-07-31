import 'package:flutter/cupertino.dart';

import '../../core/models/models.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import 'timeline_style.dart';

/// A Structured-style WEEK VIEW: 7 day columns (Mon–Sun) sharing one vertical
/// time axis. Tasks render as stacked colored rounded pill blocks positioned
/// proportionally by start/end time, each with a centered white category icon
/// (tall blocks) or just a color pill (short blocks). Hour labels run down the
/// far-left gutter. The selected day's column is full-color; the others are
/// dimmed so the focus is the selected day. A red "now" line crosses the
/// selected column when it is today.
class WeekView extends StatelessWidget {
  const WeekView({
    super.key,
    required this.weekStart,
    required this.selectedDay,
    required this.tasks,
    required this.startMinutes,
    required this.durationMinutes,
    required this.onTapTask,
  });

  /// Monday 00:00 of the visible week.
  final DateTime weekStart;

  /// Which column is highlighted (midnight).
  final DateTime selectedDay;

  /// All tasks; filtered per day internally.
  final List<Task> tasks;

  /// Start minute-of-day, or null if unscheduled (those are skipped).
  final int? Function(Task) startMinutes;

  final int Function(Task) durationMinutes;
  final void Function(Task) onTapTask;

  // Visible window + scale.
  static const int _startHour = 6;
  static const int _endHour = 22;
  static const double _pxPerMin = 0.9;
  static const double _gutter = 34.0;

  double get _laneHeight => (_endHour - _startHour) * 60 * _pxPerMin;

  static bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  /// The day a task belongs to: its `dueAt` date if present, else today when
  /// bucketed as today, else null (excluded from the grid).
  DateTime? _dayOf(Task t) {
    final due = t.dueAt;
    if (due != null) return DateTime(due.year, due.month, due.day);
    if (t.bucket == TaskBucket.today) {
      final n = DateTime.now();
      return DateTime(n.year, n.month, n.day);
    }
    return null;
  }

  List<Task> _tasksOn(DateTime day) {
    final out = <Task>[];
    for (final t in tasks) {
      if (startMinutes(t) == null) continue;
      final d = _dayOf(t);
      if (d != null && _sameDay(d, day)) out.add(t);
    }
    out.sort((a, b) => startMinutes(a)!.compareTo(startMinutes(b)!));
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final nowMin = now.hour * 60 + now.minute;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 120),
      child: SizedBox(
        height: _laneHeight,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _HourGutter(
              startHour: _startHour,
              endHour: _endHour,
              pxPerMin: _pxPerMin,
              width: _gutter,
            ),
            for (var i = 0; i < 7; i++)
              Expanded(
                child: _buildLane(context, weekStart.add(Duration(days: i)), nowMin),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildLane(BuildContext context, DateTime day, int nowMin) {
    final isSelected = _sameDay(day, selectedDay);
    final isToday = _sameDay(day, DateTime.now());
    final dayTasks = _tasksOn(day);

    final blocks = <Widget>[
      _Gridlines(
        startHour: _startHour,
        endHour: _endHour,
        pxPerMin: _pxPerMin,
        color: QColors.separator.resolveFrom(context),
      ),
      for (final t in dayTasks)
        _positionedBlock(context, t, selected: isSelected),
      if (isSelected && isToday && nowMin >= _startHour * 60 && nowMin <= _endHour * 60)
        Positioned(
          top: (nowMin - _startHour * 60) * _pxPerMin,
          left: 0,
          right: 0,
          child: Container(height: 2, color: CupertinoColors.systemRed.resolveFrom(context)),
        ),
    ];

    final lane = Padding(
      padding: const EdgeInsets.symmetric(horizontal: 1.5),
      child: SizedBox(
        height: _laneHeight,
        child: Stack(children: blocks),
      ),
    );

    if (isSelected) return lane;
    return Opacity(opacity: 0.45, child: lane);
  }

  Widget _positionedBlock(BuildContext context, Task t, {required bool selected}) {
    final start = startMinutes(t)!;
    final dur = durationMinutes(t);
    final top = (start - _startHour * 60) * _pxPerMin;
    final height = (dur * _pxPerMin - 3).clamp(16.0, _laneHeight);
    final baseColor = timelineColorFor(t);
    final color = selected ? baseColor : baseColor.withValues(alpha: 0.28);
    final showIcon = height > 34;

    return Positioned(
      top: top,
      left: 0,
      right: 0,
      height: height,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => onTapTask(t),
        child: Container(
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(14),
          ),
          alignment: Alignment.center,
          child: showIcon
              ? Icon(timelineIconFor(t.title), size: 18, color: CupertinoColors.white)
              : null,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Left hour gutter — "13ᵒᵒ 14ᵒᵒ …"
// ---------------------------------------------------------------------------

class _HourGutter extends StatelessWidget {
  const _HourGutter({
    required this.startHour,
    required this.endHour,
    required this.pxPerMin,
    required this.width,
  });

  final int startHour;
  final int endHour;
  final double pxPerMin;
  final double width;

  @override
  Widget build(BuildContext context) {
    final height = (endHour - startHour) * 60 * pxPerMin;
    return SizedBox(
      width: width,
      height: height,
      child: Stack(
        children: [
          for (var h = startHour; h <= endHour; h++)
            Positioned(
              top: (h - startHour) * 60 * pxPerMin - 6,
              right: 4,
              child: Text(
                '${h.toString().padLeft(2, '0')}ᵒᵒ',
                style: QType.caption.copyWith(
                  fontSize: 10,
                  color: QColors.labelTertiary.resolveFrom(context),
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Faint horizontal hour gridlines behind a lane's blocks.
// ---------------------------------------------------------------------------

class _Gridlines extends StatelessWidget {
  const _Gridlines({
    required this.startHour,
    required this.endHour,
    required this.pxPerMin,
    required this.color,
  });

  final int startHour;
  final int endHour;
  final double pxPerMin;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: Stack(
        children: [
          for (var h = startHour; h <= endHour; h++)
            Positioned(
              top: (h - startHour) * 60 * pxPerMin,
              left: 0,
              right: 0,
              child: Container(height: 0.5, color: color.withValues(alpha: 0.5)),
            ),
        ],
      ),
    );
  }
}
