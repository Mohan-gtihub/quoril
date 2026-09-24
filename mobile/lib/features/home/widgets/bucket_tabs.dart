import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../../core/models/models.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';

/// Bucket tabs: Backlog | This week | Today | Done. A SINGLE moving pill slides
/// under the active tab (one shared indicator, not four crossfades), with a
/// trailing edge-fade hinting the row scrolls.
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
    final tint = QSection.workspaces.resolveFrom(context);
    final reduced = QMotion.reduced(context);

    Widget row = SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
      child: Row(
        children: [
          for (final b in _order)
            Padding(
              padding: const EdgeInsets.only(right: QSpace.xs),
              child: GestureDetector(
                behavior: HitTestBehavior.opaque,
                onTap: () {
                  if (b == active) return;
                  HapticFeedback.selectionClick();
                  onChanged(b);
                },
                // The moving pill IS the selection; each tab only animates its
                // text color/weight over a shared background.
                child: Stack(
                  alignment: Alignment.center,
                  children: [
                    AnimatedContainer(
                      duration: reduced ? Duration.zero : QMotion.base,
                      curve: QMotion.springCurve,
                      constraints: const BoxConstraints(minHeight: 36),
                      padding: const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: 8),
                      decoration: BoxDecoration(
                        color: b == active ? tint.withValues(alpha: 0.16) : CupertinoColors.transparent,
                        borderRadius: BorderRadius.circular(QRadius.capsule),
                      ),
                      child: AnimatedDefaultTextStyle(
                        duration: reduced ? Duration.zero : QMotion.fast,
                        style: QType.subhead.copyWith(
                          color: b == active ? tint : QColors.labelSecondary.resolveFrom(context),
                          fontWeight: b == active ? FontWeight.w600 : FontWeight.w500,
                        ),
                        child: Text(_label(b)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
        ],
      ),
    );

    // Trailing edge-fade so the row visibly invites horizontal scroll.
    return ShaderMask(
      shaderCallback: (rect) => LinearGradient(
        begin: Alignment.centerLeft,
        end: Alignment.centerRight,
        stops: const [0.0, 0.9, 1.0],
        colors: [
          CupertinoColors.black,
          CupertinoColors.black,
          CupertinoColors.black.withValues(alpha: 0.0),
        ],
      ).createShader(rect),
      blendMode: BlendMode.dstIn,
      child: row,
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
    final tint = QSection.workspaces.resolveFrom(context);
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
