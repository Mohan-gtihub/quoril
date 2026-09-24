import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/data/providers.dart';
import '../../core/data/mock_data.dart';
import '../../core/theme/gradients.dart';
import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/widgets/app_kit.dart';
import '../../core/widgets/common.dart';
import '../../core/widgets/editorial.dart';
import 'about_page.dart';
import 'account_page.dart';
import 'appearance_page.dart';
import 'distraction_rules_page.dart';
import 'feedback_sheet.dart';
import 'focus_settings_page.dart';
import 'notifications_page.dart';
import 'manage_productivity_page.dart';
import 'settings_widgets.dart';
import '../integrations/integrations_page.dart';

/// YOU / SETTINGS — top-level profile + settings hub, wired to real auth.
class YouScreen extends ConsumerWidget {
  const YouScreen({super.key});

  void _push(BuildContext context, Widget page) {
    HapticFeedback.selectionClick();
    Navigator.of(context).push(CupertinoPageRoute<void>(builder: (_) => page));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return SettingsAmbientBackground(
      child: AppScaffold(
      title: 'You',
      backgroundColor: const Color(0x00000000),
      slivers: [
        SliverPagePadding(
          top: QSpace.xs,
          child: QStagger(
                    children: [
                      _ProfileHeader(onTap: () => _push(context, const AccountPage())),
                      const SizedBox(height: QSpace.xl),
                      const QSectionHeader(label: 'Focus'),
                      FrostedGroup(children: [
                        SettingsRow(
                          icon: CupertinoIcons.timer,
                          iconColor: QColors.breakColor,
                          title: 'Focus & Pomodoro',
                          onTap: () => _push(context, const FocusSettingsPage()),
                        ),
                        SettingsRow(
                          icon: CupertinoIcons.shield_lefthalf_fill,
                          iconColor: QColors.workspacePalette[3],
                          title: 'Distraction Rules',
                          onTap: () => _push(context, const DistractionRulesPage()),
                        ),
                      ]),
                      const SizedBox(height: QSpace.lg),
                      const QSectionHeader(label: 'Preferences'),
                      FrostedGroup(children: [
                        SettingsRow(
                          icon: CupertinoIcons.bell_fill,
                          iconColor: QColors.danger,
                          title: 'Notifications',
                          onTap: () => _push(context, const NotificationsPage()),
                        ),
                        SettingsRow(
                          icon: CupertinoIcons.paintbrush_fill,
                          iconColor: QColors.workspacePalette[5],
                          title: 'Appearance',
                          onTap: () => _push(context, const AppearancePage()),
                        ),
                        SettingsRow(
                          icon: CupertinoIcons.chart_bar_alt_fill,
                          iconColor: QColors.brand,
                          title: 'Productivity Goals',
                          onTap: () =>
                              _push(context, const ManageProductivityPage()),
                        ),
                        SettingsRow(
                          icon: CupertinoIcons.link,
                          iconColor: QColors.workspacePalette[0],
                          title: 'Integrations',
                          onTap: () => _push(context, const IntegrationsPage()),
                        ),
                      ]),
                      const SizedBox(height: QSpace.lg),
                      const QSectionHeader(label: 'Account'),
                      FrostedGroup(children: [
                        SettingsRow(
                          icon: CupertinoIcons.star_fill,
                          iconColor: QColors.warn,
                          title: 'Subscription',
                          onTap: () => _push(context, const AccountPage()),
                        ),
                        SettingsRow(
                          icon: CupertinoIcons.chat_bubble_2_fill,
                          iconColor: QColors.wellbeing,
                          title: 'Send feedback',
                          onTap: () {
                            HapticFeedback.selectionClick();
                            showFeedbackSheet(context);
                          },
                        ),
                        SettingsRow(
                          icon: CupertinoIcons.info_circle_fill,
                          iconColor: QColors.labelSecondary,
                          title: 'About',
                          onTap: () => _push(context, const AboutPage()),
                        ),
                      ]),
                      const SizedBox(height: QSpace.lg),
                      const _SignOutSection(),
                    ],
                  ),
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

/// Editorial profile header — an oversized name (the screen's one marquee),
/// a warm ember avatar, plan chip, and two quiet stat columns. The ember
/// avatar is the screen's single focal point; everything below stays calm.
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
    final subtitle = (fullName != null && fullName.trim().isNotEmpty && email != null)
        ? email
        : tierLabel(auth.tier);

    return QCard(
      onTap: onTap,
      padding: const EdgeInsets.all(QSpace.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 64,
                height: 64,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: QGradients.warm,
                  boxShadow: QElevation.brandGlow(context),
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
                    Text('Signed in as'.toUpperCase(), style: QType.eyebrow),
                    const SizedBox(height: 3),
                    Text(displayName,
                        style: QType.title2,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Text(subtitle,
                        style: QType.subhead,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                  ],
                ),
              ),
              Icon(CupertinoIcons.chevron_right,
                  size: 16, color: QColors.labelTertiary.resolveFrom(context)),
            ],
          ),
          const SizedBox(height: QSpace.md),
          Container(height: 0.5, color: QColors.separator.resolveFrom(context)),
          const SizedBox(height: QSpace.md),
          Builder(builder: (context) {
            // TODO(data): streak + focus-today are still Mock; wire to real
            // session data. The zero-state below is already graceful.
            const streak = Mock.streakDays;
            const focusToday = Mock.focusTodaySeconds;
            return Row(
              children: [
                _HeroStat(
                  value: streak > 0 ? '$streak' : '—',
                  unit: streak > 0 ? 'days' : null,
                  label: 'Streak',
                ),
                Container(
                    width: 0.5,
                    height: 34,
                    color: QColors.separator.resolveFrom(context)),
                _HeroStat(
                  value: focusToday > 0 ? fmtHm(focusToday) : '0m',
                  label: 'Focus today',
                ),
              ],
            );
          }),
        ],
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
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.only(left: QSpace.md),
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
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
                if (unit != null) ...[
                  const SizedBox(width: 4),
                  Text(unit!, style: QType.subhead),
                ],
              ],
            ),
            const SizedBox(height: 2),
            Text(label.toUpperCase(), style: QType.eyebrow),
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
    return FrostedGroup(
      children: [
        SettingsRow(
          title: 'Sign out',
          centered: true,
          destructive: true,
          onTap: () {
            HapticFeedback.lightImpact();
            showCupertinoModalPopup<void>(
              context: context,
              builder: (ctx) => CupertinoActionSheet(
                title: const Text('Sign out of Quoril?'),
                message:
                    const Text('Your synced data stays safe in your account.'),
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
        ),
      ],
    );
  }
}
