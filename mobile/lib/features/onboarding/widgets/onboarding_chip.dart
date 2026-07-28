import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';

/// Native selectable toggle chip: icon + label. Depth via layered fills, not
/// borders — tint fill + checkmark when selected. Adaptive light/dark.
class OnboardingChip extends StatelessWidget {
  const OnboardingChip({
    super.key,
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final tint = QColors.tint.resolveFrom(context);
    final label0 = QColors.label.resolveFrom(context);
    final fg = selected ? tint : label0;

    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () {
        HapticFeedback.selectionClick();
        onTap();
      },
      child: AnimatedContainer(
        duration: QMotion.fast,
        curve: QMotion.standard,
        constraints: const BoxConstraints(minHeight: 44),
        padding: const EdgeInsets.symmetric(
          horizontal: QSpace.md,
          vertical: QSpace.sm,
        ),
        decoration: BoxDecoration(
          color: selected
              ? tint.withValues(alpha: 0.16)
              : QColors.secondaryFill.resolveFrom(context),
          borderRadius: BorderRadius.circular(QRadius.capsule),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              selected ? CupertinoIcons.checkmark_alt : icon,
              size: 17,
              color: fg,
            ),
            const SizedBox(width: QSpace.xs),
            Text(
              label,
              style: QType.callout.copyWith(
                color: fg,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Small progress ring preview used on the focus-goal tiles (CustomPaint).
class RingPreview extends StatelessWidget {
  const RingPreview({
    super.key,
    required this.progress,
    required this.color,
    this.size = 46,
    this.label,
  });

  final double progress;
  final Color color;
  final double size;
  final String? label;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _RingPainter(
          progress: progress,
          color: color,
          track: QColors.separator.resolveFrom(context).withValues(alpha: 0.35),
        ),
        child: label == null
            ? null
            : Center(
                child: Text(
                  label!,
                  style: QType.footnote.copyWith(
                    color: color,
                    fontWeight: FontWeight.w700,
                    fontFeatures: const [FontFeature.tabularFigures()],
                  ),
                ),
              ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter({required this.progress, required this.color, required this.track});
  final double progress;
  final Color color;
  final Color track;

  @override
  void paint(Canvas canvas, Size size) {
    const stroke = 5.0;
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - stroke) / 2;
    final trackPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round
      ..color = track;
    final arcPaint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke
      ..strokeCap = StrokeCap.round
      ..color = color;
    canvas.drawCircle(center, radius, trackPaint);
    const start = -1.5707963267948966; // -90deg
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      start,
      6.283185307179586 * progress.clamp(0.0, 1.0),
      false,
      arcPaint,
    );
  }

  @override
  bool shouldRepaint(covariant _RingPainter old) =>
      old.progress != progress || old.color != color || old.track != track;
}
