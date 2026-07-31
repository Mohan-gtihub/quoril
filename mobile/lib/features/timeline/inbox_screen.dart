import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/app_kit.dart';
import '../home/sheets/task_editor_sheet.dart';
import 'create_task_sheet.dart';
import 'timeline_style.dart';

/// Inbox — captured tasks with no scheduled time yet (Structured's capture list).
/// Tap a task to open it; complete it with the ring.
class InboxScreen extends ConsumerWidget {
  const InboxScreen({super.key});

  bool _scheduled(Task t) {
    final due = t.dueAt;
    if (due != null && (due.hour != 0 || due.minute != 0)) return true;
    return t.startLabel != null;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final all = ref.watch(tasksProvider).valueOrNull ?? const <Task>[];
    final inbox = all.where((t) => !t.done && !_scheduled(t)).toList();

    return AppScaffold(
      title: 'Inbox',
      trailing: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          final n = DateTime.now();
          showCreateTask(context, day: DateTime(n.year, n.month, n.day));
        },
        child: const Icon(CupertinoIcons.add, color: kAccent, size: 24),
      ),
      slivers: [
        if (inbox.isEmpty)
          const SliverFillRemaining(
            hasScrollBody: false,
            child: Center(
              child: Padding(
                padding: EdgeInsets.all(QSpace.xl),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(CupertinoIcons.tray, size: 42, color: CupertinoColors.systemGrey),
                    SizedBox(height: QSpace.sm),
                    Text('Inbox zero', style: QType.title3),
                  ],
                ),
              ),
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
                final c = timelineColorFor(t);
                return GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => showTaskEditorSheet(context, ref, task: t),
                  child: Container(
                    padding: const EdgeInsets.all(QSpace.sm),
                    decoration: BoxDecoration(
                      color: QColors.surface.resolveFrom(context),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 40,
                          height: 40,
                          alignment: Alignment.center,
                          decoration: BoxDecoration(color: c, shape: BoxShape.circle),
                          child: Icon(timelineIconFor(t.title), size: 20, color: CupertinoColors.white),
                        ),
                        const SizedBox(width: QSpace.sm),
                        Expanded(child: Text(t.title, style: QType.headline, maxLines: 1, overflow: TextOverflow.ellipsis)),
                        GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: () {
                            HapticFeedback.selectionClick();
                            ref.read(tasksProvider.notifier).toggleDone(t);
                          },
                          child: Container(
                            width: 26,
                            height: 26,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(color: c.withValues(alpha: 0.6), width: 2),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }
}
