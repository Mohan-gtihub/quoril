import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/providers.dart';
import '../../../core/models/models.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/common.dart';
import '../sheets/task_editor_sheet.dart';
import 'task_card.dart';

/// The filtered, bucketed task list rendered as slivers. Shared by Home and
/// WorkspaceDetail so the card behavior stays identical.
class TaskListSliver extends ConsumerWidget {
  const TaskListSliver({
    super.key,
    required this.tasks,
    required this.workspaces,
    required this.bucket,
  });

  final List<Task> tasks;
  final List<Workspace> workspaces;
  final TaskBucket bucket;

  static const _order = [TaskBucket.backlog, TaskBucket.week, TaskBucket.today, TaskBucket.done];

  (Color, String) _badge(BuildContext context, Task t) {
    final wsId = t.listId ?? t.workspaceId;
    final ws = workspaces.where((w) => w.id == wsId).cast<Workspace?>().firstWhere((w) => true, orElse: () => null);
    if (ws != null) return (ws.color, ws.badge);
    return (QColors.tint, t.title.isEmpty ? '?' : t.title.substring(0, 1).toUpperCase());
  }

  void _move(WidgetRef ref, Task t, int dir) {
    final i = _order.indexOf(t.bucket);
    final ni = (i + dir).clamp(0, _order.length - 1);
    if (ni == i) return;
    ref.read(tasksProvider.notifier).move(t, _order[ni]);
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final filtered = tasks.where((t) => t.bucket == bucket).toList();

    if (filtered.isEmpty) {
      return const SliverFillRemaining(
        hasScrollBody: false,
        child: EmptyState(
          icon: CupertinoIcons.tray,
          title: 'Nothing here yet',
          message: 'Add a task or move one into this bucket.',
        ),
      );
    }

    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.xs, QSpace.md, 140),
      sliver: SliverList.separated(
        itemCount: filtered.length + 1,
        separatorBuilder: (_, __) => const SizedBox(height: QSpace.sm),
        itemBuilder: (context, i) {
          if (i == 0) {
            return Padding(
              padding: const EdgeInsets.only(left: QSpace.xxs, bottom: 2),
              child: Text('${filtered.length} scheduled tasks', style: QType.footnote),
            );
          }
          final t = filtered[i - 1];
          final (color, letter) = _badge(context, t);
          final idx = _order.indexOf(t.bucket);
          return TaskCard(
            task: t,
            badgeColor: color,
            badgeLetter: letter,
            onToggle: () => ref.read(tasksProvider.notifier).toggleDone(t),
            onMovePrev: idx > 0 ? () => _move(ref, t, -1) : null,
            onMoveNext: idx < _order.length - 1 ? () => _move(ref, t, 1) : null,
            onTap: () => showTaskEditorSheet(context, ref, task: t),
            onEdit: () => showTaskEditorSheet(context, ref, task: t),
            onDelete: () => ref.read(tasksProvider.notifier).remove(t),
            onSubtaskToggle: (s) {
              s.done = !s.done;
              ref.read(tasksProvider.notifier).updateTask(t);
            },
          );
        },
      ),
    );
  }
}
