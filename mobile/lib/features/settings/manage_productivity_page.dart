import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/app_kit.dart';
import '../../core/widgets/editorial.dart';
import '../home/data/productivity.dart';
import '../home/widgets/activity_rings.dart';
import 'settings_widgets.dart';

/// Productivity goals — drives the home activity rings (focus + tasks targets).
class ManageProductivityPage extends ConsumerWidget {
  const ManageProductivityPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final goals = ref.watch(goalsProvider);

    return SettingsAmbientBackground(
      child: AppScaffold(
      title: 'Productivity Goals',
      backgroundColor: const Color(0x00000000),
      transitionBetweenRoutes: true,
      slivers: [
        SliverPagePadding(
          top: QSpace.xs,
          child: QStagger(children: [
                    const QSectionHeader(label: 'Daily focus'),
                    FrostedGroup(children: [
                      _FocusGoalRow(
                        hours: goals.focusHoursGoal,
                        onMinus: () => ref
                            .read(goalsProvider.notifier)
                            .setFocusHours(
                                (goals.focusHoursGoal - 1).clamp(1, 12)),
                        onPlus: () => ref
                            .read(goalsProvider.notifier)
                            .setFocusHours(
                                (goals.focusHoursGoal + 1).clamp(1, 12)),
                      ),
                    ]),
                    const SettingsFootnote(
                        'Your daily focus target. The outer home ring fills as you focus toward it.'),
                    const SizedBox(height: QSpace.xl),
                    const QSectionHeader(label: 'Daily tasks'),
                    FrostedGroup(children: [
                      _StepperRow(
                        icon: CupertinoIcons.checkmark_circle_fill,
                        color: QColors.wellbeing,
                        title: 'Task target',
                        value: '${goals.dailyTaskGoal}',
                        onMinus: () => ref
                            .read(goalsProvider.notifier)
                            .setDailyTasks(
                                (goals.dailyTaskGoal - 1).clamp(1, 20)),
                        onPlus: () => ref
                            .read(goalsProvider.notifier)
                            .setDailyTasks(
                                (goals.dailyTaskGoal + 1).clamp(1, 20)),
                      ),
                    ]),
                    const SettingsFootnote(
                        'Complete this many tasks a day to close the inner home ring.'),
                  ]),
        ),
      ],
    ),
    );
  }
}

/// The focus-goal row: a +/- stepper alongside a small solid-focus ring preview.
class _FocusGoalRow extends StatelessWidget {
  const _FocusGoalRow({
    required this.hours,
    required this.onMinus,
    required this.onPlus,
  });

  final int hours;
  final VoidCallback onMinus;
  final VoidCallback onPlus;

  @override
  Widget build(BuildContext context) {
    return SettingsRow(
      icon: CupertinoIcons.flame_fill,
      iconColor: QColors.brand,
      title: 'Focus goal',
      chevron: false,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const ActivityRings(
            focusFraction: 1,
            taskFraction: 0,
            size: 48,
            strokeWidth: 5,
            gap: 2,
            animate: false,
          ),
          const SizedBox(width: QSpace.sm),
          Text(
            '${hours}h',
            style: QType.body.copyWith(
              color: QColors.labelSecondary.resolveFrom(context),
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          const SizedBox(width: QSpace.sm),
          _MiniStepper(onMinus: onMinus, onPlus: onPlus),
        ],
      ),
    );
  }
}

/// A settings row whose trailing control is a tabular value + a +/- stepper.
class _StepperRow extends StatelessWidget {
  const _StepperRow({
    required this.icon,
    required this.color,
    required this.title,
    required this.value,
    required this.onMinus,
    required this.onPlus,
  });

  final IconData icon;
  final Color color;
  final String title;
  final String value;
  final VoidCallback onMinus;
  final VoidCallback onPlus;

  @override
  Widget build(BuildContext context) {
    return SettingsRow(
      icon: icon,
      iconColor: color,
      title: title,
      chevron: false,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            value,
            style: QType.body.copyWith(
              color: QColors.labelSecondary.resolveFrom(context),
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          const SizedBox(width: QSpace.sm),
          _MiniStepper(onMinus: onMinus, onPlus: onPlus),
        ],
      ),
    );
  }
}

/// A compact segmented minus/plus control with haptic feedback on each tap.
class _MiniStepper extends StatelessWidget {
  const _MiniStepper({required this.onMinus, required this.onPlus});
  final VoidCallback onMinus;
  final VoidCallback onPlus;

  @override
  Widget build(BuildContext context) {
    Widget btn(IconData icon, VoidCallback onTap) => Pressable(
          pressedScale: 0.9,
          onTap: () {
            HapticFeedback.selectionClick();
            onTap();
          },
          child: Container(
            width: 38,
            height: 28,
            alignment: Alignment.center,
            color: QColors.fill.resolveFrom(context),
            child: Icon(icon, size: 17, color: QColors.label.resolveFrom(context)),
          ),
        );
    return ClipRRect(
      borderRadius: BorderRadius.circular(QRadius.chip),
      child: Row(mainAxisSize: MainAxisSize.min, children: [
        btn(CupertinoIcons.minus, onMinus),
        Container(
            width: 0.5,
            height: 28,
            color: QColors.separator.resolveFrom(context)),
        btn(CupertinoIcons.plus, onPlus),
      ]),
    );
  }
}
