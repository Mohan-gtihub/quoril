import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/models/models.dart';
import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/glass.dart';
import '../../core/widgets/inset_list.dart';
import '../../core/widgets/primary_button.dart';
import 'widgets/charts.dart';

/// Single-app detail: total time, trend, opens, nudges, add to watched.
class AppDetailPage extends StatefulWidget {
  const AppDetailPage({super.key, required this.app});

  final AppUsage app;

  @override
  State<AppDetailPage> createState() => _AppDetailPageState();
}

class _AppDetailPageState extends State<AppDetailPage> {
  bool _watched = false;

  // Deterministic mock derivations from the app's minutes.
  List<int> get _trend {
    final base = widget.app.minutes;
    return [
      (base * 0.7).round(),
      (base * 1.1).round(),
      (base * 0.5).round(),
      (base * 0.9).round(),
      (base * 1.3).round(),
      (base * 0.8).round(),
      base,
    ];
  }

  @override
  Widget build(BuildContext context) {
    final app = widget.app;
    final accent = (app.distracting ? QColors.danger : QColors.breakColor).resolveFrom(context);
    final opens = (app.minutes / 6).round() + 3;
    final nudges = app.distracting ? (app.minutes / 12).round() : 0;
    final brightness =
        MediaQuery.maybeOf(context)?.platformBrightness ?? Brightness.light;

    return CupertinoPageScaffold(
      backgroundColor: QColors.bgGrouped.resolveFrom(context),
      child: GradientBackground(
        gradient: QGradients.page(brightness),
        child: CustomScrollView(
        slivers: [
          CupertinoSliverNavigationBar(
            largeTitle: Text(app.name),
            previousPageTitle: 'Insights',
          ),
          SliverList(
            delegate: SliverChildListDelegate([
              const SizedBox(height: QSpace.sm),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
                child: GlassCard(
                  child: Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: accent.withValues(alpha: 0.14),
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Icon(app.icon, color: accent, size: 26),
                      ),
                      const SizedBox(width: QSpace.md),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(fmtHm(app.minutes * 60),
                              style: QType.title1.copyWith(color: accent, letterSpacing: -0.5)),
                          Text(app.distracting ? 'Distracting · today' : 'Productive · today',
                              style: QType.footnote),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: QSpace.md),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
                child: GlassCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('7-day trend', style: QType.headline),
                      const SizedBox(height: QSpace.md),
                      SizedBox(
                          height: 130,
                          child: TrendLineChart(values: _trend, color: accent)),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: QSpace.lg),
              InsetSection(
                header: 'Activity',
                children: [
                  InsetRow(
                    icon: CupertinoIcons.hand_draw,
                    iconColor: QColors.breakColor,
                    title: 'Opens',
                    value: '$opens',
                    showChevron: false,
                  ),
                  InsetRow(
                    icon: CupertinoIcons.bell,
                    iconColor: QColors.warn,
                    title: 'Nudges sent',
                    value: '$nudges',
                    showChevron: false,
                  ),
                  InsetRow(
                    icon: CupertinoIcons.clock,
                    iconColor: QColors.labelSecondary,
                    title: 'Avg per open',
                    value: fmtHm(((app.minutes / opens) * 60).round()),
                    showChevron: false,
                  ),
                ],
              ),
              const SizedBox(height: QSpace.lg),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
                child: _watched
                    ? GlassCard(
                        child: Row(
                          children: [
                            Icon(CupertinoIcons.checkmark_seal_fill,
                                color: QColors.wellbeing.resolveFrom(context)),
                            const SizedBox(width: QSpace.sm),
                            Expanded(
                              child: Text('${app.name} is now a watched app',
                                  style: QType.callout),
                            ),
                          ],
                        ),
                      )
                    : PrimaryButton(
                        label: 'Add to watched apps',
                        icon: CupertinoIcons.eye,
                        style: QButtonStyle.tinted,
                        color: accent,
                        onPressed: () {
                          HapticFeedback.mediumImpact();
                          setState(() => _watched = true);
                        },
                      ),
              ),
              const SizedBox(height: QSpace.xxl),
            ]),
          ),
        ],
        ),
      ),
    );
  }
}
