import 'package:flutter/cupertino.dart';

import '../theme/tokens.dart';
import '../theme/typography.dart';

/// Quoril App Kit — the canonical building blocks every screen composes from.
///
/// One native page chrome (large-title nav bar over an adaptive grouped
/// background), one inset card, one section header. Using these instead of
/// bespoke scaffolds is what makes the product feel engineered and coherent
/// across features — not a pile of one-off screens.
///
/// Design decisions encoded here:
/// • Adaptive light/dark via iOS system semantics (no forced palettes).
/// • A single brand accent: [QColors.breakColor] (systemOrange) for interactive
///   + selected states. Semantic colors (green/red/blue) stay meaning-specific.
/// • 4pt spacing (QSpace), 16pt card radius, layered depth (no drop shadows).

/// Quoril "Ember" brand accent — spend it on actions and selection, nowhere
/// decorative. Kept in sync with [QColors.brand] (light value); prefer
/// `QColors.brand.resolveFrom(context)` in new code so dark mode lifts it.
const Color kAccent = Color(0xFFF2751B);

/// A screen: native large-title nav bar + adaptive grouped background, with an
/// optional trailing action and a floating [overlay] (e.g. a FAB).
class AppScaffold extends StatelessWidget {
  const AppScaffold({
    super.key,
    required this.title,
    required this.slivers,
    this.trailing,
    this.leading,
    this.overlay,
    this.backgroundColor,
    this.largeTitle = true,
    this.transitionBetweenRoutes = false,
  });

  final String title;
  final List<Widget> slivers;
  final Widget? trailing;

  /// Optional leading nav item (e.g. a back-affordance or profile avatar).
  final Widget? leading;
  final Widget? overlay;
  final Color? backgroundColor;
  final bool largeTitle;

  /// Set true for a *pushed* (non-tab-root) screen so it gets the native
  /// large-title collapse + back hero. Tab roots keep this false to avoid
  /// "multiple heroes share the same tag".
  final bool transitionBetweenRoutes;

  @override
  Widget build(BuildContext context) {
    final bg = backgroundColor ?? QColors.bgGrouped.resolveFrom(context);
    return CupertinoPageScaffold(
      backgroundColor: bg,
      child: Stack(
        children: [
          CustomScrollView(
            physics: const BouncingScrollPhysics(),
            slivers: [
              CupertinoSliverNavigationBar(
                largeTitle: largeTitle ? Text(title) : null,
                middle: largeTitle ? null : Text(title),
                backgroundColor: bg.withValues(alpha: 0.7),
                border: null,
                leading: leading,
                trailing: trailing,
                transitionBetweenRoutes: transitionBetweenRoutes,
              ),
              ...slivers,
            ],
          ),
          ?overlay,
        ],
      ),
    );
  }
}

/// Convenience: wrap page content in the standard horizontal page margin and a
/// sliver so screens don't re-derive [kPageMargin] + [SliverToBoxAdapter].
class SliverPagePadding extends StatelessWidget {
  const SliverPagePadding({
    super.key,
    required this.child,
    this.margin = kPageMargin,
    this.top = QSpace.md,
    this.bottom = QSpace.xxl,
  });

  final Widget child;
  final EdgeInsets margin;
  final double top;
  final double bottom;

  @override
  Widget build(BuildContext context) {
    return SliverToBoxAdapter(
      child: Padding(
        padding: margin.add(EdgeInsets.only(top: top, bottom: bottom)),
        child: child,
      ),
    );
  }
}

/// An inset content card (secondary grouped surface), 16pt radius, no shadow —
/// depth comes from the surface layering, iOS-native.
class InsetCard extends StatelessWidget {
  const InsetCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(QSpace.md),
    this.onTap,
    this.color,
    this.radius = QRadius.taskCard,
  });

  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? color;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final card = Container(
      padding: padding,
      decoration: BoxDecoration(
        color: (color ?? QColors.surface).resolveFrom(context),
        borderRadius: BorderRadius.circular(radius),
      ),
      child: child,
    );
    if (onTap == null) return card;
    return GestureDetector(behavior: HitTestBehavior.opaque, onTap: onTap, child: card);
  }
}

/// Inset section header — a bold title with an optional trailing action link.
///
/// Pass a section [accent] to tint the action link with that screen's accent
/// (defaults to ember). An optional [eyebrow] renders a tracked accent kicker
/// above the title for the refined editorial header pattern.
class AppSectionHeader extends StatelessWidget {
  const AppSectionHeader(
    this.title, {
    super.key,
    this.actionLabel,
    this.onAction,
    this.eyebrow,
    this.accent,
  });
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  /// Optional tracked kicker above the title (rendered in [accent]).
  final String? eyebrow;

  /// Section accent for the eyebrow + action link. Defaults to ember.
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final a = (accent ?? QColors.brand).resolveFrom(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.sm, QSpace.md, QSpace.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (eyebrow != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 2),
                    child: Text(eyebrow!.toUpperCase(),
                        style: QType.eyebrow.copyWith(color: a)),
                  ),
                Text(title, style: QType.title3.copyWith(fontWeight: FontWeight.w700)),
              ],
            ),
          ),
          if (actionLabel != null)
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: onAction,
              child: Padding(
                padding: const EdgeInsets.only(left: QSpace.sm),
                child: Text(
                  actionLabel!,
                  style: QType.subhead.copyWith(color: a, fontWeight: FontWeight.w600),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Standard outer horizontal margin for content laid directly on the page.
const EdgeInsets kPageMargin = EdgeInsets.symmetric(horizontal: QSpace.md);
