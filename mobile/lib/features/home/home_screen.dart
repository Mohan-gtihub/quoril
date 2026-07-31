import 'dart:math' as math;

import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/mock_data.dart';
import '../../core/data/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/app_kit.dart';
import '../../core/widgets/common.dart';
import '../focus/focus_screen.dart';
import '../timeline/create_task_sheet.dart';
import '../timeline/timeline_day_section.dart';

/// Quoril home — greeting hero, a live "Today" focus card, and the Structured
/// timeline for today. Everything below the greeting is real, useful data.
class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  String get _greeting {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  void _launchSession(Task? task) {
    HapticFeedback.mediumImpact();
    Navigator.of(context, rootNavigator: true).push(
      CupertinoPageRoute(fullscreenDialog: true, builder: (_) => FocusScreen(task: task)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final all = ref.watch(tasksProvider).valueOrNull ?? const <Task>[];
    final todayTasks = all.where((t) => t.bucket == TaskBucket.today).toList();
    final todayCount = todayTasks.length;
    final todayDone = todayTasks.where((t) => t.done).length;
    final focusedToday = todayTasks.fold<int>(0, (a, t) => a + t.spentSeconds);

    final brightness = MediaQuery.maybeOf(context)?.platformBrightness ?? Brightness.light;

    return CupertinoPageScaffold(
      backgroundColor: QColors.bgGrouped.resolveFrom(context),
      child: GradientBackground(
        gradient: QGradients.page(brightness),
        child: SafeArea(
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
                    _Greeting(greeting: _greeting, taskCount: todayCount),
                    const SizedBox(height: QSpace.lg),
                    _TodayCard(
                      focusedSeconds: focusedToday,
                      tasksDone: todayDone,
                      tasksTotal: todayCount,
                      onStart: () => _launchSession(null),
                    ),
                    const SizedBox(height: QSpace.xl),
                    TimelineDaySection(
                      title: "Today's plan",
                      onAdd: () {
                        final n = DateTime.now();
                        showCreateTask(context, day: DateTime(n.year, n.month, n.day));
                      },
                    ),
                    // Clears the floating tab bar so the last row isn't hidden.
                    const SizedBox(height: 96),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Greeting hero
// ---------------------------------------------------------------------------

/// Plain editorial greeting — an Ember date eyebrow, a large greeting, and a
/// quiet task-count subline. No gradient card, so the warm Today card below is
/// the single color moment.
class _Greeting extends ConsumerWidget {
  const _Greeting({required this.greeting, required this.taskCount});
  final String greeting;
  final int taskCount;

  static const _weekdays = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
  static const _months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider).valueOrNull;
    final email = ref.watch(authServiceProvider).user?.email;
    final name = _firstName(profile?['name']?.toString() ?? email) ?? 'there';
    final now = DateTime.now();
    final eyebrow = '${_weekdays[now.weekday - 1]}, ${_months[now.month - 1]} ${now.day}';

    return Padding(
      padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.xs, QSpace.md, 0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(eyebrow, style: QType.caption.copyWith(color: kAccent, fontWeight: FontWeight.w700, letterSpacing: 0.6)),
                const SizedBox(height: 4),
                Text('$greeting, $name', style: QType.largeTitle, maxLines: 2, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Text(
                  taskCount == 0 ? 'No tasks planned today' : '$taskCount ${taskCount == 1 ? 'task' : 'tasks'} planned today',
                  style: QType.subhead,
                ),
              ],
            ),
          ),
          const SizedBox(width: QSpace.sm),
          Padding(
            padding: const EdgeInsets.only(top: QSpace.sm),
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => HapticFeedback.selectionClick(),
              child: Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: QColors.fill.resolveFrom(context), shape: BoxShape.circle),
                child: Icon(CupertinoIcons.bell, size: 19, color: QColors.label.resolveFrom(context)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  static String? _firstName(String? source) {
    if (source == null || source.trim().isEmpty) return null;
    final head = source.trim().split(RegExp(r'[\s@.]+')).firstWhere((p) => p.isNotEmpty, orElse: () => '');
    if (head.isEmpty) return null;
    return head[0].toUpperCase() + head.substring(1);
  }
}

// ---------------------------------------------------------------------------
// "Today" focus card — live focus progress toward a daily goal + Start Focus.
// ---------------------------------------------------------------------------

class _TodayCard extends StatelessWidget {
  const _TodayCard({
    required this.focusedSeconds,
    required this.tasksDone,
    required this.tasksTotal,
    required this.onStart,
  });

  final int focusedSeconds;
  final int tasksDone;
  final int tasksTotal;
  final VoidCallback onStart;

  static const _goalSeconds = 4 * 3600;

  @override
  Widget build(BuildContext context) {
    final frac = (focusedSeconds / _goalSeconds).clamp(0.0, 1.0);
    const white = CupertinoColors.white;
    final soft = white.withValues(alpha: 0.8);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
      child: Container(
        padding: const EdgeInsets.all(QSpace.lg),
        decoration: BoxDecoration(
          gradient: QGradients.warm,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(color: const Color(0xFF7E2412).withValues(alpha: 0.22), blurRadius: 20, offset: const Offset(0, 8)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text("TODAY'S FOCUS",
                style: QType.caption.copyWith(color: white.withValues(alpha: 0.75), fontWeight: FontWeight.w700, letterSpacing: 0.8)),
            const SizedBox(height: QSpace.md),
            Row(
              children: [
                _Ring(fraction: frac, size: 84, center: fmtHm(focusedSeconds), caption: 'focused'),
                const SizedBox(width: QSpace.lg),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _Stat(icon: CupertinoIcons.checkmark_alt_circle_fill, label: 'Tasks done', value: '$tasksDone of $tasksTotal'),
                      const SizedBox(height: QSpace.sm),
                      _Stat(icon: CupertinoIcons.flame_fill, label: 'Streak', value: '${Mock.streakDays} days'),
                      const SizedBox(height: QSpace.sm),
                      _Stat(icon: CupertinoIcons.shield_fill, label: 'Blocked', value: fmtHm(Mock.savedSeconds)),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: QSpace.md),
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: onStart,
              child: Container(
                height: 48,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: white, borderRadius: BorderRadius.circular(QRadius.capsule)),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(CupertinoIcons.play_arrow_solid, size: 16, color: Color(0xFF7E2412)),
                    const SizedBox(width: 6),
                    Text('Start Focus', style: QType.headline.copyWith(color: const Color(0xFF7E2412), fontWeight: FontWeight.w700)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text('${fmtHm(focusedSeconds)} of ${fmtHm(_goalSeconds)} daily goal',
                style: QType.caption.copyWith(color: soft, fontFeatures: const [FontFeature.tabularFigures()])),
          ],
        ),
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    const white = CupertinoColors.white;
    final soft = white.withValues(alpha: 0.75);
    return Row(
      children: [
        Icon(icon, size: 15, color: soft),
        const SizedBox(width: 6),
        Text('$label  ', style: QType.footnote.copyWith(color: soft)),
        Text(value,
            style: QType.footnote.copyWith(color: white, fontWeight: FontWeight.w700, fontFeatures: const [FontFeature.tabularFigures()])),
      ],
    );
  }
}

class _Ring extends StatelessWidget {
  const _Ring({required this.fraction, required this.size, required this.center, required this.caption});
  final double fraction;
  final double size;
  final String center;
  final String caption;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _RingPainter(fraction),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(center,
                  style: QType.headline.copyWith(color: CupertinoColors.white, fontWeight: FontWeight.w800, fontFeatures: const [FontFeature.tabularFigures()])),
              Text(caption, style: QType.caption.copyWith(color: CupertinoColors.white.withValues(alpha: 0.7))),
            ],
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.fraction);
  final double fraction;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    const stroke = 8.0;
    final r = (size.shortestSide - stroke) / 2;
    canvas.drawCircle(center, r, Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..color = CupertinoColors.white.withValues(alpha: 0.22));
    if (fraction <= 0) return;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: r),
      -math.pi / 2,
      2 * math.pi * fraction,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..color = CupertinoColors.white,
    );
  }

  @override
  bool shouldRepaint(covariant _RingPainter old) => old.fraction != fraction;
}
