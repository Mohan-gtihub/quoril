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

  /// Primary warm wash (top-left deep → bottom-right bright). Used on the
  /// focus/session surface and hero cards.
  static const warm = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF3A0E0A), // deep maroon
      Color(0xFF7E2412), // burnt sienna
      Color(0xFFC5471B), // vermilion
      Color(0xFFF37A1E), // orange
      Color(0xFFFF9E3D), // amber
    ],
    stops: [0.0, 0.28, 0.52, 0.78, 1.0],
  );

  /// Cool morning wash (deep navy → azure). Used on the greeting card.
  static const cool = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [
      Color(0xFF0A1B3D), // midnight navy
      Color(0xFF10315F), // deep blue
      Color(0xFF1E5AA8), // azure
      Color(0xFF2E86D8), // bright blue
    ],
    stops: [0.0, 0.35, 0.75, 1.0],
  );

  /// Subtle page background wash — a faint warm tint that reads as light in
  /// light mode and rich in dark mode via the two brightness variants.
  static LinearGradient page(Brightness b) => b == Brightness.dark
      ? const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFF1A0F0A), Color(0xFF0B0B0C)],
        )
      : const LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [Color(0xFFFFF3EA), Color(0xFFF6F5F8)],
        );

  // --- Apple Health–style ring sweeps (each is a 2-stop conic-ready pair) ---

  /// Focus ring — amber → bright orange.
  static const ringFocus = [Color(0xFFFFC24B), Color(0xFFFF7A1A)];

  /// Protected/blocked ring — teal → azure.
  static const ringProtected = [Color(0xFF37E6C4), Color(0xFF17A0E8)];

  /// Tasks ring — pink → magenta-red.
  static const ringTasks = [Color(0xFFFF5E8A), Color(0xFFE81E63)];
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
