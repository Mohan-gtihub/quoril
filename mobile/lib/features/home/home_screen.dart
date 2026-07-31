import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/mock_data.dart';
import '../../core/data/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/common.dart';
import 'sheets/task_editor_sheet.dart';
import 'widgets/bucket_tabs.dart';
import 'widgets/home_dashboard.dart';
import 'widgets/task_list_body.dart';

/// Quoril home — an Apple Fitness "Summary"-style dashboard: a black canvas,
/// the triple Activity Rings, dark metric cards, then the task board. Rendered
/// in forced dark so every semantic surface resolves to the Fitness palette.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  TaskBucket _bucket = TaskBucket.today;

  List<Workspace> _allWorkspaces() {
    return ref.watch(workspacesProvider).valueOrNull ?? Mock.workspaces;
  }

  @override
  Widget build(BuildContext context) {
    final tasksAsync = ref.watch(tasksProvider);
    final workspaces = _allWorkspaces();
    final all = tasksAsync.valueOrNull ?? const <Task>[];
    final inBucket = all.where((t) => t.bucket == _bucket).toList();
    final doneCount = inBucket.where((t) => t.done).length;

    final todayTasks = all.where((t) => t.bucket == TaskBucket.today).toList();
    final todayDone = todayTasks.where((t) => t.done).length;

    final profile = ref.watch(profileProvider).valueOrNull;
    final email = ref.watch(authServiceProvider).user?.email;
    final name = _firstName(profile?['name']?.toString() ?? email) ?? 'there';

    final mq = MediaQuery.of(context);

    // Force the Fitness look: pure-black canvas, dark-resolved surfaces.
    return MediaQuery(
      data: mq.copyWith(platformBrightness: Brightness.dark),
      child: CupertinoTheme(
        data: const CupertinoThemeData(brightness: Brightness.dark),
        child: CupertinoPageScaffold(
          backgroundColor: CupertinoColors.black,
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
                          _SummaryHeader(name: name),
                          const SizedBox(height: QSpace.md),
                          ActivityCard(tasksDone: todayDone, tasksTotal: todayTasks.length),
                          const SizedBox(height: QSpace.md),
                          const FocusTrendCard(),
                          const SizedBox(height: QSpace.xl),
                          const _SectionHeader('Your board'),
                          const SizedBox(height: QSpace.sm),
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
                      error: (_, _) => const SliverFillRemaining(
                        hasScrollBody: false,
                        child: EmptyState(icon: CupertinoIcons.exclamationmark_triangle, title: 'Could not load tasks'),
                      ),
                      data: (_) => TaskListSliver(tasks: all, workspaces: workspaces, bucket: _bucket),
                    ),
                  ],
                ),
              ),
              _quickAddFab(context),
            ],
          ),
        ),
      ),
    );
  }

  Widget _quickAddFab(BuildContext context) {
    // Quick-add task FAB, lifted to clear the shell's floating tab bar.
    return Positioned(
      right: QSpace.md,
      bottom: 0,
      child: SafeArea(
        top: false,
        child: Padding(
          padding: const EdgeInsets.only(bottom: 84),
          child: Container(
            decoration: BoxDecoration(
              color: CupertinoColors.white,
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
              child: const Icon(CupertinoIcons.add, color: CupertinoColors.black, size: 24),
            ),
          ),
        ),
      ),
    );
  }

  static String? _firstName(String? source) {
    if (source == null || source.trim().isEmpty) return null;
    final head = source.trim().split(RegExp(r'[\s@.]+')).firstWhere(
          (p) => p.isNotEmpty,
          orElse: () => '',
        );
    if (head.isEmpty) return null;
    return head[0].toUpperCase() + head.substring(1);
  }
}

/// Large "Summary" title + a circular profile avatar (Fitness nav idiom).
class _SummaryHeader extends StatelessWidget {
  const _SummaryHeader({required this.name});
  final String name;

  static const _weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  static const _months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final date = '${_weekdays[now.weekday - 1].toUpperCase()}, ${_months[now.month - 1].toUpperCase()} ${now.day}';
    final initial = name.isEmpty ? '?' : name[0].toUpperCase();

    return Padding(
      padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.md, QSpace.md, 0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  date,
                  style: QType.footnote.copyWith(
                    color: const Color(0xFFFF6482),
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.4,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  'Summary',
                  style: QType.largeTitle.copyWith(color: CupertinoColors.white),
                ),
              ],
            ),
          ),
          GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: () => HapticFeedback.selectionClick(),
            child: Container(
              width: 38,
              height: 38,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: QColors.tertiaryFill.resolveFrom(context),
                shape: BoxShape.circle,
              ),
              child: Text(
                initial,
                style: QType.headline.copyWith(color: CupertinoColors.white, fontWeight: FontWeight.w700),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  const _SectionHeader(this.title);
  final String title;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
      child: Text(
        title,
        style: QType.title2.copyWith(color: CupertinoColors.white, fontWeight: FontWeight.w700),
      ),
    );
  }
}
