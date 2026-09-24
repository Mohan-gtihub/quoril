import 'dart:ui';

import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/theme/tokens.dart';
import '../../core/theme/typography.dart';
import '../../core/theme/gradients.dart';
import '../../core/models/models.dart';
import '../../core/widgets/primary_button.dart';
import '../auth/sign_in_screen.dart';
import '../home/data/productivity.dart';
import 'widgets/onboarding_chip.dart';
import 'widgets/brand.dart';
import 'widgets/permission_demos.dart';

// ── Warm Aurora foreground palette ──────────────────────────────────────────
// Full-bleed over QGradients.warm. White-ink-on-gradient consts live in
// widgets/brand.dart (kFg*, kGlass*); brand selection uses QColors.brand.

/// Dark warm ink used on white/amber surfaces for high contrast.
const Color _darkInk = Color(0xFF2A0A06);

/// First-run flow. 7 steps: welcome, distractions, goal, intensity,
/// Screen Time explainer, notifications explainer, recap. Native paged flow
/// with spring page transitions, page dots, and Skip on the early setup steps.
class OnboardingScreen extends ConsumerStatefulWidget {
  const OnboardingScreen({super.key});

  @override
  ConsumerState<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends ConsumerState<OnboardingScreen> {
  static const _pageCount = 7;

  final _controller = PageController();
  int _page = 0;
  bool _skipped = false;

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

  void _skip() {
    setState(() => _skipped = true);
    _goTo(_pageCount - 1);
  }

  void _finish() {
    HapticFeedback.lightImpact();
    ref.read(goalsProvider.notifier).setFocusHours(_goalHours);
    Navigator.of(
      context,
    ).pushReplacement(CupertinoPageRoute(builder: (_) => const SignInScreen()));
  }

  // Skip is shown on the three setup steps (distractions, goal, intensity).
  bool get _showSkip => _page >= 1 && _page <= 3;

  @override
  Widget build(BuildContext context) {
    final ctaLabel = switch (_page) {
      0 => 'Get Started',
      // Priming precedes the real OS prompt — do not label a page-advance as a
      // permission grant.
      4 => 'Continue',
      5 => 'Continue',
      6 => 'Get Started',
      _ => 'Continue',
    };

    return CupertinoPageScaffold(
      backgroundColor: QColors.bg.resolveFrom(context),
      child: GradientBackground(
        gradient: QGradients.warm,
        child: SafeArea(
          child: Column(
            children: [
              // Top bar: page dots + Skip.
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  QSpace.lg,
                  QSpace.md,
                  QSpace.lg,
                  QSpace.xs,
                ),
                child: Row(
                  children: [
                    _PageDots(count: _pageCount, active: _page),
                    const Spacer(),
                    AnimatedOpacity(
                      duration: QMotion.fast,
                      opacity: _showSkip ? 1 : 0,
                      child: CupertinoButton(
                        padding: EdgeInsets.zero,
                        minimumSize: const Size(44, 44),
                        onPressed: _showSkip ? _skip : null,
                        child: Text(
                          'Skip',
                          style: QType.body.copyWith(color: kFgSecondary),
                        ),
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
                      demo: PermissionDemo.screenTime,
                      icon: CupertinoIcons.shield_lefthalf_fill,
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
                      demo: PermissionDemo.notifications,
                      icon: CupertinoIcons.bell_fill,
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
                      usedDefaults: _skipped,
                    ),
                  ],
                ),
              ),
              // Footer CTAs.
              Padding(
                padding: const EdgeInsets.fromLTRB(
                  QSpace.lg,
                  QSpace.md,
                  QSpace.lg,
                  QSpace.lg,
                ),
                child: Column(
                  children: [
                    PrimaryButton(
                      label: ctaLabel,
                      color: CupertinoColors.white,
                      foreground: _darkInk,
                      onPressed: _next,
                    ),
                    // "Not now" is subordinate to the primary CTA — a centered,
                    // smaller text link, not a competing full-width button.
                    if (_page == 4 || _page == 5) ...[
                      const SizedBox(height: QSpace.xxs),
                      Center(
                        child: CupertinoButton(
                          padding: const EdgeInsets.symmetric(
                            horizontal: QSpace.md,
                            vertical: QSpace.xs,
                          ),
                          minimumSize: const Size(44, 44),
                          onPressed: _next,
                          child: Text(
                            'Not now',
                            style: QType.subhead.copyWith(
                              color: kFgSecondary,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
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
            color: on
                ? CupertinoColors.white
                : CupertinoColors.white.withValues(alpha: 0.35),
            borderRadius: BorderRadius.circular(QRadius.capsule),
          ),
        );
      }),
    );
  }
}

/// Shared scrollable page frame with a big hero header. Eyebrow → title →
/// subtitle → content animate in with a staggered fade+slide (honors Reduce
/// Motion). The optional [eyebrow] is a quiet all-caps kicker that names the
/// step, giving every setup page the same header rhythm.
class _PageFrame extends StatelessWidget {
  const _PageFrame({
    required this.title,
    this.eyebrow,
    this.subtitle,
    required this.child,
  });

  final String title;
  final String? eyebrow;
  final String? subtitle;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        QSpace.lg,
        QSpace.lg,
        QSpace.lg,
        QSpace.xxl,
      ),
      child: StaggerColumn(
        children: [
          if (eyebrow != null)
            Padding(
              padding: const EdgeInsets.only(bottom: QSpace.sm),
              child: Text(
                eyebrow!.toUpperCase(),
                style: QType.eyebrow.copyWith(color: kFgSecondary),
              ),
            ),
          Text(
            title,
            style: QType.hero.copyWith(color: kFgPrimary),
          ),
          if (subtitle != null)
            Padding(
              padding: const EdgeInsets.only(top: QSpace.sm),
              child: Text(
                subtitle!,
                style: QType.body.copyWith(color: kFgSecondary, height: 1.35),
              ),
            ),
          Padding(
            padding: const EdgeInsets.only(top: QSpace.xxl + QSpace.xs),
            child: child,
          ),
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
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.lg),
      child: Center(
        child: StaggerColumn(
          children: [
            // True hero: a larger, breathing brand mark.
            const Padding(
              padding: EdgeInsets.only(bottom: QSpace.xxl + QSpace.xs),
              child: BrandMark(size: 128, iconSize: 64, breathe: true),
            ),
            Text(
              'Catch the drift\nbefore it catches you.',
              style: QType.hero.copyWith(color: kFgPrimary),
            ),
            Padding(
              padding: const EdgeInsets.only(top: QSpace.md),
              child: Text(
                'Quoril watches for the pull of distraction and steps in — a beat before the scroll takes you.',
                style: QType.body.copyWith(color: kFgSecondary, height: 1.35),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────── 2. Distractions

class _DistractionsPage extends StatelessWidget {
  const _DistractionsPage({required this.selected, required this.onToggle});
  final Set<String> selected;
  final ValueChanged<String> onToggle;

  // Authoritative monochrome glyphs (fill-weight, single-hue) so the sources
  // read as a considered set, not generic clip-art.
  static const _options = <(String, IconData)>[
    ('Instagram', CupertinoIcons.camera_fill),
    ('TikTok', CupertinoIcons.music_note_2),
    ('YouTube', CupertinoIcons.play_rectangle_fill),
    ('X', CupertinoIcons.chat_bubble_2_fill),
    ('Reddit', CupertinoIcons.flame_fill),
    ('Add', CupertinoIcons.add_circled),
  ];

  @override
  Widget build(BuildContext context) {
    return _PageFrame(
      eyebrow: 'Distractions',
      title: 'What pulls you away?',
      subtitle:
          'Pick the apps that tend to break your focus. You can change these later.',
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
      eyebrow: 'Your goal',
      title: 'Daily focus goal',
      subtitle: 'How much focused time are you aiming for each day?',
      child: Column(
        children: [
          for (final h in opts) ...[
            _GoalTile(hours: h, selected: hours == h, onTap: () => onSelect(h)),
            if (h != opts.last) const SizedBox(height: QSpace.md),
          ],
        ],
      ),
    );
  }
}

class _GoalTile extends StatefulWidget {
  const _GoalTile({
    required this.hours,
    required this.selected,
    required this.onTap,
  });
  final int hours;
  final bool selected;
  final VoidCallback onTap;

  @override
  State<_GoalTile> createState() => _GoalTileState();
}

class _GoalTileState extends State<_GoalTile>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: QMotion.base,
  );

  double get _target => (widget.hours / 6).clamp(0.0, 1.0);

  @override
  void initState() {
    super.initState();
    if (widget.selected) _c.value = 1;
  }

  @override
  void didUpdateWidget(covariant _GoalTile old) {
    super.didUpdateWidget(old);
    if (widget.selected && !old.selected) {
      if (QMotion.reduced(context)) {
        _c.value = 1;
      } else {
        _c.forward(from: 0);
      }
    } else if (!widget.selected && old.selected) {
      _c.value = 0;
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final selected = widget.selected;
    final warmAccent = QColors.brandBright.resolveFrom(context);
    final titleColor = selected ? _darkInk : kFgPrimary;
    final subColor =
        selected ? _darkInk.withValues(alpha: 0.7) : kFgSecondary;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: widget.onTap,
      // Real frost behind the tile so the resting (unselected) state refracts
      // the ember wash; the animated fill sits on top and turns solid amber —
      // the sanctioned bold moment — when selected, hiding the frost.
      child: _FrostBehind(
        radius: QRadius.taskCard,
        child: AnimatedContainer(
        duration: QMotion.fast,
        curve: QMotion.standard,
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.all(QSpace.lg),
        decoration: BoxDecoration(
          color: selected ? warmAccent : kGlassFill,
          borderRadius: BorderRadius.circular(QRadius.taskCard),
          border: Border.all(
            color: selected ? warmAccent : kGlassBorder,
            width: 1,
          ),
        ),
        child: Row(
          children: [
            // Ring fills 0 → progress on selection.
            AnimatedBuilder(
              animation: _c,
              builder: (context, _) => RingPreview(
                progress: _target * _c.value,
                color: selected ? _darkInk : warmAccent,
                label: '${widget.hours}h',
              ),
            ),
            const SizedBox(width: QSpace.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${widget.hours}h focused',
                    style: QType.headline.copyWith(
                      color: titleColor,
                      fontFeatures: const [FontFeature.tabularFigures()],
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(switch (widget.hours) {
                    2 => 'A steady, sustainable start',
                    4 => 'A solid, balanced day',
                    _ => 'Deep, ambitious focus',
                  }, style: QType.footnote.copyWith(color: subColor)),
                ],
              ),
            ),
            Icon(
              selected
                  ? CupertinoIcons.checkmark_circle_fill
                  : CupertinoIcons.circle,
              color: selected ? _darkInk : kFgTertiary,
              size: 24,
            ),
          ],
        ),
        ),
      ),
    );
  }
}

/// Real BackdropFilter frost laid BEHIND a tile whose own (possibly animated)
/// fill sits on top — used for the goal/intensity tiles so the resting state
/// reads as true glass over the ember wash while the selected amber fill stays
/// solid. Clipped to the same radius as the tile.
class _FrostBehind extends StatelessWidget {
  const _FrostBehind({required this.child, required this.radius});
  final Widget child;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final br = BorderRadius.circular(radius);
    return ClipRRect(
      borderRadius: br,
      child: Stack(
        children: [
          Positioned.fill(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 18, sigmaY: 18),
              child: const SizedBox.shrink(),
            ),
          ),
          child,
        ],
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
      eyebrow: 'Nudges',
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
            if (v != NudgeIntensity.toughLove)
              const SizedBox(height: QSpace.md),
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
    final warmAccent = QColors.brandBright.resolveFrom(context);
    final titleColor = selected ? _darkInk : kFgPrimary;
    final descColor =
        selected ? _darkInk.withValues(alpha: 0.7) : kFgSecondary;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: _FrostBehind(
        radius: QRadius.taskCard,
        child: AnimatedContainer(
        duration: QMotion.fast,
        curve: QMotion.standard,
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.all(QSpace.lg),
        decoration: BoxDecoration(
          color: selected ? warmAccent : kGlassFill,
          borderRadius: BorderRadius.circular(QRadius.taskCard),
          border: Border.all(
            color: selected ? warmAccent : kGlassBorder,
            width: 1,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 22,
              color: selected ? _darkInk : kFgSecondary,
            ),
            const SizedBox(width: QSpace.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: QType.headline.copyWith(color: titleColor)),
                  const SizedBox(height: 2),
                  Text(desc, style: QType.footnote.copyWith(color: descColor)),
                ],
              ),
            ),
            const SizedBox(width: QSpace.xs),
            Icon(
              selected
                  ? CupertinoIcons.checkmark_circle_fill
                  : CupertinoIcons.circle,
              color: selected ? _darkInk : kFgTertiary,
              size: 24,
            ),
          ],
        ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────── permission

class _PermissionPage extends StatelessWidget {
  const _PermissionPage({
    required this.demo,
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.rows,
  });

  final PermissionDemo demo;
  final IconData icon;
  final String title;
  final String subtitle;
  final List<String> rows;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        QSpace.lg,
        QSpace.md,
        QSpace.lg,
        QSpace.xxl,
      ),
      child: StaggerColumn(
        children: [
          Padding(
            padding: const EdgeInsets.only(top: QSpace.md, bottom: QSpace.xl),
            child: _PermissionIcon(icon: icon),
          ),
          // Animated illustration of the actual behavior this unlocks.
          Padding(
            padding: const EdgeInsets.only(bottom: QSpace.xxl),
            child: PermissionIllustration(demo: demo),
          ),
          Text(
            title,
            style: QType.hero.copyWith(color: kFgPrimary),
          ),
          Padding(
            padding: const EdgeInsets.only(top: QSpace.sm),
            child: Text(
              subtitle,
              style: QType.body.copyWith(color: kFgSecondary, height: 1.35),
            ),
          ),
          Padding(
            padding: const EdgeInsets.only(top: QSpace.xxl),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                for (final r in rows)
                  Padding(
                    padding: const EdgeInsets.only(bottom: QSpace.md),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(
                          CupertinoIcons.checkmark_seal_fill,
                          size: 22,
                          color:
                              CupertinoColors.white.withValues(alpha: 0.72),
                        ),
                        const SizedBox(width: QSpace.sm),
                        Expanded(
                          child: Text(
                            r,
                            style: QType.callout.copyWith(color: kFgPrimary),
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Permission page icon with a subtle scale-in + shimmer sweep. Honors Reduce
/// Motion (renders resting state).
class _PermissionIcon extends StatefulWidget {
  const _PermissionIcon({required this.icon});
  final IconData icon;

  @override
  State<_PermissionIcon> createState() => _PermissionIconState();
}

class _PermissionIconState extends State<_PermissionIcon>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1200),
  );

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (QMotion.reduced(context)) {
        _c.value = 1;
      } else {
        _c.forward();
      }
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      builder: (context, child) {
        // Scale-in over the first ~40% of the timeline.
        final inT = Curves.easeOutBack.transform((_c.value / 0.4).clamp(0.0, 1.0));
        // Shimmer sweep over the remainder.
        final sweep = ((_c.value - 0.35) / 0.65).clamp(0.0, 1.0);
        return Transform.scale(
          scale: 0.7 + inT * 0.3,
          child: ShaderMask(
            shaderCallback: (rect) {
              final x = -1.0 + sweep * 2.0;
              return LinearGradient(
                begin: Alignment(x - 0.4, -1),
                end: Alignment(x + 0.4, 1),
                colors: [
                  CupertinoColors.white.withValues(alpha: 0.0),
                  CupertinoColors.white.withValues(alpha: 0.9),
                  CupertinoColors.white.withValues(alpha: 0.0),
                ],
                stops: const [0.35, 0.5, 0.65],
              ).createShader(rect);
            },
            blendMode: BlendMode.srcATop,
            child: child,
          ),
        );
      },
      child: Container(
        width: 88,
        height: 88,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: CupertinoColors.white.withValues(alpha: 0.16),
          border: Border.all(
            color: CupertinoColors.white.withValues(alpha: 0.24),
            width: 1,
          ),
        ),
        child: Icon(widget.icon, size: 42, color: CupertinoColors.white),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────── recap

class _RecapPage extends StatefulWidget {
  const _RecapPage({
    required this.distractions,
    required this.goalHours,
    required this.intensity,
    required this.usedDefaults,
  });
  final Set<String> distractions;
  final int goalHours;
  final NudgeIntensity intensity;
  final bool usedDefaults;

  @override
  State<_RecapPage> createState() => _RecapPageState();
}

class _RecapPageState extends State<_RecapPage>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 700),
  );
  bool _celebrated = false;

  String get _intensityLabel => switch (widget.intensity) {
        NudgeIntensity.gentle => 'Gentle',
        NudgeIntensity.firm => 'Firm',
        NudgeIntensity.toughLove => 'Tough-love',
      };

  void _celebrate() {
    if (_celebrated) return;
    _celebrated = true;
    HapticFeedback.mediumImpact();
    if (QMotion.reduced(context)) {
      _c.value = 1;
    } else {
      _c.forward();
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Recap is the last page — celebrate the moment it builds/appears.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _celebrate();
    });

    final watched = widget.distractions.where((d) => d != 'Add').toList();
    final cards = <Widget>[
      _RecapRow(
        icon: CupertinoIcons.eye_slash_fill,
        title: 'Watching',
        value: watched.isEmpty
            ? 'No apps yet'
            : watched.take(3).join(', ') +
                (watched.length > 3 ? ' +${watched.length - 3}' : ''),
      ),
      _RecapRow(
        icon: QBrand.mark,
        title: 'Daily goal',
        value: '${widget.goalHours}h of focus',
      ),
      _RecapRow(
        icon: CupertinoIcons.hand_raised_fill,
        title: 'Nudges',
        value: _intensityLabel,
      ),
    ];

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(
        QSpace.lg,
        QSpace.md,
        QSpace.lg,
        QSpace.xxl,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Celebratory checkmark spring-in.
          Center(
            child: Padding(
              padding: const EdgeInsets.only(top: QSpace.lg, bottom: QSpace.xxl),
              child: ScaleTransition(
                scale: CurvedAnimation(parent: _c, curve: QMotion.springCurve),
                child: Container(
                  width: 96,
                  height: 96,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: CupertinoColors.white.withValues(alpha: 0.16),
                    border: Border.all(
                      color: CupertinoColors.white.withValues(alpha: 0.24),
                      width: 1,
                    ),
                    boxShadow: QElevation.floating(context),
                  ),
                  child: const Icon(
                    CupertinoIcons.checkmark_alt_circle_fill,
                    size: 52,
                    color: CupertinoColors.white,
                  ),
                ),
              ),
            ),
          ),
          Text(
            "You're all set",
            style: QType.hero.copyWith(color: kFgPrimary),
          ),
          const SizedBox(height: QSpace.sm),
          Text(
            widget.usedDefaults
                ? 'We started you with sensible defaults — tweak anytime in Settings.'
                : "Here's how Quoril will have your back.",
            style: QType.body.copyWith(color: kFgSecondary, height: 1.35),
          ),
          const SizedBox(height: QSpace.xxl),
          // Cascading summary cards.
          for (var i = 0; i < cards.length; i++) ...[
            if (i != 0) const SizedBox(height: QSpace.sm),
            _CascadeCard(controller: _c, index: i, child: cards[i]),
          ],
        ],
      ),
    );
  }
}

/// Fade+slide cascade for a recap card, keyed off the celebration controller.
class _CascadeCard extends StatelessWidget {
  const _CascadeCard({
    required this.controller,
    required this.index,
    required this.child,
  });
  final AnimationController controller;
  final int index;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final begin = (0.25 + index * 0.18).clamp(0.0, 0.95);
    final anim = CurvedAnimation(
      parent: controller,
      curve: Interval(begin, (begin + 0.35).clamp(0.0, 1.0),
          curve: QMotion.standard),
    );
    return AnimatedBuilder(
      animation: anim,
      builder: (context, child) => Opacity(
        opacity: anim.value,
        child: Transform.translate(
          offset: Offset(0, (1 - anim.value) * 18),
          child: child,
        ),
      ),
      child: child,
    );
  }
}

class _RecapRow extends StatelessWidget {
  const _RecapRow({
    required this.icon,
    required this.title,
    required this.value,
  });
  final IconData icon;
  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return EmberGlass(
      child: Padding(
        padding: const EdgeInsets.all(QSpace.lg),
        child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: CupertinoColors.white.withValues(alpha: 0.16),
              borderRadius: BorderRadius.circular(QRadius.row),
              border: Border.all(color: kGlassBorder, width: 1),
            ),
            child: Icon(icon, size: 20, color: CupertinoColors.white),
          ),
          const SizedBox(width: QSpace.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title.toUpperCase(),
                  style: QType.caption2.copyWith(
                    color: kFgSecondary,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.6,
                  ),
                ),
                const SizedBox(height: 3),
                Text(value, style: QType.headline.copyWith(color: kFgPrimary)),
              ],
            ),
          ),
        ],
        ),
      ),
    );
  }
}
