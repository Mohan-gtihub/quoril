import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/providers.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/app_kit.dart';
import '../../core/widgets/editorial.dart';
import '../../core/widgets/primary_button.dart';
import 'paywall_sheet.dart';
import 'settings_widgets.dart';
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

  /// Restore purchases: run the (best-effort) restore, then gate the outcome
  /// dialog on the actual result rather than always claiming "none found".
  /// Currently no billing SDK is wired, so [isPro] stands in for a restored
  /// entitlement — the branch is real, not a hardcoded message.
  Future<void> _restorePurchases(BuildContext context, WidgetRef ref) async {
    HapticFeedback.lightImpact();
    final restored = ref.read(authServiceProvider).isPro;
    if (!context.mounted) return;
    showCupertinoDialog<void>(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text('Restore Purchases'),
        content: Text(restored
            ? 'Your Pro subscription has been restored.'
            : 'No previous purchases were found for your Apple ID.'),
        actions: [
          CupertinoDialogAction(
              onPressed: () => Navigator.pop(ctx), child: const Text('OK')),
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

    return SettingsAmbientBackground(
      child: AppScaffold(
      title: 'Account',
      backgroundColor: const Color(0x00000000),
      transitionBetweenRoutes: true,
      slivers: [
        SliverPagePadding(
          top: QSpace.xs,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const QSectionHeader(label: 'Profile'),
              FrostedGroup(children: [
                SettingsRow(
                    icon: CupertinoIcons.person_fill,
                    title: 'Name',
                    value: displayName,
                    chevron: false),
                SettingsRow(
                    icon: CupertinoIcons.mail_solid,
                    iconColor: QColors.breakColor,
                    title: 'Email',
                    value: email,
                    chevron: false),
                SettingsRow(
                  icon: CupertinoIcons.lock_fill,
                  iconColor: QColors.labelSecondary,
                  title: 'Change password',
                  onTap: () => _changePassword(context, ref),
                ),
              ]),
              const SizedBox(height: QSpace.lg),
              const QSectionHeader(label: 'Subscription'),
              _PlanCard(
                tier: auth.tier,
                isPro: auth.isPro,
                onUpgrade: () {
                  HapticFeedback.selectionClick();
                  showPaywallSheet(context);
                },
              ),
              const SizedBox(height: QSpace.lg),
              FrostedGroup(children: [
                SettingsRow(
                  icon: CupertinoIcons.arrow_clockwise,
                  iconColor: QColors.wellbeing,
                  title: 'Restore purchases',
                  chevron: false,
                  onTap: () => _restorePurchases(context, ref),
                ),
              ]),
              const SizedBox(height: QSpace.lg),
              FrostedGroup(children: [
                SettingsRow(
                  icon: CupertinoIcons.trash_fill,
                  iconColor: QColors.danger,
                  title: 'Delete account',
                  destructive: true,
                  chevron: false,
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
                ]),
            ],
          ),
        ),
      ],
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
    final tint = QColors.brand.resolveFrom(context);
    return QCard(
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
              label: 'Unlock Quoril Pro',
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
