import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/app_kit.dart';
import '../../core/widgets/editorial.dart';
import 'settings_widgets.dart';

/// E10 — About.
class AboutPage extends StatelessWidget {
  const AboutPage({super.key});

  void _info(BuildContext context, String title, String body) {
    HapticFeedback.selectionClick();
    Navigator.of(context).push(
      CupertinoPageRoute(
        builder: (_) => _DocPage(title: title, body: body),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SettingsAmbientBackground(
      child: AppScaffold(
      title: 'About',
      backgroundColor: const Color(0x00000000),
      transitionBetweenRoutes: true,
      slivers: [
        SliverPagePadding(
          top: QSpace.lg,
          child: QStagger(children: [
              Center(
                child: Column(
                  children: [
                    Container(
                      width: 76,
                      height: 76,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(18),
                        gradient: QGradients.warm,
                        boxShadow: QElevation.brandGlow(context),
                      ),
                      child: const Icon(
                        CupertinoIcons.timer,
                        color: CupertinoColors.white,
                        size: 40,
                      ),
                    ),
                    const SizedBox(height: QSpace.md),
                    Text('Quoril', style: QType.largeTitle),
                    const SizedBox(height: 2),
                    Text('Focus, protected.', style: QType.subhead),
                  ],
                ),
              ),
              const SizedBox(height: QSpace.xl),
              const QSectionHeader(label: 'Version'),
              FrostedGroup(children: const [
                SettingsRow(
                  icon: CupertinoIcons.number,
                  title: 'Version',
                  value: '1.1.6',
                  chevron: false,
                ),
                SettingsRow(
                  icon: CupertinoIcons.hammer,
                  iconColor: QColors.labelSecondary,
                  title: 'Build',
                  value: '1160',
                  chevron: false,
                ),
              ]),
              const SizedBox(height: QSpace.lg),
              FrostedGroup(children: [
                SettingsRow(
                  icon: CupertinoIcons.sparkles,
                  iconColor: QColors.warn,
                  title: 'What’s new',
                  onTap: () => _info(
                    context,
                    'What’s New',
                    'Version 1.1.6\n\nâ€¢ Hardened session reliability.\nâ€¢ New Liquid Glass surfaces across the app.\nâ€¢ Faster distraction nudges.',
                  ),
                ),
                SettingsRow(
                  icon: CupertinoIcons.lock_shield_fill,
                  iconColor: QColors.breakColor,
                  title: 'Privacy policy',
                  onTap: () => _info(
                    context,
                    'Privacy Policy',
                    'Quoril processes usage data on-device wherever possible. We never sell your data.',
                  ),
                ),
                SettingsRow(
                  icon: CupertinoIcons.doc_text_fill,
                  iconColor: QColors.labelSecondary,
                  title: 'Terms of service',
                  onTap: () => _info(
                    context,
                    'Terms of Service',
                    'By using Quoril you agree to our terms. Use the app responsibly.',
                  ),
                ),
                SettingsRow(
                  icon: CupertinoIcons.heart_fill,
                  iconColor: QColors.danger,
                  title: 'Acknowledgements',
                  onTap: () => _info(
                    context,
                    'Acknowledgements',
                    'Built with Flutter and the Cupertino library.\n\nThank you to our alpha testers.',
                  ),
                ),
              ]),
              const SizedBox(height: QSpace.lg),
              FrostedGroup(children: [
                SettingsRow(
                  icon: CupertinoIcons.star_fill,
                  iconColor: QColors.warn,
                  title: 'Rate on the App Store',
                  onTap: () => HapticFeedback.lightImpact(),
                ),
                SettingsRow(
                  icon: CupertinoIcons.envelope_fill,
                  iconColor: QColors.wellbeing,
                  title: 'Contact support',
                  value: 'kilarimohansai@gmail.com',
                  onTap: () => HapticFeedback.lightImpact(),
                ),
              ]),
              const SizedBox(height: QSpace.xl),
              Center(
                child: Text('Made with care in India', style: QType.caption),
              ),
              ]),
        ),
      ],
    ),
    );
  }
}

class _DocPage extends StatelessWidget {
  const _DocPage({required this.title, required this.body});
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return SettingsAmbientBackground(
      child: AppScaffold(
      title: title,
      backgroundColor: const Color(0x00000000),
      transitionBetweenRoutes: true,
      slivers: [
        SliverPagePadding(
          margin: const EdgeInsets.symmetric(horizontal: QSpace.lg),
          top: QSpace.xs,
          child: Text(
            body,
            style: QType.body.copyWith(
              color: QColors.label.resolveFrom(context),
              height: 1.4,
            ),
          ),
        ),
      ],
    ),
    );
  }
}
