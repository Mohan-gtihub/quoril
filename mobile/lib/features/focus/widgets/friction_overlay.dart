import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/glass.dart';
import '../../../core/widgets/primary_button.dart';

/// Level-1 top glass nudge banner: "Instagram 3m — back to <task>?".
/// A floating translucent card (the one place a subtle floating shadow is used).
class NudgeBanner extends StatelessWidget {
  const NudgeBanner({
    super.key,
    required this.app,
    required this.minutes,
    required this.taskTitle,
    required this.onTap,
    required this.onDismiss,
  });

  final String app;
  final int minutes;
  final String taskTitle;
  final VoidCallback onTap;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final warn = QColors.warn.resolveFrom(context);
    return SafeArea(
      bottom: false,
      child: Padding(
        padding:
            const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: QSpace.xs),
        child: GestureDetector(
          onTap: onTap,
          behavior: HitTestBehavior.opaque,
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(QRadius.glass),
              boxShadow: QElevation.floating(context),
            ),
            child: GlassSurface(
              padding: const EdgeInsets.all(QSpace.sm),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: warn.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(CupertinoIcons.exclamationmark_triangle_fill,
                        size: 18, color: warn),
                  ),
                  const SizedBox(width: QSpace.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('$app · ${minutes}m',
                            style: QType.headline,
                            overflow: TextOverflow.ellipsis),
                        Text('Back to $taskTitle?',
                            style: QType.footnote,
                            overflow: TextOverflow.ellipsis),
                      ],
                    ),
                  ),
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    minSize: 44,
                    onPressed: () {
                      HapticFeedback.selectionClick();
                      onDismiss();
                    },
                    child: Icon(
                      CupertinoIcons.xmark_circle_fill,
                      size: 24,
                      color: QColors.labelTertiary.resolveFrom(context),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Full friction overlay shown after continued distraction.
class FrictionOverlay extends StatelessWidget {
  const FrictionOverlay({
    super.key,
    required this.app,
    required this.todayMinutes,
    required this.weeklyAvgMinutes,
    required this.focusTasksEquivalent,
    required this.onTakeBreath,
    required this.onFiveMore,
  });

  final String app;
  final int todayMinutes;
  final int weeklyAvgMinutes;
  final int focusTasksEquivalent;
  final VoidCallback onTakeBreath;
  final VoidCallback onFiveMore;

  @override
  Widget build(BuildContext context) {
    final danger = QColors.danger.resolveFrom(context);
    return DecoratedBox(
      decoration: BoxDecoration(
        color: QColors.bg.resolveFrom(context).withValues(alpha: 0.96),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(QSpace.lg),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: danger.withValues(alpha: 0.15),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(CupertinoIcons.hand_raised_fill,
                      size: 34, color: danger),
                ),
              ),
              const SizedBox(height: QSpace.lg),
              Text('Time on $app',
                  style: QType.title1, textAlign: TextAlign.center),
              const SizedBox(height: QSpace.xs),
              Text(
                "You've spent ${todayMinutes}m here today.",
                style: QType.body
                    .copyWith(color: QColors.labelSecondary.resolveFrom(context)),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: QSpace.xl),
              _StatLine(label: 'Today', value: '${todayMinutes}m'),
              const SizedBox(height: QSpace.xs),
              _StatLine(label: 'Weekly average', value: '${weeklyAvgMinutes}m'),
              const SizedBox(height: QSpace.xs),
              _StatLine(
                  label: 'That is about',
                  value: '≈ $focusTasksEquivalent focus tasks'),
              const SizedBox(height: QSpace.xl),
              PrimaryButton(
                label: 'Take a breath',
                icon: CupertinoIcons.wind,
                color: QColors.wellbeing,
                onPressed: onTakeBreath,
              ),
              const SizedBox(height: QSpace.sm),
              PrimaryButton(
                label: '5 more minutes',
                style: QButtonStyle.plain,
                onPressed: () {
                  HapticFeedback.selectionClick();
                  onFiveMore();
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatLine extends StatelessWidget {
  const _StatLine({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return GlassCard(
      padding:
          const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: QSpace.sm),
      child: Row(
        children: [
          Expanded(child: Text(label, style: QType.body)),
          Text(
            value,
            style: QType.headline.copyWith(
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }
}
