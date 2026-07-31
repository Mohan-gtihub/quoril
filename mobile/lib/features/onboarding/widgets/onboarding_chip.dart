import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';

/// Warm-accent amber used across the onboarding "Warm Aurora" gradient screens.
const Color _warmAccent = Color(0xFFFF9E3D);

/// Native selectable toggle chip: icon + label. Tuned for the Warm Aurora
/// gradient — a translucent-white glass pill unselected, a solid warm-amber
/// pill (dark ink) when selected. Depth via layered fills, not borders.
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
    // Selected: warm amber fill with dark ink for punch. Unselected: frosted
    // white glass with white ink — always readable on the gradient.
    final fg = selected ? const Color(0xFF2A0A06) : CupertinoColors.white;

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
              ? _warmAccent
              : CupertinoColors.white.withValues(alpha: 0.12),
          borderRadius: BorderRadius.circular(QRadius.capsule),
          border: Border.all(
            color: selected
                ? _warmAccent
                : CupertinoColors.white.withValues(alpha: 0.22),
            width: 1,
          ),
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
