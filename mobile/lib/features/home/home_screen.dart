import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/mock_data.dart';
import '../../core/data/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/primary_button.dart';
import '../focus/focus_screen.dart';
import 'sheets/quick_add_sheet.dart';
import 'sheets/task_editor_sheet.dart';
import 'sheets/workspace_picker_sheet.dart';
import 'widgets/bucket_tabs.dart';
import 'widgets/task_list_body.dart';
import 'workspace_detail_screen.dart';

/// The Blitzit-style board — Quoril's home centerpiece.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  TaskBucket _bucket = TaskBucket.today;
  String? _selectedWsId; // null => All lists
  final List<Workspace> _localWorkspaces = [];

  List<Workspace> _allWorkspaces() {
    final remote = ref.watch(workspacesProvider).valueOrNull ?? Mock.workspaces;
    return [...remote, ..._localWorkspaces];
  }

  String get _greeting {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  Future<void> _openWorkspacePicker() async {
    HapticFeedback.selectionClick();
    final pick = await showWorkspacePickerSheet(
      context,
      workspaces: _allWorkspaces(),
      currentId: _selectedWsId,
      onCreate: () async {
        final ws = await showNewWorkspaceSheet(context);
        if (ws != null) setState(() => _localWorkspaces.add(ws));
        return ws;
      },
    );
    if (pick == null || !mounted) return;
    if (pick.workspace == null) {
      setState(() => _selectedWsId = null);
    } else {
      Navigator.of(context).push(
        CupertinoPageRoute(builder: (_) => WorkspaceDetailScreen(workspace: pick.workspace!)),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final tasksAsync = ref.watch(tasksProvider);
    final workspaces = _allWorkspaces();
    final all = tasksAsync.valueOrNull ?? const <Task>[];
    final inBucket = all.where((t) => t.bucket == _bucket).toList();
    final doneCount = inBucket.where((t) => t.done).length;

    final selectedName = _selectedWsId == null
        ? 'All lists'
        : (workspaces.where((w) => w.id == _selectedWsId).cast<Workspace?>().firstWhere((w) => true, orElse: () => null)?.name ?? 'All lists');

    return CupertinoPageScaffold(
      backgroundColor: QColors.bgGrouped.resolveFrom(context),
      child: Stack(
        children: [
          SafeArea(
            bottom: false,
            child: CustomScrollView(
              physics: const BouncingScrollPhysics(),
              slivers: [
                CupertinoSliverRefreshControl(
                  onRefresh: () async {
                    HapticFeedback.selectionClick();
                    ref.invalidate(tasksProvider);
                    await ref.read(tasksProvider.future);
                  },
                ),
                SliverToBoxAdapter(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _Header(
                        workspaces: workspaces,
                        selectedName: selectedName,
                        greeting: _greeting,
                        onTapSelector: _openWorkspacePicker,
                      ),
                      const SizedBox(height: QSpace.sm),
                      const _InsightsPeek(),
                      const SizedBox(height: QSpace.md),
                      BucketTabs(active: _bucket, onChanged: (b) => setState(() => _bucket = b)),
                      const SizedBox(height: QSpace.sm),
                      BucketProgress(done: doneCount, total: inBucket.length),
                      const SizedBox(height: QSpace.sm),
                    ],
                  ),
                ),
                tasksAsync.when(
                  loading: () => const SliverFillRemaining(
                    hasScrollBody: false,
                    child: Center(child: CupertinoActivityIndicator()),
                  ),
                  error: (_, __) => const SliverFillRemaining(
                    hasScrollBody: false,
                    child: EmptyState(icon: CupertinoIcons.exclamationmark_triangle, title: 'Could not load tasks'),
                  ),
                  data: (_) => TaskListSliver(tasks: all, workspaces: workspaces, bucket: _bucket),
                ),
              ],
            ),
          ),
          _bottomBar(context, all),
        ],
      ),
    );
  }

  Widget _bottomBar(BuildContext context, List<Task> all) {
    final todayTop = all
        .where((t) => t.bucket == TaskBucket.today && !t.done)
        .cast<Task?>()
        .firstWhere((t) => true, orElse: () => null);
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
                  label: todayTop == null ? 'Start Focus' : 'Focus: ${_short(todayTop.title)}',
                  icon: CupertinoIcons.bolt_fill,
                  onPressed: () {
                    HapticFeedback.mediumImpact();
                    Navigator.of(context, rootNavigator: true).push(
                      CupertinoPageRoute(fullscreenDialog: true, builder: (_) => FocusScreen(task: todayTop)),
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
                  onPressed: () {
                    HapticFeedback.lightImpact();
                    showTaskEditorSheet(context, ref, task: null);
                  },
                  child: const Icon(CupertinoIcons.add, color: CupertinoColors.white, size: 24),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  static String _short(String s) => s.length <= 14 ? s : '${s.substring(0, 13)}…';
}

class _Header extends ConsumerWidget {
  const _Header({
    required this.workspaces,
    required this.selectedName,
    required this.greeting,
    required this.onTapSelector,
  });
  final List<Workspace> workspaces;
  final String selectedName;
  final String greeting;
  final VoidCallback onTapSelector;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider).valueOrNull;
    final email = ref.watch(authServiceProvider).user?.email;
    final initials = _initials(profile?['name']?.toString() ?? email);

    return Padding(
      padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.sm, QSpace.md, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: onTapSelector,
                  child: Row(
                    children: [
                      _StackedBadges(workspaces: workspaces.take(3).toList()),
                      const SizedBox(width: QSpace.sm),
                      Flexible(
                        child: Text(selectedName, style: QType.title2, overflow: TextOverflow.ellipsis),
                      ),
                      const SizedBox(width: 4),
                      Icon(CupertinoIcons.chevron_down, size: 18, color: QColors.labelSecondary.resolveFrom(context)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: QSpace.sm),
              GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () => HapticFeedback.selectionClick(),
                child: Container(
                  width: 40,
                  height: 40,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: QColors.tint.resolveFrom(context).withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: Text(initials, style: QType.subhead.copyWith(color: QColors.tint.resolveFrom(context), fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
          const SizedBox(height: QSpace.sm),
          Text(greeting, style: QType.subhead),
          const SizedBox(height: QSpace.xs),
          Row(
            children: [
              QChip(icon: CupertinoIcons.flame_fill, label: '${Mock.streakDays} day streak', color: QColors.breakColor),
              const SizedBox(width: QSpace.xs),
              QChip(icon: CupertinoIcons.timer, label: '${fmtHm(Mock.focusTodaySeconds)} focused', color: QColors.tint),
            ],
          ),
        ],
      ),
    );
  }

  static String _initials(String? source) {
    if (source == null || source.trim().isEmpty) return 'Q';
    final parts = source.trim().split(RegExp(r'[\s@.]+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return 'Q';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
  }
}

class _StackedBadges extends StatelessWidget {
  const _StackedBadges({required this.workspaces});
  final List<Workspace> workspaces;

  @override
  Widget build(BuildContext context) {
    const size = 22.0;
    const overlap = 13.0;
    final count = workspaces.length.clamp(1, 3);
    return SizedBox(
      width: size + overlap * (count - 1),
      height: size,
      child: Stack(
        children: [
          for (var i = 0; i < count; i++)
            Positioned(
              left: i * overlap,
              child: Container(
                width: size,
                height: size,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: workspaces[i].color.resolveFrom(context),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(color: QColors.bgGrouped.resolveFrom(context), width: 1.5),
                ),
                child: Text(
                  workspaces[i].badge,
                  style: QType.caption.copyWith(color: CupertinoColors.white, fontWeight: FontWeight.w700, fontSize: 11),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _InsightsPeek extends StatelessWidget {
  const _InsightsPeek();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () => HapticFeedback.selectionClick(),
        child: Container(
          padding: const EdgeInsets.all(QSpace.md),
          decoration: BoxDecoration(
            color: QColors.surface.resolveFrom(context),
            borderRadius: BorderRadius.circular(QRadius.taskCard),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text('Today', style: QType.headline),
                  const Spacer(),
                  Icon(CupertinoIcons.chevron_right, size: 15, color: QColors.labelTertiary.resolveFrom(context)),
                ],
              ),
              const SizedBox(height: QSpace.sm),
              Row(
                children: [
                  _stat(context, fmtHm(Mock.focusTodaySeconds), 'Focus', QColors.tint),
                  _stat(context, '${Mock.savesToday}', 'Blocked', QColors.wellbeing),
                  _stat(context, '${Mock.productivityScore}', 'Score', QColors.breakColor),
                ],
              ),
              const SizedBox(height: QSpace.sm),
              _SparkBar(values: Mock.weekTrend),
            ],
          ),
        ),
      ),
    );
  }

  Widget _stat(BuildContext context, String value, String label, Color color) {
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            value,
            style: QType.title3.copyWith(
              color: color.resolveFrom(context),
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          Text(label, style: QType.caption),
        ],
      ),
    );
  }
}

class _SparkBar extends StatelessWidget {
  const _SparkBar({required this.values});
  final List<int> values;

  @override
  Widget build(BuildContext context) {
    final max = values.fold<int>(1, (a, b) => b > a ? b : a);
    final tint = QColors.tint.resolveFrom(context);
    return SizedBox(
      height: 28,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (var i = 0; i < values.length; i++) ...[
            Expanded(
              child: Container(
                height: (values[i] / max * 28).clamp(3, 28),
                decoration: BoxDecoration(
                  color: i == values.length - 1 ? tint : tint.withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
            ),
            if (i < values.length - 1) const SizedBox(width: 4),
          ],
        ],
      ),
    );
  }
}
