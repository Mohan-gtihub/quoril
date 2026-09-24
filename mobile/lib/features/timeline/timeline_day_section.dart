import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../focus/focus_screen.dart';
import '../home/sheets/task_editor_sheet.dart';
import 'create_task_sheet.dart';
import 'timeline_components.dart';

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
            PlannerEmptyState(
              compact: true,
              icon: CupertinoIcons.calendar_badge_plus,
              title: 'Nothing planned today',
              subtitle: onAdd != null ? 'Capture your first task for today.' : null,
              actionLabel: onAdd != null ? 'Add task' : null,
              onAction: onAdd != null
                  ? () => showCreateTask(context, day: _today)
                  : null,
            )
          else
            for (var i = 0; i < ordered.length; i++)
              TimelineRow(
                compact: true,
                task: ordered[i],
                startMinutes: _startMinutes(ordered[i]),
                durationMin: _dur(ordered[i]),
                nowMin: nowMin,
                isToday: true,
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
}
