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
