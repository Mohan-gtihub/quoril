import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import '../theme/tokens.dart';
import '../theme/typography.dart';

enum QButtonStyle { filled, tinted, plain }

/// Capsule button with haptic feedback on tap.
class PrimaryButton extends StatelessWidget {
  const PrimaryButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.style = QButtonStyle.filled,
    this.color,
    this.foreground,
    this.icon,
    this.expand = true,
    this.height = 52,
    this.loading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final QButtonStyle style;
  final Color? color;

  /// Overrides the label/icon ink. Used for high-contrast white pills on a
  /// colored background (e.g. a white CTA with dark warm ink over a gradient).
  final Color? foreground;
  final IconData? icon;
  final bool expand;
  final double height;
  final bool loading;

  @override
  Widget build(BuildContext context) {
    final tint = (color ?? QColors.tint).resolveFrom(context);
    final Color bg;
    final Color fg;
    switch (style) {
      case QButtonStyle.filled:
        bg = tint;
        fg = foreground ?? CupertinoColors.white;
        break;
      case QButtonStyle.tinted:
        bg = tint.withValues(alpha: 0.15);
        fg = foreground ?? tint;
        break;
      case QButtonStyle.plain:
        bg = const Color(0x00000000);
        fg = foreground ?? tint;
        break;
    }

    return SizedBox(
      width: expand ? double.infinity : null,
      height: height,
      child: CupertinoButton(
        padding: EdgeInsets.symmetric(horizontal: expand ? 0 : QSpace.lg),
        borderRadius: BorderRadius.circular(QRadius.capsule),
        color: style == QButtonStyle.plain ? null : bg,
        onPressed: onPressed == null
            ? null
            : () {
                HapticFeedback.lightImpact();
                onPressed!();
              },
        child: loading
            ? const CupertinoActivityIndicator()
            : Row(
                mainAxisSize: MainAxisSize.min,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 18, color: fg),
                    const SizedBox(width: QSpace.xs),
                  ],
                  Text(label, style: QType.headline.copyWith(color: fg)),
                ],
              ),
      ),
    );
  }
}
