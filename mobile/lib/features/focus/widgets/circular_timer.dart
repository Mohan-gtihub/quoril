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

/// A large, clean focus dial: one bold progress ring with a rounded glowing
/// head, a subtle minute bezel just inside it, and big tabular time in the
/// center. No competing hour numerals — practical and readable. Designed to sit
/// on the warm gradient (white ink, amber progress).
class ClockFaceTimer extends StatelessWidget {
  const ClockFaceTimer({
    super.key,
    required this.progress,
    required this.label,
    this.sublabel,
    this.size = 320,
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

  /// Retained for source compatibility; the head now uses [arcColor].
  final Color? knobColor;

  @override
  Widget build(BuildContext context) {
    final arc = arcColor ?? const Color(0xFFFFC24B);
    final tick = tickColor ?? CupertinoColors.white;
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _ClockFacePainter(
          progress: progress.clamp(0.0, 1.0),
          arc: arc,
          tick: tick,
        ),
        child: Padding(
          // Keep the center label clear of the ring + bezel band.
          padding: EdgeInsets.all(size * 0.2),
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                FittedBox(
                  fit: BoxFit.scaleDown,
                  child: Text(
                    label,
                    maxLines: 1,
                    style: QType.timer.copyWith(
                      fontSize: size * 0.19,
                      letterSpacing: -1.5,
                      color: CupertinoColors.white,
                    ),
                  ),
                ),
                if (sublabel != null) ...[
                  const SizedBox(height: QSpace.xs),
                  Text(
                    sublabel!.toUpperCase(),
                    style: QType.footnote.copyWith(
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1.6,
                      color: CupertinoColors.white.withValues(alpha: 0.7),
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
  });

  final double progress;
  final Color arc;
  final Color tick;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final r = size.shortestSide / 2;
    final stroke = r * 0.09; // proportional ring weight
    final ringRadius = r - stroke / 2 - 1;
    final rect = Rect.fromCircle(center: center, radius: ringRadius);

    // --- Faint full track. -------------------------------------------------
    canvas.drawCircle(
      center,
      ringRadius,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..color = tick.withValues(alpha: 0.16),
    );

    // --- Subtle minute bezel just inside the ring (60 ticks). --------------
    final tickOuter = ringRadius - stroke / 2 - r * 0.03;
    for (var i = 0; i < 60; i++) {
      final isMajor = i % 5 == 0;
      final angle = (i / 60) * 2 * math.pi;
      final dir = Offset(math.cos(angle), math.sin(angle));
      final len = isMajor ? r * 0.055 : r * 0.03;
      canvas.drawLine(
        center + dir * tickOuter,
        center + dir * (tickOuter - len),
        Paint()
          ..strokeCap = StrokeCap.round
          ..strokeWidth = isMajor ? 2.0 : 1.0
          ..color = tick.withValues(alpha: isMajor ? 0.5 : 0.22),
      );
    }

    if (progress <= 0) return;

    // --- Bold amber progress arc + rounded glowing head. -------------------
    const start = -math.pi / 2;
    final sweep = 2 * math.pi * progress;
    canvas.drawArc(
      rect,
      start,
      sweep,
      false,
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = stroke
        ..strokeCap = StrokeCap.round
        ..color = arc,
    );

    // Head: a bright white cap with an amber core at the leading edge.
    final headAngle = start + sweep;
    final head = center + Offset(math.cos(headAngle), math.sin(headAngle)) * ringRadius;
    canvas.drawCircle(head, stroke * 0.62, Paint()..color = CupertinoColors.white);
    canvas.drawCircle(head, stroke * 0.30, Paint()..color = arc);
  }

  @override
  bool shouldRepaint(covariant _ClockFacePainter old) =>
      old.progress != progress || old.arc != arc || old.tick != tick;
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
