import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/models/models.dart';
import '../../core/widgets/primary_button.dart';
import '../auth/sign_in_screen.dart';
import 'widgets/onboarding_chip.dart';

/// First-run flow. 7 steps: welcome, distractions, goal, intensity,
/// Screen Time explainer, notifications explainer, recap. Native paged flow
/// with spring page transitions, page dots, and Skip on the early setup steps.
class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  static const _pageCount = 7;

  final _controller = PageController();
  int _page = 0;

  // Step 2 — distraction sources.
  final Set<String> _distractions = {'Instagram', 'TikTok'};

  // Step 3 — daily goal in hours.
  int _goalHours = 4;

  // Step 4 — nudge intensity.
  NudgeIntensity _intensity = NudgeIntensity.firm;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _goTo(int page) {
    HapticFeedback.selectionClick();
    final reduce = MediaQuery.of(context).disableAnimations;
    if (reduce) {
      _controller.jumpToPage(page);
    } else {
      _controller.animateToPage(
        page,
        duration: QMotion.base,
        curve: QMotion.standard,
      );
    }
  }

  void _next() {
    if (_page < _pageCount - 1) {
      _goTo(_page + 1);
    } else {
      _finish();
    }
  }

  void _skip() => _goTo(_pageCount - 1);

  void _finish() {
    HapticFeedback.lightImpact();
    Navigator.of(context).pushReplacement(
      CupertinoPageRoute(builder: (_) => const SignInScreen()),
    );
  }

  // Skip is shown on the three setup steps (distractions, goal, intensity).
  bool get _showSkip => _page >= 1 && _page <= 3;

  @override
  Widget build(BuildContext context) {
    final tint = QColors.tint.resolveFrom(context);

    final ctaLabel = switch (_page) {
      0 => 'Get Started',
      4 => 'Allow Screen Time',
      5 => 'Enable Notifications',
      6 => 'Get Started',
      _ => 'Continue',
    };

    return CupertinoPageScaffold(
      backgroundColor: QColors.bg.resolveFrom(context),
      child: SafeArea(
        child: Column(
          children: [
            // Top bar: page dots + Skip.
            Padding(
              padding: const EdgeInsets.fromLTRB(QSpace.lg, QSpace.sm, QSpace.lg, 0),
              child: Row(
                children: [
                  _PageDots(count: _pageCount, active: _page),
                  const Spacer(),
                  AnimatedOpacity(
                    duration: QMotion.fast,
                    opacity: _showSkip ? 1 : 0,
                    child: CupertinoButton(
                      padding: EdgeInsets.zero,
                      minSize: 44,
                      onPressed: _showSkip ? _skip : null,
                      child: Text('Skip', style: QType.body.copyWith(color: tint)),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: PageView(
                controller: _controller,
                physics: const BouncingScrollPhysics(),
                onPageChanged: (i) {
                  HapticFeedback.selectionClick();
                  setState(() => _page = i);
                },
                children: [
                  const _WelcomePage(),
                  _DistractionsPage(
                    selected: _distractions,
                    onToggle: (name) => setState(() {
                      if (!_distractions.remove(name)) _distractions.add(name);
                    }),
                  ),
                  _GoalPage(
                    hours: _goalHours,
                    onSelect: (h) {
                      HapticFeedback.selectionClick();
                      setState(() => _goalHours = h);
                    },
                  ),
                  _IntensityPage(
                    value: _intensity,
                    onSelect: (v) {
                      HapticFeedback.selectionClick();
                      setState(() => _intensity = v);
                    },
                  ),
                  const _PermissionPage(
                    icon: CupertinoIcons.shield_lefthalf_fill,
                    accent: CupertinoColors.systemBlue,
                    title: 'Screen Time Access',
                    subtitle:
                        'Quoril uses Screen Time to gently step in when a distracting app pulls you away.',
                    rows: [
                      'Stays on your device — never uploaded',
                      'You choose exactly which apps count',
                      'Turn it off anytime in Settings',
                    ],
                  ),
                  const _PermissionPage(
                    icon: CupertinoIcons.bell_fill,
                    accent: CupertinoColors.systemBlue,
                    title: 'Notifications',
                    subtitle:
                        'A well-timed nudge is the whole point. We keep them rare and meaningful.',
                    rows: [
                      'Only when you drift off task',
                      'No marketing, no noise',
                      'Fully tunable per nudge level',
                    ],
                  ),
                  _RecapPage(
                    distractions: _distractions,
                    goalHours: _goalHours,
                    intensity: _intensity,
                  ),
                ],
              ),
            ),
            // Footer CTAs.
            Padding(
              padding: const EdgeInsets.fromLTRB(QSpace.lg, QSpace.sm, QSpace.lg, QSpace.md),
              child: Column(
                children: [
                  PrimaryButton(label: ctaLabel, onPressed: _next),
                  if (_page == 4 || _page == 5) ...[
                    const SizedBox(height: QSpace.xs),
                    PrimaryButton(
                      label: 'Not now',
                      style: QButtonStyle.plain,
                      onPressed: _next,
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────── page dots

class _PageDots extends StatelessWidget {
  const _PageDots({required this.count, required this.active});
  final int count;
  final int active;

  @override
  Widget build(BuildContext context) {
    final tint = QColors.tint.resolveFrom(context);
    final off = QColors.separator.resolveFrom(context);
    return Row(
      children: List.generate(count, (i) {
        final on = i == active;
        return AnimatedContainer(
          duration: QMotion.fast,
          curve: QMotion.standard,
          margin: const EdgeInsets.only(right: 6),
          width: on ? 20 : 7,
          height: 7,
          decoration: BoxDecoration(
            color: on ? tint : off.withValues(alpha: 0.6),
            borderRadius: BorderRadius.circular(QRadius.capsule),
          ),
        );
      }),
    );
  }
}

/// Shared scrollable page frame with a big hero header.
class _PageFrame extends StatelessWidget {
  const _PageFrame({
    required this.title,
    this.subtitle,
    required this.child,
    this.hero,
  });

  final String title;
  final String? subtitle;
  final Widget child;
  final Widget? hero;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(QSpace.lg, QSpace.md, QSpace.lg, QSpace.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (hero != null) ...[
            const SizedBox(height: QSpace.md),
            Center(child: hero!),
            const SizedBox(height: QSpace.xl),
          ],
          Text(title, style: QType.title1),
          if (subtitle != null) ...[
            const SizedBox(height: QSpace.xs),
            Text(
              subtitle!,
              style: QType.body.copyWith(
                color: QColors.labelSecondary.resolveFrom(context),
              ),
            ),
          ],
          const SizedBox(height: QSpace.xl),
          child,
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────── 1. Welcome

class _WelcomePage extends StatelessWidget {
  const _WelcomePage();

  @override
  Widget build(BuildContext context) {
    final tint = QColors.tint.resolveFrom(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.lg),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Quoril mark — single soft floating tier, systemBlue.
          Container(
            width: 128,
            height: 128,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: tint,
              boxShadow: QElevation.floating(context),
            ),
            child: const Icon(
              CupertinoIcons.scope,
              size: 60,
              color: CupertinoColors.white,
            ),
          ),
          const SizedBox(height: QSpace.xxl),
          Text(
            'Your focus companion',
            style: QType.largeTitle,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: QSpace.sm),
          Text(
            'Quoril helps you notice the pull of distraction — and gently guides you back to what matters.',
            style: QType.body.copyWith(
              color: QColors.labelSecondary.resolveFrom(context),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────── 2. Distractions

class _DistractionsPage extends StatelessWidget {
  const _DistractionsPage({required this.selected, required this.onToggle});
  final Set<String> selected;
  final ValueChanged<String> onToggle;

  static const _options = <(String, IconData)>[
    ('Instagram', CupertinoIcons.camera),
    ('TikTok', CupertinoIcons.music_note),
    ('YouTube', CupertinoIcons.play_rectangle),
    ('X', CupertinoIcons.chat_bubble_2),
    ('Reddit', CupertinoIcons.flame),
    ('Add', CupertinoIcons.add),
  ];

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'What pulls you away?',
      subtitle: 'Pick the apps that tend to break your focus. You can change these later.',
      child: Wrap(
        spacing: QSpace.sm,
        runSpacing: QSpace.sm,
        children: [
          for (final (name, icon) in _options)
            OnboardingChip(
              icon: icon,
              label: name,
              selected: selected.contains(name),
              onTap: () => onToggle(name),
            ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────── 3. Goal

class _GoalPage extends StatelessWidget {
  const _GoalPage({required this.hours, required this.onSelect});
  final int hours;
  final ValueChanged<int> onSelect;

  @override
  Widget build(BuildContext context) {
    const opts = [2, 4, 6];
    return _PageFrame(
      title: 'Daily focus goal',
      subtitle: 'How much focused time are you aiming for each day?',
      child: Column(
        children: [
          for (final h in opts) ...[
            _GoalTile(hours: h, selected: hours == h, onTap: () => onSelect(h)),
            if (h != opts.last) const SizedBox(height: QSpace.sm),
          ],
        ],
      ),
    );
  }
}

class _GoalTile extends StatelessWidget {
  const _GoalTile({
    required this.hours,
    required this.selected,
    required this.onTap,
  });
  final int hours;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tint = QColors.tint.resolveFrom(context);
    final progress = (hours / 6).clamp(0.0, 1.0);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: AnimatedContainer(
        duration: QMotion.fast,
        curve: QMotion.standard,
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.all(QSpace.md),
        decoration: BoxDecoration(
          color: selected
              ? tint.withValues(alpha: 0.14)
              : QColors.surface.resolveFrom(context),
          borderRadius: BorderRadius.circular(QRadius.card),
        ),
        child: Row(
          children: [
            RingPreview(progress: progress, color: tint, label: '${hours}h'),
            const SizedBox(width: QSpace.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${hours}h focused', style: QType.headline),
                  const SizedBox(height: 2),
                  Text(
                    switch (hours) {
                      2 => 'A steady, sustainable start',
                      4 => 'A solid, balanced day',
                      _ => 'Deep, ambitious focus',
                    },
                    style: QType.footnote,
                  ),
                ],
              ),
            ),
            Icon(
              selected
                  ? CupertinoIcons.checkmark_circle_fill
                  : CupertinoIcons.circle,
              color: selected ? tint : QColors.labelTertiary.resolveFrom(context),
              size: 24,
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────── 4. Intensity

class _IntensityPage extends StatelessWidget {
  const _IntensityPage({required this.value, required this.onSelect});
  final NudgeIntensity value;
  final ValueChanged<NudgeIntensity> onSelect;

  static const _rows = <(NudgeIntensity, String, String, IconData)>[
    (
      NudgeIntensity.gentle,
      'Gentle',
      'A soft, friendly reminder you can dismiss.',
      CupertinoIcons.leaf_arrow_circlepath,
    ),
    (
      NudgeIntensity.firm,
      'Firm',
      'A clear prompt with a short pause before you continue.',
      CupertinoIcons.hand_raised_fill,
    ),
    (
      NudgeIntensity.toughLove,
      'Tough-love',
      'Real friction — you have to actively choose the distraction.',
      CupertinoIcons.bolt_fill,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      title: 'Nudge intensity',
      subtitle: 'How hard should Quoril push when you drift?',
      child: Column(
        children: [
          for (final (v, title, desc, icon) in _rows) ...[
            _SelectableRow(
              icon: icon,
              title: title,
              desc: desc,
              selected: value == v,
              onTap: () => onSelect(v),
            ),
            if (v != NudgeIntensity.toughLove) const SizedBox(height: QSpace.sm),
          ],
        ],
      ),
    );
  }
}

class _SelectableRow extends StatelessWidget {
  const _SelectableRow({
    required this.icon,
    required this.title,
    required this.desc,
    required this.selected,
    required this.onTap,
  });
  final IconData icon;
  final String title;
  final String desc;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tint = QColors.tint.resolveFrom(context);
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: AnimatedContainer(
        duration: QMotion.fast,
        curve: QMotion.standard,
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.all(QSpace.md),
        decoration: BoxDecoration(
          color: selected
              ? tint.withValues(alpha: 0.14)
              : QColors.surface.resolveFrom(context),
          borderRadius: BorderRadius.circular(QRadius.card),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 22,
              color: selected ? tint : QColors.labelSecondary.resolveFrom(context),
            ),
            const SizedBox(width: QSpace.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: QType.headline),
                  const SizedBox(height: 2),
                  Text(desc, style: QType.footnote),
                ],
              ),
            ),
            const SizedBox(width: QSpace.xs),
            Icon(
              selected
                  ? CupertinoIcons.largecircle_fill_circle
                  : CupertinoIcons.circle,
              color: selected ? tint : QColors.labelTertiary.resolveFrom(context),
              size: 24,
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────── permission

class _PermissionPage extends StatelessWidget {
  const _PermissionPage({
    required this.icon,
    required this.accent,
    required this.title,
    required this.subtitle,
    required this.rows,
  });

  final IconData icon;
  final Color accent;
  final String title;
  final String subtitle;
  final List<String> rows;

  @override
  Widget build(BuildContext context) {
    final a = accent.resolveFrom(context);
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(QSpace.lg, QSpace.md, QSpace.lg, QSpace.xl),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const SizedBox(height: QSpace.md),
          Container(
            width: 108,
            height: 108,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: a.withValues(alpha: 0.14),
            ),
            child: Icon(icon, size: 50, color: a),
          ),
          const SizedBox(height: QSpace.xl),
          Text(title, style: QType.title1, textAlign: TextAlign.center),
          const SizedBox(height: QSpace.xs),
          Text(
            subtitle,
            style: QType.body.copyWith(
              color: QColors.labelSecondary.resolveFrom(context),
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: QSpace.xl),
          for (final r in rows)
            Padding(
              padding: const EdgeInsets.only(bottom: QSpace.md),
              child: Row(
                children: [
                  Icon(CupertinoIcons.checkmark_seal_fill, size: 22, color: a),
                  const SizedBox(width: QSpace.sm),
                  Expanded(child: Text(r, style: QType.callout)),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────── recap

class _RecapPage extends StatelessWidget {
  const _RecapPage({
    required this.distractions,
    required this.goalHours,
    required this.intensity,
  });
  final Set<String> distractions;
  final int goalHours;
  final NudgeIntensity intensity;

  String get _intensityLabel => switch (intensity) {
        NudgeIntensity.gentle => 'Gentle',
        NudgeIntensity.firm => 'Firm',
        NudgeIntensity.toughLove => 'Tough-love',
      };

  @override
  Widget build(BuildContext context) {
    final tint = QColors.tint.resolveFrom(context);
    final good = QColors.wellbeing.resolveFrom(context);
    final watched = distractions.where((d) => d != 'Add').toList();
    return _PageFrame(
      hero: Container(
        width: 108,
        height: 108,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: good.withValues(alpha: 0.14),
        ),
        child: Icon(CupertinoIcons.checkmark_alt_circle_fill, size: 56, color: good),
      ),
      title: "You're all set",
      subtitle: "Here's how Quoril will have your back.",
      child: Column(
        children: [
          _RecapRow(
            icon: CupertinoIcons.eye_slash_fill,
            color: QColors.danger.resolveFrom(context),
            title: 'Watching',
            value: watched.isEmpty
                ? 'No apps yet'
                : watched.take(3).join(', ') +
                    (watched.length > 3 ? ' +${watched.length - 3}' : ''),
          ),
          const SizedBox(height: QSpace.sm),
          _RecapRow(
            icon: CupertinoIcons.scope,
            color: tint,
            title: 'Daily goal',
            value: '${goalHours}h of focus',
          ),
          const SizedBox(height: QSpace.sm),
          _RecapRow(
            icon: CupertinoIcons.hand_raised_fill,
            color: QColors.breakColor.resolveFrom(context),
            title: 'Nudges',
            value: _intensityLabel,
          ),
        ],
      ),
    );
  }
}

class _RecapRow extends StatelessWidget {
  const _RecapRow({
    required this.icon,
    required this.color,
    required this.title,
    required this.value,
  });
  final IconData icon;
  final Color color;
  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(QSpace.md),
      decoration: BoxDecoration(
        color: QColors.surface.resolveFrom(context),
        borderRadius: BorderRadius.circular(QRadius.card),
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(QRadius.row),
            ),
            child: Icon(icon, size: 20, color: color),
          ),
          const SizedBox(width: QSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: QType.footnote),
                const SizedBox(height: 1),
                Text(value, style: QType.headline),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
