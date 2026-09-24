import 'dart:math' as math;
import 'package:flutter/cupertino.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';

/// A large countdown ring with big tabular numerals in the center.
/// [progress] is 0..1 (fraction of the session remaining). Native, adaptive,
/// systemBlue — depth comes from a recessed track, no shadows or glow.
class CircularTimer extends StatelessWidget {
  const CircularTimer({
    super.key,
    required this.progress,
    required this.label,
    this.sublabel,
    this.color,
    this.size = 300,
    this.stroke = 12,
  });

  final double progress;
  final String label;
  final String? sublabel;
  final Color? color;
  final double size;
  final double stroke;

  @override
  Widget build(BuildContext context) {
    final ring = (color ?? QColors.focus).resolveFrom(context);
    final track = QColors.secondaryFill.resolveFrom(context);
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _RingPainter(
          progress: progress.clamp(0.0, 1.0),
          ring: ring,
          track: track,
          stroke: stroke,
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: QType.timer.copyWith(
                  fontSize: size * 0.235,
                  letterSpacing: -1.0,
                ),
              ),
              if (sublabel != null) ...[
                const SizedBox(height: QSpace.xxs),
                Text(
                  sublabel!.toUpperCase(),
                  style: QType.footnote.copyWith(
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.2,
                    color: QColors.labelSecondary.resolveFrom(context),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({
    required this.progress,
    required this.ring,
    required this.track,
    required this.stroke,
  });

  final double progress;
  final Color ring;
  final Color track;
  final double stroke;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = (size.shortestSide - stroke) / 2;

    final trackPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round
      ..color = track;
    canvas.drawCircle(center, radius, trackPaint);

    if (progress <= 0) return;

    final ringPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round
      ..color = ring;

    const start = -math.pi / 2;
    final sweep = 2 * math.pi * progress;
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      start,
      sweep,
      false,
      ringPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _RingPainter old) =>
      old.progress != progress ||
      old.ring != ring ||
      old.track != track ||
      old.stroke != stroke;
}

/// A large, living focus dial: one bold ember progress ring (SweepGradient
/// amber→ember) that DRAINS as the countdown runs, a real MaskFilter head glow
/// that intensifies in the last ~10%, an ambient breathing pulse (~5.5s), and
/// big tabular time in the center. Designed to sit on the warm gradient (white
/// ink, amber progress).
///
/// [progress] is 0..1 (fraction REMAINING). The widget smoothly interpolates
/// between successive [progress] values so the ring flows instead of snapping
/// in 1° per-second steps. All motion is gated on Reduce Motion.
class ClockFaceTimer extends StatefulWidget {
  const ClockFaceTimer({
    super.key,
    required this.progress,
    required this.label,
    this.sublabel,
    this.size = 320,
    this.arcColor,
    this.tickColor,
    this.paused = false,
    this.knobColor,
    this.ignite = 0.0,
  });

  /// Fraction of the session REMAINING (1 = full, 0 = drained).
  final double progress;
  final String label;
  final String? sublabel;
  final double size;
  final Color? arcColor;
  final Color? tickColor;

  /// 0..1 one-shot ignition bloom driven by the focus screen's start moment.
  /// Blooms an ember halo around the whole ring (ember@40%→0%, blur 8→20).
  final double ignite;

  /// When paused the ring desaturates and breathing halts.
  final bool paused;

  /// Retained for source compatibility; the head now uses [arcColor].
  final Color? knobColor;

  @override
  State<ClockFaceTimer> createState() => _ClockFaceTimerState();
}

class _ClockFaceTimerState extends State<ClockFaceTimer>
    with TickerProviderStateMixin {
  /// Smoothly tweens displayed progress toward the target each time it changes
  /// (once per second) so the ring glides across the intervening arc.
  late final AnimationController _progressCtrl;
  late Animation<double> _progressAnim;
  double _shownProgress = 1.0;

  /// Ambient breathing loop (scale + glow bloom).
  late final AnimationController _breathCtrl;

  @override
  void initState() {
    super.initState();
    _shownProgress = widget.progress.clamp(0.0, 1.0);
    _progressCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 950),
    );
    _progressAnim = AlwaysStoppedAnimation(_shownProgress);
    _breathCtrl = AnimationController(
      vsync: this,
      duration: QMotion.breath,
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _syncBreath();
  }

  void _syncBreath() {
    final reduced = QMotion.reduced(context);
    if (reduced || widget.paused) {
      if (_breathCtrl.isAnimating) _breathCtrl.stop();
    } else if (!_breathCtrl.isAnimating) {
      _breathCtrl.repeat(reverse: true);
    }
  }

  @override
  void didUpdateWidget(ClockFaceTimer old) {
    super.didUpdateWidget(old);
    final target = widget.progress.clamp(0.0, 1.0);
    if (target != _shownProgress) {
      if (QMotion.reduced(context)) {
        _shownProgress = target;
        _progressAnim = AlwaysStoppedAnimation(target);
        _progressCtrl.value = 0;
        setState(() {});
      } else {
        _progressAnim = Tween<double>(begin: _shownProgress, end: target)
            .animate(CurvedAnimation(
                parent: _progressCtrl, curve: Curves.linear));
        _shownProgress = target;
        _progressCtrl.forward(from: 0);
      }
    }
    if (old.paused != widget.paused) _syncBreath();
  }

  @override
  void dispose() {
    _progressCtrl.dispose();
    _breathCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Flame (focus section accent) drives the leading edge of the ring.
    final arc = widget.arcColor ?? QSection.focus.resolveFrom(context);
    final tick = widget.tickColor ?? CupertinoColors.white;
    final size = widget.size;

    return SizedBox(
      width: size,
      height: size,
      child: AnimatedBuilder(
        animation: Listenable.merge([_progressCtrl, _breathCtrl]),
        builder: (context, child) {
          // Ambient breathing: scale 0.98→1.02, glow bloom 0→1.
          final t = _breathCtrl.value; // 0..1 (reverses)
          final breathing = !widget.paused && !QMotion.reduced(context);
          final scale = breathing ? 0.98 + 0.04 * t : 1.0;
          final bloom = breathing ? t : 0.0;
          return Transform.scale(
            scale: scale,
            child: CustomPaint(
              painter: _ClockFacePainter(
                progress: _progressAnim.value.clamp(0.0, 1.0),
                arc: arc,
                tick: tick,
                bloom: bloom,
                ignite: widget.ignite.clamp(0.0, 1.0),
                paused: widget.paused,
              ),
              child: child,
            ),
          );
        },
        child: Padding(
          // Keep the center label clear of the ring band.
          padding: EdgeInsets.all(size * 0.19),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Huge, clean tabular countdown — the single focal numeral.
                FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    widget.label,
                    maxLines: 1,
                    style: QType.timer.copyWith(
                      fontSize: size * 0.205,
                      fontWeight: FontWeight.w500,
                      letterSpacing: -2.0,
                      height: 1.0,
                      color: CupertinoColors.white,
                    ),
                  ),
                ),
                if (widget.sublabel != null) ...[
                  SizedBox(height: size * 0.03),
                  Text(
                    widget.sublabel!.toUpperCase(),
                    style: QType.eyebrow.copyWith(
                      letterSpacing: 2.0,
                      color: CupertinoColors.white.withValues(alpha: 0.62),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ClockFacePainter extends CustomPainter {
  _ClockFacePainter({
    required this.progress,
    required this.arc,
    required this.tick,
    required this.bloom,
    required this.ignite,
    required this.paused,
  });

  /// Fraction REMAINING (the arc drains toward 0).
  final double progress;
  final Color arc;
  final Color tick;

  /// 0..1 ambient breath bloom driving the head-glow intensity.
  final double bloom;

  /// 0..1 one-shot ignition bloom — a full-ring ember halo on session start.
  final double ignite;
  final bool paused;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final r = size.shortestSide / 2;
    final stroke = r * 0.09; // proportional ring weight
    final ringRadius = r - stroke / 2 - 1;
    final rect = Rect.fromCircle(center: center, radius: ringRadius);

    // --- Ignition halo: a full-ring ember bloom (40%→0%, blur 8→20). -------
    if (ignite > 0) {
      final glowAlpha = 0.40 * ignite;
      final blur = 8.0 + 12.0 * ignite;
      canvas.drawCircle(
        center,
        ringRadius,
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = stroke * (1.4 + 1.6 * ignite)
          ..color = arc.withValues(alpha: glowAlpha)
          ..maskFilter = MaskFilter.blur(BlurStyle.normal, blur),
      );
    }

    // --- Faint full track. -------------------------------------------------
    canvas.drawCircle(
      center,
      ringRadius,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..color = tick.withValues(alpha: 0.14),
    );

    if (progress <= 0) return;

    const start = -math.pi / 2;
    final sweep = 2 * math.pi * progress;

    // Last-stretch urgency: intensify head glow as the countdown drains.
    final nearEnd = (1.0 - progress).clamp(0.0, 1.0); // 0 full → 1 drained
    final urgency = ((nearEnd - 0.9) / 0.1).clamp(0.0, 1.0); // ramps in last 10%

    // --- Bold flame progress arc: warm amber head → deep flame tail. -------
    // Derived from the flame accent so the ring carries the focus section hue.
    final flameLight = Color.lerp(arc, const Color(0xFFFFC24B), 0.55)!;
    final stops = <Color>[flameLight, arc];
    final gradient = SweepGradient(
      startAngle: 0,
      endAngle: 2 * math.pi,
      transform: const GradientRotation(-math.pi / 2),
      colors: paused
          ? [
              // Desaturated toward the tick ink when paused.
              Color.lerp(stops.first, tick, 0.55)!,
              Color.lerp(stops.last, tick, 0.55)!,
            ]
          : stops,
    );
    canvas.drawArc(
      rect,
      start,
      sweep,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..shader = gradient.createShader(rect),
    );

    // --- Glowing head at the leading (draining) edge. ----------------------
    final headAngle = start + sweep;
    final head =
        center + Offset(math.cos(headAngle), math.sin(headAngle)) * ringRadius;

    if (!paused) {
      // Real bloom via MaskFilter.blur; breathes + surges near the end.
      final glowAlpha = (0.30 + 0.35 * bloom + 0.35 * urgency).clamp(0.0, 1.0);
      final glowRadius = stroke * (1.3 + 0.6 * bloom + 1.2 * urgency);
      canvas.drawCircle(
        head,
        glowRadius,
        Paint()
          ..color = arc.withValues(alpha: glowAlpha)
          ..maskFilter = MaskFilter.blur(BlurStyle.normal, stroke * 0.9),
      );
    }

    // Head cap: bright white with an amber core.
    final capColor =
        paused ? tick.withValues(alpha: 0.85) : CupertinoColors.white;
    canvas.drawCircle(head, stroke * 0.62, Paint()..color = capColor);
    canvas.drawCircle(
        head, stroke * 0.30, Paint()..color = paused ? tick : arc);
  }

  @override
  bool shouldRepaint(covariant _ClockFacePainter old) =>
      old.progress != progress ||
      old.arc != arc ||
      old.tick != tick ||
      old.bloom != bloom ||
      old.ignite != ignite ||
      old.paused != paused;
}

/// An empty outline ring used in an idle / ready state.
class IdleRing extends StatelessWidget {
  const IdleRing({
    super.key,
    required this.title,
    this.subtitle,
    this.size = 300,
    this.stroke = 12,
  });

  final String title;
  final String? subtitle;
  final double size;
  final double stroke;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _RingPainter(
          progress: 0,
          ring: QColors.focus.resolveFrom(context),
          track: QColors.secondaryFill.resolveFrom(context),
          stroke: stroke,
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(title, style: QType.title1),
              if (subtitle != null) ...[
                const SizedBox(height: QSpace.xxs),
                Text(
                  subtitle!,
                  style: QType.subhead.copyWith(
                    color: QColors.labelSecondary.resolveFrom(context),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
