import 'dart:ui';

import 'package:adaptive_platform_ui/adaptive_platform_ui.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import '../theme/tokens.dart';

/// Liquid-Glass surface: native UIVisualEffectView material on iOS 26 (via
/// [AdaptiveBlurView]), graceful BackdropFilter blur on iOS <26 / Android.
///
/// EMBER EDITORIAL: reserve this for CHROME — tab/nav bars, the floating FAB,
/// modal-sheet backgrounds — never for content rows. Mode-aware tint gives the
/// material real body, and a top "refraction" hairline reads as a glass edge.
class GlassSurface extends StatelessWidget {
  const GlassSurface({
    super.key,
    required this.child,
    this.radius = QRadius.glass,
    this.padding = EdgeInsets.zero,
    this.tint,
  });

  final Widget child;
  final double radius;
  final EdgeInsetsGeometry padding;
  final Color? tint;

  @override
  Widget build(BuildContext context) {
    final dark = (MediaQuery.maybeOf(context)?.platformBrightness ?? Brightness.light) == Brightness.dark;
    final base = (tint ?? QColors.surface).resolveFrom(context);
    final br = BorderRadius.circular(radius);
    return AdaptiveBlurView(
      borderRadius: br,
      child: Container(
        padding: padding,
        decoration: BoxDecoration(
          color: base.withValues(alpha: dark ? QGlass.tintDark : QGlass.tintLight),
          borderRadius: br,
          border: Border(
            top: BorderSide(
              color: CupertinoColors.white.withValues(alpha: dark ? 0.10 : QGlass.edgeHighlight),
              width: 0.66,
            ),
          ),
        ),
        child: child,
      ),
    );
  }
}

/// CONTENT-grade frosted glass card — the Apple "material" for content surfaces
/// (task cards, agenda cards, KPI/metric cards, workspace-section cards, the
/// ring-calendar container, hero stat cards, inset content groups).
///
/// Unlike [GlassSurface] (which is reserved for CHROME) this reads as a resting
/// content card: a translucent frosted fill that refracts the faint ambient
/// wash behind it, an optional very-faint section-accent [tint], a hairline
/// border, a top specular highlight, and a restrained tier-1 shadow. It is
/// tuned to stay WCAG-AA legible with neutral system ink in BOTH light and dark
/// mode, over the ambient wash OR a flat page background.
///
/// Recipe: continuous-radius clip → BackdropFilter blur (brightness-aware:
/// ~18 light / ~24 dark) → translucent fill (light: surface @ ~0.62; dark:
/// white @ ~0.08 over the dark ground) → optional accent tint @ ~0.05 →
/// 1px border (white 0.18 light / 0.10 dark) → top highlight hairline
/// (white @ 0.25 fading out). [onTap] adds a press-scale (~0.98) +
/// selection haptic, gated on Reduce Motion.
class GlassCard extends StatefulWidget {
  const GlassCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(QSpace.md),
    this.radius = QRadius.card,
    this.onTap,
    this.tint,
    this.blur = 18,
    this.interactive = true,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final double radius;
  final VoidCallback? onTap;

  /// Very-faint section-accent wash laid over the frosted fill (@ ~5%). Pass a
  /// screen's [QSection] accent to give the card a whisper of that hue.
  final Color? tint;

  /// Base blur sigma in light mode; dark mode lifts it ~+6 for a richer frost.
  final double blur;

  /// When false, [onTap] still fires but the press-scale + haptic are skipped
  /// (for cards that manage their own press feedback).
  final bool interactive;

  @override
  State<GlassCard> createState() => _GlassCardState();
}

class _GlassCardState extends State<GlassCard> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    final dark = CupertinoTheme.of(context).brightness == Brightness.dark ||
        (MediaQuery.maybeOf(context)?.platformBrightness == Brightness.dark);
    final reduced = QMotion.reduced(context);
    final br = BorderRadius.circular(widget.radius);
    final sigma = dark ? widget.blur + 6 : widget.blur;

    // Translucent frosted fill — legible neutral ground in both modes.
    final fill = dark
        ? CupertinoColors.white.withValues(alpha: 0.08)
        : QColors.surface.resolveFrom(context).withValues(alpha: 0.62);
    final border = CupertinoColors.white.withValues(alpha: dark ? 0.10 : 0.18);

    final card = DecoratedBox(
      // Tier-1 shadow lives OUTSIDE the clip so it reads as lift, not a fill.
      decoration: BoxDecoration(
        borderRadius: br,
        boxShadow: QElevation.card(context),
      ),
      child: ClipRRect(
        borderRadius: br,
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: sigma, sigmaY: sigma),
          child: Container(
            padding: widget.padding,
            decoration: BoxDecoration(
              color: fill,
              borderRadius: br,
              border: Border.all(color: border, width: 1),
            ),
            child: Stack(
              children: [
                // Optional section-accent tint wash + top specular highlight,
                // both painted UNDER the child so they never wash out ink.
                Positioned.fill(
                  child: IgnorePointer(
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        borderRadius: br,
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            CupertinoColors.white.withValues(alpha: dark ? 0.06 : 0.25),
                            (widget.tint ?? const Color(0x00000000))
                                .resolveFrom(context)
                                .withValues(alpha: widget.tint == null ? 0.0 : 0.05),
                          ],
                          stops: const [0.0, 0.55],
                        ),
                      ),
                    ),
                  ),
                ),
                widget.child,
              ],
            ),
          ),
        ),
      ),
    );

    if (widget.onTap == null) return card;

    final scaled = AnimatedScale(
      scale: _pressed && widget.interactive && !reduced ? 0.98 : 1.0,
      duration: QMotion.duration(context, QMotion.fast),
      curve: QMotion.standard,
      child: card,
    );
    return GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTapDown: widget.interactive ? (_) => setState(() => _pressed = true) : null,
      onTapUp: widget.interactive ? (_) => setState(() => _pressed = false) : null,
      onTapCancel: widget.interactive ? () => setState(() => _pressed = false) : null,
      onTap: () {
        HapticFeedback.selectionClick();
        widget.onTap!();
      },
      child: scaled,
    );
  }
}
