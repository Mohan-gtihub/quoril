import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/inset_list.dart';

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
    final tint = QColors.tint.resolveFrom(context);
    return CupertinoPageScaffold(
      backgroundColor: QColors.bgGrouped.resolveFrom(context),
      child: CustomScrollView(
        slivers: [
          const CupertinoSliverNavigationBar(
            previousPageTitle: 'You',
            largeTitle: Text('About'),
          ),
          SliverList(
            delegate: SliverChildListDelegate([
              const SizedBox(height: QSpace.lg),
              Center(
                child: Column(
                  children: [
                    Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(18),
                        gradient: LinearGradient(
                          colors: [tint, tint.withValues(alpha: 0.55)],
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                        ),
                      ),
                      child: const Icon(
                        CupertinoIcons.timer,
                        color: CupertinoColors.white,
                        size: 40,
                      ),
                    ),
                    const SizedBox(height: QSpace.sm),
                    Text('Quoril', style: QType.title3),
                    Text('Focus, protected.', style: QType.footnote),
                  ],
                ),
              ),
              const SizedBox(height: QSpace.xl),
              InsetSection(
                header: 'Version',
                children: const [
                  InsetRow(
                    icon: CupertinoIcons.number,
                    title: 'Version',
                    value: '1.1.6',
                    showChevron: false,
                  ),
                  InsetRow(
                    icon: CupertinoIcons.hammer,
                    iconColor: QColors.labelSecondary,
                    title: 'Build',
                    value: '1160',
                    showChevron: false,
                  ),
                ],
              ),
              const SizedBox(height: QSpace.xl),
              InsetSection(
                children: [
                  InsetRow(
                    icon: CupertinoIcons.sparkles,
                    iconColor: QColors.warn,
                    title: 'What’s New',
                    onTap: () => _info(
                      context,
                      'What’s New',
                      'Version 1.1.6\n\n• Hardened session reliability.\n• New Liquid Glass surfaces across the app.\n• Faster distraction nudges.',
                    ),
                  ),
                  InsetRow(
                    icon: CupertinoIcons.lock_shield_fill,
                    iconColor: QColors.tint,
                    title: 'Privacy Policy',
                    onTap: () => _info(
                      context,
                      'Privacy Policy',
                      'Quoril processes usage data on-device wherever possible. We never sell your data.',
                    ),
                  ),
                  InsetRow(
                    icon: CupertinoIcons.doc_text_fill,
                    iconColor: QColors.labelSecondary,
                    title: 'Terms of Service',
                    onTap: () => _info(
                      context,
                      'Terms of Service',
                      'By using Quoril you agree to our terms. Use the app responsibly.',
                    ),
                  ),
                  InsetRow(
                    icon: CupertinoIcons.heart_fill,
                    iconColor: QColors.danger,
                    title: 'Acknowledgements',
                    onTap: () => _info(
                      context,
                      'Acknowledgements',
                      'Built with Flutter and the Cupertino library.\n\nThank you to our alpha testers.',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: QSpace.xl),
              InsetSection(
                children: [
                  InsetRow(
                    icon: CupertinoIcons.star_fill,
                    iconColor: QColors.warn,
                    title: 'Rate on the App Store',
                    onTap: () => HapticFeedback.lightImpact(),
                  ),
                  InsetRow(
                    icon: CupertinoIcons.envelope_fill,
                    iconColor: QColors.wellbeing,
                    title: 'Contact support',
                    value: 'kilarimohansai@gmail.com',
                    onTap: () => HapticFeedback.lightImpact(),
                  ),
                ],
              ),
              const SizedBox(height: QSpace.xl),
              Center(
                child: Text('Made with care in India', style: QType.caption),
              ),
              const SizedBox(height: QSpace.xxl),
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
    return CupertinoPageScaffold(
      backgroundColor: QColors.bgGrouped.resolveFrom(context),
      child: CustomScrollView(
        slivers: [
          CupertinoSliverNavigationBar(
            previousPageTitle: 'About',
            largeTitle: Text(title),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(QSpace.lg),
              child: Text(
                body,
                style: QType.body.copyWith(
                  color: QColors.label.resolveFrom(context),
                  height: 1.4,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
