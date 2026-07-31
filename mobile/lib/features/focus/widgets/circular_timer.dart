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

/// A large analog CLOCK-FACE timer with tick marks + hour numerals, a bold
/// amber progress arc riding a recessed track with a rounded dark knob at its
/// leading edge, and big tabular numerals in the center. Designed to sit on the
/// warm gradient — ticks/numerals are translucent white, the arc is amber.
class ClockFaceTimer extends StatelessWidget {
  const ClockFaceTimer({
    super.key,
    required this.progress,
    required this.label,
    this.sublabel,
    this.size = 300,
    this.arcColor,
    this.tickColor,
    this.knobColor,
  });

  final double progress;
  final String label;
  final String? sublabel;
  final double size;
  final Color? arcColor;
  final Color? tickColor;
  final Color? knobColor;

  @override
  Widget build(BuildContext context) {
    final arc = arcColor ?? const Color(0xFFFFB13D);
    final tick = tickColor ?? CupertinoColors.white;
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _ClockFacePainter(
          progress: progress.clamp(0.0, 1.0),
          arc: arc,
          tick: tick,
          textDirection: Directionality.of(context),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                label,
                style: QType.timer.copyWith(
                  fontSize: size * 0.2,
                  letterSpacing: -1.0,
                  color: CupertinoColors.white,
                ),
              ),
              if (sublabel != null) ...[
                const SizedBox(height: QSpace.xxs),
                Text(
                  sublabel!.toUpperCase(),
                  style: QType.footnote.copyWith(
                    fontWeight: FontWeight.w600,
                    letterSpacing: 1.4,
                    color: CupertinoColors.white.withValues(alpha: 0.7),
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

class _ClockFacePainter extends CustomPainter {
  _ClockFacePainter({
    required this.progress,
    required this.arc,
    required this.tick,
    required this.textDirection,
  });

  final double progress;
  final Color arc;
  final Color tick;
  final TextDirection textDirection;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final r = size.shortestSide / 2;

    // --- Hour numerals 1..12, OUTSIDE the bezel (12 top, 3 right...). ------
    final numRadius = r - 12;
    for (var h = 1; h <= 12; h++) {
      final angle = -math.pi / 2 + (h / 12) * 2 * math.pi;
      final tp = TextPainter(
        text: TextSpan(
          text: '$h',
          style: QType.footnote.copyWith(
            fontWeight: FontWeight.w700,
            color: tick,
            fontFeatures: const [FontFeature.tabularFigures()],
          ),
        ),
        textDirection: textDirection,
      )..layout();
      final pos = center +
          Offset(math.cos(angle), math.sin(angle)) * numRadius -
          Offset(tp.width / 2, tp.height / 2);
      tp.paint(canvas, pos);
    }

    // --- White stopwatch BEZEL: a dense ring of fine radial ticks that
    //     reads as a near-solid white band, just inside the numerals. ------
    final bezelOuter = r - 30;
    const bezelDepth = 16.0;
    final bezelInner = bezelOuter - bezelDepth;
    const tickCount = 120;
    for (var i = 0; i < tickCount; i++) {
      final isMajor = i % 10 == 0;
      final angle = (i / tickCount) * 2 * math.pi;
      final dir = Offset(math.cos(angle), math.sin(angle));
      final paint = Paint()
        ..strokeCap = StrokeCap.butt
        ..strokeWidth = isMajor ? 2.4 : 1.6
        ..color = tick.withValues(alpha: isMajor ? 1.0 : 0.85);
      canvas.drawLine(
        center + dir * bezelOuter,
        center + dir * bezelInner,
        paint,
      );
    }

    // (The warm gradient shows through the center inside the bezel.)

    // --- Bold BLACK progress arc riding the OUTER rim (over the bezel top),
    //     thick with rounded caps, sweeping from ~10 o'clock through 12. ---
    final arcRadius = bezelOuter + 2;
    const arcStroke = 12.0;
    if (progress > 0) {
      final arcPaint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = arcStroke
        ..strokeCap = StrokeCap.round
        ..color = CupertinoColors.black;
      // Start at ~10 o'clock so progress reads as a band riding the rim.
      const start = -math.pi / 2 - (2 * math.pi) * (2 / 12);
      final sweep = 2 * math.pi * progress;
      canvas.drawArc(
        Rect.fromCircle(center: center, radius: arcRadius),
        start,
        sweep,
        false,
        arcPaint,
      );

      // Small ORANGE tick/marker at the START of the arc (~10 o'clock).
      final startDir = Offset(math.cos(start), math.sin(start));
      final markerCenter = center + startDir * arcRadius;
      canvas.drawCircle(
        markerCenter,
        6.5,
        Paint()..color = arc,
      );
    }
  }

  @override
  bool shouldRepaint(covariant _ClockFacePainter old) =>
      old.progress != progress ||
      old.arc != arc ||
      old.tick != tick;
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
