import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/app_kit.dart';
import '../../core/widgets/glass.dart';
import '../home/sheets/task_editor_sheet.dart';
import 'create_task_sheet.dart';
import 'timeline_components.dart';
import 'timeline_style.dart';

/// Inbox — captured tasks with no scheduled time yet (Structured's capture list).
/// Tap to open, tap the calendar affordance (or swipe right) to schedule into
/// the next free slot, swipe left to delete.
class InboxScreen extends ConsumerWidget {
  const InboxScreen({super.key});

  bool _scheduled(Task t) {
    final due = t.dueAt;
    if (due != null && (due.hour != 0 || due.minute != 0)) return true;
    return t.startLabel != null;
  }

  /// Schedule a task into the next quarter-hour slot from now (mock heuristic).
  void _quickSchedule(WidgetRef ref, Task t) {
    final now = DateTime.now();
    var start = DateTime(now.year, now.month, now.day, now.hour, ((now.minute ~/ 15) + 1) * 15);
    if (start.isBefore(now)) start = start.add(const Duration(minutes: 15));
    final dur = (t.estimateMinutes ?? 30).clamp(15, 600);
    ref.read(tasksProvider.notifier).scheduleTask(t, start, durationMinutes: dur);
    HapticFeedback.mediumImpact();
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final all = ref.watch(tasksProvider).valueOrNull ?? const <Task>[];
    final inbox = all.where((t) => !t.done && !_scheduled(t)).toList();

    // Faint calendar-tinted ambient wash behind the frosted inbox rows.
    final brightness =
        MediaQuery.maybeOf(context)?.platformBrightness ?? Brightness.light;
    return GradientBackground(
      gradient: QGradients.ambient(
        QSection.calendar.resolveFrom(context),
        brightness,
      ),
      child: AppScaffold(
      backgroundColor: const Color(0x00000000),
      title: 'Inbox',
      trailing: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          final n = DateTime.now();
          showCreateTask(context, day: DateTime(n.year, n.month, n.day));
        },
        child: Icon(CupertinoIcons.add, color: QSection.calendar.resolveFrom(context), size: 24),
      ),
      slivers: [
        if (inbox.isEmpty)
          SliverFillRemaining(
            hasScrollBody: false,
            child: PlannerEmptyState(
              icon: CupertinoIcons.tray,
              title: 'Inbox zero',
              subtitle: 'Capture anything on your mind.',
              actionLabel: 'Capture a task',
              accent: QSection.calendar,
              onAction: () {
                final n = DateTime.now();
                showCreateTask(context, day: DateTime(n.year, n.month, n.day));
              },
            ),
          )
        else
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.xs, QSpace.md, QSpace.xl),
            sliver: SliverList.separated(
              itemCount: inbox.length,
              separatorBuilder: (_, _) => const SizedBox(height: QSpace.sm),
              itemBuilder: (context, i) {
                final t = inbox[i];
                return Dismissible(
                  key: ValueKey(t.id),
                  background: _swipeBg(context, alignStart: true),
                  secondaryBackground: _swipeBg(context, alignStart: false),
                  confirmDismiss: (dir) async {
                    if (dir == DismissDirection.startToEnd) {
                      _quickSchedule(ref, t); // schedule — removes it from inbox
                      return true;
                    }
                    HapticFeedback.mediumImpact();
                    ref.read(tasksProvider.notifier).remove(t);
                    return true;
                  },
                  child: _InboxRow(
                    task: t,
                    onOpen: () => showTaskEditorSheet(context, ref, task: t),
                    onSchedule: () => _quickSchedule(ref, t),
                  ),
                );
              },
            ),
          ),
      ],
      ),
    );
  }

  Widget _swipeBg(BuildContext context, {required bool alignStart}) {
    final color = alignStart
        ? QSection.calendar.resolveFrom(context)
        : QColors.danger.resolveFrom(context);
    final icon = alignStart ? CupertinoIcons.calendar_badge_plus : CupertinoIcons.trash_fill;
    final label = alignStart ? 'Schedule' : 'Delete';
    return Container(
      decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(16)),
      alignment: alignStart ? Alignment.centerLeft : Alignment.centerRight,
      padding: const EdgeInsets.symmetric(horizontal: QSpace.lg),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (!alignStart) ...[
            Text(label, style: QType.footnoteEmphasized.copyWith(color: CupertinoColors.white)),
            const SizedBox(width: 6),
          ],
          Icon(icon, color: CupertinoColors.white, size: 20),
          if (alignStart) ...[
            const SizedBox(width: 6),
            Text(label, style: QType.footnoteEmphasized.copyWith(color: CupertinoColors.white)),
          ],
        ],
      ),
    );
  }
}

class _InboxRow extends StatelessWidget {
  const _InboxRow({required this.task, required this.onOpen, required this.onSchedule});
  final Task task;
  final VoidCallback onOpen;
  final VoidCallback onSchedule;

  @override
  Widget build(BuildContext context) {
    final c = timelineColorFor(task).resolveFrom(context);
    // Frosted capture row — refracts the ambient wash; tap opens the editor.
    return GlassCard(
      radius: 16,
      tint: c,
      onTap: onOpen,
      padding: const EdgeInsets.all(QSpace.sm),
      child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: c.withValues(alpha: 0.16),
                borderRadius: BorderRadius.circular(QRadius.iconTile + 3),
              ),
              child: Icon(timelineIconFor(task.title), size: 20, color: c),
            ),
            const SizedBox(width: QSpace.sm),
            Expanded(
              child: Text(task.title,
                  style: QType.headline, maxLines: 1, overflow: TextOverflow.ellipsis),
            ),
            const SizedBox(width: QSpace.sm),
            // Schedule affordance (replaces the inert completion ring).
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: onSchedule,
              child: Container(
                width: 32,
                height: 32,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: c.withValues(alpha: 0.15), shape: BoxShape.circle),
                child: Icon(CupertinoIcons.calendar_badge_plus, size: 16, color: c),
              ),
            ),
          ],
        ),
    );
  }
}
