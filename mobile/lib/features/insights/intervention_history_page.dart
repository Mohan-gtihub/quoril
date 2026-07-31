import 'package:flutter/cupertino.dart';
import 'package:intl/intl.dart';

import '../../core/data/mock_data.dart';
import '../../core/models/models.dart';
import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/glass.dart';

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

    final brightness =
        MediaQuery.maybeOf(context)?.platformBrightness ?? Brightness.light;
    return CupertinoPageScaffold(
      backgroundColor: QColors.bgGrouped.resolveFrom(context),
      child: GradientBackground(
        gradient: QGradients.page(brightness),
        child: CustomScrollView(
        slivers: [
          CupertinoSliverNavigationBar(
            largeTitle: const Text('History'),
            previousPageTitle: 'Insights',
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.sm, QSpace.md, QSpace.xs),
              child: GlassCard(
                child: Row(
                  children: [
                    Icon(CupertinoIcons.bell_fill,
                        color: QColors.breakColor.resolveFrom(context), size: 22),
                    const SizedBox(width: QSpace.sm),
                    Expanded(
                      child: RichText(
                        text: TextSpan(
                          style: QType.callout.copyWith(color: QColors.label.resolveFrom(context)),
                          children: [
                            const TextSpan(text: 'This week: '),
                            TextSpan(
                                text: '24 nudges',
                                style: QType.callout.copyWith(fontWeight: FontWeight.w600)),
                            const TextSpan(text: ' · '),
                            TextSpan(
                                text: '71% returned',
                                style: QType.callout.copyWith(
                                    fontWeight: FontWeight.w600,
                                    color: QColors.wellbeing.resolveFrom(context))),
                          ],
                        ),
                      ),
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
                message: 'Interventions will appear here as they happen.',
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
                      child: GlassCard(
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
                            Icon(oc.icon, color: oc.color(context), size: 22),
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
