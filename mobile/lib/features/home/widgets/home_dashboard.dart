import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';

import '../../../core/data/mock_data.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../focus/focus_screen.dart';

/// Apple Fitness–style "Summary" components: the triple Activity Rings and a
/// dark Activity card with big colored metric labels. Pure black canvas, SF
/// type, tabular numerals — clean and Apple-native.

// Focus accent gradient (magenta → coral) — the hero + trend brand color.
const _focusA = Color(0xFFFA114F);
const _focusB = Color(0xFFFF6482);

// ---------------------------------------------------------------------------
// Primary focus CTA — a full-width white pill on the gradient hero. A gentle
// breathing halo around the play glyph signals "tap me" the moment the app
// opens; press-scale gives it a tactile, alive feel. Launches a focus session.
// ---------------------------------------------------------------------------

class StartFocusButton extends StatefulWidget {
  const StartFocusButton({super.key, this.label = 'Start Focus'});

  final String label;

  @override
  State<StartFocusButton> createState() => _StartFocusButtonState();
}

class _StartFocusButtonState extends State<StartFocusButton>
    with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 1700),
  )..repeat(reverse: true);

  bool _pressed = false;

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  void _start() {
    HapticFeedback.mediumImpact();
    Navigator.of(context, rootNavigator: true).push(
      CupertinoPageRoute(
        fullscreenDialog: true,
        builder: (_) => const FocusScreen(task: null),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) => setState(() => _pressed = false),
      onTapCancel: () => setState(() => _pressed = false),
      onTap: _start,
      child: AnimatedScale(
        scale: _pressed ? 0.97 : 1.0,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOut,
        child: Container(
          height: 54,
          decoration: BoxDecoration(
            color: CupertinoColors.white,
            borderRadius: BorderRadius.circular(QRadius.capsule),
            boxShadow: [
              BoxShadow(
                color: CupertinoColors.black.withValues(alpha: 0.16),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AnimatedBuilder(
                animation: _pulse,
                builder: (context, child) {
                  final t = Curves.easeInOut.transform(_pulse.value);
                  return SizedBox(
                    width: 40,
                    height: 40,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        Container(
                          width: 30 + 10 * t,
                          height: 30 + 10 * t,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _focusA.withValues(alpha: 0.16 * (1 - t)),
                          ),
                        ),
                        child!,
                      ],
                    ),
                  );
                },
                child: Container(
                  width: 30,
                  height: 30,
                  alignment: Alignment.center,
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [_focusB, _focusA],
                    ),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    CupertinoIcons.play_arrow_solid,
                    color: CupertinoColors.white,
                    size: 15,
                  ),
                ),
              ),
              const SizedBox(width: QSpace.xs),
              Text(
                widget.label,
                style: QType.headline.copyWith(
                  color: _focusA,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Focus hero — the premium "what to do now" card: today's focus progress with
// an animated fill bar, a streak chip, a compact stat row, and the primary
// Start-Focus CTA. Bold gradient surface, glossy white controls.
// ---------------------------------------------------------------------------

class ActivityCard extends StatelessWidget {
  const ActivityCard({super.key, required this.tasksDone, required this.tasksTotal});
  final int tasksDone;
  final int tasksTotal;

  static const _focusGoalMin = 240;
  static const _sessGoal = 5;

  /// Consecutive days (ending today) with any focus logged — a light "streak".
  int get _streak {
    var s = 0;
    for (final v in Mock.weekTrend.reversed) {
      if (v <= 0) break;
      s++;
    }
    return s;
  }

  @override
  Widget build(BuildContext context) {
    final focusMin = Mock.focusTodaySeconds ~/ 60;
    final protMin = Mock.savedSeconds ~/ 60;
    final sessDone = Mock.recentSessions.length;
    final frac = (focusMin / _focusGoalMin).clamp(0.0, 1.0);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
      child: Container(
        padding: const EdgeInsets.all(QSpace.lg),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(24),
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [_focusB, _focusA],
          ),
          boxShadow: [
            BoxShadow(
              color: _focusA.withValues(alpha: 0.32),
              blurRadius: 24,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        "TODAY'S FOCUS",
                        style: QType.caption.copyWith(
                          color: CupertinoColors.white.withValues(alpha: 0.8),
                          fontWeight: FontWeight.w700,
                          letterSpacing: 0.8,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text.rich(
                        TextSpan(
                          children: [
                            TextSpan(
                              text: '$focusMin',
                              style: QType.largeTitle.copyWith(
                                color: CupertinoColors.white,
                                fontWeight: FontWeight.w800,
                                fontFeatures: const [FontFeature.tabularFigures()],
                              ),
                            ),
                            TextSpan(
                              text: '  / $_focusGoalMin min',
                              style: QType.headline.copyWith(
                                color: CupertinoColors.white.withValues(alpha: 0.8),
                                fontWeight: FontWeight.w600,
                                fontFeatures: const [FontFeature.tabularFigures()],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                if (_streak > 0) _StreakChip(days: _streak),
              ],
            ),
            const SizedBox(height: QSpace.lg),
            _AnimatedFocusBar(fraction: frac),
            const SizedBox(height: QSpace.lg),
            Row(
              children: [
                _HeroStat(
                  icon: CupertinoIcons.bolt_fill,
                  value: '$sessDone/$_sessGoal',
                  label: 'Sessions',
                ),
                const _HeroDivider(),
                _HeroStat(
                  icon: CupertinoIcons.shield_lefthalf_fill,
                  value: '${protMin}m',
                  label: 'Protected',
                ),
                const _HeroDivider(),
                _HeroStat(
                  icon: CupertinoIcons.checkmark_seal_fill,
                  value: '$tasksDone/$tasksTotal',
                  label: 'Tasks',
                ),
              ],
            ),
            const SizedBox(height: QSpace.lg),
            const StartFocusButton(),
          ],
        ),
      ),
    );
  }
}

/// A flame streak pill on the hero.
class _StreakChip extends StatelessWidget {
  const _StreakChip({required this.days});
  final int days;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: CupertinoColors.white.withValues(alpha: 0.22),
        borderRadius: BorderRadius.circular(QRadius.capsule),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(CupertinoIcons.flame_fill, size: 14, color: CupertinoColors.white),
          const SizedBox(width: 4),
          Text(
            '$days',
            style: QType.footnote.copyWith(
              color: CupertinoColors.white,
              fontWeight: FontWeight.w700,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
        ],
      ),
    );
  }
}

/// Glossy progress bar that animates from empty to [fraction] on first build.
class _AnimatedFocusBar extends StatelessWidget {
  const _AnimatedFocusBar({required this.fraction});
  final double fraction;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, c) {
        return Container(
          height: 12,
          decoration: BoxDecoration(
            color: CupertinoColors.white.withValues(alpha: 0.24),
            borderRadius: BorderRadius.circular(QRadius.capsule),
          ),
          child: Align(
            alignment: Alignment.centerLeft,
            child: TweenAnimationBuilder<double>(
              tween: Tween(begin: 0, end: fraction),
              duration: const Duration(milliseconds: 900),
              curve: Curves.easeOutCubic,
              builder: (context, t, _) {
                return Container(
                  width: (c.maxWidth * t).clamp(12.0, c.maxWidth),
                  height: 12,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      colors: [
                        CupertinoColors.white.withValues(alpha: 0.85),
                        CupertinoColors.white,
                      ],
                    ),
                    borderRadius: BorderRadius.circular(QRadius.capsule),
                    boxShadow: [
                      BoxShadow(
                        color: CupertinoColors.white.withValues(alpha: 0.5),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        );
      },
    );
  }
}

/// One compact icon + value + label stat inside the hero stat row.
class _HeroStat extends StatelessWidget {
  const _HeroStat({required this.icon, required this.value, required this.label});
  final IconData icon;
  final String value;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, size: 16, color: CupertinoColors.white.withValues(alpha: 0.9)),
          const SizedBox(height: 5),
          Text(
            value,
            style: QType.subhead.copyWith(
              color: CupertinoColors.white,
              fontWeight: FontWeight.w700,
              fontFeatures: const [FontFeature.tabularFigures()],
            ),
          ),
          const SizedBox(height: 1),
          Text(
            label,
            style: QType.caption.copyWith(
              color: CupertinoColors.white.withValues(alpha: 0.75),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _HeroDivider extends StatelessWidget {
  const _HeroDivider();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 1,
      height: 30,
      color: CupertinoColors.white.withValues(alpha: 0.22),
    );
  }
}

// ---------------------------------------------------------------------------
// Weekly focus trend card (Fitness "Trends" idiom).
// ---------------------------------------------------------------------------

class FocusTrendCard extends StatelessWidget {
  const FocusTrendCard({super.key});

  static const _days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  @override
  Widget build(BuildContext context) {
    final values = Mock.weekTrend;
    final total = values.fold<int>(0, (a, b) => a + b);
    final maxV = values.fold<int>(1, (a, b) => b > a ? b : a);
    final white = QColors.label.resolveFrom(context);

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.md),
      child: Container(
        padding: const EdgeInsets.all(QSpace.lg),
        decoration: BoxDecoration(
          color: QColors.surface.resolveFrom(context),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.baseline,
              textBaseline: TextBaseline.alphabetic,
              children: [
                Text('Focus', style: QType.headline.copyWith(color: _focusB, fontWeight: FontWeight.w700)),
                const Spacer(),
                Text(
                  '${(total / 60).toStringAsFixed(1)}h this week',
                  style: QType.footnote.copyWith(
                    color: QColors.labelSecondary.resolveFrom(context),
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ],
            ),
            const SizedBox(height: QSpace.md),
            SizedBox(
              height: 96,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  for (var i = 0; i < values.length; i++) ...[
                    Expanded(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Container(
                            height: (values[i] / maxV * 74).clamp(6, 74),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                begin: Alignment.topCenter,
                                end: Alignment.bottomCenter,
                                colors: i == values.length - 1
                                    ? const [_focusB, _focusA]
                                    : [
                                        _focusB.withValues(alpha: 0.35),
                                        _focusA.withValues(alpha: 0.35),
                                      ],
                              ),
                              borderRadius: BorderRadius.circular(5),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            _days[i],
                            style: QType.caption.copyWith(
                              color: i == values.length - 1
                                  ? white
                                  : QColors.labelTertiary.resolveFrom(context),
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                    if (i < values.length - 1) const SizedBox(width: 8),
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
