import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/app_kit.dart';
import '../../core/widgets/editorial.dart';
import 'settings_widgets.dart';
import 'theme_mode_provider.dart';

/// E6 — Appearance. Wired to [themeModeProvider] so the choice takes effect
/// globally (see the TODO in theme_mode_provider.dart for the app-root read).
class AppearancePage extends ConsumerWidget {
  const AppearancePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final mode = ref.watch(themeModeProvider);
    return SettingsAmbientBackground(
      child: AppScaffold(
      title: 'Appearance',
      backgroundColor: const Color(0x00000000),
      transitionBetweenRoutes: true,
      slivers: [
        SliverPagePadding(
          child: QStagger(children: [
                    const QSectionHeader(label: 'Theme'),
                    QSegmentedControl<QThemeMode>(
                      groupValue: mode,
                      accent: QSection.settings,
                      onValueChanged: (v) {
                        if (v == null) return;
                        HapticFeedback.selectionClick();
                        ref.read(themeModeProvider.notifier).set(v);
                      },
                      children: const {
                        QThemeMode.system: Text('System'),
                        QThemeMode.light: Text('Light'),
                        QThemeMode.dark: Text('Dark'),
                      },
                    ),
                    const SizedBox(height: QSpace.xs),
                    Text(
                      mode == QThemeMode.system
                          ? 'Quoril follows your device appearance.'
                          : 'Quoril stays in ${mode == QThemeMode.light ? 'light' : 'dark'} regardless of your device.',
                      style: QType.footnote,
                    ),
                    const SizedBox(height: QSpace.xl),
                    const QSectionHeader(label: 'Preview'),
                    _PreviewCard(forced: mode.forcedBrightness),
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
      duration: QMotion.duration(context, QMotion.base),
      curve: QMotion.standard,
      child: CupertinoTheme(
        data: CupertinoThemeData(brightness: effective),
        child: Builder(
          builder: (ctx) => Container(
            padding: const EdgeInsets.all(QSpace.md),
            decoration: BoxDecoration(
              color: QColors.bgGrouped.resolveFrom(ctx),
              borderRadius: BorderRadius.circular(QRadius.glass),
              boxShadow: QElevation.card(ctx),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    QIconTile(
                        icon: CupertinoIcons.timer,
                        color: QColors.brand,
                        size: 40),
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
                    boxShadow: QElevation.card(ctx),
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
