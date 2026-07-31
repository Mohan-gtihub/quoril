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
/// decorative. A considered warm ember (distinct from flat systemOrange).
const Color kAccent = Color(0xFFF2751B);

/// A screen: native large-title nav bar + adaptive grouped background, with an
/// optional trailing action and a floating [overlay] (e.g. a FAB).
class AppScaffold extends StatelessWidget {
  const AppScaffold({
    super.key,
    required this.title,
    required this.slivers,
    this.trailing,
    this.overlay,
    this.backgroundColor,
    this.largeTitle = true,
  });

  final String title;
  final List<Widget> slivers;
  final Widget? trailing;
  final Widget? overlay;
  final Color? backgroundColor;
  final bool largeTitle;

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
                trailing: trailing,
                // Tab-root bars are all mounted together in the shell's
                // IndexedStack — opting out of route-transition heroes avoids
                // "multiple heroes share the same tag" during pushes.
                transitionBetweenRoutes: false,
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

/// An inset content card (secondary grouped surface), 16pt radius, no shadow —
/// depth comes from the surface layering, iOS-native.
class InsetCard extends StatelessWidget {
  const InsetCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(QSpace.md),
    this.onTap,
    this.color,
    this.radius = 16,
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
class AppSectionHeader extends StatelessWidget {
  const AppSectionHeader(this.title, {super.key, this.actionLabel, this.onAction});
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(QSpace.md, QSpace.sm, QSpace.md, QSpace.xs),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.baseline,
        textBaseline: TextBaseline.alphabetic,
        children: [
          Text(title, style: QType.title3.copyWith(fontWeight: FontWeight.w700)),
          const Spacer(),
          if (actionLabel != null)
            GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: onAction,
              child: Text(
                actionLabel!,
                style: QType.subhead.copyWith(color: kAccent, fontWeight: FontWeight.w600),
              ),
            ),
        ],
      ),
    );
  }
}

/// Standard outer horizontal margin for content laid directly on the page.
const EdgeInsets kPageMargin = EdgeInsets.symmetric(horizontal: QSpace.md);
