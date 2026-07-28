import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/tokens.dart';
import '../../core/widgets/primary_button.dart';
import '../focus/focus_screen.dart';
import 'sheets/quick_add_sheet.dart';
import 'widgets/bucket_tabs.dart';
import 'widgets/task_list_body.dart';

/// A single workspace's board — same tabs + cards filtered to this workspace.
class WorkspaceDetailScreen extends ConsumerStatefulWidget {
  const WorkspaceDetailScreen({super.key, required this.workspace});
  final Workspace workspace;

  @override
  ConsumerState<WorkspaceDetailScreen> createState() => _WorkspaceDetailScreenState();
}

class _WorkspaceDetailScreenState extends ConsumerState<WorkspaceDetailScreen> {
  TaskBucket _bucket = TaskBucket.today;

  bool _inWorkspace(Task t) => (t.listId ?? t.workspaceId) == widget.workspace.id;

  @override
  Widget build(BuildContext context) {
    final tasksAsync = ref.watch(tasksProvider);
    final workspaces = ref.watch(workspacesProvider).valueOrNull ?? [widget.workspace];
    final all = tasksAsync.valueOrNull ?? const <Task>[];
    final mine = all.where(_inWorkspace).toList();
    final inBucket = mine.where((t) => t.bucket == _bucket).toList();
    final doneCount = inBucket.where((t) => t.done).length;

    return CupertinoPageScaffold(
      backgroundColor: QColors.bgGrouped.resolveFrom(context),
      child: Stack(
        children: [
          CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              CupertinoSliverNavigationBar(
                largeTitle: Text(widget.workspace.name),
                backgroundColor: QColors.bgGrouped.resolveFrom(context).withValues(alpha: 0.9),
                border: null,
              ),
              CupertinoSliverRefreshControl(
                onRefresh: () async {
                  HapticFeedback.selectionClick();
                  ref.invalidate(tasksProvider);
                  await ref.read(tasksProvider.future);
                },
              ),
              SliverToBoxAdapter(
                child: Column(
                  children: [
                    const SizedBox(height: QSpace.xs),
                    BucketTabs(active: _bucket, onChanged: (b) => setState(() => _bucket = b)),
                    const SizedBox(height: QSpace.sm),
                    BucketProgress(done: doneCount, total: inBucket.length),
                    const SizedBox(height: QSpace.sm),
                  ],
                ),
              ),
              TaskListSliver(tasks: mine, workspaces: workspaces, bucket: _bucket),
            ],
          ),
          _bottomBar(context),
        ],
      ),
    );
  }

  Widget _bottomBar(BuildContext context) {
    return Positioned(
      left: QSpace.md,
      right: QSpace.md,
      bottom: 0,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.only(bottom: QSpace.xs),
          child: Row(
            children: [
              Expanded(
                child: PrimaryButton(
                  label: 'Start Focus',
                  icon: CupertinoIcons.bolt_fill,
                  onPressed: () {
                    HapticFeedback.mediumImpact();
                    Navigator.of(context, rootNavigator: true).push(
                      CupertinoPageRoute(fullscreenDialog: true, builder: (_) => const FocusScreen()),
                    );
                  },
                ),
              ),
              const SizedBox(width: QSpace.sm),
              Container(
                decoration: BoxDecoration(
                  color: QColors.tint.resolveFrom(context),
                  shape: BoxShape.circle,
                  boxShadow: QElevation.floating(context),
                ),
                child: CupertinoButton(
                  padding: const EdgeInsets.all(14),
                  borderRadius: BorderRadius.circular(QRadius.capsule),
                  onPressed: () => showQuickAddSheet(context, ref, bucket: _bucket),
                  child: const Icon(CupertinoIcons.add, color: CupertinoColors.white, size: 24),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
