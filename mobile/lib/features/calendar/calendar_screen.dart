import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/common.dart';
import '../focus/focus_screen.dart';
import '../home/sheets/task_editor_sheet.dart';

/// The Calendar screen — a working month calendar wired to the user's TASKS.
///
/// Each task is placed on its scheduled day (its `dueAt`, or the bucket's
/// default day for Today/This-week tasks). Days carrying tasks are dotted, and
/// the agenda below lists the selected day's tasks — each can be opened for
/// editing or started as a focus session, so the calendar, board, and timer all
/// operate on the same data.
class CalendarScreen extends ConsumerStatefulWidget {
  const CalendarScreen({super.key});

  @override
  ConsumerState<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends ConsumerState<CalendarScreen> {
  static const _monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  late final DateTime _today;
  late DateTime _visibleMonth;
  late DateTime _selected;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _today = DateTime(now.year, now.month, now.day);
    _visibleMonth = DateTime(now.year, now.month);
    _selected = _today;
  }

  int get _daysInMonth => DateTime(_visibleMonth.year, _visibleMonth.month + 1, 0).day;

  int get _leadingBlanks => DateTime(_visibleMonth.year, _visibleMonth.month, 1).weekday % 7;

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  /// The calendar day a task belongs to: explicit due date, else the bucket's
  /// default day (Today → today, This-week → +5d, mirroring the backend).
  DateTime? _taskDay(Task t) {
    final due = t.dueAt;
    if (due != null) return DateTime(due.year, due.month, due.day);
    return switch (t.bucket) {
      TaskBucket.today => _today,
      TaskBucket.week => _today.add(const Duration(days: 5)),
      TaskBucket.backlog || TaskBucket.done => null,
    };
  }

  int _taskCountOn(List<Task> tasks, DateTime day) =>
      tasks.where((t) => _dayEquals(_taskDay(t), day)).length;

  bool _dayEquals(DateTime? a, DateTime b) => a != null && _isSameDay(a, b);

  List<Task> _tasksOn(List<Task> tasks, DateTime day) {
    final list = tasks.where((t) => _dayEquals(_taskDay(t), day)).toList();
    list.sort((a, b) {
      final ta = a.dueAt, tb = b.dueAt;
      if (ta != null && tb != null) return ta.compareTo(tb);
      return a.title.compareTo(b.title);
    });
    return list;
  }

  void _shiftMonth(int delta) {
    HapticFeedback.selectionClick();
    setState(() => _visibleMonth = DateTime(_visibleMonth.year, _visibleMonth.month + delta));
  }

  void _selectDay(int day) {
    HapticFeedback.selectionClick();
    setState(() => _selected = DateTime(_visibleMonth.year, _visibleMonth.month, day));
  }

  void _jumpToToday() {
    HapticFeedback.mediumImpact();
    setState(() {
      _visibleMonth = DateTime(_today.year, _today.month);
      _selected = _today;
    });
  }

  bool get _showingCurrentMonth =>
      _visibleMonth.year == _today.year && _visibleMonth.month == _today.month;

  void _startFocus(Task task) {
    HapticFeedback.mediumImpact();
    Navigator.of(context, rootNavigator: true).push(
      CupertinoPageRoute(fullscreenDialog: true, builder: (_) => FocusScreen(task: task)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tasks = ref.watch(tasksProvider).valueOrNull ?? const <Task>[];
    final monthLabel = _monthNames[_visibleMonth.month - 1];
    final selectedTasks = _tasksOn(tasks, _selected);

    return CupertinoPageScaffold(
      backgroundColor: const Color(0x00000000),
      child: GradientBackground(
        gradient: QGradients.warm,
        child: SafeArea(
          bottom: false,
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(QSpace.lg, QSpace.xs, QSpace.lg, 140),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _CalendarHeader(
                        showTodayButton: !_showingCurrentMonth,
                        onToday: _jumpToToday,
                        onAdd: () => showTaskEditorSheet(context, ref),
                      ),
                      const SizedBox(height: QSpace.lg),
                      GlassPanel(
                        padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.md, QSpace.md, QSpace.lg),
                        child: Column(
                          children: [
                            _MonthNavRow(
                              label: '$monthLabel ${_visibleMonth.year}',
                              onPrev: () => _shiftMonth(-1),
                              onNext: () => _shiftMonth(1),
                            ),
                            const SizedBox(height: QSpace.lg),
                            const _WeekdayRow(),
                            const SizedBox(height: QSpace.sm),
                            _MonthGrid(
                              leadingBlanks: _leadingBlanks,
                              daysInMonth: _daysInMonth,
                              isSelected: (d) => _isSameDay(
                                  DateTime(_visibleMonth.year, _visibleMonth.month, d), _selected),
                              isToday: (d) => _isSameDay(
                                  DateTime(_visibleMonth.year, _visibleMonth.month, d), _today),
                              taskCount: (d) => _taskCountOn(
                                  tasks, DateTime(_visibleMonth.year, _visibleMonth.month, d)),
                              onSelect: _selectDay,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: QSpace.xl),
                      _AgendaHeader(date: _selected, count: selectedTasks.length),
                      const SizedBox(height: QSpace.md),
                      if (selectedTasks.isEmpty)
                        const _EmptyAgenda()
                      else
                        for (var i = 0; i < selectedTasks.length; i++) ...[
                          if (i > 0) const SizedBox(height: QSpace.sm),
                          _AgendaTaskCard(
                            task: selectedTasks[i],
                            onToggle: () => ref.read(tasksProvider.notifier).toggleDone(selectedTasks[i]),
                            onFocus: () => _startFocus(selectedTasks[i]),
                            onTap: () => showTaskEditorSheet(context, ref, task: selectedTasks[i]),
                          ),
                        ],
                    ],
                  ),
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
// Header
// ---------------------------------------------------------------------------

class _CalendarHeader extends StatelessWidget {
  const _CalendarHeader({
    required this.showTodayButton,
    required this.onToday,
    required this.onAdd,
  });
  final bool showTodayButton;
  final VoidCallback onToday;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text('Calendar', style: QType.largeTitle.copyWith(color: CupertinoColors.white)),
        ),
        if (showTodayButton) ...[
          GlassPanel(
            radius: QRadius.capsule,
            fillAlpha: 0.18,
            shadow: false,
            onTap: onToday,
            padding: const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: 8),
            child: Text('Today',
                style: QType.footnote.copyWith(color: CupertinoColors.white, fontWeight: FontWeight.w600)),
          ),
          const SizedBox(width: QSpace.sm),
        ],
        _GlassCircleButton(icon: CupertinoIcons.add, onTap: onAdd),
      ],
    );
  }
}

class _GlassCircleButton extends StatelessWidget {
  const _GlassCircleButton({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      radius: QRadius.capsule,
      fillAlpha: 0.18,
      shadow: false,
      onTap: onTap,
      child: SizedBox(
        width: 44,
        height: 44,
        child: Center(child: Icon(icon, size: 22, color: CupertinoColors.white)),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Month navigation
// ---------------------------------------------------------------------------

class _MonthNavRow extends StatelessWidget {
  const _MonthNavRow({required this.label, required this.onPrev, required this.onNext});
  final String label;
  final VoidCallback onPrev;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _NavChevron(icon: CupertinoIcons.chevron_left, onTap: onPrev),
        Expanded(
          child: Text(
            label,
            textAlign: TextAlign.center,
            style: QType.title3.copyWith(color: CupertinoColors.white, fontWeight: FontWeight.w600),
          ),
        ),
        _NavChevron(icon: CupertinoIcons.chevron_right, onTap: onNext),
      ],
    );
  }
}

class _NavChevron extends StatelessWidget {
  const _NavChevron({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        width: 36,
        height: 36,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: CupertinoColors.white.withValues(alpha: 0.12),
          shape: BoxShape.circle,
          border: Border.all(color: CupertinoColors.white.withValues(alpha: 0.18), width: 1),
        ),
        child: Icon(icon, size: 18, color: CupertinoColors.white.withValues(alpha: 0.9)),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Weekday header
// ---------------------------------------------------------------------------

class _WeekdayRow extends StatelessWidget {
  const _WeekdayRow();
  static const _labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        for (final l in _labels)
          Expanded(
            child: Text(
              l,
              textAlign: TextAlign.center,
              style: QType.footnote.copyWith(
                color: CupertinoColors.white.withValues(alpha: 0.55),
                fontWeight: FontWeight.w600,
                letterSpacing: 1.0,
              ),
            ),
          ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Month grid
// ---------------------------------------------------------------------------

class _MonthGrid extends StatelessWidget {
  const _MonthGrid({
    required this.leadingBlanks,
    required this.daysInMonth,
    required this.isSelected,
    required this.isToday,
    required this.taskCount,
    required this.onSelect,
  });

  final int leadingBlanks;
  final int daysInMonth;
  final bool Function(int day) isSelected;
  final bool Function(int day) isToday;
  final int Function(int day) taskCount;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final totalCells = leadingBlanks + daysInMonth;
    final rows = (totalCells / 7.0).ceil();
    return Column(
      children: [
        for (var r = 0; r < rows; r++)
          Padding(
            padding: EdgeInsets.only(bottom: r == rows - 1 ? 0 : QSpace.xs),
            child: Row(
              children: [
                for (var c = 0; c < 7; c++) Expanded(child: _cellAt(r * 7 + c)),
              ],
            ),
          ),
      ],
    );
  }

  Widget _cellAt(int index) {
    if (index < leadingBlanks) return const _DayCell.blank();
    final day = index - leadingBlanks + 1;
    if (day > daysInMonth) return const _DayCell.blank();
    return _DayCell(
      day: day,
      selected: isSelected(day),
      today: isToday(day),
      tasks: taskCount(day),
      onTap: () => onSelect(day),
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.day,
    required this.selected,
    required this.today,
    required this.tasks,
    required this.onTap,
  }) : blank = false;

  const _DayCell.blank()
      : day = 0,
        selected = false,
        today = false,
        tasks = 0,
        onTap = null,
        blank = true;

  final int day;
  final bool selected;
  final bool today;
  final int tasks;
  final bool blank;
  final VoidCallback? onTap;

  static const _orange = Color(0xFFFF9E3D);
  static const _selectedFill = Color(0xFF1A1A1A);

  @override
  Widget build(BuildContext context) {
    if (blank) return const SizedBox(height: 48);

    Border? border;
    Color fill = const Color(0x00000000);
    Color textColor;
    FontWeight weight = FontWeight.w500;
    List<BoxShadow>? shadow;

    if (selected) {
      fill = _selectedFill;
      textColor = CupertinoColors.white;
      weight = FontWeight.w700;
      shadow = [
        BoxShadow(color: CupertinoColors.black.withValues(alpha: 0.35), blurRadius: 14, offset: const Offset(0, 5)),
      ];
    } else if (today) {
      border = Border.all(color: _orange, width: 2);
      textColor = CupertinoColors.white;
      weight = FontWeight.w700;
    } else {
      border = Border.all(color: CupertinoColors.white.withValues(alpha: 0.85), width: 1.2);
      textColor = CupertinoColors.white;
    }

    final dotColor = selected ? CupertinoColors.white : _orange;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: SizedBox(
        height: 48,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 39,
              height: 39,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: fill, shape: BoxShape.circle, border: border, boxShadow: shadow),
              child: Text(
                '$day',
                style: QType.subhead.copyWith(
                  color: textColor,
                  fontWeight: weight,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
            const SizedBox(height: 4),
            SizedBox(
              height: 5,
              child: tasks > 0
                  ? Container(width: 5, height: 5, decoration: BoxDecoration(color: dotColor, shape: BoxShape.circle))
                  : null,
            ),
          ],
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Agenda
// ---------------------------------------------------------------------------

class _AgendaHeader extends StatelessWidget {
  const _AgendaHeader({required this.date, required this.count});
  final DateTime date;
  final int count;

  static const _weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  static const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  @override
  Widget build(BuildContext context) {
    final label = '${_weekdays[date.weekday - 1]}, ${_months[date.month - 1]} ${date.day}';
    final countLabel = count == 0 ? 'No tasks' : '$count task${count == 1 ? '' : 's'}';
    return Row(
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        Expanded(
          child: Text(label, style: QType.title3.copyWith(color: CupertinoColors.white, fontWeight: FontWeight.w700)),
        ),
        Text(
          countLabel,
          style: QType.footnote.copyWith(color: CupertinoColors.white.withValues(alpha: 0.65), fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}

class _EmptyAgenda extends StatelessWidget {
  const _EmptyAgenda();

  @override
  Widget build(BuildContext context) {
    return GlassPanel(
      fillAlpha: 0.10,
      padding: const EdgeInsets.symmetric(vertical: QSpace.xxl),
      child: Column(
        children: [
          Icon(CupertinoIcons.calendar, size: 34, color: CupertinoColors.white.withValues(alpha: 0.55)),
          const SizedBox(height: QSpace.sm),
          Text(
            'Nothing scheduled',
            style: QType.subhead.copyWith(color: CupertinoColors.white.withValues(alpha: 0.75), fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Agenda task card — the calendar's task row, with edit-on-tap and a play
// button that starts a focus session on that task.
// ---------------------------------------------------------------------------

class _AgendaTaskCard extends StatelessWidget {
  const _AgendaTaskCard({
    required this.task,
    required this.onToggle,
    required this.onFocus,
    required this.onTap,
  });

  final Task task;
  final VoidCallback onToggle;
  final VoidCallback onFocus;
  final VoidCallback onTap;

  String _meta() {
    final t = task;
    if (t.startLabel != null && t.finishLabel != null) return '${t.startLabel} – ${t.finishLabel}';
    final e = t.estimateMinutes;
    if (e != null) {
      final h = e ~/ 60, m = e % 60;
      return h > 0 ? (m > 0 ? 'Est ${h}h ${m}m' : 'Est ${h}h') : 'Est ${m}m';
    }
    return t.priority.label;
  }

  @override
  Widget build(BuildContext context) {
    final done = task.done;
    return GlassPanel(
      onTap: onTap,
      padding: const EdgeInsets.all(QSpace.md),
      child: Row(
        children: [
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () {
              HapticFeedback.heavyImpact();
              onToggle();
            },
            child: Icon(
              done ? CupertinoIcons.checkmark_circle_fill : CupertinoIcons.circle,
              size: 26,
              color: done ? CupertinoColors.white : CupertinoColors.white.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(width: QSpace.sm),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  task.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: QType.headline.copyWith(
                    color: CupertinoColors.white,
                    fontWeight: FontWeight.w700,
                    decoration: done ? TextDecoration.lineThrough : null,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _meta(),
                  style: QType.footnote.copyWith(
                    color: CupertinoColors.white.withValues(alpha: 0.7),
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: QSpace.sm),
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: onFocus,
            child: Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: CupertinoColors.white.withValues(alpha: 0.16),
                shape: BoxShape.circle,
                border: Border.all(color: CupertinoColors.white.withValues(alpha: 0.3), width: 1),
              ),
              child: const Icon(CupertinoIcons.play_fill, size: 16, color: CupertinoColors.white),
            ),
          ),
        ],
      ),
    );
  }
}
