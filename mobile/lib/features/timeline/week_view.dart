import 'package:flutter/cupertino.dart';

import '../../core/models/models.dart';
import '../../core/theme/tokens.dart';
import 'timeline_components.dart';
import 'timeline_style.dart';

/// A Structured-style WEEK VIEW: 7 day columns (Mon–Sun) sharing one vertical
/// time axis. Tasks render as stacked colored rounded pill blocks positioned
/// proportionally by start/end time, each with a centered white category icon
/// (tall blocks) or just a color pill (short blocks). The FULL 0–24h day is
/// scrollable — nothing is clipped — and the view auto-scrolls to now−1h on
/// open. Hour labels run down the far-left gutter (respecting 12/24h). The
/// selected day's column is full-color; the others are dimmed. A red "now" line
/// crosses the selected column when it is today, and the in-progress block gets
/// a "now" ring emphasis.
class WeekView extends StatefulWidget {
  const WeekView({
    super.key,
    required this.weekStart,
    required this.selectedDay,
    required this.tasks,
    required this.startMinutes,
    required this.durationMinutes,
    required this.onTapTask,
    this.accent,
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

  /// The one color moment for the canvas (now-line + active block). Defaults to
  /// the ember brand; the calendar planner passes its section accent (grape).
  final Color? accent;

  @override
  State<WeekView> createState() => _WeekViewState();
}

class _WeekViewState extends State<WeekView> {
  // Full 0–24h axis so a block at any hour is reachable.
  static const int _startHour = 0;
  static const int _endHour = 24;
  static const double _pxPerMin = 0.9;
  static const double _gutter = TimelineMetrics.railWidth;

  final _scroll = ScrollController();

  double get _laneHeight => (_endHour - _startHour) * 60 * _pxPerMin;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToNow());
  }

  void _scrollToNow() {
    if (!_scroll.hasClients) return;
    final now = DateTime.now();
    final target = ((now.hour - 1) * 60) * _pxPerMin;
    final max = _scroll.position.maxScrollExtent;
    _scroll.jumpTo(target.clamp(0.0, max));
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  static bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

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
    for (final t in widget.tasks) {
      if (widget.startMinutes(t) == null) continue;
      final d = _dayOf(t);
      if (d != null && _sameDay(d, day)) out.add(t);
    }
    out.sort((a, b) => widget.startMinutes(a)!.compareTo(widget.startMinutes(b)!));
    return out;
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final nowMin = now.hour * 60 + now.minute;

    return SingleChildScrollView(
      controller: _scroll,
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 120),
      child: SizedBox(
        height: _laneHeight,
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            HourGutter(
              startHour: _startHour,
              endHour: _endHour,
              pxPerMin: _pxPerMin,
              width: _gutter,
            ),
            for (var i = 0; i < 7; i++)
              Expanded(
                child: _buildLane(context, widget.weekStart.add(Duration(days: i)), nowMin),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildLane(BuildContext context, DateTime day, int nowMin) {
    final isSelected = _sameDay(day, widget.selectedDay);
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
        _positionedBlock(context, t, selected: isSelected, isToday: isToday, nowMin: nowMin),
      if (isSelected && isToday)
        Positioned(
          top: (nowMin - _startHour * 60) * _pxPerMin - 3.5,
          left: 0,
          right: 0,
          child: NowLine(color: widget.accent),
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

  Widget _positionedBlock(
    BuildContext context,
    Task t, {
    required bool selected,
    required bool isToday,
    required int nowMin,
  }) {
    final start = widget.startMinutes(t)!;
    final dur = widget.durationMinutes(t);
    final top = (start - _startHour * 60) * _pxPerMin;
    final height = (dur * _pxPerMin - 3).clamp(16.0, _laneHeight);
    final baseColor = timelineColorFor(t).resolveFrom(context);
    final color = selected ? baseColor : baseColor.withValues(alpha: 0.28);
    final showIcon = height > 34;
    final active = isToday && selected && nowMin >= start && nowMin < start + dur;
    final accent = (widget.accent ?? QColors.brand).resolveFrom(context);

    return Positioned(
      top: top,
      left: 0,
      right: 0,
      height: height,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => widget.onTapTask(t),
        child: Container(
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(TimelineMetrics.blockRadius),
            border: active
                ? Border.all(color: accent, width: 1.5)
                : null,
            boxShadow: active
                ? [
                    BoxShadow(
                      color: accent.withValues(alpha: 0.40),
                      blurRadius: 8,
                    ),
                  ]
                : null,
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
