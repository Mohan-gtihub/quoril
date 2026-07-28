import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/providers.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/inset_list.dart';
import 'about_page.dart';
import 'account_page.dart';
import 'appearance_page.dart';
import 'distraction_rules_page.dart';
import 'feedback_sheet.dart';
import 'focus_settings_page.dart';
import 'notifications_page.dart';

/// YOU / SETTINGS — top-level profile + settings hub, wired to real auth.
class YouScreen extends ConsumerWidget {
  const YouScreen({super.key});

  void _push(BuildContext context, Widget page) {
    HapticFeedback.selectionClick();
    Navigator.of(context).push(CupertinoPageRoute<void>(builder: (_) => page));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return CupertinoPageScaffold(
      backgroundColor: QColors.bgGrouped.resolveFrom(context),
      child: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          const CupertinoSliverNavigationBar(largeTitle: Text('You')),
          SliverList(
            delegate: SliverChildListDelegate([
              const SizedBox(height: QSpace.xs),
              _ProfileHeader(onTap: () => _push(context, const AccountPage())),
              const SizedBox(height: QSpace.lg),
              InsetSection(
                header: 'Focus',
                children: [
                  InsetRow(
                    icon: CupertinoIcons.timer,
                    iconColor: QColors.focus,
                    title: 'Focus & Pomodoro',
                    onTap: () => _push(context, const FocusSettingsPage()),
                  ),
                  InsetRow(
                    icon: CupertinoIcons.shield_lefthalf_fill,
                    iconColor: QColors.breakColor,
                    title: 'Distraction Rules',
                    onTap: () => _push(context, const DistractionRulesPage()),
                  ),
                ],
              ),
              const SizedBox(height: QSpace.xl),
              InsetSection(
                header: 'Preferences',
                children: [
                  InsetRow(
                    icon: CupertinoIcons.bell_fill,
                    iconColor: QColors.danger,
                    title: 'Notifications',
                    onTap: () => _push(context, const NotificationsPage()),
                  ),
                  InsetRow(
                    icon: CupertinoIcons.paintbrush_fill,
                    iconColor: QColors.workspacePalette[5],
                    title: 'Appearance',
                    onTap: () => _push(context, const AppearancePage()),
                  ),
                ],
              ),
              const SizedBox(height: QSpace.xl),
              InsetSection(
                header: 'Account',
                children: [
                  InsetRow(
                    icon: CupertinoIcons.star_fill,
                    iconColor: QColors.warn,
                    title: 'Subscription',
                    onTap: () => _push(context, const AccountPage()),
                  ),
                  InsetRow(
                    icon: CupertinoIcons.chat_bubble_2_fill,
                    iconColor: QColors.wellbeing,
                    title: 'Send Feedback',
                    onTap: () {
                      HapticFeedback.selectionClick();
                      showFeedbackSheet(context);
                    },
                  ),
                  InsetRow(
                    icon: CupertinoIcons.info_circle_fill,
                    iconColor: QColors.labelSecondary,
                    title: 'About',
                    onTap: () => _push(context, const AboutPage()),
                  ),
                ],
              ),
              const SizedBox(height: QSpace.xl),
              const _SignOutSection(),
              const SizedBox(height: QSpace.xxl),
            ]),
          ),
        ],
      ),
    );
  }
}

String tierLabel(String tier) => switch (tier) {
      'monthly' => 'Pro · Monthly',
      'annual' => 'Pro · Annual',
      'lifetime' => 'Pro · Lifetime',
      _ => 'Free plan',
    };

String initialsFor(String? email, String? fullName) {
  final src = (fullName != null && fullName.trim().isNotEmpty) ? fullName : email;
  if (src == null || src.trim().isEmpty) return '?';
  final parts = src.trim().split(RegExp(r'[\s@._]+')).where((p) => p.isNotEmpty).toList();
  if (parts.isEmpty) return '?';
  if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
  return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
}

class _ProfileHeader extends ConsumerWidget {
  const _ProfileHeader({required this.onTap});
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authServiceProvider);
    final profile = ref.watch(profileProvider).valueOrNull;
    final email = auth.user?.email;
    final fullName = profile?['full_name'] as String?;
    final displayName = (fullName != null && fullName.trim().isNotEmpty)
        ? fullName
        : (email ?? 'Signed out');
    final tint = QColors.tint.resolveFrom(context);

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: QSpace.md),
        padding: const EdgeInsets.all(QSpace.md),
        decoration: BoxDecoration(
          color: QColors.surface.resolveFrom(context),
          borderRadius: BorderRadius.circular(QRadius.card),
        ),
        child: Row(
          children: [
            Container(
              width: 60,
              height: 60,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [tint, tint.withValues(alpha: 0.62)],
                ),
              ),
              child: Text(
                initialsFor(email, fullName),
                style: QType.title2.copyWith(color: CupertinoColors.white),
              ),
            ),
            const SizedBox(width: QSpace.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(displayName,
                      style: QType.title3,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis),
                  if (fullName != null && fullName.trim().isNotEmpty && email != null) ...[
                    const SizedBox(height: 2),
                    Text(email,
                        style: QType.subhead,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  ],
                  const SizedBox(height: QSpace.xs),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: QSpace.sm, vertical: 3),
                    decoration: BoxDecoration(
                      color: (auth.isPro ? QColors.warn : QColors.fill)
                          .resolveFrom(context)
                          .withValues(alpha: auth.isPro ? 0.18 : 1.0),
                      borderRadius: BorderRadius.circular(QRadius.capsule),
                    ),
                    child: Text(
                      tierLabel(auth.tier),
                      style: QType.caption.copyWith(
                        fontWeight: FontWeight.w600,
                        color: (auth.isPro ? QColors.warn : QColors.labelSecondary)
                            .resolveFrom(context),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Icon(CupertinoIcons.chevron_right,
                size: 16, color: QColors.labelTertiary.resolveFrom(context)),
          ],
        ),
      ),
    );
  }
}

class _SignOutSection extends ConsumerWidget {
  const _SignOutSection();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: QSpace.md),
      decoration: BoxDecoration(
        color: QColors.surface.resolveFrom(context),
        borderRadius: BorderRadius.circular(QRadius.card),
      ),
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: () {
          HapticFeedback.lightImpact();
          showCupertinoModalPopup<void>(
            context: context,
            builder: (ctx) => CupertinoActionSheet(
              title: const Text('Sign out of Quoril?'),
              message: const Text('Your synced data stays safe in your account.'),
              actions: [
                CupertinoActionSheetAction(
                  isDestructiveAction: true,
                  onPressed: () {
                    HapticFeedback.heavyImpact();
                    Navigator.pop(ctx);
                    ref.read(authServiceProvider).signOut();
                  },
                  child: const Text('Sign Out'),
                ),
              ],
              cancelButton: CupertinoActionSheetAction(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel'),
              ),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 11),
          child: Center(
            child: Text('Sign Out',
                style: QType.body.copyWith(color: QColors.danger.resolveFrom(context))),
          ),
        ),
      ),
    );
  }
}
