import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/providers.dart';
import '../../core/data/mock_data.dart';
import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/common.dart';
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
    final brightness = MediaQuery.platformBrightnessOf(context);
    return CupertinoPageScaffold(
      backgroundColor: QColors.bgGrouped.resolveFrom(context).withValues(alpha: 0.0),
      child: GradientBackground(
        gradient: QGradients.page(brightness),
        child: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          const CupertinoSliverNavigationBar(
            largeTitle: Text('You'),
            backgroundColor: Color(0x00000000),
            border: null,
          ),
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
                    iconColor: QColors.breakColor,
                    title: 'Focus & Pomodoro',
                    onTap: () => _push(context, const FocusSettingsPage()),
                  ),
                  InsetRow(
                    icon: CupertinoIcons.shield_lefthalf_fill,
                    iconColor: QColors.workspacePalette[3],
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
    final showEmail =
        fullName != null && fullName.trim().isNotEmpty && email != null;
    const onWarm = CupertinoColors.white;

    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: QSpace.md),
        padding: const EdgeInsets.all(QSpace.lg),
        decoration: BoxDecoration(
          gradient: QGradients.warm,
          borderRadius: BorderRadius.circular(QRadius.glass),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFFC5471B).withValues(alpha: 0.28),
              blurRadius: 22,
              offset: const Offset(0, 10),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 60,
                  height: 60,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: onWarm.withValues(alpha: 0.22),
                    border: Border.all(
                        color: onWarm.withValues(alpha: 0.55), width: 1.5),
                  ),
                  child: Text(
                    initialsFor(email, fullName),
                    style: QType.title2.copyWith(color: onWarm),
                  ),
                ),
                const SizedBox(width: QSpace.md),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(displayName,
                          style: QType.title3.copyWith(color: onWarm),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis),
                      if (showEmail) ...[
                        const SizedBox(height: 2),
                        Text(email,
                            style: QType.subhead
                                .copyWith(color: onWarm.withValues(alpha: 0.82)),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis),
                      ],
                      const SizedBox(height: QSpace.xs),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: QSpace.sm, vertical: 3),
                        decoration: BoxDecoration(
                          color: onWarm.withValues(alpha: 0.2),
                          borderRadius: BorderRadius.circular(QRadius.capsule),
                        ),
                        child: Text(
                          tierLabel(auth.tier),
                          style: QType.caption.copyWith(
                            fontWeight: FontWeight.w600,
                            color: onWarm,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Icon(CupertinoIcons.chevron_right,
                    size: 16, color: onWarm.withValues(alpha: 0.7)),
              ],
            ),
            const SizedBox(height: QSpace.md),
            Container(height: 0.5, color: onWarm.withValues(alpha: 0.24)),
            const SizedBox(height: QSpace.md),
            Row(
              children: [
                _HeroStat(
                  value: '${Mock.streakDays}',
                  unit: 'days',
                  label: 'Streak',
                ),
                Container(
                    width: 0.5,
                    height: 34,
                    color: onWarm.withValues(alpha: 0.24)),
                _HeroStat(
                  value: fmtHm(Mock.focusTodaySeconds),
                  label: 'Focus today',
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _HeroStat extends StatelessWidget {
  const _HeroStat({required this.value, this.unit, required this.label});
  final String value;
  final String? unit;
  final String label;

  @override
  Widget build(BuildContext context) {
    const onWarm = CupertinoColors.white;
    return Expanded(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                value,
                style: QType.title1.copyWith(
                  color: onWarm,
                  fontFeatures: const [FontFeature.tabularFigures()],
                ),
              ),
              if (unit != null) ...[
                const SizedBox(width: 4),
                Text(unit!,
                    style: QType.subhead
                        .copyWith(color: onWarm.withValues(alpha: 0.8))),
              ],
            ],
          ),
          const SizedBox(height: 2),
          Text(label.toUpperCase(),
              style: QType.caption.copyWith(
                  color: onWarm.withValues(alpha: 0.78),
                  letterSpacing: 0.4,
                  fontWeight: FontWeight.w600)),
        ],
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
