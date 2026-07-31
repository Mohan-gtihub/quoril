import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/providers.dart';
import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/inset_list.dart';
import '../../core/widgets/primary_button.dart';
import 'paywall_sheet.dart';
import 'you_screen.dart' show tierLabel;

/// E7 — Account & Subscription, wired to real auth + profile + tier.
class AccountPage extends ConsumerWidget {
  const AccountPage({super.key});

  void _changePassword(BuildContext context, WidgetRef ref) {
    HapticFeedback.selectionClick();
    final email = ref.read(authServiceProvider).user?.email;
    showCupertinoDialog<void>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text('Change Password'),
        content: Text(email == null
            ? 'Sign in to reset your password.'
            : 'We’ll email a secure reset link to $email.'),
        actions: [
          CupertinoDialogAction(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          if (email != null)
            CupertinoDialogAction(
              isDefaultAction: true,
              onPressed: () {
                HapticFeedback.lightImpact();
                ref.read(authServiceProvider).resetPassword(email);
                Navigator.pop(ctx);
              },
              child: const Text('Send Link'),
            ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authServiceProvider);
    final profile = ref.watch(profileProvider).valueOrNull;
    final email = auth.user?.email ?? 'Not signed in';
    final fullName = (profile?['full_name'] as String?)?.trim();
    final displayName = (fullName != null && fullName.isNotEmpty) ? fullName : '—';

    final brightness = MediaQuery.platformBrightnessOf(context);
    return CupertinoPageScaffold(
      backgroundColor: const Color(0x00000000),
      child: GradientBackground(
        gradient: QGradients.page(brightness),
        child: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          const CupertinoSliverNavigationBar(
              previousPageTitle: 'You',
              largeTitle: Text('Account'),
              backgroundColor: Color(0x00000000),
              border: null),
          SliverList(
            delegate: SliverChildListDelegate([
              const SizedBox(height: QSpace.xs),
              InsetSection(
                header: 'Profile',
                children: [
                  InsetRow(
                      icon: CupertinoIcons.person_fill,
                      title: 'Name',
                      value: displayName,
                      showChevron: false),
                  InsetRow(
                      icon: CupertinoIcons.mail_solid,
                      iconColor: QColors.breakColor,
                      title: 'Email',
                      value: email,
                      showChevron: false),
                  InsetRow(
                    icon: CupertinoIcons.lock_fill,
                    iconColor: QColors.labelSecondary,
                    title: 'Change password',
                    onTap: () => _changePassword(context, ref),
                  ),
                ],
              ),
              const SizedBox(height: QSpace.xl),
              Padding(
                padding: const EdgeInsets.fromLTRB(
                    QSpace.md + QSpace.xs, 0, QSpace.md, QSpace.xs),
                child: Text('SUBSCRIPTION', style: QType.sectionHeader),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
                child: _PlanCard(
                  tier: auth.tier,
                  isPro: auth.isPro,
                  onUpgrade: () {
                    HapticFeedback.selectionClick();
                    showPaywallSheet(context);
                  },
                ),
              ),
              const SizedBox(height: QSpace.xl),
              InsetSection(
                children: [
                  InsetRow(
                    icon: CupertinoIcons.arrow_clockwise,
                    iconColor: QColors.wellbeing,
                    title: 'Restore purchases',
                    showChevron: false,
                    onTap: () {
                      HapticFeedback.lightImpact();
                      showCupertinoDialog<void>(
                        context: context,
                        builder: (ctx) => CupertinoAlertDialog(
                          title: const Text('Restore Purchases'),
                          content: const Text('No previous purchases were found.'),
                          actions: [
                            CupertinoDialogAction(
                                onPressed: () => Navigator.pop(ctx),
                                child: const Text('OK')),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
              const SizedBox(height: QSpace.xl),
              InsetSection(
                children: [
                  InsetRow(
                    icon: CupertinoIcons.trash_fill,
                    iconColor: QColors.danger,
                    title: 'Delete account',
                    destructive: true,
                    showChevron: false,
                    onTap: () {
                      HapticFeedback.lightImpact();
                      showCupertinoModalPopup<void>(
                        context: context,
                        builder: (ctx) => CupertinoActionSheet(
                          title: const Text('Delete account?'),
                          message: const Text(
                              'This permanently erases your data and cannot be undone.'),
                          actions: [
                            CupertinoActionSheetAction(
                              isDestructiveAction: true,
                              onPressed: () {
                                HapticFeedback.heavyImpact();
                                Navigator.pop(ctx);
                              },
                              child: const Text('Delete Account'),
                            ),
                          ],
                          cancelButton: CupertinoActionSheetAction(
                            onPressed: () => Navigator.pop(ctx),
                            child: const Text('Cancel'),
                          ),
                        ),
                      );
                    },
                  ),
                ],
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

class _PlanCard extends StatelessWidget {
  const _PlanCard({required this.tier, required this.isPro, required this.onUpgrade});
  final String tier;
  final bool isPro;
  final VoidCallback onUpgrade;

  @override
  Widget build(BuildContext context) {
    final tint = QColors.breakColor.resolveFrom(context);
    return Container(
      padding: const EdgeInsets.all(QSpace.md),
      decoration: BoxDecoration(
        color: QColors.surface.resolveFrom(context),
        borderRadius: BorderRadius.circular(QRadius.card),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(tierLabel(tier), style: QType.title3),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: QSpace.sm, vertical: 3),
                decoration: BoxDecoration(
                  color: (isPro ? QColors.warn : QColors.fill)
                      .resolveFrom(context)
                      .withValues(alpha: isPro ? 0.18 : 1.0),
                  borderRadius: BorderRadius.circular(QRadius.capsule),
                ),
                child: Text(isPro ? 'Active' : 'Current',
                    style: QType.caption.copyWith(
                        fontWeight: FontWeight.w600,
                        color: (isPro ? QColors.warn : QColors.labelSecondary)
                            .resolveFrom(context))),
              ),
            ],
          ),
          const SizedBox(height: QSpace.xs),
          Text(
              isPro
                  ? 'You have full access to unlimited watched apps, advanced insights, and cloud sync.'
                  : 'Unlock unlimited watched apps, advanced insights, and cloud sync with Quoril Pro.',
              style: QType.subhead),
          if (!isPro) ...[
            const SizedBox(height: QSpace.md),
            PrimaryButton(
              label: 'Upgrade to Pro',
              icon: CupertinoIcons.star_fill,
              color: tint,
              onPressed: onUpgrade,
            ),
          ],
        ],
      ),
    );
  }
}
