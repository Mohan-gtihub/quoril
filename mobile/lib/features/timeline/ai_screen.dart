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
import 'timeline_style.dart';

/// AI planner — "Plan my day" builds a preview of proposed time slots for your
/// unscheduled tasks, shown in-place. You review before committing; committing
/// animates a confirmation with an Undo. A local heuristic today; the natural
/// home for a real AI Gateway call later.
class AiScreen extends ConsumerStatefulWidget {
  const AiScreen({super.key});

  @override
  ConsumerState<AiScreen> createState() => _AiScreenState();
}

class _Slot {
  _Slot(this.task, this.start, this.durationMin);
  final Task task;
  final DateTime start;
  final int durationMin;
}

class _AiScreenState extends ConsumerState<AiScreen> {
  List<_Slot>? _preview; // proposed plan, awaiting commit
  bool _committing = false;
  bool _committed = false; // shows the confirmation + undo affordance

  bool _scheduled(Task t) {
    final due = t.dueAt;
    if (due != null && (due.hour != 0 || due.minute != 0)) return true;
    return t.startLabel != null;
  }

  List<Task> _pendingTasks() {
    final all = ref.read(tasksProvider).valueOrNull ?? const <Task>[];
    return all.where((t) => !t.done && !_scheduled(t)).toList();
  }

  /// Build (but don't commit) a back-to-back plan from the next free slot.
  List<_Slot> _buildPlan(List<Task> todo) {
    final now = DateTime.now();
    var cursor = DateTime(now.year, now.month, now.day, now.hour, ((now.minute ~/ 15) + 1) * 15 % 60);
    if (now.minute >= 45) cursor = DateTime(now.year, now.month, now.day, now.hour + 1);
    final slots = <_Slot>[];
    for (final t in todo) {
      final dur = (t.estimateMinutes ?? 30).clamp(15, 240);
      slots.add(_Slot(t, cursor, dur));
      cursor = cursor.add(Duration(minutes: dur + 5));
    }
    return slots;
  }

  void _plan() {
    final todo = _pendingTasks();
    if (todo.isEmpty) return;
    HapticFeedback.mediumImpact();
    setState(() {
      _preview = _buildPlan(todo);
      _committed = false;
    });
  }

  Future<void> _commit() async {
    final plan = _preview;
    if (plan == null) return;
    setState(() => _committing = true);
    HapticFeedback.mediumImpact();
    for (final s in plan) {
      await ref.read(tasksProvider.notifier).scheduleTask(s.task, s.start, durationMinutes: s.durationMin);
    }
    if (!mounted) return;
    HapticFeedback.heavyImpact();
    setState(() {
      _committing = false;
      _committed = true;
    });
  }

  Future<void> _undo() async {
    final plan = _preview;
    if (plan == null) return;
    HapticFeedback.mediumImpact();
    // Mock undo: clear the start slot back to "anytime" (midnight of the day).
    for (final s in plan) {
      final day = s.start;
      await ref.read(tasksProvider.notifier).scheduleTask(
            s.task,
            DateTime(day.year, day.month, day.day),
          );
    }
    if (!mounted) return;
    setState(() {
      _committed = false;
      _preview = null;
    });
  }

  void _dismissPreview() => setState(() {
        _preview = null;
        _committed = false;
      });

  @override
  Widget build(BuildContext context) {
    final all = ref.watch(tasksProvider).valueOrNull ?? const <Task>[];
    final pending = all.where((t) => !t.done && !_scheduled(t)).length;
    final preview = _preview;

    final accent = QSection.calendar.resolveFrom(context);
    // Faint calendar-tinted ambient wash so the frosted preview card refracts.
    final brightness =
        MediaQuery.maybeOf(context)?.platformBrightness ?? Brightness.light;
    return GradientBackground(
      gradient: QGradients.ambient(accent, brightness),
      child: AppScaffold(
      backgroundColor: const Color(0x00000000),
      title: 'AI',
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(QSpace.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // The ONE color moment — a single section-tinted hero surface.
                Container(
                  padding: const EdgeInsets.all(QSpace.lg),
                  decoration: BoxDecoration(
                    gradient: QPlay.grad(accent),
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: QElevation.glow(accent),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(CupertinoIcons.sparkles, color: CupertinoColors.white, size: 30),
                      const SizedBox(height: QSpace.sm),
                      Text('Plan my day',
                          style: QType.title2Emphasized.copyWith(color: CupertinoColors.white)),
                      const SizedBox(height: 4),
                      Text(
                        pending == 0
                            ? 'Everything is scheduled. Nice.'
                            : 'Auto-schedule your $pending unplanned ${pending == 1 ? 'task' : 'tasks'} into free time slots.',
                        style: QType.subhead.copyWith(color: CupertinoColors.white.withValues(alpha: 0.92)),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: QSpace.lg),

                if (preview == null) ...[
                  _PrimaryButton(
                    label: 'Plan my day',
                    enabled: pending != 0,
                    accent: accent,
                    onTap: _plan,
                  ),
                  const SizedBox(height: QSpace.md),
                  Text(
                    'Builds a back-to-back plan from your next free slot. You review before anything changes.',
                    style: QType.footnote,
                  ),
                ] else ...[
                  _PreviewPanel(
                    slots: preview,
                    committed: _committed,
                    context24: MediaQuery.of(context).alwaysUse24HourFormat,
                  ),
                  const SizedBox(height: QSpace.md),
                  if (_committed)
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            height: 48,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: QColors.wellbeing.resolveFrom(context).withValues(alpha: 0.15),
                              borderRadius: BorderRadius.circular(QRadius.capsule),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(CupertinoIcons.checkmark_circle_fill,
                                    size: 18, color: QColors.wellbeing.resolveFrom(context)),
                                const SizedBox(width: 6),
                                Text('Scheduled',
                                    style: QType.headline.copyWith(
                                        color: QColors.wellbeing.resolveFrom(context))),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: QSpace.sm),
                        GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: _undo,
                          child: Container(
                            height: 48,
                            padding: const EdgeInsets.symmetric(horizontal: QSpace.lg),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: QColors.fill.resolveFrom(context),
                              borderRadius: BorderRadius.circular(QRadius.capsule),
                            ),
                            child: Text('Undo', style: QType.headline),
                          ),
                        ),
                      ],
                    )
                  else
                    Row(
                      children: [
                        Expanded(
                          child: _PrimaryButton(
                            label: 'Confirm plan',
                            enabled: !_committing,
                            busy: _committing,
                            accent: accent,
                            onTap: _commit,
                          ),
                        ),
                        const SizedBox(width: QSpace.sm),
                        GestureDetector(
                          behavior: HitTestBehavior.opaque,
                          onTap: _committing ? null : _dismissPreview,
                          child: Container(
                            height: 52,
                            padding: const EdgeInsets.symmetric(horizontal: QSpace.lg),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: QColors.fill.resolveFrom(context),
                              borderRadius: BorderRadius.circular(QRadius.capsule),
                            ),
                            child: Text('Cancel', style: QType.headline),
                          ),
                        ),
                      ],
                    ),
                ],
              ],
            ),
          ),
        ),
      ],
      ),
    );
  }
}

class _PreviewPanel extends StatelessWidget {
  const _PreviewPanel({required this.slots, required this.committed, required this.context24});
  final List<_Slot> slots;
  final bool committed;
  final bool context24;

  @override
  Widget build(BuildContext context) {
    // Frosted preview panel — the review surface sits on glass so it reads as a
    // distinct material below the bold gradient hero (the one color moment).
    return GlassCard(
      radius: QRadius.taskCard,
      tint: QSection.calendar,
      interactive: false,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(committed ? 'Your day' : 'Proposed plan',
              style: QType.eyebrow.copyWith(color: QColors.labelSecondary.resolveFrom(context))),
          const SizedBox(height: QSpace.sm),
          for (var i = 0; i < slots.length; i++) ...[
            if (i > 0) const SizedBox(height: QSpace.sm),
            _slotRow(context, slots[i]),
          ],
        ],
      ),
    );
  }

  Widget _slotRow(BuildContext context, _Slot s) {
    final c = timelineColorFor(s.task).resolveFrom(context);
    final startMin = s.start.hour * 60 + s.start.minute;
    return Row(
      children: [
        Container(
          width: 36,
          height: 36,
          alignment: Alignment.center,
          decoration: BoxDecoration(color: c, shape: BoxShape.circle),
          child: Icon(timelineIconFor(s.task.title), size: 18, color: CupertinoColors.white),
        ),
        const SizedBox(width: QSpace.sm),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${clockLabel(context, startMin)} – ${clockLabel(context, startMin + s.durationMin)}  (${durationLabel(s.durationMin)})',
                style: QType.caption.copyWith(fontFeatures: const [FontFeature.tabularFigures()]),
              ),
              const SizedBox(height: 1),
              Text(s.task.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: QType.subhead.copyWith(
                      color: QColors.label.resolveFrom(context), fontWeight: FontWeight.w600)),
            ],
          ),
        ),
        if (committed)
          Icon(CupertinoIcons.checkmark_circle_fill,
              size: 18, color: QColors.wellbeing.resolveFrom(context)),
      ],
    );
  }
}

class _PrimaryButton extends StatelessWidget {
  const _PrimaryButton({
    required this.label,
    required this.enabled,
    required this.onTap,
    this.accent,
    this.busy = false,
  });
  final String label;
  final bool enabled;
  final VoidCallback onTap;

  /// CTA fill accent (defaults to the ember brand).
  final Color? accent;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: enabled ? onTap : null,
      child: Container(
        height: 52,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: enabled ? (accent ?? QColors.brand).resolveFrom(context) : QColors.fill.resolveFrom(context),
          borderRadius: BorderRadius.circular(QRadius.capsule),
        ),
        child: busy
            ? const CupertinoActivityIndicator(color: CupertinoColors.white)
            : Text(label,
                style: QType.headline.copyWith(
                  color: enabled
                      ? CupertinoColors.white
                      : QColors.labelTertiary.resolveFrom(context),
                )),
      ),
    );
  }
}
