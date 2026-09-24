import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/models/models.dart';
import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/editorial.dart';
import '../../core/widgets/glass.dart';
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
  // TODO(data): AppUsage has no per-app trend field, so every app's 7-day
  // shape is the same algebraic multiple of `minutes` (only the amplitude
  // differs). Add a `List<int> trend` to AppUsage in core/models to give each
  // app a distinct curve once real Screen Time data is wired.
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
    final accent = (app.distracting ? QColors.danger : QColors.breakColor)
        .resolveFrom(context);
    final opens = (app.minutes / 6).round() + 3;
    final nudges = app.distracting ? (app.minutes / 12).round() : 0;

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
            largeTitle: Text(app.name),
            previousPageTitle: 'Insights',
            backgroundColor:
                QColors.bgGrouped.resolveFrom(context).withValues(alpha: 0.7),
            border: null,
            transitionBetweenRoutes: true,
          ),
          SliverPadding(
            padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
            sliver: SliverToBoxAdapter(
              child: QStagger(
                children: [
              const SizedBox(height: QSpace.sm),
              QCard(
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
                            style: QType.largeTitle
                                .copyWith(color: accent, letterSpacing: -0.6)),
                        Text(
                            app.distracting
                                ? 'Distracting · today'
                                : 'Productive · today',
                            style: QType.meta),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: QSpace.md),
              QCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const QSectionHeader(
                        label: '7-day trend', padding: EdgeInsets.zero),
                    const SizedBox(height: QSpace.sm),
                    SizedBox(
                        height: 130,
                        child: TrendLineChart(values: _trend, color: accent)),
                  ],
                ),
              ),
              const SizedBox(height: QSpace.lg),
              const QSectionHeader(label: 'Activity'),
              _FrostedGroup(
                tint: sky,
                children: [
                  QRow(
                    icon: CupertinoIcons.hand_draw,
                    label: 'Opens',
                    value: '$opens',
                    chevron: false,
                  ),
                  QRow(
                    icon: CupertinoIcons.bell,
                    label: 'Nudges sent',
                    value: '$nudges',
                    chevron: false,
                  ),
                  QRow(
                    icon: CupertinoIcons.clock,
                    label: 'Avg per open',
                    value: fmtHm(((app.minutes / opens) * 60).round()),
                    chevron: false,
                  ),
                ],
              ),
              const SizedBox(height: QSpace.lg),
              _watched
                    ? QCard(
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
              const SizedBox(height: QSpace.xxl),
                ],
              ),
            ),
          ),
        ],
        ),
      ),
    );
  }
}

/// An inset-grouped list on the frosted [GlassCard] material: the same hairline
/// row separators + 44pt rows as [QGroup], but the container itself is frosted
/// glass so it refracts the ambient wash. Rows stay legible on neutral ink.
class _FrostedGroup extends StatelessWidget {
  const _FrostedGroup({required this.children, this.tint});

  final List<Widget> children;
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    final rows = <Widget>[];
    for (var i = 0; i < children.length; i++) {
      if (i > 0) {
        rows.add(Container(
          height: 0.5,
          margin: const EdgeInsets.only(left: QSpace.md),
          color: QColors.separator.resolveFrom(context).withValues(alpha: 0.6),
        ));
      }
      rows.add(children[i]);
    }
    return GlassCard(
      padding: EdgeInsets.zero,
      tint: tint,
      interactive: false,
      child: Column(children: rows),
    );
  }
}
