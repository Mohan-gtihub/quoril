import 'package:flutter/cupertino.dart';
import 'package:intl/intl.dart';

import '../../core/data/mock_data.dart';
import '../../core/models/models.dart';
import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/editorial.dart';

/// Push page: full intervention (nudge) history for the week.
class InterventionHistoryPage extends StatelessWidget {
  const InterventionHistoryPage({super.key});

  static const _appIcons = {
    'Instagram': CupertinoIcons.camera,
    'YouTube': CupertinoIcons.play_rectangle,
    'TikTok': CupertinoIcons.music_note,
  };

  Color _levelColor(BuildContext c, InterventionLevel l) => switch (l) {
        InterventionLevel.nudge => QColors.warn.resolveFrom(c),
        InterventionLevel.alert => QColors.breakColor.resolveFrom(c),
        InterventionLevel.friction => QColors.danger.resolveFrom(c),
      };

  String _levelLabel(InterventionLevel l) => switch (l) {
        InterventionLevel.nudge => 'Nudge',
        InterventionLevel.alert => 'Alert',
        InterventionLevel.friction => 'Friction',
      };

  ({IconData icon, Color Function(BuildContext) color, String label}) _outcome(
      InterventionOutcome o) {
    switch (o) {
      case InterventionOutcome.returned:
        return (
          icon: CupertinoIcons.arrow_uturn_left_circle_fill,
          color: (c) => QColors.wellbeing.resolveFrom(c),
          label: 'Returned'
        );
      case InterventionOutcome.snoozed:
        return (
          icon: CupertinoIcons.moon_zzz_fill,
          color: (c) => QColors.breakColor.resolveFrom(c),
          label: 'Snoozed'
        );
      case InterventionOutcome.ignored:
        return (
          icon: CupertinoIcons.xmark_circle_fill,
          color: (c) => QColors.danger.resolveFrom(c),
          label: 'Ignored'
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    final items = Mock.interventions();
    final sky = QSection.insights.resolveFrom(context);
    final brightness =
        MediaQuery.maybeOf(context)?.platformBrightness ?? Brightness.light;

    return CupertinoPageScaffold(
      // Transparent so the faint sky ambient wash behind gives the frosted
      // content cards something to refract.
      backgroundColor: CupertinoColors.transparent,
      child: GradientBackground(
        gradient: QGradients.ambient(sky, brightness),
        child: CustomScrollView(
        slivers: [
          CupertinoSliverNavigationBar(
            largeTitle: const Text('History'),
            previousPageTitle: 'Insights',
            backgroundColor:
                QColors.bgGrouped.resolveFrom(context).withValues(alpha: 0.7),
            border: null,
            transitionBetweenRoutes: true,
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(
                  QSpace.md, QSpace.md, QSpace.md, QSpace.xs),
              child: QCard(
                padding: const EdgeInsets.all(QSpace.lg),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('THIS WEEK', style: QType.eyebrow.copyWith(color: sky)),
                    const SizedBox(height: QSpace.sm),
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.baseline,
                      textBaseline: TextBaseline.alphabetic,
                      children: [
                        Text(
                          '24',
                          style: QType.title1.copyWith(
                            letterSpacing: -0.5,
                            fontFeatures: const [FontFeature.tabularFigures()],
                          ),
                        ),
                        const SizedBox(width: QSpace.xs),
                        Text('nudges sent', style: QType.subhead),
                        const Spacer(),
                        QChip(
                          icon: CupertinoIcons.arrow_uturn_left,
                          label: '71% returned',
                          color: QColors.wellbeing,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          if (items.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: EmptyState(
                icon: CupertinoIcons.bell_slash,
                title: 'No nudges yet',
                message: 'Your interventions will appear here.',
              ),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.sm, QSpace.md, QSpace.xxl),
              sliver: SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, i) {
                    final it = items[i];
                    final lc = _levelColor(context, it.level);
                    final oc = _outcome(it.outcome);
                    return Padding(
                      padding: const EdgeInsets.only(bottom: QSpace.sm),
                      child: QCard(
                        child: Row(
                          children: [
                            Container(
                              width: 40,
                              height: 40,
                              decoration: BoxDecoration(
                                color: lc.withValues(alpha: 0.14),
                                borderRadius: BorderRadius.circular(11),
                              ),
                              child: Icon(_appIcons[it.app] ?? CupertinoIcons.app,
                                  color: lc, size: 20),
                            ),
                            const SizedBox(width: QSpace.sm),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(it.app, style: QType.headline),
                                      const SizedBox(width: QSpace.xs),
                                      QChip(label: _levelLabel(it.level), color: lc),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(DateFormat('EEE · h:mm a').format(it.at),
                                      style: QType.footnote),
                                ],
                              ),
                            ),
                            Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(oc.icon,
                                    color: oc.color(context), size: 22),
                                const SizedBox(height: 2),
                                Text(oc.label,
                                    style: QType.caption2.copyWith(
                                        color: oc.color(context),
                                        fontWeight: FontWeight.w600)),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                  childCount: items.length,
                ),
              ),
            ),
        ],
        ),
      ),
    );
  }
}
