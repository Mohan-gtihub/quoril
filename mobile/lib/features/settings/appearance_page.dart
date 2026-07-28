import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';

enum _Appearance { system, light, dark }

/// E6 — Appearance.
class AppearancePage extends StatefulWidget {
  const AppearancePage({super.key});

  @override
  State<AppearancePage> createState() => _AppearancePageState();
}

class _AppearancePageState extends State<AppearancePage> {
  _Appearance _mode = _Appearance.system;

  Brightness? get _forced => switch (_mode) {
        _Appearance.system => null,
        _Appearance.light => Brightness.light,
        _Appearance.dark => Brightness.dark,
      };

  @override
  Widget build(BuildContext context) {
    return CupertinoPageScaffold(
      backgroundColor: QColors.bgGrouped.resolveFrom(context),
      child: CustomScrollView(
        slivers: [
          const CupertinoSliverNavigationBar(
              previousPageTitle: 'You', largeTitle: Text('Appearance')),
          SliverList(
            delegate: SliverChildListDelegate([
              const SizedBox(height: QSpace.md),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
                child: CupertinoSlidingSegmentedControl<_Appearance>(
                  groupValue: _mode,
                  onValueChanged: (v) {
                    if (v == null) return;
                    HapticFeedback.selectionClick();
                    setState(() => _mode = v);
                  },
                  children: const {
                    _Appearance.system: Padding(
                        padding: EdgeInsets.symmetric(vertical: 6),
                        child: Text('System')),
                    _Appearance.light: Text('Light'),
                    _Appearance.dark: Text('Dark'),
                  },
                ),
              ),
              const SizedBox(height: QSpace.xl),
              Padding(
                padding: const EdgeInsets.fromLTRB(
                    QSpace.md + QSpace.xs, 0, QSpace.md, QSpace.xs),
                child: Text('PREVIEW', style: QType.sectionHeader),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
                child: _PreviewCard(forced: _forced),
              ),
              const SizedBox(height: QSpace.xxl),
            ]),
          ),
        ],
      ),
    );
  }
}

class _PreviewCard extends StatelessWidget {
  const _PreviewCard({required this.forced});
  final Brightness? forced;

  @override
  Widget build(BuildContext context) {
    final effective = forced ?? MediaQuery.platformBrightnessOf(context);
    return AnimatedContainer(
      duration: QMotion.base,
      curve: QMotion.standard,
      child: CupertinoTheme(
        data: CupertinoThemeData(brightness: effective),
        child: Builder(
          builder: (ctx) => Container(
            padding: const EdgeInsets.all(QSpace.md),
            decoration: BoxDecoration(
              color: QColors.bgGrouped.resolveFrom(ctx),
              borderRadius: BorderRadius.circular(QRadius.glass),
              border: Border.all(
                  color: QColors.separator.resolveFrom(ctx), width: 0.5),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: QColors.tint.resolveFrom(ctx),
                      ),
                      child: const Icon(CupertinoIcons.timer,
                          color: CupertinoColors.white, size: 22),
                    ),
                    const SizedBox(width: QSpace.sm),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Focus Session',
                            style: QType.headline.copyWith(
                                color: QColors.label.resolveFrom(ctx))),
                        Text('Deep Work · 25:00',
                            style: QType.footnote.copyWith(
                                color: QColors.labelSecondary.resolveFrom(ctx))),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: QSpace.md),
                Container(
                  padding: const EdgeInsets.all(QSpace.md),
                  decoration: BoxDecoration(
                    color: QColors.surface.resolveFrom(ctx),
                    borderRadius: BorderRadius.circular(QRadius.card),
                  ),
                  child: Row(
                    children: [
                      Icon(CupertinoIcons.checkmark_circle_fill,
                          color: QColors.wellbeing.resolveFrom(ctx), size: 20),
                      const SizedBox(width: QSpace.sm),
                      Text('Ship the design spec',
                          style: QType.body
                              .copyWith(color: QColors.label.resolveFrom(ctx))),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
