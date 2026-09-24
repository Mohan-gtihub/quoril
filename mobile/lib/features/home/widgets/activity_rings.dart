import 'dart:math' as math;

import 'package:flutter/cupertino.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/theme/gradients.dart';

/// Apple Health–style concentric activity rings.
///
/// Outer ring = FOCUS ([QGradients.ringFocus]), inner ring = TASKS
/// ([QGradients.ringTasks]). Each ring has a faint track behind it, rounded
/// stroke caps, and a [gap] of empty space between the two rings. Sweeps begin
/// at the top (-pi/2) and go clockwise. Fractions clamp to 1.0 for the arc, so
/// a value >= 1 reads as a complete ring.
///
/// On first appear the rings animate 0 -> fraction over ~800ms
/// [Curves.easeOutCubic]. When [animate] is false or Reduce Motion is on, the
/// final state renders immediately (no animation).
class ActivityRings extends StatefulWidget {
  const ActivityRings({
    super.key,
    required this.focusFraction,
    required this.taskFraction,
    this.size = 120,
    this.strokeWidth = 12,
    this.gap = 3,
    this.animate = true,
    this.center,
  });

  final double focusFraction; // 0..1+ (clamp display to 1)
  final double taskFraction; // 0..1+
  final double size;
  final double strokeWidth;
  final double gap;
  final bool animate;
  final Widget? center;

  @override
  State<ActivityRings> createState() => _ActivityRingsState();
}

class _ActivityRingsState extends State<ActivityRings>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _progress;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _progress = CurvedAnimation(
      parent: _controller,
      curve: Curves.easeOutCubic,
    );
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Kick off the reveal once, honoring Reduce Motion / animate flag.
    if (_controller.status == AnimationStatus.dismissed &&
        _controller.value == 0.0) {
      if (widget.animate && !QMotion.reduced(context)) {
        _controller.forward();
      } else {
        _controller.value = 1.0;
      }
    }
  }

  @override
  void didUpdateWidget(covariant ActivityRings old) {
    super.didUpdateWidget(old);
    if (!widget.animate || QMotion.reduced(context)) {
      _controller.value = 1.0;
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final brightness =
        CupertinoTheme.of(context).brightness ?? Brightness.light;
    final trackColor = brightness == Brightness.dark
        ? CupertinoColors.white.withValues(alpha: 0.10)
        : QColors.brand.resolveFrom(context).withValues(alpha: 0.15);

    final focus = widget.focusFraction.clamp(0.0, 1.0).toDouble();
    final task = widget.taskFraction.clamp(0.0, 1.0).toDouble();

    return SizedBox(
      width: widget.size,
      height: widget.size,
      child: AnimatedBuilder(
        animation: _progress,
        builder: (context, child) {
          final t = _progress.value;
          return CustomPaint(
            size: Size.square(widget.size),
            painter: _RingsPainter(
              focusFraction: focus * t,
              taskFraction: task * t,
              strokeWidth: widget.strokeWidth,
              gap: widget.gap,
              trackColor: trackColor,
              focusColors: QGradients.ringFocus,
              taskColors: QGradients.ringTasks,
            ),
            child: child,
          );
        },
        // Center child is stationary; keep it out of the rebuild.
        child: widget.center == null
            ? null
            : Center(child: widget.center),
      ),
    );
  }
}

class _RingsPainter extends CustomPainter {
  _RingsPainter({
    required this.focusFraction,
    required this.taskFraction,
    required this.strokeWidth,
    required this.gap,
    required this.trackColor,
    required this.focusColors,
    required this.taskColors,
  });

  final double focusFraction;
  final double taskFraction;
  final double strokeWidth;
  final double gap;
  final Color trackColor;
  final List<Color> focusColors;
  final List<Color> taskColors;

  static const double _start = -math.pi / 2; // top

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final outerRadius = (size.shortestSide - strokeWidth) / 2;
    final innerRadius = outerRadius - strokeWidth - gap;

    _paintRing(
      canvas,
      center,
      outerRadius,
      focusFraction,
      focusColors,
    );
    if (innerRadius > strokeWidth / 2) {
      _paintRing(
        canvas,
        center,
        innerRadius,
        taskFraction,
        taskColors,
      );
    }
  }

  void _paintRing(
    Canvas canvas,
    Offset center,
    double radius,
    double fraction,
    List<Color> colors,
  ) {
    final rect = Rect.fromCircle(center: center, radius: radius);

    // Faint track behind the ring.
    final track = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round
      ..color = trackColor;
    canvas.drawArc(rect, 0, 2 * math.pi, false, track);

    if (fraction <= 0) return;

    final sweep = (2 * math.pi) * fraction;
    final gradient = SweepGradient(
      startAngle: 0,
      endAngle: 2 * math.pi,
      colors: colors,
      transform: GradientRotation(_start),
    );

    final arc = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round
      ..shader = gradient.createShader(rect);
    canvas.drawArc(rect, _start, sweep, false, arc);
  }

  @override
  bool shouldRepaint(covariant _RingsPainter old) =>
      old.focusFraction != focusFraction ||
      old.taskFraction != taskFraction ||
      old.strokeWidth != strokeWidth ||
      old.gap != gap ||
      old.trackColor != trackColor;
}
