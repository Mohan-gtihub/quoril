import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/mock_data.dart';
import '../../core/data/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/glass.dart';
import '../focus/focus_screen.dart';
import '../shell/app_shell.dart';
import 'data/productivity.dart';
import 'sheets/task_editor_sheet.dart';
import 'widgets/activity_rings.dart';
import 'widgets/ring_calendar.dart';
import 'widgets/workspace_section.dart';

/// Quoril home — greeting hero, a live "Today" rings card, a 3-week ring
/// calendar, and collapsible per-workspace task sections. Everything below the
/// greeting is real, useful data.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  void _launchSession(Task? task) {
    HapticFeedback.mediumImpact();
    Navigator.of(context, rootNavigator: true).push(
      CupertinoPageRoute(fullscreenDialog: true, builder: (_) => FocusScreen(task: task)),
    );
  }

  static const String _inboxId = '__inbox';

  @override
  Widget build(BuildContext context) {
    final all = ref.watch(tasksProvider).valueOrNull ?? const <Task>[];
    final todayTasks = all.where((t) => t.bucket == TaskBucket.today).toList();
    final todayDone = todayTasks.where((t) => t.done).length;

    final goals = ref.watch(goalsProvider);
    final stats = ref.watch(dailyStatsProvider).valueOrNull;
    // Today's focus seconds: prefer the last daily-stats entry; fall back to the
    // sum of today's tasks' spent time.
    final todayFocusSeconds = (stats != null && stats.isNotEmpty)
        ? stats.last.focusSeconds
        : todayTasks.fold<int>(0, (a, t) => a + t.spentSeconds);

    final focusGoalSeconds = (goals.focusHoursGoal * 3600).clamp(1, 1 << 30);
    final taskGoal = goals.dailyTaskGoal.clamp(1, 1 << 30);
    final focusFraction = todayFocusSeconds / focusGoalSeconds;
    final taskFraction = todayDone / taskGoal;

    final workspaces = ref.watch(workspacesProvider).valueOrNull ?? const <Workspace>[];
    final sections = _buildSections(context, workspaces, all);

    final ember = QSection.home.resolveFrom(context);
    final bottomInset = QShellInsets.of(context) + QSpace.md;
    final brightness = MediaQuery.maybeOf(context)?.platformBrightness ?? Brightness.light;

    return CupertinoPageScaffold(
      backgroundColor: QColors.bgGrouped.resolveFrom(context),
      // Faint ember ambient wash so the frosted content cards have something to
      // refract; fades to the neutral grouped bg by ~42% height.
      child: GradientBackground(
        gradient: QGradients.ambient(ember, brightness),
        child: SafeArea(
        bottom: false,
        child: CustomScrollView(
          physics: const BouncingScrollPhysics(),
          slivers: [
            CupertinoSliverRefreshControl(
              onRefresh: () async {
                HapticFeedback.selectionClick();
                ref.invalidate(tasksProvider);
                ref.invalidate(dailyStatsProvider);
                await ref.read(tasksProvider.future);
              },
            ),
            SliverToBoxAdapter(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SizedBox(height: QSpace.sm),
                  // The ONE ember hero — the single color moment on Home.
                  _TodayCard(
                    focusFraction: focusFraction,
                    taskFraction: taskFraction,
                    focusSeconds: todayFocusSeconds,
                    focusHoursGoal: goals.focusHoursGoal,
                    tasksDone: todayDone,
                    tasksTarget: taskGoal,
                    onStart: () => _launchSession(null),
                  ),
                  const SizedBox(height: QSpace.xxl),
                  // Ring calendar, grounded on a frosted glass card with a
                  // whisper of the ember section hue.
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
                    child: GlassCard(
                      padding: const EdgeInsets.all(QSpace.md),
                      tint: ember,
                      child: RingCalendar(
                        onDaySelected: (_) => HapticFeedback.selectionClick(),
                      ),
                    ),
                  ),
                  const SizedBox(height: QSpace.xxl),
                  Padding(
                    padding: const EdgeInsets.fromLTRB(QSpace.md, 0, QSpace.md, QSpace.sm),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Padding(
                                padding: const EdgeInsets.only(bottom: 2),
                                child: Text('YOUR LISTS',
                                    style: QType.eyebrow.copyWith(color: ember)),
                              ),
                              const Text('Workspaces', style: QType.title3Emphasized),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  for (var i = 0; i < sections.length; i++)
                    Padding(
                      padding: EdgeInsets.fromLTRB(
                        QSpace.md,
                        0,
                        QSpace.md,
                        i == sections.length - 1 ? 0 : QSpace.sm,
                      ),
                      child: WorkspaceSection(
                        workspace: sections[i].workspace,
                        tasks: sections[i].tasks,
                        initiallyExpanded: i == 0,
                        onToggleDone: (t) => ref.read(tasksProvider.notifier).toggleDone(t),
                        onOpen: (t) => showTaskEditorSheet(context, ref, task: t),
                        onFocus: (t) => _launchSession(t),
                      ),
                    ),
                  SizedBox(height: bottomInset),
                ],
              ),
            ),
          ],
        ),
      ),
      ),
    );
  }

  /// Groups tasks by workspace using the (listId ?? workspaceId) predicate, then
  /// appends a synthetic "Inbox" section for any task that matched no workspace.
  List<_Section> _buildSections(
    BuildContext context,
    List<Workspace> workspaces,
    List<Task> tasks,
  ) {
    final matched = <String>{};
    final sections = <_Section>[];

    for (final ws in workspaces) {
      final wsTasks = tasks.where((t) => (t.listId ?? t.workspaceId) == ws.id).toList();
      for (final t in wsTasks) {
        matched.add(t.id);
      }
      sections.add(_Section(ws, wsTasks));
    }

    final orphans = tasks.where((t) => !matched.contains(t.id)).toList();
    final inbox = Workspace(
      id: _inboxId,
      name: 'Inbox',
      color: QColors.labelSecondary.resolveFrom(context),
    );
    sections.add(_Section(inbox, orphans));

    return sections;
  }
}

class _Section {
  const _Section(this.workspace, this.tasks);
  final Workspace workspace;
  final List<Task> tasks;
}

// ---------------------------------------------------------------------------
// "Today" rings card — live focus + tasks progress toward daily goals.
// ---------------------------------------------------------------------------

/// Warm ember hero: a large [ActivityRings] (focus outer / tasks inner) with the
/// focus-hours goal in its center, two quiet supporting stats, and the white
/// Start Focus button.
class _TodayCard extends StatelessWidget {
  const _TodayCard({
    required this.focusFraction,
    required this.taskFraction,
    required this.focusSeconds,
    required this.focusHoursGoal,
    required this.tasksDone,
    required this.tasksTarget,
    required this.onStart,
  });

  final double focusFraction;
  final double taskFraction;
  final int focusSeconds;
  final int focusHoursGoal;
  final int tasksDone;
  final int tasksTarget;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    const white = CupertinoColors.white;
    final focusLabel = '${(focusSeconds / 3600).toStringAsFixed(1)}/${focusHoursGoal}h';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
      child: Container(
        padding: const EdgeInsets.all(QSpace.xl),
        decoration: BoxDecoration(
          gradient: QGradients.warm,
          borderRadius: BorderRadius.circular(QRadius.glass),
          boxShadow: [
            BoxShadow(
              color: QColors.brandDeep.resolveFrom(context).withValues(alpha: 0.30),
              blurRadius: 28,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('TODAY\'S FOCUS', style: QType.eyebrow.copyWith(color: white.withValues(alpha: 0.82))),
            const SizedBox(height: QSpace.xl),
            Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                ActivityRings(
                  focusFraction: focusFraction,
                  taskFraction: taskFraction,
                  size: 120,
                  center: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        focusLabel,
                        style: QType.title3Emphasized.copyWith(
                          color: white,
                          fontFeatures: const [FontFeature.tabularFigures()],
                        ),
                      ),
                      Text('focused', style: QType.caption2.copyWith(color: white.withValues(alpha: 0.7))),
                    ],
                  ),
                ),
                const SizedBox(width: QSpace.xl),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _Stat(label: 'Tasks done', value: '$tasksDone of $tasksTarget'),
                      const SizedBox(height: QSpace.lg),
                      _Stat(label: 'Streak', value: '${Mock.streakDays} days'),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: QSpace.xl),
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: onStart,
              child: Container(
                height: 52,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: white, borderRadius: BorderRadius.circular(QRadius.capsule)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(CupertinoIcons.play_arrow_solid, size: 16, color: QColors.brandDeep.resolveFrom(context)),
                    const SizedBox(width: 7),
                    Text('Start Focus',
                        style: QType.headline.copyWith(
                            color: QColors.brandDeep.resolveFrom(context), fontWeight: FontWeight.w700)),
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

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    const white = CupertinoColors.white;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(value,
            style: QType.title3Emphasized.copyWith(
                color: white, fontFeatures: const [FontFeature.tabularFigures()])),
        const SizedBox(height: 1),
        Text(label, style: QType.footnote.copyWith(color: white.withValues(alpha: 0.72))),
      ],
    );
  }
}
