import 'dart:ui';

import 'package:flutter/cupertino.dart';

import '../../../core/theme/tokens.dart';
import '../../../core/theme/typography.dart';

/// Single source of truth for the Quoril brand mark so it can never drift
/// across welcome, recap, and the sign-in wordmark. `scope` reads as
/// focus / aim — the whole product thesis.
class QBrand {
  QBrand._();

  /// THE brand glyph. Use everywhere a Quoril mark appears.
  static const IconData mark = CupertinoIcons.scope;
}

// ── Warm Aurora foreground palette (shared on the ember gradient) ────────────
// White-ink-on-gradient stays a local const per the design-system contract;
// brand-ish selection colors resolve from QColors.brand at call sites.
const Color kFgPrimary = CupertinoColors.white;
final Color kFgSecondary = CupertinoColors.white.withValues(alpha: 0.74);
final Color kFgTertiary = CupertinoColors.white.withValues(alpha: 0.5);
final Color kGlassFill = CupertinoColors.white.withValues(alpha: 0.12);
final Color kGlassBorder = CupertinoColors.white.withValues(alpha: 0.22);

/// ON-EMBER frosted glass — the content-card material for surfaces that sit on
/// the warm ember gradient (onboarding recap rows, resting goal/intensity
/// tiles). This is the white-ink sibling of the neutral [GlassCard]: it adds a
/// REAL BackdropFilter blur so the tile actually refracts the ember wash behind
/// it (the old flat translucent fills read as opaque scrims, not glass), plus a
/// top specular highlight hairline. White ink stays fully legible on it.
///
/// The one sanctioned bold moment — a SELECTED amber tile — is NOT this; those
/// keep their solid [QColors.brandBright] fill. Use [EmberGlass] only for the
/// resting/unselected state and for the recap summary rows.
class EmberGlass extends StatelessWidget {
  const EmberGlass({
    super.key,
    required this.child,
    this.radius = QRadius.taskCard,
    this.blur = 18,
  });

  final Widget child;
  final double radius;
  final double blur;

  @override
  Widget build(BuildContext context) {
    final br = BorderRadius.circular(radius);
    return ClipRRect(
      borderRadius: br,
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: blur, sigmaY: blur),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: kGlassFill,
            borderRadius: br,
            border: Border.all(color: kGlassBorder, width: 1),
          ),
          child: Stack(
            children: [
              // Top specular highlight, painted UNDER the child so ink stays
              // crisp — the edge that makes it read as glass, not a flat scrim.
              Positioned.fill(
                child: IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: br,
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          CupertinoColors.white.withValues(alpha: 0.14),
                          CupertinoColors.white.withValues(alpha: 0.0),
                        ],
                        stops: const [0.0, 0.55],
                      ),
                    ),
                  ),
                ),
              ),
              child,
            ],
          ),
        ),
      ),
    );
  }
}

/// Frosted-glass circular brand mark on the ember wash, with an optional slow
/// breathing pulse (welcome hero). Honors Reduce Motion.
class BrandMark extends StatefulWidget {
  const BrandMark({
    super.key,
    this.size = 88,
    this.iconSize = 44,
    this.breathe = false,
  });

  final double size;
  final double iconSize;
  final bool breathe;

  @override
  State<BrandMark> createState() => _BrandMarkState();
}

class _BrandMarkState extends State<BrandMark>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: QMotion.breath,
  );

  @override
  void initState() {
    super.initState();
    if (widget.breathe) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && !QMotion.reduced(context)) _c.repeat(reverse: true);
      });
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final mark = Container(
      width: widget.size,
      height: widget.size,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: CupertinoColors.white.withValues(alpha: 0.16),
        border: Border.all(color: kGlassBorder, width: 1),
        boxShadow: QElevation.floating(context),
      ),
      child: Icon(
        QBrand.mark,
        size: widget.iconSize,
        color: CupertinoColors.white,
      ),
    );

    if (!widget.breathe || QMotion.reduced(context)) return mark;

    return AnimatedBuilder(
      animation: _c,
      builder: (context, child) {
        final t = Curves.easeInOut.transform(_c.value);
        final scale = 1.0 + t * 0.06;
        return Stack(
          alignment: Alignment.center,
          children: [
            // Soft ember bloom that breathes with the mark.
            Container(
              width: widget.size * (1.35 + t * 0.35),
              height: widget.size * (1.35 + t * 0.35),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: CupertinoColors.white
                    .withValues(alpha: 0.06 + t * 0.06),
              ),
            ),
            Transform.scale(scale: scale, child: child),
          ],
        );
      },
      child: mark,
    );
  }
}

/// The ONE hero header shared by onboarding and sign-in: mark + largeTitle +
/// subtitle, on one layout grid. Left-aligned editorial composition.
class HeroHeader extends StatelessWidget {
  const HeroHeader({
    super.key,
    required this.title,
    this.subtitle,
    this.markSize = 64,
    this.markIconSize = 32,
    this.breathe = false,
    this.titleStyle,
  });

  final String title;
  final String? subtitle;
  final double markSize;
  final double markIconSize;
  final bool breathe;
  final TextStyle? titleStyle;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        BrandMark(
          size: markSize,
          iconSize: markIconSize,
          breathe: breathe,
        ),
        const SizedBox(height: QSpace.xl),
        Text(
          title,
          style: (titleStyle ?? QType.largeTitle).copyWith(
            color: kFgPrimary,
            height: 1.05,
            fontWeight: FontWeight.w700,
          ),
        ),
        if (subtitle != null) ...[
          const SizedBox(height: QSpace.sm),
          Text(
            subtitle!,
            style: QType.body.copyWith(color: kFgSecondary, height: 1.3),
          ),
        ],
      ],
    );
  }
}

/// Compact brand row (mark + wordmark) for the sign-in header.
class BrandWordmark extends StatelessWidget {
  const BrandWordmark({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 34,
          height: 34,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: CupertinoColors.white.withValues(alpha: 0.16),
            border: Border.all(color: kGlassBorder, width: 1),
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(QBrand.mark, size: 18, color: CupertinoColors.white),
        ),
        const SizedBox(width: QSpace.xs),
        Text(
          'Quoril',
          style: QType.headline.copyWith(
            color: kFgPrimary,
            letterSpacing: 0.5,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

/// Staggered fade+slide entrance for a column of children (title → subtitle →
/// content). Honors Reduce Motion (renders instantly). Each child is delayed by
/// [stagger] * index.
class StaggerColumn extends StatefulWidget {
  const StaggerColumn({
    super.key,
    required this.children,
    this.crossAxisAlignment = CrossAxisAlignment.start,
    this.stagger = const Duration(milliseconds: 110),
  });

  final List<Widget> children;
  final CrossAxisAlignment crossAxisAlignment;
  final Duration stagger;

  @override
  State<StaggerColumn> createState() => _StaggerColumnState();
}

class _StaggerColumnState extends State<StaggerColumn>
    with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(
    vsync: this,
    duration: QMotion.base +
        widget.stagger * (widget.children.length.clamp(1, 99)),
  );

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (QMotion.reduced(context)) {
        _c.value = 1;
      } else {
        _c.forward();
      }
    });
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final total = _c.duration!.inMilliseconds;
    final stepMs = widget.stagger.inMilliseconds;
    return Column(
      crossAxisAlignment: widget.crossAxisAlignment,
      children: [
        for (var i = 0; i < widget.children.length; i++)
          _StaggerItem(
            controller: _c,
            begin: (stepMs * i) / total,
            end: ((stepMs * i) + QMotion.base.inMilliseconds) / total,
            child: widget.children[i],
          ),
      ],
    );
  }
}

class _StaggerItem extends StatelessWidget {
  const _StaggerItem({
    required this.controller,
    required this.begin,
    required this.end,
    required this.child,
  });
  final AnimationController controller;
  final double begin;
  final double end;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final anim = CurvedAnimation(
      parent: controller,
      curve: Interval(begin.clamp(0.0, 1.0), end.clamp(0.0, 1.0),
          curve: QMotion.standard),
    );
    return AnimatedBuilder(
      animation: anim,
      builder: (context, child) {
        return Opacity(
          opacity: anim.value,
          child: Transform.translate(
            offset: Offset(0, (1 - anim.value) * 16),
            child: child,
          ),
        );
      },
      child: child,
    );
  }
}
