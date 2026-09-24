import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../data/productivity.dart';
import 'activity_rings.dart';

/// A 3-week (21-day) grid of mini [ActivityRings] — one cell per day, oldest
/// week on top and the current week on the bottom (today = last cell).
///
/// Each cell shows a tiny weekday letter, a small ring pair (focus outer /
/// tasks inner) whose fractions come from that day's stats against the current
/// [ProductivityGoals], and the day-of-month number layered in the ring center.
/// Today is emphasized (ember number). Tapping a cell reports the [DayStat]
/// via [onDaySelected].
class RingCalendar extends ConsumerWidget {
  const RingCalendar({super.key, this.onDaySelected});

  final ValueChanged<DayStat>? onDaySelected;

  static const double _ringSize = 34;
  static const double _ringStroke = 4;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final statsAsync = ref.watch(dailyStatsProvider);
    final goals = ref.watch(goalsProvider);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: QSpace.xxs, bottom: QSpace.sm),
          child: Text('Last 3 weeks', style: QType.eyebrow),
        ),
        statsAsync.when(
          data: (stats) => _grid(context, stats, goals),
          loading: () => _skeleton(context),
          error: (_, _) => _grid(context, mockDailyStats(), goals),
        ),
      ],
    );
  }

  Widget _grid(BuildContext context, List<DayStat> stats, ProductivityGoals goals) {
    // Guard against a short list; the contract promises 21 ascending entries.
    final days = stats.length >= 21 ? stats.sublist(stats.length - 21) : stats;
    final today = DateTime.now();

    return Column(
      children: [
        for (var week = 0; week < (days.length / 7).ceil(); week++)
          Padding(
            padding: EdgeInsets.only(bottom: week == (days.length / 7).ceil() - 1 ? 0 : QSpace.sm),
            child: Row(
              children: [
                for (var col = 0; col < 7; col++)
                  Expanded(
                    child: (week * 7 + col) < days.length
                        ? _Cell(
                            day: days[week * 7 + col],
                            goals: goals,
                            isToday: _sameDay(days[week * 7 + col].date, today),
                            onTap: onDaySelected == null
                                ? null
                                : () => onDaySelected!(days[week * 7 + col]),
                          )
                        : const SizedBox.shrink(),
                  ),
              ],
            ),
          ),
      ],
    );
  }

  Widget _skeleton(BuildContext context) {
    final track = QColors.fill.resolveFrom(context).withValues(alpha: 0.5);
    return Column(
      children: [
        for (var week = 0; week < 3; week++)
          Padding(
            padding: EdgeInsets.only(bottom: week == 2 ? 0 : QSpace.sm),
            child: Row(
              children: [
                for (var col = 0; col < 7; col++)
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: QSpace.xxs),
                      child: Column(
                        children: [
                          Container(
                            width: 12,
                            height: 8,
                            decoration: BoxDecoration(
                              color: track,
                              borderRadius: BorderRadius.circular(4),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            width: _ringSize,
                            height: _ringSize,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: track, width: _ringStroke),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }

  static bool _sameDay(DateTime a, DateTime b) =>
      a.year == b.year && a.month == b.month && a.day == b.day;
}

/// One day cell: weekday letter, mini rings, day-of-month centered.
class _Cell extends StatelessWidget {
  const _Cell({required this.day, required this.goals, required this.isToday, this.onTap});

  final DayStat day;
  final ProductivityGoals goals;
  final bool isToday;
  final VoidCallback? onTap;

  static const _weekdayLetters = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  @override
  Widget build(BuildContext context) {
    final focusGoalSeconds = (goals.focusHoursGoal * 3600).clamp(1, 1 << 30);
    final taskGoal = goals.dailyTaskGoal.clamp(1, 1 << 30);
    final focusFraction = day.focusSeconds / focusGoalSeconds;
    final taskFraction = day.tasksDone / taskGoal;
    final letter = _weekdayLetters[(day.date.weekday - 1) % 7];

    final numberColor = isToday
        ? QColors.brand.resolveFrom(context)
        : QColors.label.resolveFrom(context);

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: QSpace.xxs),
        child: Column(
          children: [
            Text(
              letter,
              style: QType.caption2.copyWith(
                color: isToday
                    ? QColors.brand.resolveFrom(context)
                    : QColors.labelTertiary.resolveFrom(context),
                fontWeight: isToday ? FontWeight.w700 : FontWeight.w500,
              ),
            ),
            const SizedBox(height: 4),
            ActivityRings(
              focusFraction: focusFraction,
              taskFraction: taskFraction,
              size: RingCalendar._ringSize,
              strokeWidth: RingCalendar._ringStroke,
              gap: 2,
              animate: false,
              center: Text(
                '${day.date.day}',
                style: QType.caption2.copyWith(
                  color: numberColor,
                  fontWeight: isToday ? FontWeight.w800 : FontWeight.w600,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
