import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/models/models.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/glass.dart';
import 'timeline_style.dart';

/// ONE empty-state used across the planner (timeline day, day section, inbox).
/// Quiet, tertiary-label, with an optional single action.
class PlannerEmptyState extends StatelessWidget {
  const PlannerEmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.subtitle,
    this.actionLabel,
    this.onAction,
    this.compact = false,
    this.accent,
  });

  final IconData icon;
  final String title;
  final String? subtitle;
  final String? actionLabel;
  final VoidCallback? onAction;

  /// Compact = boxed card (embedded in a scroll); full = centered fill.
  final bool compact;

  /// Accent for the action pill (defaults to the ember brand when null).
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final tertiary = QColors.labelTertiary.resolveFrom(context);
    final content = Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: compact ? 30 : 42, color: tertiary),
        SizedBox(height: compact ? QSpace.xs : QSpace.sm),
        Text(title,
            textAlign: TextAlign.center,
            style: (compact ? QType.subhead : QType.title3Emphasized)
                .copyWith(color: QColors.labelSecondary.resolveFrom(context))),
        if (subtitle != null) ...[
          const SizedBox(height: 2),
          Text(subtitle!,
              textAlign: TextAlign.center,
              style: QType.footnote.copyWith(color: tertiary)),
        ],
        if (actionLabel != null && onAction != null) ...[
          SizedBox(height: compact ? QSpace.sm : QSpace.md),
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () {
              HapticFeedback.lightImpact();
              onAction!();
            },
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: QSpace.xs),
              decoration: BoxDecoration(
                color: (accent ?? QColors.brand).resolveFrom(context),
                borderRadius: BorderRadius.circular(QRadius.capsule),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(CupertinoIcons.add, size: 15, color: CupertinoColors.white),
                  const SizedBox(width: 5),
                  Text(actionLabel!,
                      style: QType.footnoteEmphasized.copyWith(color: CupertinoColors.white)),
                ],
              ),
            ),
          ),
        ],
      ],
    );

    if (compact) {
      // Frosted content material — refracts the ambient wash behind the planner.
      return GlassCard(
        radius: QRadius.taskCard,
        tint: accent,
        interactive: false,
        padding: const EdgeInsets.symmetric(
            horizontal: QSpace.md, vertical: QSpace.xl),
        child: SizedBox(width: double.infinity, child: content),
      );
    }
    return Center(
      child: Padding(padding: const EdgeInsets.all(QSpace.xl), child: content),
    );
  }
}

/// Small, readable per-day busyness indicator: 1–3 dots capped with a "3+"
/// pill. Replaces the ambiguous multi-color micro-bars. One brand tint only.
class DensityDots extends StatelessWidget {
  const DensityDots({super.key, required this.count, this.size = 5, this.color});
  final int count;
  final double size;

  /// Optional accent tint for the dots. Defaults to the ember brand when null so
  /// existing call sites keep their look; the planner passes its section accent.
  final Color? color;

  @override
  Widget build(BuildContext context) {
    if (count <= 0) return SizedBox(height: size);
    final tint = (color ?? QColors.brand).resolveFrom(context);
    if (count > 3) {
      return Text('3+',
          style: QType.caption2.copyWith(
            fontSize: 9,
            height: 1,
            fontWeight: FontWeight.w800,
            color: tint,
            fontFeatures: const [FontFeature.tabularFigures()],
          ));
    }
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      mainAxisSize: MainAxisSize.min,
      children: [
        for (var i = 0; i < count; i++)
          Container(
            width: size,
            height: size,
            margin: const EdgeInsets.symmetric(horizontal: 1),
            decoration: BoxDecoration(color: tint, shape: BoxShape.circle),
          ),
      ],
    );
  }
}

/// THE single planner timeline row. Used by the full Timeline screen and the
/// embedded Home day section via [compact]. Shared rail width, marker geometry,
/// spine, active "now" expansion, completion ring, and optional focus button.
class TimelineRow extends StatelessWidget {
  const TimelineRow({
    super.key,
    required this.task,
    required this.startMinutes,
    required this.durationMin,
    required this.nowMin,
    required this.isToday,
    required this.first,
    required this.last,
    required this.onToggle,
    required this.onTap,
    required this.onFocus,
    this.compact = false,
  });

  final Task task;

  /// null == "Anytime" (unscheduled but placed on the day list).
  final int? startMinutes;
  final int durationMin;
  final int nowMin;
  final bool isToday;
  final bool first;
  final bool last;
  final VoidCallback onToggle;
  final VoidCallback onTap;
  final VoidCallback onFocus;

  /// Compact = carded content (Home); full = flat content (Timeline screen).
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final c = timelineColorFor(task).resolveFrom(context);
    final done = task.done;
    final active = isToday &&
        startMinutes != null &&
        nowMin >= startMinutes! &&
        nowMin < startMinutes! + durationMin;
    final markerH = active ? TimelineMetrics.markerActive : TimelineMetrics.markerSize;

    final String subtitle;
    if (active) {
      subtitle = '${(startMinutes! + durationMin - nowMin).clamp(0, durationMin)}m remaining';
    } else if (startMinutes != null) {
      subtitle =
          '${clockLabel(context, startMinutes!)} – ${clockLabel(context, startMinutes! + durationMin)}  (${durationLabel(durationMin)})';
    } else {
      subtitle = 'Anytime · ${durationLabel(durationMin)}';
    }

    final railText = startMinutes == null ? 'Anytime' : clockLabel(context, startMinutes!);

    Widget content = Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: QType.caption.copyWith(
                    color: active ? c : QColors.labelSecondary.resolveFrom(context),
                    fontWeight: active ? FontWeight.w700 : FontWeight.w400,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  )),
              const SizedBox(height: 2),
              Text(task.title,
                  maxLines: compact ? 1 : 2,
                  overflow: TextOverflow.ellipsis,
                  style: QType.headline.copyWith(
                    fontWeight: FontWeight.w700,
                    decoration: done ? TextDecoration.lineThrough : null,
                    color: done
                        ? QColors.labelTertiary.resolveFrom(context)
                        : QColors.label.resolveFrom(context),
                  )),
            ],
          ),
        ),
        const SizedBox(width: QSpace.sm),
        // Focus button (skip when done — nothing to focus).
        if (!done) ...[
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: onFocus,
            child: Container(
              width: 32,
              height: 32,
              alignment: Alignment.center,
              decoration: BoxDecoration(color: c.withValues(alpha: 0.15), shape: BoxShape.circle),
              child: Icon(CupertinoIcons.play_fill, size: 13, color: c),
            ),
          ),
          const SizedBox(width: QSpace.xs),
        ],
        _CompletionRing(color: c, done: done, onToggle: onToggle),
      ],
    );

    if (compact) {
      // Frosted content card for the embedded (Home) timeline row. The row's own
      // GestureDetector below handles the tap, so this card is non-interactive.
      content = GlassCard(
        radius: QRadius.taskCard,
        tint: c,
        interactive: false,
        child: content,
      );
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Time rail.
          SizedBox(
            width: TimelineMetrics.railWidth,
            child: Padding(
              padding: EdgeInsets.only(top: markerH / 2 - 7, right: QSpace.xs),
              child: Text(railText,
                  textAlign: TextAlign.right,
                  maxLines: 1,
                  style: QType.caption.copyWith(
                    color: active
                        ? QColors.label.resolveFrom(context)
                        : QColors.labelTertiary.resolveFrom(context),
                    fontWeight: active ? FontWeight.w800 : FontWeight.w600,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  )),
            ),
          ),
          const SizedBox(width: 6),
          // Marker + spine.
          SizedBox(
            width: TimelineMetrics.markerColumn,
            child: Column(
              children: [
                Container(
                  width: TimelineMetrics.markerSize,
                  height: markerH,
                  alignment: active ? Alignment.topCenter : Alignment.center,
                  padding: EdgeInsets.only(top: active ? 11 : 0),
                  decoration: BoxDecoration(
                    color: c,
                    borderRadius: BorderRadius.circular(active ? 22 : 999),
                  ),
                  child: Icon(timelineIconFor(task.title), size: 22, color: CupertinoColors.white),
                ),
                Expanded(
                  child: Center(
                    child: Container(
                      width: TimelineMetrics.spineWidth,
                      decoration: BoxDecoration(
                        color: last ? const Color(0x00000000) : c.withValues(alpha: done ? 0.3 : 0.85),
                        borderRadius: BorderRadius.circular(3),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: QSpace.sm),
          Expanded(
            child: Padding(
              padding: EdgeInsets.only(
                top: compact ? 4 : 6,
                bottom: compact ? QSpace.md : QSpace.lg,
                right: compact ? 0 : QSpace.md,
              ),
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: onTap,
                child: content,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ===========================================================================
// EMBER EDITORIAL — day timeline hour-grid vocabulary
// ===========================================================================
//
// The day view is a proper time canvas: a 52pt gutter of bare hour numerals,
// ~64pt hour rows, category-tinted time-block cards, and — the screen's ONE
// ember focal point — the glowing now-line. Everything else stays quiet.

/// The bare-numeral hour gutter for the day canvas: "9 / 10 / 11" in footnote,
/// tertiary, right-aligned against a 52pt column, one label per hour row.
class HourGutter extends StatelessWidget {
  const HourGutter({
    super.key,
    required this.startHour,
    required this.endHour,
    this.width = TimelineMetrics.railWidth,
    this.pxPerMin = TimelineMetrics.pxPerMin,
  });

  final int startHour;
  final int endHour;
  final double width;
  final double pxPerMin;

  @override
  Widget build(BuildContext context) {
    final use24 = MediaQuery.maybeOf(context)?.alwaysUse24HourFormat ?? false;
    final tertiary = QColors.labelTertiary.resolveFrom(context);
    String label(int h) {
      if (use24) return h.toString();
      final period = h < 12 ? 'AM' : 'PM';
      var h12 = h % 12;
      if (h12 == 0) h12 = 12;
      return '$h12 $period';
    }

    return SizedBox(
      width: width,
      height: (endHour - startHour) * 60 * pxPerMin,
      child: Stack(
        children: [
          for (var h = startHour; h < endHour; h++)
            Positioned(
              top: (h - startHour) * 60 * pxPerMin - 7,
              right: QSpace.sm,
              child: Text(
                label(h),
                textAlign: TextAlign.right,
                style: QType.footnote.copyWith(
                  color: tertiary,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Faint horizontal hour hairlines behind the blocks (one per hour row).
class HourGridlines extends StatelessWidget {
  const HourGridlines({
    super.key,
    required this.startHour,
    required this.endHour,
    this.pxPerMin = TimelineMetrics.pxPerMin,
  });

  final int startHour;
  final int endHour;
  final double pxPerMin;

  @override
  Widget build(BuildContext context) {
    final color = QColors.separator.resolveFrom(context).withValues(alpha: 0.5);
    return Positioned.fill(
      child: Stack(
        children: [
          for (var h = startHour; h <= endHour; h++)
            Positioned(
              top: (h - startHour) * 60 * pxPerMin,
              left: 0,
              right: 0,
              child: Container(height: 0.5, color: color),
            ),
        ],
      ),
    );
  }
}

/// THE ember focal point: a 1.5pt ember line + a 7pt ember dot at the rail,
/// wrapped in a soft ember @ 40%, blur-8 glow. Exactly one per screen.
class NowLine extends StatelessWidget {
  const NowLine({super.key, this.dotAtStart = true, this.color});

  /// Whether the dot sits at the left rail (day view) — always true here.
  final bool dotAtStart;

  /// The now-line hue (defaults to the ember brand). The planner passes its
  /// section accent so the one color moment matches the screen.
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final ember = (color ?? QColors.brand).resolveFrom(context);
    return IgnorePointer(
      child: Row(
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(
              color: ember,
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: ember.withValues(alpha: 0.40),
                  blurRadius: 8,
                ),
              ],
            ),
          ),
          Expanded(
            child: Container(
              height: 1.5,
              decoration: BoxDecoration(
                color: ember,
                boxShadow: [
                  BoxShadow(
                    color: ember.withValues(alpha: 0.40),
                    blurRadius: 8,
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// A single category-tinted time-block card for the day canvas. Radius 14, a
/// 3pt left category accent bar (the ONE place non-ember hues live), fill =
/// category @ 10–14% over surface, subhead-semibold title + caption time.
/// When the block is the in-progress "now" task its accent lifts to ember.
class TimeBlockCard extends StatelessWidget {
  const TimeBlockCard({
    super.key,
    required this.task,
    required this.startMinutes,
    required this.durationMin,
    required this.active,
    required this.onTap,
    this.accent,
  });

  final Task task;
  final int startMinutes;
  final int durationMin;
  final bool active;
  final VoidCallback onTap;

  /// The "now / active" accent (defaults to the ember brand).
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final cat = timelineColorFor(task).resolveFrom(context);
    final ember = (accent ?? QColors.brand).resolveFrom(context);
    final barAccent = active ? ember : cat;
    final done = task.done;
    // Tall enough to show the second (time) line?
    final tall = durationMin * TimelineMetrics.pxPerMin >= 44;

    // Frosted time-block: a translucent glass card carrying a whisper of the
    // category (or active-ember) hue, with the 3pt left accent bar kept as the
    // category signal. When active it leans into the ember tint a touch more.
    return GlassCard(
      radius: TimelineMetrics.blockRadius,
      tint: active ? ember : cat,
      onTap: onTap,
      padding: EdgeInsets.zero,
      child: SizedBox.expand(
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(width: TimelineMetrics.accentBar, color: barAccent),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(
                    horizontal: QSpace.sm, vertical: 6),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Row(
                      children: [
                        Icon(timelineIconFor(task.title),
                            size: 13, color: barAccent),
                        const SizedBox(width: 5),
                        Expanded(
                          child: Text(
                            task.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: QType.subhead.copyWith(
                              fontWeight: FontWeight.w600,
                              color: done
                                  ? QColors.labelTertiary.resolveFrom(context)
                                  : QColors.label.resolveFrom(context),
                              decoration:
                                  done ? TextDecoration.lineThrough : null,
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (tall) ...[
                      const SizedBox(height: 2),
                      Text(
                        active
                            ? '${(startMinutes + durationMin - (DateTime.now().hour * 60 + DateTime.now().minute)).clamp(0, durationMin)}m left'
                            : '${clockLabel(context, startMinutes)} – ${clockLabel(context, startMinutes + durationMin)}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: QType.caption.copyWith(
                          color: active
                              ? ember
                              : QColors.labelSecondary.resolveFrom(context),
                          fontWeight: active ? FontWeight.w700 : FontWeight.w400,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// The full day time-canvas: hour gutter + gridlines + positioned time-blocks +
/// the ember now-line, auto-scrolling to now. Unscheduled ("anytime") tasks are
/// handled by the caller above this canvas.
class DayTimeline extends StatefulWidget {
  const DayTimeline({
    super.key,
    required this.tasks,
    required this.startMinutes,
    required this.durationMin,
    required this.isToday,
    required this.onTapTask,
    this.accent,
  });

  /// Already filtered to the day and scheduled (start != null), sorted by start.
  final List<Task> tasks;
  final int Function(Task) startMinutes;
  final int Function(Task) durationMin;
  final bool isToday;
  final void Function(Task) onTapTask;

  /// The one color moment for the canvas (now-line + active block). Defaults to
  /// the ember brand; the calendar planner passes its section accent (grape).
  final Color? accent;

  @override
  State<DayTimeline> createState() => _DayTimelineState();
}

class _DayTimelineState extends State<DayTimeline> {
  final _scroll = ScrollController();

  int get _startHour {
    var earliest = 6;
    for (final t in widget.tasks) {
      earliest = earliest < widget.startMinutes(t) ~/ 60
          ? earliest
          : widget.startMinutes(t) ~/ 60;
    }
    if (widget.isToday) {
      final nowH = DateTime.now().hour;
      if (nowH < earliest) earliest = nowH;
    }
    return earliest.clamp(0, 23);
  }

  int get _endHour {
    var latest = 22;
    for (final t in widget.tasks) {
      final end = (widget.startMinutes(t) + widget.durationMin(t) + 59) ~/ 60;
      latest = latest > end ? latest : end;
    }
    return latest.clamp(_startHour + 1, 24);
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToNow());
  }

  void _scrollToNow() {
    if (!_scroll.hasClients || !widget.isToday) return;
    final now = DateTime.now().hour * 60 + DateTime.now().minute;
    final target =
        (now - _startHour * 60) * TimelineMetrics.pxPerMin - 120;
    _scroll.jumpTo(target.clamp(0.0, _scroll.position.maxScrollExtent));
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final startHour = _startHour;
    final endHour = _endHour;
    final laneHeight = (endHour - startHour) * 60 * TimelineMetrics.pxPerMin;
    final nowMin = DateTime.now().hour * 60 + DateTime.now().minute;

    return SingleChildScrollView(
      controller: _scroll,
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.only(bottom: QSpace.xxl),
      child: SizedBox(
        height: laneHeight,
        child: Stack(
          children: [
            Padding(
              padding: EdgeInsets.only(left: TimelineMetrics.railWidth),
              child: HourGridlines(startHour: startHour, endHour: endHour),
            ),
            HourGutter(startHour: startHour, endHour: endHour),
            for (final t in widget.tasks)
              _positioned(context, t, startHour, nowMin),
            if (widget.isToday && nowMin >= startHour * 60 && nowMin <= endHour * 60)
              Positioned(
                top: (nowMin - startHour * 60) * TimelineMetrics.pxPerMin - 3.5,
                left: TimelineMetrics.railWidth - 3.5,
                right: QSpace.md,
                child: NowLine(color: widget.accent),
              ),
          ],
        ),
      ),
    );
  }

  Widget _positioned(BuildContext context, Task t, int startHour, int nowMin) {
    final start = widget.startMinutes(t);
    final dur = widget.durationMin(t);
    final top = (start - startHour * 60) * TimelineMetrics.pxPerMin;
    final height =
        (dur * TimelineMetrics.pxPerMin - 4).clamp(28.0, double.infinity);
    final active = widget.isToday && nowMin >= start && nowMin < start + dur;
    return Positioned(
      top: top,
      left: TimelineMetrics.railWidth + QSpace.xs,
      right: QSpace.md,
      height: height.toDouble(),
      child: TimeBlockCard(
        task: t,
        startMinutes: start,
        durationMin: dur,
        active: active,
        accent: widget.accent,
        onTap: () => widget.onTapTask(t),
      ),
    );
  }
}

class _CompletionRing extends StatelessWidget {
  const _CompletionRing({required this.color, required this.done, required this.onToggle});
  final Color color;
  final bool done;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.selectionClick();
        onToggle();
      },
      child: AnimatedContainer(
        duration: QMotion.duration(context, QMotion.fast),
        width: 26,
        height: 26,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: done ? color : const Color(0x00000000),
          shape: BoxShape.circle,
          border: Border.all(color: done ? color : color.withValues(alpha: 0.6), width: 2),
        ),
        child: done
            ? const Icon(CupertinoIcons.checkmark_alt, size: 14, color: CupertinoColors.white)
            : null,
      ),
    );
  }
}
