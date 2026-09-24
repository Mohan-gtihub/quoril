import 'dart:ui';

import 'package:flutter/cupertino.dart';
import '../models/models.dart';
import '../theme/tokens.dart';
import '../theme/typography.dart';

/// Reusable "Liquid Glass" surface — a frosted, backdrop-blurred panel with a
/// specular top highlight, a hairline light border, and a soft ambient shadow.
/// This is the shared building block for translucent cards layered over the
/// warm-aurora [GradientBackground].
class GlassPanel extends StatelessWidget {
  const GlassPanel({
    super.key,
    required this.child,
    this.padding,
    this.radius = QRadius.glass,
    this.blur = 18,
    this.fillAlpha = 0.16,
    this.borderAlpha = 0.24,
    this.onTap,
    this.shadow = true,
    this.onDark = true,
  });

  final Widget child;
  final EdgeInsetsGeometry? padding;
  final double radius;
  final double blur;

  /// Base translucency of the glass fill (a vertical gradient is layered on top).
  final double fillAlpha;
  final double borderAlpha;
  final VoidCallback? onTap;
  final bool shadow;

  /// When the panel sits over a *dark* surface (e.g. the ember gradient), the
  /// specular sheen is white. Set false when it sits on a light grouped
  /// background so the glass uses a dark scrim instead of an invisible
  /// white-on-white frost.
  final bool onDark;

  @override
  Widget build(BuildContext context) {
    // Adaptive sheen: white specular over dark surfaces, a subtle dark scrim in
    // light contexts — so the glass is visible in BOTH modes.
    final brightness =
        MediaQuery.maybeOf(context)?.platformBrightness ?? Brightness.light;
    final overDark = onDark || brightness == Brightness.dark;
    final sheen = overDark ? CupertinoColors.white : CupertinoColors.black;
    final borderColor = overDark ? CupertinoColors.white : CupertinoColors.black;

    final panel = DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(radius),
        boxShadow: shadow ? QElevation.raised(context) : null,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(radius),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
          child: Container(
            padding: padding,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(radius),
              // Specular sheen: brighter at the top edge, settling lower down.
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  sheen.withValues(alpha: fillAlpha + 0.08),
                  sheen.withValues(alpha: fillAlpha),
                  sheen.withValues(alpha: (fillAlpha - 0.04).clamp(0.0, 1.0)),
                ],
                stops: const [0.0, 0.45, 1.0],
              ),
              border: Border.all(
                color: borderColor.withValues(alpha: borderAlpha),
                width: 0.66,
              ),
            ),
            child: child,
          ),
        ),
      ),
    );

    if (onTap == null) return panel;
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: onTap,
      child: panel,
    );
  }
}

/// Overlapping cluster of colored initials avatars (reference task/event cards).
class AvatarStack extends StatelessWidget {
  const AvatarStack({
    super.key,
    required this.people,
    this.size = 30,
    this.max = 3,
    this.ringColor,
  });

  final List<Assignee> people;
  final double size;
  final int max;

  /// Border color separating overlapping avatars (defaults to card surface).
  final Color? ringColor;

  @override
  Widget build(BuildContext context) {
    if (people.isEmpty) return const SizedBox.shrink();
    final shown = people.take(max).toList();
    final overlap = size * 0.42;
    final ring = ringColor ?? QColors.surface.resolveFrom(context);
    return SizedBox(
      width: size + overlap * (shown.length - 1),
      height: size,
      child: Stack(
        children: [
          for (var i = 0; i < shown.length; i++)
            Positioned(
              left: i * overlap,
              child: Container(
                width: size,
                height: size,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: shown[i].color,
                  shape: BoxShape.circle,
                  border: Border.all(color: ring, width: 2),
                ),
                child: Text(
                  shown[i].initials,
                  style: QType.caption.copyWith(
                    color: CupertinoColors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: size * 0.34,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Centered empty state: a symbol in a soft tinted disc, a title line, an
/// optional message, and an optional action. Pass a section [accent] to tint
/// the symbol + its disc with that screen's accent (defaults to neutral so it
/// stays quiet unless a screen opts in).
class EmptyState extends StatelessWidget {
  const EmptyState({
    super.key,
    required this.icon,
    required this.title,
    this.message,
    this.action,
    this.accent,
  });
  final IconData icon;
  final String title;
  final String? message;
  final Widget? action;

  /// Optional section accent for the symbol + its disc.
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final tinted = accent != null;
    final c = (accent ?? QColors.labelTertiary).resolveFrom(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(QSpace.xl),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72,
              height: 72,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: c.withValues(alpha: tinted ? 0.12 : 0.10),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 34, color: c),
            ),
            const SizedBox(height: QSpace.md),
            Text(title, style: QType.title3, textAlign: TextAlign.center),
            if (message != null) ...[
              const SizedBox(height: QSpace.xs),
              Text(message!, style: QType.subhead, textAlign: TextAlign.center),
            ],
            if (action != null) ...[const SizedBox(height: QSpace.lg), action!],
          ],
        ),
      ),
    );
  }
}

/// Small pill chip: icon + label. Used for stats and metadata.
class QChip extends StatelessWidget {
  const QChip({super.key, this.icon, required this.label, this.color});
  final IconData? icon;
  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final c = (color ?? QColors.labelSecondary).resolveFrom(context);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: QSpace.sm, vertical: 5),
      decoration: BoxDecoration(
        color: c.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(QRadius.capsule),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 13, color: c), const SizedBox(width: 4)],
          // Flexible + ellipsis so the pill shrinks gracefully inside a tight
          // parent (e.g. a half-width KPI tile) instead of overflowing; in an
          // unbounded row it still sizes to its full intrinsic width.
          Flexible(
            child: Text(
              label,
              style: QType.footnote.copyWith(color: c, fontWeight: FontWeight.w600),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              softWrap: false,
            ),
          ),
        ],
      ),
    );
  }
}

/// Format helpers.
String fmtHm(int seconds) {
  final h = seconds ~/ 3600;
  final m = (seconds % 3600) ~/ 60;
  if (h > 0) return m > 0 ? '${h}h ${m}m' : '${h}h';
  return '${m}m';
}

String fmtClock(int seconds) {
  final m = seconds ~/ 60;
  final s = seconds % 60;
  return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
}

/// HH:MM:SS clock format used by the Session timer + session list rows.
String fmtHms(int seconds) {
  final h = seconds ~/ 3600;
  final m = (seconds % 3600) ~/ 60;
  final s = seconds % 60;
  return '${h.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
}
