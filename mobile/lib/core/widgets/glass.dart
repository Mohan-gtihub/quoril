import 'dart:ui';
import 'package:flutter/cupertino.dart';
import '../theme/tokens.dart';

/// Liquid-Glass surface: blurred translucent material with a hairline border.
/// Use for tab bars, floating controls, and elevated cards.
class GlassSurface extends StatelessWidget {
  const GlassSurface({
    super.key,
    required this.child,
    this.radius = QRadius.glass,
    this.blur = 20,
    this.padding = EdgeInsets.zero,
    this.tint,
  });

  final Widget child;
  final double radius;
  final double blur;
  final EdgeInsetsGeometry padding;
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    final base = (tint ?? QColors.surface).resolveFrom(context);
    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: Container(
          padding: padding,
          decoration: BoxDecoration(
            color: base.withValues(alpha: 0.72),
            borderRadius: BorderRadius.circular(radius),
            border: Border.all(
              color: QColors.separator.resolveFrom(context).withValues(alpha: 0.5),
              width: 0.5,
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}

/// Solid rounded card for grouped content (Insights metrics, etc.).
class GlassCard extends StatelessWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(QSpace.md),
    this.onTap,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final card = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: QColors.surface.resolveFrom(context),
        borderRadius: BorderRadius.circular(QRadius.card),
      ),
      child: child,
    );
    if (onTap == null) return card;
    return GestureDetector(onTap: onTap, behavior: HitTestBehavior.opaque, child: card);
  }
}
