import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../../core/models/models.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';

/// Custom pill tabs: Backlog | This week | Today | Done.
class BucketTabs extends StatelessWidget {
  const BucketTabs({super.key, required this.active, required this.onChanged});
  final TaskBucket active;
  final ValueChanged<TaskBucket> onChanged;

  static const _order = [TaskBucket.backlog, TaskBucket.week, TaskBucket.today, TaskBucket.done];

  String _label(TaskBucket b) => switch (b) {
        TaskBucket.backlog => 'Backlog',
        TaskBucket.week => 'This week',
        TaskBucket.today => 'Today',
        TaskBucket.done => 'Done',
      };

  @override
  Widget build(BuildContext context) {
    final tint = QColors.tint.resolveFrom(context);
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
      child: Row(
        children: [
          for (final b in _order)
            Padding(
              padding: const EdgeInsets.only(right: QSpace.xs),
              child: GestureDetector(
                onTap: () {
                  if (b == active) return;
                  HapticFeedback.selectionClick();
                  onChanged(b);
                },
                child: AnimatedContainer(
                  duration: QMotion.fast,
                  constraints: const BoxConstraints(minHeight: 36),
                  alignment: Alignment.center,
                  padding: const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: 8),
                  decoration: BoxDecoration(
                    color: b == active ? tint.withValues(alpha: 0.16) : QColors.surface.resolveFrom(context),
                    borderRadius: BorderRadius.circular(QRadius.capsule),
                  ),
                  child: Text(
                    _label(b),
                    style: QType.subhead.copyWith(
                      color: b == active ? tint : QColors.labelSecondary.resolveFrom(context),
                      fontWeight: b == active ? FontWeight.w600 : FontWeight.w500,
                    ),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Thin progress bar + "n/m DONE" tabular label.
class BucketProgress extends StatelessWidget {
  const BucketProgress({super.key, required this.done, required this.total});
  final int done;
  final int total;

  @override
  Widget build(BuildContext context) {
    final frac = total == 0 ? 0.0 : done / total;
    final tint = QColors.tint.resolveFrom(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
      child: Row(
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(QRadius.capsule),
              child: Stack(
                children: [
                  Container(height: 6, color: QColors.fill.resolveFrom(context)),
                  AnimatedFractionallySizedBox(
                    duration: QMotion.base,
                    curve: QMotion.standard,
                    widthFactor: frac.clamp(0.0, 1.0),
                    child: Container(
                      height: 6,
                      decoration: BoxDecoration(
                        color: tint,
                        borderRadius: BorderRadius.circular(QRadius.capsule),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: QSpace.sm),
          Text(
            '$done/$total DONE',
            style: QType.caption.copyWith(
              fontWeight: FontWeight.w700,
              fontFeatures: const [FontFeature.tabularFigures()],
              color: QColors.labelSecondary.resolveFrom(context),
            ),
          ),
        ],
      ),
    );
  }
}
