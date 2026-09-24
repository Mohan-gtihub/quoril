import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/editorial.dart';
import '../../core/widgets/glass.dart';
import '../focus/focus_screen.dart';
import '../shell/app_shell.dart';
import '../home/sheets/task_editor_sheet.dart';

/// The Calendar screen — a working month calendar wired to the user's TASKS.
///
/// Each task is placed on its scheduled day (its `dueAt`, or the bucket's
/// default day for Today/This-week tasks). Days carrying tasks are dotted, and
/// the agenda below lists the selected day's tasks — each can be opened for
/// editing or started as a focus session, so the calendar, board, and timer all
/// operate on the same data.
///
/// Refined Apple-native: a very faint grape (calendar section accent) ambient
/// wash behind the body, an airy borderless month grid, today rendered as the
/// one solid grape focal circle, a quiet neutral selection ring, per-priority
/// task dots, and the agenda as frosted glass cards that refract that wash.
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

  bool _isWeekend(int day) {
    final wd = DateTime(_visibleMonth.year, _visibleMonth.month, day).weekday;
    return wd == DateTime.saturday || wd == DateTime.sunday;
  }

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

  /// Up to three per-priority dot colors for a day, ordered highest-priority
  /// first so the day's most urgent work reads at the top of the cluster.
  List<Color> _dotColorsOn(List<Task> tasks, DateTime day) {
    final onDay = tasks.where((t) => _dayEquals(_taskDay(t), day)).toList()
      ..sort((a, b) => b.priority.index.compareTo(a.priority.index));
    return [for (final t in onDay.take(3)) t.priority.color];
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
    final accent = QSection.calendar.resolveFrom(context);

    final brightness =
        MediaQuery.maybeOf(context)?.platformBrightness ?? Brightness.light;

    return CupertinoPageScaffold(
      backgroundColor: QColors.bgGrouped.resolveFrom(context),
      // AMBIENT WASH: a very faint grape (calendar section) tint fading to the
      // grouped page ground, so the frosted agenda cards have something to
      // refract. Kept barely-there to preserve the airy grid.
      child: GradientBackground(
        gradient: QGradients.ambient(accent, brightness),
        child: SafeArea(
          bottom: false,
          child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.fromLTRB(
                    QSpace.md, QSpace.xs, QSpace.md, QShellInsets.of(context) + QSpace.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _CalendarHeader(
                      accent: accent,
                      showTodayButton: !_showingCurrentMonth,
                      onToday: _jumpToToday,
                      onAdd: () => showTaskEditorSheet(context, ref),
                    ),
                    const SizedBox(height: QSpace.lg),
                    // Borderless editorial month grid — no boxes. The month title
                    // carries the air; today's grape circle is the one focal
                    // point on the screen.
                    _MonthNavRow(
                      accent: accent,
                      label: '$monthLabel ${_visibleMonth.year}',
                      onPrev: () => _shiftMonth(-1),
                      onNext: () => _shiftMonth(1),
                    ),
                    const SizedBox(height: QSpace.lg),
                    const _WeekdayRow(),
                    const SizedBox(height: QSpace.xs),
                    _MonthGrid(
                      key: ValueKey('${_visibleMonth.year}-${_visibleMonth.month}'),
                      accent: accent,
                      leadingBlanks: _leadingBlanks,
                      daysInMonth: _daysInMonth,
                      isSelected: (d) => _isSameDay(
                          DateTime(_visibleMonth.year, _visibleMonth.month, d), _selected),
                      isToday: (d) => _isSameDay(
                          DateTime(_visibleMonth.year, _visibleMonth.month, d), _today),
                      isWeekend: _isWeekend,
                      dotColors: (d) => _dotColorsOn(
                          tasks, DateTime(_visibleMonth.year, _visibleMonth.month, d)),
                      onSelect: _selectDay,
                    ),
                    const SizedBox(height: QSpace.xl),
                    _AgendaHeader(
                      accent: accent,
                      date: _selected,
                      count: selectedTasks.length,
                    ),
                    const SizedBox(height: QSpace.md),
                    if (selectedTasks.isEmpty)
                      const _EmptyAgenda()
                    else
                      QStagger(
                        children: [
                          for (var i = 0; i < selectedTasks.length; i++)
                            Padding(
                              padding: EdgeInsets.only(top: i == 0 ? 0 : QSpace.sm),
                              child: _AgendaTaskCard(
                                accent: accent,
                                task: selectedTasks[i],
                                onToggle: () => ref
                                    .read(tasksProvider.notifier)
                                    .toggleDone(selectedTasks[i]),
                                onFocus: () => _startFocus(selectedTasks[i]),
                                onTap: () => showTaskEditorSheet(context, ref,
                                    task: selectedTasks[i]),
                              ),
                            ),
                        ],
                      ),
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
    required this.accent,
    required this.showTodayButton,
    required this.onToday,
    required this.onAdd,
  });
  final Color accent;
  final bool showTodayButton;
  final VoidCallback onToday;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(bottom: 2),
                child: Text('PLAN', style: QType.eyebrow.copyWith(color: accent)),
              ),
              Text('Calendar', style: QType.largeTitle),
            ],
          ),
        ),
        if (showTodayButton) ...[
          _PillButton(accent: accent, label: 'Today', onTap: onToday),
          const SizedBox(width: QSpace.sm),
        ],
        _AccentCircleButton(accent: accent, icon: CupertinoIcons.add, onTap: onAdd),
      ],
    );
  }
}

/// A quiet accent-tinted capsule (used for the "Today" jump). Neutral surface,
/// accent ink — no glass on content chrome.
class _PillButton extends StatelessWidget {
  const _PillButton({required this.accent, required this.label, required this.onTap});
  final Color accent;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: 9),
        decoration: BoxDecoration(
          color: accent.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(QRadius.capsule),
        ),
        child: Text(
          label,
          style: QType.footnote.copyWith(color: accent, fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}

/// A 44pt accent-tinted circular action (the add button). Uses a soft accent
/// fill on the neutral page — the one place the CTA reads.
class _AccentCircleButton extends StatelessWidget {
  const _AccentCircleButton({required this.accent, required this.icon, required this.onTap});
  final Color accent;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Container(
        width: 44,
        height: 44,
        alignment: Alignment.center,
        decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
        child: Icon(icon, size: 22, color: CupertinoColors.white),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Month navigation
// ---------------------------------------------------------------------------

class _MonthNavRow extends StatelessWidget {
  const _MonthNavRow({
    required this.accent,
    required this.label,
    required this.onPrev,
    required this.onNext,
  });
  final Color accent;
  final String label;
  final VoidCallback onPrev;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: QType.title1.copyWith(
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ),
        _NavChevron(accent: accent, icon: CupertinoIcons.chevron_left, onTap: onPrev),
        const SizedBox(width: QSpace.xs),
        _NavChevron(accent: accent, icon: CupertinoIcons.chevron_right, onTap: onNext),
      ],
    );
  }
}

class _NavChevron extends StatelessWidget {
  const _NavChevron({required this.accent, required this.icon, required this.onTap});
  final Color accent;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      // 44pt hit area around a 36pt visual disc.
      child: SizedBox(
        width: 44,
        height: 44,
        child: Center(
          child: Container(
            width: 36,
            height: 36,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: QColors.fill.resolveFrom(context).withValues(alpha: 0.5),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, size: 18, color: accent),
          ),
        ),
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
                color: QColors.labelTertiary.resolveFrom(context),
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
    super.key,
    required this.accent,
    required this.leadingBlanks,
    required this.daysInMonth,
    required this.isSelected,
    required this.isToday,
    required this.isWeekend,
    required this.dotColors,
    required this.onSelect,
  });

  final Color accent;
  final int leadingBlanks;
  final int daysInMonth;
  final bool Function(int day) isSelected;
  final bool Function(int day) isToday;
  final bool Function(int day) isWeekend;
  final List<Color> Function(int day) dotColors;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    final totalCells = leadingBlanks + daysInMonth;
    final rows = (totalCells / 7.0).ceil();
    return Column(
      children: [
        for (var r = 0; r < rows; r++)
          Row(
            children: [
              for (var c = 0; c < 7; c++) Expanded(child: _cellAt(r * 7 + c)),
            ],
          ),
      ],
    );
  }

  Widget _cellAt(int index) {
    if (index < leadingBlanks) return const _DayCell.blank();
    final day = index - leadingBlanks + 1;
    if (day > daysInMonth) return const _DayCell.blank();
    return _DayCell(
      accent: accent,
      day: day,
      selected: isSelected(day),
      today: isToday(day),
      weekend: isWeekend(day),
      dots: dotColors(day),
      onTap: () => onSelect(day),
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.accent,
    required this.day,
    required this.selected,
    required this.today,
    required this.weekend,
    required this.dots,
    required this.onTap,
  }) : blank = false;

  const _DayCell.blank()
      : accent = const Color(0x00000000),
        day = 0,
        selected = false,
        today = false,
        weekend = false,
        dots = const <Color>[],
        onTap = null,
        blank = true;

  final Color accent;
  final int day;
  final bool selected;
  final bool today;
  final bool weekend;
  final List<Color> dots;
  final bool blank;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    if (blank) return const SizedBox(height: 48);

    // Bare numerals in a borderless grid. TODAY is the one grape focal point —
    // a filled 34pt grape disc with a white numeral. SELECTED (but not today)
    // is a quiet neutral system-fill circle. Weekends recede to tertiary ink.
    Color fill = const Color(0x00000000);
    Color textColor;
    FontWeight weight = FontWeight.w500;

    if (today) {
      fill = accent;
      textColor = CupertinoColors.white;
      weight = FontWeight.w700;
    } else if (selected) {
      fill = QColors.fill.resolveFrom(context).withValues(alpha: 0.5);
      textColor = QColors.label.resolveFrom(context);
      weight = FontWeight.w600;
    } else {
      textColor = (weekend ? QColors.labelTertiary : QColors.label)
          .resolveFrom(context);
    }

    // 1–3 tiny 4pt per-priority category dots. On today's grape disc dots read
    // white so they stay legible on the accent fill.
    final dotCount = dots.length.clamp(0, 3);

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      // Full 48pt-tall cell is the tap target (>= 44pt hit area).
      child: SizedBox(
        height: 48,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 34,
              height: 34,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: fill, shape: BoxShape.circle),
              child: Text(
                '$day',
                style: QType.body.copyWith(
                  color: textColor,
                  fontWeight: weight,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
            const SizedBox(height: 3),
            SizedBox(
              height: 4,
              child: dotCount == 0
                  ? null
                  : Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        for (var i = 0; i < dotCount; i++) ...[
                          if (i > 0) const SizedBox(width: 3),
                          Container(
                            width: 4,
                            height: 4,
                            decoration: BoxDecoration(
                              color: today
                                  ? CupertinoColors.white
                                  : dots[i].resolveFrom(context),
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ],
                    ),
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
  const _AgendaHeader({required this.accent, required this.date, required this.count});
  final Color accent;
  final DateTime date;
  final int count;

  static const _weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  static const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  @override
  Widget build(BuildContext context) {
    final label = '${_weekdays[date.weekday - 1]}, ${_months[date.month - 1]} ${date.day}';
    final countLabel = count == 0 ? 'No tasks' : '$count task${count == 1 ? '' : 's'}';
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.only(bottom: 2),
                child: Text('AGENDA', style: QType.eyebrow.copyWith(color: accent)),
              ),
              Text(
                label,
                style: QType.title3.copyWith(
                  fontWeight: FontWeight.w700,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(top: 2),
          child: Text(
            countLabel,
            style: QType.footnote.copyWith(
              color: QColors.labelSecondary.resolveFrom(context),
              fontWeight: FontWeight.w600,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ),
      ],
    );
  }
}

class _EmptyAgenda extends StatelessWidget {
  const _EmptyAgenda();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: QSpace.xl),
      child: Column(
        children: [
          Icon(CupertinoIcons.calendar,
              size: 40, color: QColors.labelTertiary.resolveFrom(context)),
          const SizedBox(height: QSpace.md),
          Text(
            'Nothing planned',
            style: QType.title3,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: QSpace.xs),
          Text(
            'Add something for this day.',
            style: QType.subhead,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Agenda task card — the calendar's task row, with edit-on-tap and a play
// button that starts a focus session on that task. Rendered as the shared
// FROSTED GlassCard material with a whisper of grape (calendar) tint so it
// refracts the faint ambient wash behind the screen.
// ---------------------------------------------------------------------------

class _AgendaTaskCard extends StatelessWidget {
  const _AgendaTaskCard({
    required this.accent,
    required this.task,
    required this.onToggle,
    required this.onFocus,
    required this.onTap,
  });

  final Color accent;
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
    return GlassCard(
      onTap: onTap,
      tint: accent,
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
              color: done
                  ? QColors.wellbeing.resolveFrom(context)
                  : QColors.labelTertiary.resolveFrom(context),
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
                    color: done
                        ? QColors.labelSecondary.resolveFrom(context)
                        : QColors.label.resolveFrom(context),
                    decoration: done ? TextDecoration.lineThrough : null,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  _meta(),
                  style: QType.footnote.copyWith(
                    color: QColors.labelSecondary.resolveFrom(context),
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
                color: accent.withValues(alpha: 0.12),
                shape: BoxShape.circle,
              ),
              child: Icon(CupertinoIcons.play_fill, size: 16, color: accent),
            ),
          ),
        ],
      ),
    );
  }
}
