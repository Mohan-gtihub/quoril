import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../focus/focus_screen.dart';
import '../home/sheets/task_editor_sheet.dart';
import 'timeline_style.dart';

/// An embeddable Structured-style timeline for a single day (defaults to today).
/// Non-scrolling Column — drop it into a parent scroll view (e.g. Home, below
/// the greeting + Sessions sections). Connected markers, colored spine, title
/// cards, completion rings; the in-progress task expands into a tall pill.
class TimelineDaySection extends ConsumerWidget {
  const TimelineDaySection({super.key, this.title = 'Timeline', this.onAdd});
  final String title;
  final VoidCallback? onAdd;

  DateTime get _today {
    final n = DateTime.now();
    return DateTime(n.year, n.month, n.day);
  }

  int? _startMinutes(Task t) {
    // An explicit start label is the reliable "scheduled" signal.
    final s = t.startLabel;
    if (s != null) {
      final p = s.split(':');
      if (p.length == 2) {
        final h = int.tryParse(p[0]);
        final m = int.tryParse(p[1]);
        if (h != null && m != null) return h * 60 + m;
      }
    }
    // Fall back to dueAt time, but ignore the bucket defaults (00:00 / 23:59)
    // which mean "sometime today", not a real slot → those read as Anytime.
    final due = t.dueAt;
    if (due != null) {
      final mins = due.hour * 60 + due.minute;
      if (mins != 0 && mins != 23 * 60 + 59) return mins;
    }
    return null;
  }

  int _dur(Task t) => (t.estimateMinutes ?? 30).clamp(15, 600);

  DateTime? _dayOf(Task t) {
    final due = t.dueAt;
    if (due != null) return DateTime(due.year, due.month, due.day);
    return t.bucket == TaskBucket.today ? _today : null;
  }

  bool _isToday(DateTime? d) => d != null && d.year == _today.year && d.month == _today.month && d.day == _today.day;

  void _focus(BuildContext context, Task t) {
    HapticFeedback.mediumImpact();
    Navigator.of(context, rootNavigator: true).push(
      CupertinoPageRoute(fullscreenDialog: true, builder: (_) => FocusScreen(task: t)),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final all = ref.watch(tasksProvider).valueOrNull ?? const <Task>[];
    final today = all.where((t) => _isToday(_dayOf(t))).toList();
    final scheduled = today.where((t) => _startMinutes(t) != null).toList()
      ..sort((a, b) => _startMinutes(a)!.compareTo(_startMinutes(b)!));
    final anytime = today.where((t) => _startMinutes(t) == null).toList();
    final nowMin = DateTime.now().hour * 60 + DateTime.now().minute;

    final ordered = [...anytime, ...scheduled];

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.only(bottom: QSpace.sm, top: QSpace.xs),
            child: Row(
              children: [
                Text(title, style: QType.title3.copyWith(fontWeight: FontWeight.w700)),
                const Spacer(),
                if (onAdd != null)
                  GestureDetector(
                    behavior: HitTestBehavior.opaque,
                    onTap: () {
                      HapticFeedback.lightImpact();
                      onAdd!();
                    },
                    child: Container(
                      width: 30,
                      height: 30,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(color: QColors.fill.resolveFrom(context), shape: BoxShape.circle),
                      child: Icon(CupertinoIcons.add, size: 17, color: QColors.label.resolveFrom(context)),
                    ),
                  ),
              ],
            ),
          ),
          if (ordered.isEmpty)
            _empty(context)
          else
            for (var i = 0; i < ordered.length; i++)
              _Row(
                task: ordered[i],
                start: _startMinutes(ordered[i]),
                durationMin: _dur(ordered[i]),
                nowMin: nowMin,
                first: i == 0,
                last: i == ordered.length - 1,
                onToggle: () => ref.read(tasksProvider.notifier).toggleDone(ordered[i]),
                onTap: () => showTaskEditorSheet(context, ref, task: ordered[i]),
                onFocus: () => _focus(context, ordered[i]),
              ),
        ],
      ),
    );
  }

  Widget _empty(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: QSpace.xl),
      decoration: BoxDecoration(
        color: QColors.surface.resolveFrom(context),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        children: [
          Icon(CupertinoIcons.calendar_badge_plus, size: 30, color: QColors.labelTertiary.resolveFrom(context)),
          const SizedBox(height: QSpace.xs),
          Text('Nothing planned today', style: QType.subhead),
        ],
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({
    required this.task,
    required this.start,
    required this.durationMin,
    required this.nowMin,
    required this.first,
    required this.last,
    required this.onToggle,
    required this.onTap,
    required this.onFocus,
  });

  final Task task;
  final int? start;
  final int durationMin;
  final int nowMin;
  final bool first;
  final bool last;
  final VoidCallback onToggle;
  final VoidCallback onTap;
  final VoidCallback onFocus;

  String _fmt(int mins) {
    final h = (mins ~/ 60) % 24;
    final m = mins % 60;
    return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}';
  }

  String _durLabel(int m) {
    final h = m ~/ 60, mm = m % 60;
    if (h > 0) return mm > 0 ? '${h}h ${mm}m' : '${h}h';
    return '${m}m';
  }

  @override
  Widget build(BuildContext context) {
    final c = timelineColorFor(task);
    final done = task.done;
    final active = start != null && nowMin >= start! && nowMin < start! + durationMin;
    final markerH = active ? 84.0 : 44.0;
    // The card subtitle carries the detail; the left column carries the time.
    final String subtitle;
    if (active) {
      subtitle = '${(start! + durationMin - nowMin).clamp(0, durationMin)}m left';
    } else if (start != null) {
      subtitle = '${_fmt(start!)} – ${_fmt(start! + durationMin)}';
    } else {
      subtitle = _durLabel(durationMin);
    }

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Time rail — a real time, or a quiet "Anytime", always the same width
          // so every marker lines up.
          SizedBox(
            width: 52,
            child: Padding(
              padding: EdgeInsets.only(top: markerH / 2 - 7, right: QSpace.xs),
              child: Text(
                start == null ? 'Anytime' : _fmt(start!),
                textAlign: TextAlign.right,
                maxLines: 1,
                style: QType.caption.copyWith(
                  color: active ? QColors.label.resolveFrom(context) : QColors.labelTertiary.resolveFrom(context),
                  fontWeight: active ? FontWeight.w800 : FontWeight.w600,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
            ),
          ),
          const SizedBox(width: 6),
          // Marker + colored spine.
          SizedBox(
            width: 46,
            child: Column(
              children: [
                Container(
                  width: 44,
                  height: markerH,
                  alignment: active ? Alignment.topCenter : Alignment.center,
                  padding: EdgeInsets.only(top: active ? 11 : 0),
                  decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(active ? 22 : 999)),
                  child: Icon(timelineIconFor(task.title), size: 22, color: CupertinoColors.white),
                ),
                Expanded(
                  child: Center(
                    child: Container(
                      width: 5,
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
              padding: const EdgeInsets.only(top: 4, bottom: QSpace.md),
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: onTap,
                child: Container(
                  padding: const EdgeInsets.all(QSpace.md),
                  decoration: BoxDecoration(color: QColors.surface.resolveFrom(context), borderRadius: BorderRadius.circular(14)),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(subtitle,
                                style: QType.caption.copyWith(
                                  color: active ? c : QColors.labelSecondary.resolveFrom(context),
                                  fontWeight: active ? FontWeight.w700 : FontWeight.w400,
                                  fontFeatures: const [FontFeature.tabularFigures()],
                                )),
                            const SizedBox(height: 2),
                            Text(
                              task.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: QType.headline.copyWith(
                                fontWeight: FontWeight.w700,
                                decoration: done ? TextDecoration.lineThrough : null,
                                color: done ? QColors.labelTertiary.resolveFrom(context) : QColors.label.resolveFrom(context),
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
                          width: 32,
                          height: 32,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(color: c.withValues(alpha: 0.15), shape: BoxShape.circle),
                          child: Icon(CupertinoIcons.play_fill, size: 13, color: c),
                        ),
                      ),
                      const SizedBox(width: QSpace.xs),
                      GestureDetector(
                        behavior: HitTestBehavior.opaque,
                        onTap: () {
                          HapticFeedback.selectionClick();
                          onToggle();
                        },
                        child: Container(
                          width: 24,
                          height: 24,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(
                            color: done ? c : const Color(0x00000000),
                            shape: BoxShape.circle,
                            border: Border.all(color: done ? c : c.withValues(alpha: 0.55), width: 2),
                          ),
                          child: done ? const Icon(CupertinoIcons.checkmark_alt, size: 13, color: CupertinoColors.white) : null,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
