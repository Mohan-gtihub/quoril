import 'dart:ui' as ui;

import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';
import '../../../core/widgets/glass.dart';
import '../../../core/widgets/primary_button.dart';

/// Level-1 top glass nudge banner: "Instagram 3m — back to `task`?".
/// A floating translucent card (the one place a subtle floating shadow is used).
class NudgeBanner extends StatelessWidget {
  const NudgeBanner({
    super.key,
    required this.app,
    required this.minutes,
    required this.taskTitle,
    required this.onTap,
    required this.onDismiss,
  });

  final String app;
  final int minutes;
  final String taskTitle;
  final VoidCallback onTap;
  final VoidCallback onDismiss;

  @override
  Widget build(BuildContext context) {
    final warn = QColors.warn.resolveFrom(context);
    return SafeArea(
      bottom: false,
      child: Padding(
        padding:
            const EdgeInsets.symmetric(horizontal: QSpace.md, vertical: QSpace.xs),
        child: GestureDetector(
          onTap: onTap,
          behavior: HitTestBehavior.opaque,
          child: DecoratedBox(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(QRadius.glass),
              boxShadow: QElevation.floating(context),
            ),
            child: GlassSurface(
              padding: const EdgeInsets.all(QSpace.sm),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: warn.withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(CupertinoIcons.exclamationmark_triangle_fill,
                        size: 18, color: warn),
                  ),
                  const SizedBox(width: QSpace.sm),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('$app · ${minutes}m',
                            style: QType.headline,
                            overflow: TextOverflow.ellipsis),
                        Text('Back to $taskTitle?',
                            style: QType.footnote,
                            overflow: TextOverflow.ellipsis),
                      ],
                    ),
                  ),
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () {
                      HapticFeedback.selectionClick();
                      onDismiss();
                    },
                    minimumSize: const Size(44, 44),
                    child: Icon(
                      CupertinoIcons.xmark_circle_fill,
                      size: 24,
                      color: QColors.labelTertiary.resolveFrom(context),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Full friction overlay shown after continued distraction.
///
/// Calm-then-firm: the focus world still glows through a blurred, warm-tinted
/// backdrop (BackdropFilter, not a flat opaque fill). It leads with a breathing
/// ember orb and "Take a breath" FIRST; the numbers whisper secondarily in warm
/// (never red) ink. Entry fades + blooms in ~400ms, gated on Reduce Motion.
class FrictionOverlay extends StatefulWidget {
  const FrictionOverlay({
    super.key,
    required this.app,
    required this.todayMinutes,
    required this.weeklyAvgMinutes,
    required this.focusTasksEquivalent,
    required this.onTakeBreath,
    required this.onFiveMore,
  });

  final String app;
  final int todayMinutes;
  final int weeklyAvgMinutes;
  final int focusTasksEquivalent;
  final VoidCallback onTakeBreath;
  final VoidCallback onFiveMore;

  @override
  State<FrictionOverlay> createState() => _FrictionOverlayState();
}

class _FrictionOverlayState extends State<FrictionOverlay>
    with TickerProviderStateMixin {
  late final AnimationController _entry;
  late final AnimationController _breath;

  @override
  void initState() {
    super.initState();
    _entry = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 400),
    );
    _breath = AnimationController(vsync: this, duration: QMotion.breath);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (QMotion.reduced(context)) {
      _entry.value = 1.0;
    } else {
      if (_entry.status == AnimationStatus.dismissed) _entry.forward();
      if (!_breath.isAnimating) _breath.repeat(reverse: true);
    }
  }

  @override
  void dispose() {
    _entry.dispose();
    _breath.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // The focus section's flame accent carries the breath moment.
    final ember = QSection.focus.resolveFrom(context);
    final warmInk = QColors.brandDeep.resolveFrom(context);
    return AnimatedBuilder(
      animation: Listenable.merge([_entry, _breath]),
      builder: (context, _) {
        final t = Curves.easeOut.transform(_entry.value);
        final blurAmount = 22.0 * t;
        final breathing = !QMotion.reduced(context);
        final orbT = breathing ? _breath.value : 0.5;
        final orbScale = 0.94 + 0.12 * orbT;
        return Opacity(
          opacity: t,
          child: BackdropFilter(
            filter: ui.ImageFilter.blur(sigmaX: blurAmount, sigmaY: blurAmount),
            child: DecoratedBox(
              // Warm veil, not a cold flat fill — the focus glow reads through.
              decoration: BoxDecoration(
                color: QColors.bg.resolveFrom(context).withValues(alpha: 0.62),
              ),
              child: SafeArea(
                child: Padding(
                  padding: const EdgeInsets.all(QSpace.lg),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // --- Calm: the breathing ember orb, first. -----------
                      Center(
                        child: Transform.scale(
                          scale: orbScale,
                          child: Container(
                            width: 96,
                            height: 96,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              gradient: RadialGradient(
                                colors: [
                                  ember.withValues(alpha: 0.32),
                                  ember.withValues(alpha: 0.10),
                                ],
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: ember.withValues(
                                      alpha: 0.28 + 0.20 * orbT),
                                  blurRadius: 32 + 16 * orbT,
                                ),
                              ],
                            ),
                            child: Icon(CupertinoIcons.wind,
                                size: 38, color: ember),
                          ),
                        ),
                      ),
                      const SizedBox(height: QSpace.xl),
                      Text('Take a breath',
                          style: QType.title1, textAlign: TextAlign.center),
                      const SizedBox(height: QSpace.xs),
                      Text(
                        'Notice the pull toward ${widget.app}. '
                        'It will still be there in a minute.',
                        style: QType.body.copyWith(
                            color: QColors.labelSecondary.resolveFrom(context)),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: QSpace.xl),
                      PrimaryButton(
                        label: 'Take a breath',
                        icon: CupertinoIcons.wind,
                        color: QSection.focus,
                        onPressed: () {
                          // Soft, calming — not a thud.
                          HapticFeedback.lightImpact();
                          widget.onTakeBreath();
                        },
                      ),
                      const SizedBox(height: QSpace.sm),
                      PrimaryButton(
                        label: '5 more minutes',
                        style: QButtonStyle.plain,
                        onPressed: () {
                          HapticFeedback.selectionClick();
                          widget.onFiveMore();
                        },
                      ),
                      const SizedBox(height: QSpace.xl),
                      // --- Firm: the numbers whisper, secondarily. ---------
                      _WhisperStats(
                        today: widget.todayMinutes,
                        weeklyAvg: widget.weeklyAvgMinutes,
                        tasks: widget.focusTasksEquivalent,
                        ink: warmInk,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        );
      },
    );
  }
}

/// A quiet single line of warm-ink context. Numbers are present but never
/// shout: no danger red, no cold stats table.
class _WhisperStats extends StatelessWidget {
  const _WhisperStats({
    required this.today,
    required this.weeklyAvg,
    required this.tasks,
    required this.ink,
  });
  final int today;
  final int weeklyAvg;
  final int tasks;
  final Color ink;

  @override
  Widget build(BuildContext context) {
    final tab = const [FontFeature.tabularFigures()];
    return Column(
      children: [
        Text.rich(
          TextSpan(
            style: QType.footnote
                .copyWith(color: ink.withValues(alpha: 0.75)),
            children: [
              TextSpan(
                text: '${today}m',
                style: QType.footnote.copyWith(
                    color: ink, fontWeight: FontWeight.w700, fontFeatures: tab),
              ),
              const TextSpan(text: ' here today  ·  weekly avg '),
              TextSpan(
                text: '${weeklyAvg}m',
                style:
                    QType.footnote.copyWith(color: ink, fontFeatures: tab),
              ),
            ],
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: QSpace.xxs),
        Text(
          '≈ $tasks focus tasks',
          style: QType.caption.copyWith(color: ink.withValues(alpha: 0.55)),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
