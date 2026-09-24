import 'package:flutter/cupertino.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/data/providers.dart';
import '../../../core/models/models.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/common.dart';
import '../../../core/widgets/primary_button.dart';
import '../../focus/focus_screen.dart';
import '../sheets/quick_add_sheet.dart';
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

  static const _order = [
    TaskBucket.backlog,
    TaskBucket.week,
    TaskBucket.today,
    TaskBucket.done,
  ];

  (Color, String) _badge(BuildContext context, Task t) {
    final wsId = t.listId ?? t.workspaceId;
    final ws = workspaces
        .where((w) => w.id == wsId)
        .cast<Workspace?>()
        .firstWhere((w) => true, orElse: () => null);
    if (ws != null) return (ws.color, ws.badge);
    return (
      QColors.tint,
      t.title.isEmpty ? '?' : t.title.substring(0, 1).toUpperCase(),
    );
  }

  static String _headerLabel(TaskBucket b, int n) {
    final noun = switch (b) {
      TaskBucket.today => n == 1 ? 'task today' : 'tasks today',
      TaskBucket.week => n == 1 ? 'task this week' : 'tasks this week',
      TaskBucket.backlog => n == 1 ? 'task in backlog' : 'tasks in backlog',
      TaskBucket.done => n == 1 ? 'task done' : 'tasks done',
    };
    return '$n $noun';
  }

  static _EmptyCopy _emptyCopy(TaskBucket b) => switch (b) {
        TaskBucket.today => const _EmptyCopy(
            icon: CupertinoIcons.sun_max_fill,
            title: 'Today is clear',
            message: 'Line up one thing to focus on — a clear plan makes it easy to start.',
            cta: 'Add a task for today',
          ),
        TaskBucket.week => const _EmptyCopy(
            icon: CupertinoIcons.calendar,
            title: 'Nothing on deck this week',
            message: 'Park what\'s coming up here so today stays uncluttered.',
            cta: 'Plan this week',
          ),
        TaskBucket.backlog => const _EmptyCopy(
            icon: CupertinoIcons.tray_full_fill,
            title: 'Backlog is empty',
            message: 'Capture ideas and someday-tasks here without cluttering today.',
            cta: 'Add to backlog',
          ),
        TaskBucket.done => const _EmptyCopy(
            icon: CupertinoIcons.checkmark_seal_fill,
            title: 'Nothing finished yet',
            message: 'Completed tasks land here. Your first win of the day shows up soon.',
            cta: '',
          ),
      };

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
      final copy = _emptyCopy(bucket);
      return SliverFillRemaining(
        hasScrollBody: false,
        child: _BucketEmpty(
          copy: copy,
          onAdd: bucket == TaskBucket.done ? null : () => showQuickAddSheet(context, ref, bucket: bucket),
        ),
      );
    }

    return SliverPadding(
      padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.xs, QSpace.md, 140),
      sliver: SliverList.separated(
        itemCount: filtered.length + 1,
        separatorBuilder: (_, _) => const SizedBox(height: QSpace.sm),
        itemBuilder: (context, i) {
          if (i == 0) {
            // A proper section header aligned to the card edge — the same idiom
            // Home + workspace_detail share (was smuggled in as list row 0).
            return Padding(
              padding: const EdgeInsets.only(left: QSpace.xxs, bottom: QSpace.xxs),
              child: Text(
                _headerLabel(bucket, filtered.length),
                style: QType.eyebrow,
              ),
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
            onFocus: () => Navigator.of(context, rootNavigator: true).push(
              CupertinoPageRoute(fullscreenDialog: true, builder: (_) => FocusScreen(task: t)),
            ),
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

/// Per-bucket empty state: a brand-tinted glyph (not gray), human copy, and a
/// scoped quick-add CTA. Encouraging, never shaming.
class _EmptyCopy {
  const _EmptyCopy({required this.icon, required this.title, required this.message, required this.cta});
  final IconData icon;
  final String title;
  final String message;
  final String cta;
}

class _BucketEmpty extends StatelessWidget {
  const _BucketEmpty({required this.copy, this.onAdd});
  final _EmptyCopy copy;
  final VoidCallback? onAdd;

  @override
  Widget build(BuildContext context) {
    // Board empty state — the shared primitive tinted with the workspaces (mint)
    // section accent, with a quiet tinted CTA pill.
    final mint = QSection.workspaces.resolveFrom(context);
    return EmptyState(
      icon: copy.icon,
      title: copy.title,
      message: copy.message,
      accent: mint,
      action: (onAdd != null && copy.cta.isNotEmpty)
          ? PrimaryButton(
              label: copy.cta,
              icon: CupertinoIcons.add,
              style: QButtonStyle.tinted,
              color: mint,
              expand: false,
              onPressed: onAdd,
            )
          : null,
    );
  }
}
