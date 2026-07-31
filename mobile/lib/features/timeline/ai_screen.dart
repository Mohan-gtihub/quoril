import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/providers.dart';
import '../../core/models/models.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/app_kit.dart';

/// AI planner — a one-tap "Plan my day" that places unscheduled tasks into
/// back-to-back slots from the next free time. A local heuristic today; the
/// natural home for a real AI Gateway call later.
class AiScreen extends ConsumerStatefulWidget {
  const AiScreen({super.key});

  @override
  ConsumerState<AiScreen> createState() => _AiScreenState();
}

class _AiScreenState extends ConsumerState<AiScreen> {
  bool _planning = false;

  bool _scheduled(Task t) {
    final due = t.dueAt;
    if (due != null && (due.hour != 0 || due.minute != 0)) return true;
    return t.startLabel != null;
  }

  Future<void> _planDay() async {
    final all = ref.read(tasksProvider).valueOrNull ?? const <Task>[];
    final todo = all.where((t) => !t.done && !_scheduled(t)).toList();
    if (todo.isEmpty) return;
    setState(() => _planning = true);
    HapticFeedback.mediumImpact();

    final now = DateTime.now();
    var cursor = DateTime(now.year, now.month, now.day, now.hour, ((now.minute ~/ 15) + 1) * 15 % 60);
    if (now.minute >= 45) cursor = DateTime(now.year, now.month, now.day, now.hour + 1);

    for (final t in todo) {
      final dur = (t.estimateMinutes ?? 30).clamp(15, 240);
      await ref.read(tasksProvider.notifier).scheduleTask(t, cursor, durationMinutes: dur);
      cursor = cursor.add(Duration(minutes: dur + 5));
    }
    if (mounted) setState(() => _planning = false);
    HapticFeedback.heavyImpact();
  }

  @override
  Widget build(BuildContext context) {
    final all = ref.watch(tasksProvider).valueOrNull ?? const <Task>[];
    final pending = all.where((t) => !t.done && !_scheduled(t)).length;

    return AppScaffold(
      title: 'AI',
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(QSpace.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.all(QSpace.lg),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [Color(0xFFEF8E80), Color(0xFF9B6BB0)],
                    ),
                    borderRadius: BorderRadius.circular(22),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(CupertinoIcons.sparkles, color: CupertinoColors.white, size: 30),
                      const SizedBox(height: QSpace.sm),
                      Text('Plan my day',
                          style: QType.title2.copyWith(color: CupertinoColors.white, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 4),
                      Text(
                        pending == 0
                            ? 'Everything is scheduled. Nice.'
                            : 'Auto-schedule your $pending unplanned ${pending == 1 ? 'task' : 'tasks'} into free time slots.',
                        style: QType.subhead.copyWith(color: CupertinoColors.white.withValues(alpha: 0.9)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: QSpace.lg),
                GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: (pending == 0 || _planning) ? null : _planDay,
                  child: Container(
                    height: 52,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: (pending == 0) ? QColors.fill.resolveFrom(context) : kAccent,
                      borderRadius: BorderRadius.circular(QRadius.capsule),
                    ),
                    child: _planning
                        ? const CupertinoActivityIndicator(color: CupertinoColors.white)
                        : Text(
                            'Plan my day',
                            style: QType.headline.copyWith(
                              color: pending == 0
                                  ? QColors.labelTertiary.resolveFrom(context)
                                  : CupertinoColors.white,
                            ),
                          ),
                  ),
                ),
                const SizedBox(height: QSpace.md),
                Text(
                  'Places each unplanned task back-to-back from your next free slot. Review and adjust on the Timeline.',
                  style: QType.footnote,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
