import 'package:flutter/cupertino.dart';

/// Quoril "Warm Aurora" gradient system — the visual signature inspired by the
/// Apple-native reference: a deep maroon→orange→amber wash for focus surfaces,
/// a cool navy→azure wash for the morning greeting hero, and vivid ring stops
/// for the Apple Health–style activity rings.
///
/// These are decorative brand gradients layered *behind* content; foreground
/// text/controls stay on Apple system semantics for contrast + a11y.
class QGradients {
  QGradients._();

  /// THE signature gradient — one ember family derived from the single brand
  /// accent. Deep ember → brand ember → warm amber highlight. Used on every
  /// brand surface: focus/session hero, onboarding, the home focus card.
  static const warm = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF7A1E05), // deep ember root
      Color(0xFFB23405), // deep ember
      Color(0xFFF2751B), // brand ember
      Color(0xFFFFB661), // warm amber highlight
    ],
    stops: [0.0, 0.32, 0.72, 1.0],
  );

  /// Alias — the ember gradient by its true name (prefer this in new code).
  static const ember = warm;

  /// Break / rest wash — a calm cool exhale, the deliberate opposite of the
  /// warm focus surface so "break" reads as stepping into a different room.
  static const cool = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF063B45), // deep teal
      Color(0xFF0E5C66), // teal
      Color(0xFF1E8E96), // bright teal
    ],
    stops: [0.0, 0.5, 1.0],
  );

  /// Subtle page background wash — a faint warm tint that reads as light in
  /// light mode and rich in dark mode via the two brightness variants.
  static LinearGradient page(Brightness b) => b == Brightness.dark
      ? const LinearGradient(
          // Embers-in-the-dark: a faint warm glow at the top fading to black.
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF1C0E06), Color(0xFF0B0A0A)],
        )
      : const LinearGradient(
          // Sunrise: a barely-there warm tint settling to neutral.
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFFF4EC), Color(0xFFF7F5F7)],
        );

  /// AMBIENT WASH — a VERY faint section-tinted top-to-bottom wash to sit
  /// behind a screen body so frosted [GlassCard]s have something to refract (a
  /// flat page background makes the glass material invisible). A ~4–7% [accent]
  /// tint at the top fades to the neutral grouped page background, keeping the
  /// "clean airy" feel. Pass a resolved [QSection] accent and the current
  /// [Brightness]; render via [GradientBackground].
  static LinearGradient ambient(Color accent, Brightness b) {
    // Resolve the grouped page background for the given brightness without a
    // context: systemGroupedBackground is white-ish in light, near-black in dark.
    final ground = b == Brightness.dark
        ? const Color(0xFF000000)
        : const Color(0xFFF2F2F7);
    final tintAlpha = b == Brightness.dark ? 0.07 : 0.05;
    return LinearGradient(
      begin: Alignment.topCenter,
      end: Alignment.bottomCenter,
      colors: [
        Color.alphaBlend(accent.withValues(alpha: tintAlpha), ground),
        ground,
      ],
      stops: const [0.0, 0.42],
    );
  }

  // --- Apple Health–style ring sweeps (each is a 2-stop conic-ready pair) ---
  // All three live inside the single ember hue family — different lightness,
  // not different brands. Focus is the boldest; protected/tasks are quieter.

  /// Focus ring — warm amber → brand ember (the hero ring).
  static const ringFocus = [Color(0xFFFFC24B), Color(0xFFF2751B)];

  /// Protected/blocked ring — deep ember → ember (a shade of the same hue).
  static const ringProtected = [Color(0xFFF2751B), Color(0xFF9E3407)];

  /// Tasks ring — soft amber → warm gold (a tint of the same hue).
  static const ringTasks = [Color(0xFFFFD98A), Color(0xFFFF9E3D)];
}

/// Full-bleed gradient background. Wrap a screen body in this to get the
/// signature wash behind translucent content.
class GradientBackground extends StatelessWidget {
  const GradientBackground({
    super.key,
    required this.child,
    this.gradient,
  });

  final Widget child;
  final Gradient? gradient;

  @override
  Widget build(BuildContext context) {
    final b = MediaQuery.maybeOf(context)?.platformBrightness ?? Brightness.light;
    return DecoratedBox(
      decoration: BoxDecoration(gradient: gradient ?? QGradients.page(b)),
      child: child,
    );
  }
}
