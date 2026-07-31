import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/data/mock_data.dart';
import '../../core/models/models.dart';
import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/common.dart';

/// The Calendar screen — a working month calendar on the warm aurora gradient.
///
/// Real dates: the grid is built from actual month math, month navigation moves
/// through time, days carrying events are dotted, and tapping a day filters the
/// event list below. Events are sourced from [Mock.events]; swapping that for a
/// repository call is the only change needed to go live.
class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  static const _monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  late final DateTime _today;
  late final List<CalendarEvent> _events;

  /// First-of-month for the month currently on screen.
  late DateTime _visibleMonth;

  /// Currently selected day (midnight-normalized).
  late DateTime _selected;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _today = DateTime(now.year, now.month, now.day);
    _events = Mock.events();
    _visibleMonth = DateTime(now.year, now.month);
    _selected = _today;
  }

  /// Days in [_visibleMonth].
  int get _daysInMonth => DateTime(_visibleMonth.year, _visibleMonth.month + 1, 0).day;

  /// Leading blank cells before day 1, with Sunday as the first column
  /// (Dart's weekday is Mon=1..Sun=7 → Sunday maps to 0).
  int get _leadingBlanks => DateTime(_visibleMonth.year, _visibleMonth.month, 1).weekday % 7;

  bool _isSameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;

  /// Count of events on [day] — powers the under-cell dot.
  int _eventCountOn(DateTime day) =>
      _events.where((e) => _isSameDay(e.day, day)).length;

  List<CalendarEvent> get _selectedEvents {
    final list = _events.where((e) => _isSameDay(e.day, _selected)).toList()
      ..sort((a, b) => a.start.compareTo(b.start));
    return list;
  }

  void _shiftMonth(int delta) {
    HapticFeedback.selectionClick();
    setState(() {
      _visibleMonth = DateTime(_visibleMonth.year, _visibleMonth.month + delta);
    });
  }

  void _selectDay(int day) {
    HapticFeedback.selectionClick();
    setState(() {
      _selected = DateTime(_visibleMonth.year, _visibleMonth.month, day);
    });
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

  @override
  Widget build(BuildContext context) {
    final monthLabel = _monthNames[_visibleMonth.month - 1];
    final selectedEvents = _selectedEvents;

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
                  padding: const EdgeInsets.fromLTRB(
                      QSpace.lg, QSpace.xs, QSpace.lg, QSpace.xxl),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _CalendarHeader(
                        showTodayButton: !_showingCurrentMonth,
                        onToday: _jumpToToday,
                      ),
                      const SizedBox(height: QSpace.xl),
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
                          DateTime(_visibleMonth.year, _visibleMonth.month, d),
                          _selected,
                        ),
                        isToday: (d) => _isSameDay(
                          DateTime(_visibleMonth.year, _visibleMonth.month, d),
                          _today,
                        ),
                        eventCount: (d) => _eventCountOn(
                          DateTime(_visibleMonth.year, _visibleMonth.month, d),
                        ),
                        onSelect: _selectDay,
                      ),
                      const SizedBox(height: QSpace.xl),
                      _AgendaHeader(
                        date: _selected,
                        count: selectedEvents.length,
                      ),
                      const SizedBox(height: QSpace.md),
                      if (selectedEvents.isEmpty)
                        const _EmptyAgenda()
                      else
                        for (var i = 0; i < selectedEvents.length; i++) ...[
                          if (i > 0) const SizedBox(height: QSpace.md),
                          _EventCard(event: selectedEvents[i]),
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
  });

  final bool showTodayButton;
  final VoidCallback onToday;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            'Calendar',
            style: QType.largeTitle.copyWith(color: CupertinoColors.white),
          ),
        ),
        if (showTodayButton) ...[
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: onToday,
            child: Container(
              height: 34,
              padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: CupertinoColors.white.withValues(alpha: 0.18),
                borderRadius: BorderRadius.circular(QRadius.capsule),
              ),
              child: Text(
                'Today',
                style: QType.footnote.copyWith(
                  color: CupertinoColors.white,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
          const SizedBox(width: QSpace.sm),
        ],
        Container(
          width: 44,
          height: 44,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: CupertinoColors.white.withValues(alpha: 0.18),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            CupertinoIcons.bell,
            size: 20,
            color: CupertinoColors.white,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Month navigation
// ---------------------------------------------------------------------------

class _MonthNavRow extends StatelessWidget {
  const _MonthNavRow({
    required this.label,
    required this.onPrev,
    required this.onNext,
  });

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
            style: QType.title3.copyWith(
              color: CupertinoColors.white,
              fontWeight: FontWeight.w600,
            ),
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
      child: SizedBox(
        width: 44,
        height: 44,
        child: Center(
          child: Icon(
            icon,
            size: 20,
            color: CupertinoColors.white.withValues(alpha: 0.85),
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
    required this.eventCount,
    required this.onSelect,
  });

  final int leadingBlanks;
  final int daysInMonth;
  final bool Function(int day) isSelected;
  final bool Function(int day) isToday;
  final int Function(int day) eventCount;
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
                for (var c = 0; c < 7; c++)
                  Expanded(child: _cellAt(r * 7 + c)),
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
      events: eventCount(day),
      onTap: () => onSelect(day),
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.day,
    required this.selected,
    required this.today,
    required this.events,
    required this.onTap,
  }) : blank = false;

  const _DayCell.blank()
      : day = 0,
        selected = false,
        today = false,
        events = 0,
        onTap = null,
        blank = true;

  final int day;
  final bool selected;
  final bool today;
  final int events;
  final bool blank;
  final VoidCallback? onTap;

  static const _orange = Color(0xFFFF9E3D);
  static const _selectedFill = Color(0xFF1A1A1A);

  @override
  Widget build(BuildContext context) {
    if (blank) {
      return const SizedBox(height: 48);
    }

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
        BoxShadow(
          color: CupertinoColors.black.withValues(alpha: 0.35),
          blurRadius: 14,
          offset: const Offset(0, 5),
        ),
      ];
    } else if (today) {
      // Today (unselected) gets the warm accent ring.
      border = Border.all(color: _orange, width: 2);
      textColor = CupertinoColors.white;
      weight = FontWeight.w700;
    } else {
      border = Border.all(
        color: CupertinoColors.white.withValues(alpha: 0.85),
        width: 1.2,
      );
      textColor = CupertinoColors.white;
    }

    // Dot color: inverted under the dark selected pill for contrast.
    final dotColor = selected
        ? CupertinoColors.white
        : _orange;

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
              decoration: BoxDecoration(
                color: fill,
                shape: BoxShape.circle,
                border: border,
                boxShadow: shadow,
              ),
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
              child: events > 0
                  ? Container(
                      width: 5,
                      height: 5,
                      decoration: BoxDecoration(
                        color: dotColor,
                        shape: BoxShape.circle,
                      ),
                    )
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

  static const _weekdays = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday',
    'Friday', 'Saturday', 'Sunday',
  ];
  static const _months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  @override
  Widget build(BuildContext context) {
    final label = '${_weekdays[date.weekday - 1]}, ${_months[date.month - 1]} ${date.day}';
    final countLabel = count == 0
        ? 'No events'
        : '$count event${count == 1 ? '' : 's'}';

    return Row(
      crossAxisAlignment: CrossAxisAlignment.baseline,
      textBaseline: TextBaseline.alphabetic,
      children: [
        Expanded(
          child: Text(
            label,
            style: QType.title3.copyWith(
              color: CupertinoColors.white,
              fontWeight: FontWeight.w700,
            ),
          ),
        ),
        Text(
          countLabel,
          style: QType.footnote.copyWith(
            color: CupertinoColors.white.withValues(alpha: 0.65),
            fontWeight: FontWeight.w600,
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
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: QSpace.xxl),
      decoration: BoxDecoration(
        color: CupertinoColors.white.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(QRadius.glass),
        border: Border.all(
          color: CupertinoColors.white.withValues(alpha: 0.14),
          width: 1,
        ),
      ),
      child: Column(
        children: [
          Icon(
            CupertinoIcons.calendar,
            size: 34,
            color: CupertinoColors.white.withValues(alpha: 0.55),
          ),
          const SizedBox(height: QSpace.sm),
          Text(
            'Nothing scheduled',
            style: QType.subhead.copyWith(
              color: CupertinoColors.white.withValues(alpha: 0.75),
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Event card
// ---------------------------------------------------------------------------

class _EventCard extends StatelessWidget {
  const _EventCard({required this.event});

  final CalendarEvent event;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(QSpace.md),
      decoration: BoxDecoration(
        color: CupertinoColors.white.withValues(alpha: 0.16),
        borderRadius: BorderRadius.circular(QRadius.glass),
        border: Border.all(
          color: CupertinoColors.white.withValues(alpha: 0.18),
          width: 1,
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Accent spine keyed to the event color.
          Container(
            width: 4,
            decoration: BoxDecoration(
              color: event.color,
              borderRadius: BorderRadius.circular(QRadius.capsule),
            ),
          ),
          const SizedBox(width: QSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Text(
                        event.title,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: QType.title3.copyWith(
                          color: CupertinoColors.white,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                    if (event.assignees.isNotEmpty) ...[
                      const SizedBox(width: QSpace.sm),
                      AvatarStack(
                        people: event.assignees,
                        size: 32,
                        ringColor: const Color(0xFFF37A1E),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: QSpace.md),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    _TimeStat(label: 'Start', value: event.startLabel),
                    const SizedBox(width: QSpace.xl),
                    _TimeStat(label: 'Finish', value: event.finishLabel),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TimeStat extends StatelessWidget {
  const _TimeStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: QType.caption.copyWith(
            color: CupertinoColors.white.withValues(alpha: 0.6),
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: QType.headline.copyWith(
            color: CupertinoColors.white,
            fontWeight: FontWeight.w700,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
      ],
    );
  }
}
