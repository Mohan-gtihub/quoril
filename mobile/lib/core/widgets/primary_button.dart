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
    this.icon,
    this.expand = true,
    this.height = 52,
    this.loading = false,
  });

  final String label;
  final VoidCallback? onPressed;
  final QButtonStyle style;
  final Color? color;
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
        fg = CupertinoColors.white;
        break;
      case QButtonStyle.tinted:
        bg = tint.withValues(alpha: 0.15);
        fg = tint;
        break;
      case QButtonStyle.plain:
        bg = const Color(0x00000000);
        fg = tint;
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
